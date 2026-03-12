import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

// Use the bundled static binary which includes libass (for the subtitles filter)
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Burns subtitles into the video using FFmpeg.
 * - .ass files → uses the `ass=` filter which respects all ASS styles (themes, colors, etc.)
 * - .srt files → falls back to `subtitles=` with a basic force_style
 * @param {string} videoPath – path to the input video
 * @param {string} srtPath – path to the subtitle file (.ass or .srt)
 * @returns {Promise<string>} – path to the output video with burned subtitles
 */
export const burnSubtitles = (videoPath, srtPath) => {
  const outputPath = videoPath.replace(
    path.extname(videoPath),
    `_captioned${path.extname(videoPath)}`
  );

  // Resolve real path — on macOS /var is a symlink to /private/var,
  // which causes the subtitles filter to fail with "Invalid argument"
  const realSrtPath = fs.realpathSync(srtPath);

  // Escape special characters in the path for FFmpeg filter
  const escapedPath = realSrtPath
    .replace(/\\/g, '\\\\\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");

  const ext = path.extname(srtPath).toLowerCase();
  const filter =
    ext === '.ass'
      ? `ass='${escapedPath}'`
      : `subtitles='${escapedPath}':force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=30'`;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoFilters(filter)
      .outputOptions(['-c:v libx264', '-c:a copy', '-preset ultrafast', '-crf 23', '-threads 0', '-movflags +faststart'])
      .output(outputPath)
      .on('end', () => {
        console.log('🎬 Subtitles burned:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ Subtitle burn failed:', err.message);
        reject(err);
      })
      .run();
  });
};
