import Video from '../models/Video.js';
import path from 'path';
import { downloadVideo } from '../pipeline/download.js';
import { createPreview } from '../pipeline/createPreview.js';
import { extractAudio } from '../pipeline/extractAudio.js';
import { processWithCloudinary } from '../pipeline/cloudinaryProcessor.js';
import { captionsToSrt, segmentCaptions } from '../pipeline/segmentCaptions.js';
import { refineCaptions } from '../pipeline/refineCaptions.js';
import { uploadVideoAssetToR2 } from '../config/r2.js';
import { cleanup } from '../utils/cleanup.js';

const PROMPT_LEAK_REGEX = /(do not translate|hinglish conversation mixing|output everything in roman|keep english words exactly)/i;

const sanitizeCaptionList = (captions) =>
  (captions || [])
    .map((caption) => ({
      ...caption,
      text: String(caption.text || '').replace(/\s+/g, ' ').trim(),
    }))
    .filter((caption) => caption.text && !PROMPT_LEAK_REGEX.test(caption.text));

/**
 * Transcription pipeline (initial upload):
 *   download video → FFmpeg extract audio → transcribe → segment captions → save DB
 *
 * No burn step — captions go straight to the editor.
 * Burn only happens when the user explicitly exports (render job).
 */
export const processTranscribeJob = async (job) => {
  const {
    videoId,
    originalUrl,
    language = 'hinglish',
    transcriptionProvider = process.env.TRANSCRIPTION_PROVIDER || 'groq',
    audioUrl: cachedAudioUrl = null,
    audioPublicId: cachedAudioPublicId = null,
    previewUrl: existingPreviewUrl = null,
    previewPublicId: existingPreviewPublicId = null,
  } = job.data;
  console.log(`\n🎬 Transcribe job ${job.id} | videoId: ${videoId} | language: ${language} | provider: ${transcriptionProvider}`);

  let inputPath, audioPath, previewPath;
  let previewAsset = {
    url: existingPreviewUrl || null,
    key: existingPreviewPublicId || null,
  };
  let audioAsset = {
    url: cachedAudioUrl || null,
    key: cachedAudioPublicId || null,
  };
  const transcriptionEngine = 'cloudinary';

  try {
    await Video.findByIdAndUpdate(videoId, { status: 'processing' });
    await job.updateProgress(10);

    if (audioAsset.url) {
      console.log('⚡ Reusing cached audio for retranscription…');
      audioPath = await downloadVideo(audioAsset.url);
      await job.updateProgress(45);
    } else {
      // 1. Download full video
      console.log('⬇️  Downloading video…');
      inputPath = await downloadVideo(originalUrl);
      await job.updateProgress(25);

      // 1.5 Generate lightweight preview for editor playback (only once)
      if (!previewAsset.url || !previewAsset.key) {
        console.log('🎞️ Creating preview video…');
        previewPath = await createPreview(inputPath);
        previewAsset = await uploadVideoAssetToR2({
          filePath: previewPath,
          originalName: `${path.parse(inputPath).name}-preview.mp4`,
          prefix: 'previews',
          mimeType: 'video/mp4',
        });
      }
      await job.updateProgress(35);

      // 2. Extract audio with FFmpeg (high-quality local extraction)
      console.log('🎵 Extracting audio…');
      audioPath = await extractAudio(inputPath);

      // Persist extracted audio so future re-transcribe can skip full video download.
      audioAsset = await uploadVideoAssetToR2({
        filePath: audioPath,
        originalName: `${path.parse(inputPath).name}-audio.wav`,
        prefix: 'audio',
        mimeType: 'audio/wav',
      });
      console.log('🎵 Cached extracted audio for faster re-transcribe');
      await job.updateProgress(45);
    }

    // 3. Transcribe with Whisper
    console.log('🧠 Transcribing audio…');
    const transcription = await processWithCloudinary({
      audioPath,
      language,
      transcriptionProvider,
    });
    await job.updateProgress(72);

    // 4. Segment into captions
    console.log('✂️  Segmenting captions…');
    const segmentationResult = segmentCaptions(transcription);
    const seededCaptions = Array.isArray(segmentationResult.captions) && segmentationResult.captions.length
      ? segmentationResult.captions
      : (Array.isArray(transcription.captions) ? transcription.captions : []);
    let refinedCaptions = await refineCaptions(seededCaptions, language);
    refinedCaptions = sanitizeCaptionList(refinedCaptions);

    if (!refinedCaptions.length) {
      const fallbackCaptions = Array.isArray(transcription.captions) ? transcription.captions : [];
      refinedCaptions = sanitizeCaptionList(await refineCaptions(fallbackCaptions, language));
    }

    if (!refinedCaptions.length) {
      throw new Error('Transcription produced empty captions after sanitization');
    }

    const srt = captionsToSrt(refinedCaptions);

    if (Array.isArray(transcription.manualReview) && transcription.manualReview.length) {
      console.warn(`⚠️ Manual review required for ${transcription.manualReview.length} chunk(s)`);
    }
    await job.updateProgress(92);

    // 5. Save captions to DB — done, no burn needed
    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      transcription: transcription.text,
      subtitleSrt: srt,
      previewUrl: previewAsset.url,
      previewPublicId: previewAsset.key,
      audioUrl: audioAsset.url,
      audioPublicId: audioAsset.key,
      transcriptionEngine,
    });

    await job.updateProgress(100);
    console.log(`✅ Transcribe job ${job.id} completed (${refinedCaptions.length} captions)`);
    return { success: true, captions: refinedCaptions };
  } catch (err) {
    console.error(`❌ Transcribe job ${job.id} failed:`, err.message);
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      errorMessage: err.message,
    });
    throw err;
  } finally {
    cleanup(inputPath, audioPath, previewPath);
  }
};
