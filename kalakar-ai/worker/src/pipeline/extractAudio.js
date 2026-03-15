import { extractAudioMp3 } from './audioExtractor.js';

/**
 * Extract audio track from video into /worker/tmp/audio as WAV @16kHz mono.
 */
export const extractAudio = async (videoPath) => {
  const audioPath = await extractAudioMp3(videoPath);
  console.log('Audio extracted:', audioPath);
  return audioPath;
};
