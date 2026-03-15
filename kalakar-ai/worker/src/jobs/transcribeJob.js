import Video from '../models/Video.js';
import { downloadVideo } from '../pipeline/download.js';
import { extractAudio } from '../pipeline/extractAudio.js';
import { transcribeAudio } from '../pipeline/transcribe.js';
import { captionsToSrt, segmentCaptions } from '../pipeline/segmentCaptions.js';
import { refineCaptions } from '../pipeline/refineCaptions.js';
import { cleanup } from '../utils/cleanup.js';

/**
 * Transcription pipeline (initial upload):
 *   download video → FFmpeg extract audio → transcribe → segment captions → save DB
 *
 * No burn step — captions go straight to the editor.
 * Burn only happens when the user explicitly exports (render job).
 */
export const processTranscribeJob = async (job) => {
  const { videoId, originalUrl, language = 'hinglish' } = job.data;
  console.log(`\n🎬 Transcribe job ${job.id} | videoId: ${videoId} | language: ${language}`);

  let inputPath, audioPath;

  try {
    await Video.findByIdAndUpdate(videoId, { status: 'processing' });
    await job.updateProgress(10);

    // 1. Download full video
    console.log('⬇️  Downloading video…');
    inputPath = await downloadVideo(originalUrl);
    await job.updateProgress(25);

    // 2. Extract audio with FFmpeg (high-quality local extraction)
    console.log('🎵 Extracting audio…');
    audioPath = await extractAudio(inputPath);
    await job.updateProgress(40);

    // 3. Transcribe with Whisper
    console.log('🧠 Transcribing audio…');
    const transcription = await transcribeAudio(audioPath, language);
    await job.updateProgress(70);

    // 4. Segment into captions
    console.log('✂️  Segmenting captions…');
    const { captions } = segmentCaptions(transcription);
    const refinedCaptions = await refineCaptions(captions, language);
    const srt = captionsToSrt(refinedCaptions);
    await job.updateProgress(90);

    // 5. Save captions to DB — done, no burn needed
    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      transcription: transcription.text,
      subtitleSrt: srt,
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
    cleanup(inputPath, audioPath);
  }
};
