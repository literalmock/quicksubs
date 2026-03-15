import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = 'whisper-large-v3';

/**
 * Returns the Whisper API params for the given language.
 */
const whisperParams = (language) => {
  switch (language) {
    case 'english':
      return {
        language: 'en',
        prompt: 'The following audio is in English. Output natural English text only.',
      };
    case 'hindi':
      return {
        language: 'hi',
        prompt:
          'This audio is in Hindi. Output Hindi speech in Roman/Latin letters only. ' +
          'Do not use Devanagari script. Do not translate meaning to English. Keep wording faithful to speech.',
      };
    case 'hinglish':
    default:
      // For mixed Hindi+English speech, hinting 'hi' plus task:'transcribe'
      // reduces meaning-translation into English while still preserving English words.
      return {
        language: 'hi',
        prompt:
          'Hinglish conversation mixing Hindi and English. TRANSCRIBE exactly what is spoken; do not translate meaning. ' +
          'Output everything in Roman/Latin letters only. Keep English words exactly as spoken in English. ' +
          'For Hindi speech, write Hindi pronunciation in Roman letters (example: hame aage badhna hai). ' +
          'Do not use Devanagari. Do not translate Hindi phrases into English meaning. ' +
          'Examples: yaar, bhai, kya, hai, nahi, aur, chalte hain, kaise, theek hai, abhi, phir, toh, ' +
          'matlab, bilkul, achha, suno, dekho, kal, aaj, zyada, thoda.',
      };
  }
};

/**
 * Transcribes audio using Groq Whisper with word + segment timestamps.
 * Returns the raw verbose_json result for downstream caption segmentation.
 *
 * @param {string} audioPath – path to the audio file
 * @param {'english'|'hindi'|'hinglish'} language – audio language hint
 * @returns {Promise<{ text: string, words: Array, segments: Array }>}
 */
export const transcribeAudio = async (audioPath, language = 'hinglish') => {
  const params = whisperParams(language);
  console.log(`🧠 Sending audio to Groq Whisper [language: ${language}]…`);

  const result = await client.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: MODEL,
    temperature: 0,
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
    ...params,
  });

  console.log(`🧠 Transcription complete — ${result.segments?.length ?? 0} segments, ${result.words?.length ?? 0} words`);

  return {
    text: result.text,
    words: result.words ?? [],
    segments: result.segments ?? [],
  };
};
