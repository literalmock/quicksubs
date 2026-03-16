import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegStatic);

export const createPreview = (inputPath) => {
  const previewPath = inputPath.replace(path.extname(inputPath), '.preview.mp4');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('96k')
      .outputOptions([
        '-vf', 'scale=540:-2',
        '-b:v', '800k',
        '-preset', 'ultrafast',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
      ])
      .output(previewPath)
      .on('end', () => {
        console.log('🎞️ Preview video created:', previewPath);
        resolve(previewPath);
      })
      .on('error', (err) => {
        console.error('❌ Preview generation failed:', err.message);
        reject(err);
      })
      .run();
  });
};
