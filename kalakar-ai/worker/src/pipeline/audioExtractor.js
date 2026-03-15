import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_DIR = path.resolve(__dirname, '../../tmp/audio');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

export const extractAudioMp3 = async (inputVideoPath) => {
  ensureDir(AUDIO_DIR);

  const baseName = path.basename(inputVideoPath, path.extname(inputVideoPath));
  const outputPath = path.join(AUDIO_DIR, `${baseName}-${Date.now()}.wav`);

  await execFileAsync(ffmpegStatic, [
    '-y',
    '-i',
    inputVideoPath,
    '-vn',
    '-acodec',
    'pcm_s16le',
    '-ar',
    '16000',
    '-ac',
    '1',
    '-af',
    'highpass=f=80,lowpass=f=7800,loudnorm=I=-16:TP=-1.5:LRA=11',
    outputPath,
  ]);

  return outputPath;
};
