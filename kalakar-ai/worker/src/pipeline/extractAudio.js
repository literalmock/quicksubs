import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Extracts the audio track from a video file.
 * @param {string} videoPath – path to the input video
 * @returns {Promise<string>} – path to the extracted audio file (wav)
 */
export const extractAudio = (videoPath) => {
  const audioPath = videoPath.replace(path.extname(videoPath), '.wav');

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .audioFilters([
        'highpass=f=80',
        'lowpass=f=7800',
        'loudnorm=I=-16:TP=-1.5:LRA=11',
      ])
      .output(audioPath)
      .on('end', () => {
        console.log('🎵 Audio extracted:', audioPath);
        resolve(audioPath);
      })
      .on('error', (err) => {
        console.error('❌ Audio extraction failed:', err.message);
        reject(err);
      })
      .run();
  });
};
