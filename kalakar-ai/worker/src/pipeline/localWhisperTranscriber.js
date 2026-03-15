import fs from 'fs';
import path from 'path';

const LOCAL_WHISPER_URL = (process.env.LOCAL_WHISPER_URL || 'http://localhost:8787').replace(/\/$/, '');

/**
 * Transcribes an audio chunk via the local Faster-Whisper HTTP server.
 * The server exposes an OpenAI-compatible /v1/audio/transcriptions endpoint.
 *
 * @param {string} audioPath – path to a WAV/MP3 audio chunk
 * @param {{ language?: string, prompt?: string }} params – whisper params
 * @returns {Promise<{ text: string, words: Array, segments: Array }>}
 */
export const transcribeLocalChunk = async (audioPath, params) => {
  const bytes = fs.readFileSync(audioPath);
  const fileName = path.basename(audioPath);

  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'audio/wav' }), fileName);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  if (params?.language) form.append('language', params.language);
  if (params?.prompt) form.append('prompt', params.prompt);

  const url = `${LOCAL_WHISPER_URL}/v1/audio/transcriptions`;
  const response = await fetch(url, { method: 'POST', body: form });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Local Whisper transcription failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  return {
    text: data.text || '',
    words: Array.isArray(data.words) ? data.words : [],
    segments: Array.isArray(data.segments) ? data.segments : [],
  };
};
