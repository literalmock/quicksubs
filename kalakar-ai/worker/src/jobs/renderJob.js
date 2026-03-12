import fs from 'fs';
import path from 'path';
import Video from '../models/Video.js';
import { downloadVideo } from '../pipeline/download.js';
import { burnSubtitles } from '../pipeline/burnSubtitles.js';
import { uploadProcessed } from '../pipeline/upload.js';
import { cleanup } from '../utils/cleanup.js';

/**
 * Render-only pipeline (editor export):
 * download → write subtitle file → burn subs → upload
 */
export const processRenderJob = async (job) => {
  const { videoId, originalUrl, ass, srt } = job.data;
  console.log(`\n🎬 Render job ${job.id} | videoId: ${videoId}`);

  let inputPath, subPath, outputPath;

  try {
    await Video.findByIdAndUpdate(videoId, { status: 'processing' });
    await job.updateProgress(10);

    // 1. Download original video
    console.log('⬇️  Downloading original video…');
    inputPath = await downloadVideo(originalUrl);
    await job.updateProgress(30);

    // 2. Write subtitle file (prefer ASS for styled output)
    const tmpDir = path.dirname(inputPath);
    const stamp = `${Date.now()}_${videoId}`;

    if (ass) {
      subPath = path.join(tmpDir, `subs_${stamp}.ass`);
      fs.writeFileSync(subPath, ass, 'utf-8');
    } else {
      subPath = path.join(tmpDir, `subs_${stamp}.srt`);
      fs.writeFileSync(subPath, srt, 'utf-8');
    }
    await job.updateProgress(40);

    // 3. Burn subtitles
    console.log('🔥 Burning subtitles…');
    outputPath = await burnSubtitles(inputPath, subPath);
    await job.updateProgress(75);

    // 4. Upload rendered video
    console.log('☁️  Uploading rendered video…');
    const { url, publicId } = await uploadProcessed(outputPath);
    await job.updateProgress(95);

    // 5. Update DB + invalidate Redis cache
    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      outputUrl: url,
      outputPublicId: publicId,
    });

    // Invalidate any cached status so the next poll picks up outputUrl
    try {
      const { redisConnection } = await import('../config/redis.js');
      const video = await Video.findById(videoId).lean();
      if (video?.userId) {
        await redisConnection.del(`video:${videoId}:${video.userId}`);
      }
    } catch { /* cache invalidation is best-effort */ }

    await job.updateProgress(100);
    console.log(`✅ Render job ${job.id} completed`);
    return { success: true, outputUrl: url };
  } catch (err) {
    console.error(`❌ Render job ${job.id} failed:`, err.message);
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      errorMessage: err.message,
    });
    throw err;
  } finally {
    cleanup(inputPath, subPath, outputPath);
  }
};
