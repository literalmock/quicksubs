import fs from 'fs';
import path from 'path';

const API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const MODEL = 'scribe_v2';

/**
 * Transcribes audio using ElevenLabs Scribe v2 STT API.
 * Returns word-level timestamps and full text — same shape as Groq output
 * so the downstream segmentCaptions pipeline works unchanged.
 *
 * @param {string} audioPath – path to the audio file
 * @param {'english'|'hindi'|'hinglish'} language – audio language hint
 * @returns {Promise<{ text: string, words: Array, segments: Array }>}
 */
export const transcribeWithElevenLabs = async (audioPath, language = 'hinglish') => {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set in the environment');
  }

  // Map our internal language names to ISO-639-1 codes
  const langMap = {
    english: 'en',
    hindi: 'hi',
    hinglish: 'hi', // closest – ElevenLabs auto-detects code-mixed speech well
  };

  const languageCode = langMap[language] || null;

  console.log(`🔊 Sending audio to ElevenLabs Scribe v2 [language: ${language}]…`);

  // Build multipart/form-data using native Node (no extra dependencies)
  const { FormData, Blob } = await import('node:buffer').then(() => {
    // FormData is global in Node 18+
    return { FormData: globalThis.FormData, Blob: globalThis.Blob };
  });

  const fileBuffer = fs.readFileSync(audioPath);
  const ext = path.extname(audioPath).replace('.', '') || 'wav';
  const mimeType = ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : 'audio/wav';

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), `audio.${ext}`);
  formData.append('model_id', MODEL);
  formData.append('timestamps_granularity', 'word');
  formData.append('tag_audio_events', 'false');
  formData.append('diarize', 'false');

  if (languageCode) {
    formData.append('language_code', languageCode);
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs STT error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  console.log('--- RAW ELEVENLABS RESPONSE ---');
  console.log(JSON.stringify({ text: result.text, wordCount: result.words?.length }, null, 2));

  // ElevenLabs returns: { text, words: [{ text, start, end, type, speaker_id }], ... }
  // Convert to Groq-compatible shape: words[] with .word property, and build segments[]
  const words = (result.words || [])
    .filter((w) => w.type === 'word')
    .map((w) => ({
      word: w.text,
      start: w.start,
      end: w.end,
    }));

  // Build synthetic segments from the words (group ~20 words per segment for downstream)
  const segments = buildSegmentsFromWords(words);

  console.log(
    `🔊 ElevenLabs transcription complete — ${segments.length} segments, ${words.length} words`
  );

  return {
    text: result.text || '',
    words,
    segments,
  };
};

/**
 * Groups words into segment-like objects for compatibility with the
 * existing segmentCaptions pipeline.
 */
function buildSegmentsFromWords(words, wordsPerSegment = 6) {
  const segments = [];

  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const chunk = words.slice(i, i + wordsPerSegment);
    if (chunk.length === 0) continue;

    segments.push({
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: chunk.map((w) => w.word).join(' '),
    });
  }

  return segments;
}
