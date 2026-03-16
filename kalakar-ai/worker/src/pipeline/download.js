import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ensureTmpDir = () => {
  const tmpDir = path.join(os.tmpdir(), 'quicksubs');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
};

const isLocalPath = (value) => {
  if (!value) return false;
  if (value.startsWith('file://')) return true;
  return path.isAbsolute(value) || fs.existsSync(value);
};

const downloadToFile = (url, filePath) => {
  const writer = fs.createWriteStream(filePath);
  return axios({ url, method: 'GET', responseType: 'stream' }).then(
    (response) =>
      new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      }),
  );
};

/**
 * Downloads a video from a URL to a temporary file.
 * @param {string} url – Cloudinary video URL
 * @returns {Promise<string>} – path to downloaded file
 */
export const downloadVideo = async (url) => {
  if (!url) {
    throw new Error('downloadVideo: URL or path is missing');
  }

  console.log(`📥 downloadVideo: Processing source: ${url}`);

  try {
    const localSource = url.startsWith('file://') ? new URL(url) : null;
    const sourcePath = localSource ? localSource.pathname : url;
    const ext = path.extname(sourcePath || '') || '.mp4';
    const filePath = path.join(ensureTmpDir(), `input_${Date.now()}${ext}`);

    if (isLocalPath(sourcePath)) {
      console.log(`📂 downloadVideo: Using local file: ${sourcePath}`);
      fs.copyFileSync(sourcePath, filePath);
      return filePath;
    }

    console.log(`🌐 downloadVideo: Downloading from URL: ${url}`);
    return await downloadToFile(url, filePath);
  } catch (err) {
    if (err.code === 'ERR_INVALID_URL' || err.message?.includes('Invalid URL')) {
      throw new Error(`downloadVideo: Invalid URL or malformed local path: "${url}"`);
    }
    throw err;
  }
};

/**
 * Downloads just the audio track from a Cloudinary video URL.
 * Uses Cloudinary's on-the-fly transformation to extract audio.
 * WAV (f_wav) gives the best transcription quality; falls back to
 * MP3 (f_mp3) if the WAV download fails.
 * @param {string} videoUrl – original Cloudinary video URL
 * @returns {Promise<string>} – path to downloaded audio file
 */
export const downloadAudio = async (videoUrl) => {
  // Prefer WAV for maximum Whisper accuracy (uncompressed, no artifacts)
  const wavUrl = videoUrl.replace('/upload/', '/upload/f_wav/');
  const wavPath = path.join(ensureTmpDir(), `audio_${Date.now()}.wav`);
  console.log('🎵 Fetching WAV audio from Cloudinary…');

  try {
    return await downloadToFile(wavUrl, wavPath);
  } catch {
    // Fallback to MP3 if WAV transform unavailable
    console.log('⚠️  WAV failed, falling back to MP3…');
    const mp3Url = videoUrl.replace('/upload/', '/upload/f_mp3/');
    const mp3Path = wavPath.replace('.wav', '.mp3');
    return downloadToFile(mp3Url, mp3Path);
  }
};
