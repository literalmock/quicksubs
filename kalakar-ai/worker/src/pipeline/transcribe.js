import fs from 'fs';
import path from 'path';
import { buildWhisperParams, transcribeGroqChunk } from './groqTranscriber.js';
import { splitAudioIntoChunks } from './audioChunker.js';
import { processChunksWithRetry } from './transcriptionQueue.js';
import { mergeChunkTranscriptions } from './captionMerger.js';
import { formatCaptionsFromSegments } from './captionFormatter.js';
import { transcribeWithElevenLabs } from './transcribeElevenLabs.js';

const CHUNK_SECONDS = 45;
const RECOVERY_CHUNK_SECONDS = 24;
const RECOVERY_OVERLAP_SECONDS = 3;
const GROQ_CONCURRENCY = 1;
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-06-01';

const getAzureConfig = () => {
  const endpoint = String(process.env.AZURE_OPENAI_ENDPOINT || '').trim();
  const apiKey = String(process.env.AZURE_OPENAI_API_KEY || '').trim();
  const deployment = String(process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT || '').trim();
  return {
    endpoint: endpoint.replace(/\/$/, ''),
    apiKey,
    deployment,
  };
};

const hasAzureConfig = () => {
  const { endpoint, apiKey, deployment } = getAzureConfig();
  return Boolean(endpoint && apiKey && deployment);
};

const removePathSafe = (targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) return;
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
};

const parseJsonSafe = async (response) => {
  const bodyText = await response.text();
  try {
    return JSON.parse(bodyText || '{}');
  } catch {
    return { error: { message: bodyText || 'Unknown response parse error' } };
  }
};

const isLikelyLargeTrack = (chunkCount) => chunkCount >= 8;

const shouldRunRecoveryPass = ({ chunks, merged, captions, manualReview }) => {
  if (!isLikelyLargeTrack(chunks.length)) return false;
  if (manualReview.length > 0) return true;

  const textLength = String(merged?.text || '').trim().length;
  const segmentCount = Array.isArray(merged?.segments) ? merged.segments.length : 0;
  const captionCount = Array.isArray(captions) ? captions.length : 0;

  const sparseSegments = segmentCount < Math.max(10, Math.floor(chunks.length * 0.85));
  const sparseCaptions = captionCount < Math.max(10, Math.floor(chunks.length * 0.95));
  const sparseText = textLength < chunks.length * 35;

  return sparseSegments || sparseCaptions || sparseText;
};

const scorePass = ({ merged, captions, manualReview }) => {
  const textLength = String(merged?.text || '').trim().length;
  const segmentCount = Array.isArray(merged?.segments) ? merged.segments.length : 0;
  const captionCount = Array.isArray(captions) ? captions.length : 0;
  return (captionCount * 3) + (segmentCount * 2) + Math.min(textLength / 20, 300) - (manualReview.length * 200);
};

const runPass = async ({
  audioPath,
  transcribeChunk,
  chunkSeconds,
  overlapSeconds,
  concurrency,
}) => {
  const { chunkDir, chunks } = await splitAudioIntoChunks(audioPath, chunkSeconds, overlapSeconds);

  try {
    const { results, manualReview } = await processChunksWithRetry({
      chunks,
      processChunk: transcribeChunk,
      concurrency,
    });

    const merged = mergeChunkTranscriptions(results);
    const captions = formatCaptionsFromSegments(merged.segments);

    return {
      merged,
      captions,
      manualReview,
      chunks,
    };
  } finally {
    removePathSafe(chunkDir);
  }
};

const transcribeAzureChunk = async (audioPath, params) => {
  const { endpoint, apiKey, deployment } = getAzureConfig();
  const url = `${endpoint}/openai/deployments/${deployment}/audio/transcriptions?api-version=${AZURE_OPENAI_API_VERSION}`;

  const bytes = fs.readFileSync(audioPath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'audio/mpeg' }), path.basename(audioPath));
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  if (params?.language) form.append('language', params.language);
  if (params?.prompt) form.append('prompt', params.prompt);
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');

  let response = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': apiKey },
    body: form,
  });

  if (!response.ok) {
    const failure = await parseJsonSafe(response);
    const message = String(failure?.error?.message || '').toLowerCase();

    if (message.includes('timestamp_granularities')) {
      const retryForm = new FormData();
      retryForm.append('file', new Blob([bytes], { type: 'audio/mpeg' }), path.basename(audioPath));
      retryForm.append('response_format', 'verbose_json');
      retryForm.append('temperature', '0');
      if (params?.language) retryForm.append('language', params.language);
      if (params?.prompt) retryForm.append('prompt', params.prompt);

      response = await fetch(url, {
        method: 'POST',
        headers: { 'api-key': apiKey },
        body: retryForm,
      });
      if (!response.ok) {
        const retryFailure = await parseJsonSafe(response);
        throw new Error(retryFailure?.error?.message || 'Azure transcription failed');
      }
    } else {
      throw new Error(failure?.error?.message || 'Azure transcription failed');
    }
  }

  const data = await parseJsonSafe(response);
  return {
    text: data.text || '',
    words: Array.isArray(data.words) ? data.words : [],
    segments: Array.isArray(data.segments) ? data.segments : [],
  };
};

/**
 * Enhanced transcription pipeline:
 *   - 'elevenlabs' → High-performance multi-language STT (Scribe v2)
 *   - 'groq'/'azure' → Support chunked/primary+recovery passes for better accuracy on long videos
 *
 * @param {string} audioPath
 * @param {'english'|'hindi'|'hinglish'} language
 * @param {'groq'|'azure'|'elevenlabs'} provider
 */
export const transcribeAudio = async (audioPath, language = 'hinglish', provider = 'groq') => {
  // ── ElevenLabs bypass (doesn't need chunking) ──────────
  if (provider === 'elevenlabs') {
    const raw = await transcribeWithElevenLabs(audioPath, language);
    // Generate captions from segments for downstream compatibility
    const captions = formatCaptionsFromSegments(raw.segments);
    return {
      ...raw,
      captions,
      manualReview: [],
    };
  }

  const params = buildWhisperParams(language);
  const wantedProvider = provider === 'azure' ? 'azure' : 'groq';

  if (wantedProvider === 'azure' && !hasAzureConfig()) {
    throw new Error('Azure transcription requested but AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, or AZURE_OPENAI_WHISPER_DEPLOYMENT is missing');
  }

  const transcribeChunk = wantedProvider === 'azure'
    ? (chunk) => transcribeAzureChunk(chunk.file, params)
    : (chunk) => transcribeGroqChunk(chunk.file, params);

  console.log(`Starting chunked transcription via ${wantedProvider} [language: ${language}]`);

  const defaultConcurrency = wantedProvider === 'azure' ? 3 : GROQ_CONCURRENCY;

  const primary = await runPass({
    audioPath,
    transcribeChunk,
    chunkSeconds: CHUNK_SECONDS,
    overlapSeconds: 0,
    concurrency: defaultConcurrency,
  });

  if (primary.manualReview.length) {
    console.warn(`Manual review needed for ${primary.manualReview.length} chunk(s) in primary pass`);
  }

  let chosen = primary;
  if (shouldRunRecoveryPass(primary)) {
    console.warn('⚠️ Low-confidence large transcription detected; running recovery pass with overlapped chunks');

    const recovery = await runPass({
      audioPath,
      transcribeChunk,
      chunkSeconds: RECOVERY_CHUNK_SECONDS,
      overlapSeconds: RECOVERY_OVERLAP_SECONDS,
      concurrency: wantedProvider === 'azure' ? 2 : 1,
    });

    if (scorePass(recovery) > scorePass(primary)) {
      console.log('✅ Recovery pass selected for final captions');
      chosen = recovery;
    } else {
      console.log('ℹ️ Primary pass retained after recovery comparison');
    }
  }

  return {
    ...chosen.merged,
    captions: chosen.captions,
    manualReview: chosen.manualReview,
  };
};
