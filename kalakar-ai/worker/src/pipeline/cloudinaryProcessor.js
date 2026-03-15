import { transcribeAudio } from './transcribe.js';

export const processWithCloudinary = async ({
  audioPath,
  language = 'hinglish',
  transcriptionProvider = 'groq',
}) => {
  return transcribeAudio(audioPath, language, transcriptionProvider);
};
