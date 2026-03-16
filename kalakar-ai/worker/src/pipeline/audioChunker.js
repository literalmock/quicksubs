import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHUNKS_ROOT_DIR = path.resolve(__dirname, '../../tmp/chunks');
const FFPROBE_BIN = ffmpegStatic ? path.join(path.dirname(ffmpegStatic), 'ffprobe') : 'ffprobe';

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const listChunkFiles = (chunkDir) =>
  fs
    .readdirSync(chunkDir)
    .filter((name) => /^chunk_\d+\.wav$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => path.join(chunkDir, name));

const getAudioDuration = async (audioPath) => {
  const { stdout } = await execFileAsync(FFPROBE_BIN, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    audioPath,
  ]);

  const duration = Number(String(stdout || '').trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Unable to determine audio duration for chunking');
  }

  return duration;
};

export const splitAudioIntoChunks = async (audioPath, segmentSeconds = 30, overlapSeconds = 0) => {
  ensureDir(CHUNKS_ROOT_DIR);

  const runDir = path.join(CHUNKS_ROOT_DIR, `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  ensureDir(runDir);

  const chunkPattern = path.join(runDir, 'chunk_%03d.wav');

  if (overlapSeconds > 0 && segmentSeconds > overlapSeconds) {
    const duration = await getAudioDuration(audioPath);
    const step = segmentSeconds - overlapSeconds;
    const chunks = [];

    for (let start = 0, index = 0; start < duration - 0.05; start += step, index += 1) {
      const outputFile = path.join(runDir, `chunk_${String(index).padStart(3, '0')}.wav`);
      const window = Math.min(segmentSeconds, duration - start);

      await execFileAsync(ffmpegStatic, [
        '-y',
        '-ss',
        String(start),
        '-t',
        String(window),
        '-i',
        audioPath,
        '-acodec',
        'pcm_s16le',
        '-ar',
        '16000',
        '-ac',
        '1',
        outputFile,
      ]);

      chunks.push({
        file: outputFile,
        offset: start,
        index,
      });
    }

    if (!chunks.length) {
      throw new Error('No audio chunks were generated');
    }

    return { chunkDir: runDir, chunks };
  }

  await execFileAsync(ffmpegStatic, [
    '-y',
    '-i',
    audioPath,
    '-f',
    'segment',
    '-segment_time',
    String(segmentSeconds),
    '-c:a',
    'pcm_s16le',
    '-ar',
    '16000',
    '-ac',
    '1',
    chunkPattern,
  ]);

  const chunkFiles = listChunkFiles(runDir);
  if (!chunkFiles.length) {
    throw new Error('No audio chunks were generated');
  }

  const chunks = chunkFiles.map((file, index) => ({
    file,
    offset: index * segmentSeconds,
    index,
  }));

  return { chunkDir: runDir, chunks };
};
