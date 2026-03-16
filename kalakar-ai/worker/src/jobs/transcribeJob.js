import Video from '../models/Video.js';
import path from 'path';
import fs from 'fs';
import { downloadVideo } from '../pipeline/download.js';
import { createPreview } from '../pipeline/createPreview.js';
import { extractAudio } from '../pipeline/extractAudio.js';
import { captionsToSrt } from '../pipeline/segmentCaptions.js';
import { uploadVideoAssetToR2 } from '../config/r2.js';
import { cleanup } from '../utils/cleanup.js';
import { runVerifiedTranscription } from '../pipeline/quality/runVerifiedTranscription.js';

const MAX_RETRIES = 3;
const PROMPT_LEAK_REGEX = /(do not translate|hinglish conversation mixing|output everything in roman|keep english words exactly)/i;

const sanitizeCaptionList = (captions) =>
  (captions || [])
    .map((caption) => ({
      ...caption,
      text: String(caption.text || '').replace(/\s+/g, ' ').trim(),
    }))
    .filter((caption) => caption.text && !PROMPT_LEAK_REGEX.test(caption.text));

const saveTranscriptionLog = (data) => {
  try {
    const logPath = path.resolve(process.cwd(), 'last_transcription_log.json');
    fs.writeFileSync(logPath, JSON.stringify(data, null, 2));
    console.log(`💾 Raw transcription saved to: ${logPath}`);
  } catch (err) {
    console.warn('⚠️ Failed to save transcription log:', err.message);
  }
};

/**
 * Transcription pipeline:
 * Restored previous sophisticated functionality while maintaining
 * optimizations for bandwidth (cached audio) and reliability (retry limits).
 */
export const processTranscribeJob = async (job) => {
  const {
    videoId,
    originalUrl,
    language = 'hinglish',
    provider = 'groq',
    // These may be present for re-transcription
    audioUrl: cachedAudioUrl = null,
    audioPublicId: cachedAudioPublicId = null,
    previewUrl: existingPreviewUrl = null,
    previewPublicId: existingPreviewPublicId = null,
  } = job.data;

  console.log(`\n🎬 Transcribe job ${job.id} | videoId: ${videoId} | language: ${language} | provider: ${provider}`);

  // 1. Check retry limit
  const videoDoc = await Video.findById(videoId);
  if (!videoDoc) {
    throw new Error(`Video ${videoId} not found`);
  }

  if ((videoDoc.failureCount || 0) >= MAX_RETRIES) {
    console.error(`❌ Video ${videoId} has failed too many times (${videoDoc.failureCount}) — aborting`);
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      errorMessage: `Transcription failed ${videoDoc.failureCount} consecutive times. Stop retrying to save bandwidth.`,
    });
    return { success: false, reason: 'max_retries_exceeded' };
  }

  let inputPath, audioPath, previewPath;
  let qualityReport = null;
  let previewAsset = {
    url: existingPreviewUrl || videoDoc.previewUrl || null,
    key: existingPreviewPublicId || videoDoc.previewPublicId || null,
  };
  let audioAsset = {
    url: cachedAudioUrl || videoDoc.audioUrl || null,
    key: cachedAudioPublicId || videoDoc.audioPublicId || null,
  };

  try {
    await Video.findByIdAndUpdate(videoId, { status: 'processing' });
    await job.updateProgress(10);

    // 2. Audio & Preview Logic — Restore previous functionality + cached audio reuse
    if (audioAsset.url) {
      console.log('⚡ Reusing cached audio for transcription…');
      // If we already have the audio in R2, we only need to download that small file
      audioPath = await downloadVideo(audioAsset.url);
      await job.updateProgress(40);
    } else {
      // Download original video
      console.log('⬇️  Downloading original video…');
      inputPath = await downloadVideo(originalUrl);
      await job.updateProgress(25);

      // Generate preview for editor playback (once)
      if (!previewAsset.url) {
        console.log('🎞️  Creating preview video…');
        previewPath = await createPreview(inputPath);
        previewAsset = await uploadVideoAssetToR2({
          filePath: previewPath,
          originalName: `${path.parse(inputPath).name}-preview.mp4`,
          prefix: 'previews',
          mimeType: 'video/mp4',
        });
      }
      await job.updateProgress(35);

      // Extract and cache audio
      console.log('🎵 Extracting and caching audio…');
      audioPath = await extractAudio(inputPath);
      audioAsset = await uploadVideoAssetToR2({
        filePath: audioPath,
        originalName: `${path.parse(inputPath).name}-audio.wav`,
        prefix: 'audio',
        mimeType: 'audio/wav',
      });
      await job.updateProgress(45);
    }

    // 3. Transcribe with sophisticated pipeline
    console.log(`🧠 Transcribing audio with ${provider}…`);
    const transcription = await runVerifiedTranscription({ audioPath, language, provider });
    qualityReport = transcription.quality || null;

    // Save raw response to local file as requested
    saveTranscriptionLog({
      videoId,
      provider,
      language,
      timestamp: new Date().toISOString(),
      quality: qualityReport,
      raw: transcription.audit || transcription,
    });

    console.log(`📝 Transcription Result Summary:
- Text Length: ${transcription.text?.length || 0}
- Raw Captions: ${transcription.captions?.length || 0}
`);
    if (!transcription || (!transcription.text && (!transcription.captions || transcription.captions.length === 0))) {
      throw new Error(`Transcription provider ${provider} returned empty result`);
    }
    await job.updateProgress(72);

    // 4. Transform to captions
    console.log('✂️  Processing captions…');
    const inputCaptions = transcription.captions || [];
    let refinedCaptions = sanitizeCaptionList(inputCaptions);

    if (!refinedCaptions.length && inputCaptions.length > 0) {
      console.warn('⚠️ Sanitization removed all captions, using raw ASR results');
      refinedCaptions = sanitizeCaptionList(inputCaptions);
    }

    if (!refinedCaptions.length) {
      throw new Error(`Transcription resulted in zero valid captions (Raw: ${inputCaptions.length})`);
    }

    const finalCaptions = refinedCaptions;
    const srt = captionsToSrt(finalCaptions);
    const finalTranscriptText = String(transcription.text || '').trim();

    if (transcription.manualReview?.length) {
      console.warn(`⚠️ Manual review required for ${transcription.manualReview.length} chunk(s)`);
    }

    if (qualityReport && !qualityReport.approved) {
      throw new Error(
        `Hinglish verification rejected subtitles: ${qualityReport.issues.join(' | ') || 'quality gate failed'}`
      );
    }
    await job.updateProgress(92);

    // 5. Save results and reset failure count
    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      transcription: finalTranscriptText,
      subtitleSrt: srt,
      previewUrl: previewAsset.url,
      previewPublicId: previewAsset.key,
      audioUrl: audioAsset.url,
      audioPublicId: audioAsset.key,
      transcriptionQuality: qualityReport,
      failureCount: 0,
      errorMessage: null,
    });

    await job.updateProgress(100);
    console.log(`✅ Transcription job completed (${finalCaptions.length} captions)`);
    return { success: true, captions: finalCaptions };
  } catch (err) {
    console.error(`❌ Transcribe job failed:`, err.message);
    const newCount = (videoDoc.failureCount || 0) + 1;
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      errorMessage: err.message,
      failureCount: newCount,
      previewUrl: previewAsset.url || videoDoc.previewUrl || null,
      previewPublicId: previewAsset.key || videoDoc.previewPublicId || null,
      audioUrl: audioAsset.url || videoDoc.audioUrl || null,
      audioPublicId: audioAsset.key || videoDoc.audioPublicId || null,
      transcriptionQuality: qualityReport,
    });
    throw err;
  } finally {
    cleanup(inputPath, audioPath, previewPath);
  }
};
