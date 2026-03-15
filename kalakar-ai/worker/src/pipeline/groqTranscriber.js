import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = 'whisper-large-v3';

export const buildWhisperParams = (language) => {
  switch (language) {
    case 'english':
      return {
        language: 'en',
        prompt: 'Transcribe verbatim. Do not translate or paraphrase. Preserve names, numbers and slang.',
      };
    case 'hindi':
      return {
        language: 'hi',
        prompt:
          'Transcribe verbatim in Hindi. Do not translate meaning. Preserve spoken wording and proper nouns.',
      };
    case 'hinglish':
    default:
      return {
        // Let Whisper auto-detect mixed Hindi+English for better fidelity.
        prompt:
          'Hinglish audio. Transcribe exactly what is spoken. Do not translate or summarize. ' +
          'Keep code-switching intact, including Hindi words, English words, names, numbers, and fillers.',
      };
  }
};

const buildPayload = (audioPath, params, withTask = true) => ({
  file: fs.createReadStream(audioPath),
  model: MODEL,
  ...(withTask ? { task: 'transcribe' } : {}),
  temperature: 0,
  response_format: 'verbose_json',
  timestamp_granularities: ['word', 'segment'],
  ...params,
});

export const transcribeGroqChunk = async (audioPath, params) => {
  try {
    const result = await client.audio.transcriptions.create(buildPayload(audioPath, params, true));
    return {
      text: result?.text || '',
      words: result?.words ?? [],
      segments: result?.segments ?? [],
    };
  } catch (err) {
    const message = String(err?.message || '').toLowerCase();
    if (!message.includes('unknown param') || !message.includes('task')) {
      throw err;
    }

    const fallback = await client.audio.transcriptions.create(buildPayload(audioPath, params, false));
    return {
      text: fallback?.text || '',
      words: fallback?.words ?? [],
      segments: fallback?.segments ?? [],
    };
  }
};
