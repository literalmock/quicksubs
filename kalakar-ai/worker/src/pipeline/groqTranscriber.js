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
        // Significantly improved Hinglish prompt from Turn 1
        prompt: `Hinglish audio: mix of Hindi and English.
Examples: 
- "Mujhe ye video bahut pasand aaya"
- "Next level growth ke liye steps follow karein"
- "Kya aap ready hain for the challenge?"
Transcribe exactly what is spoken. Keep Hindi words in Roman script. Do NOT translate to English. Maintain all code-switching, names, and numbers.`,
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
    console.log('--- RAW GROQ RESPONSE ---');
    console.log(JSON.stringify({ text: result.text, segmentCount: result.segments?.length, wordCount: result.words?.length }, null, 2));
    return {
      text: result?.text || '',
      words: result?.words ?? [],
      segments: result?.segments ?? [],
    };
  } catch (err) {
    const message = String(err?.message || '').toLowerCase();
    // Some endpoints don't support the 'task' parameter
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
