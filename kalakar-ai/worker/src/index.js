import 'dotenv/config';
import { Worker } from 'bullmq';
import { connectDB } from './config/db.js';
import { redisConnection } from './config/redis.js';
import './config/cloudinary.js';

import { processTranscribeJob } from './jobs/transcribeJob.js';
import { processRenderJob } from './jobs/renderJob.js';

// ── Job Router ──────────────────────────────────────
const processJob = (job) => {
  if (job.name === 'render-subtitles') return processRenderJob(job);
  return processTranscribeJob(job);
};

// ── Start Worker ────────────────────────────────────
const start = async () => {
  await connectDB();

  const worker = new Worker('video-processing', processJob, {
    connection: redisConnection,
    concurrency: 2,
    limiter: { max: 5, duration: 60000 },
  });

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('🏭 Worker listening for video-processing jobs…');
};

start();
