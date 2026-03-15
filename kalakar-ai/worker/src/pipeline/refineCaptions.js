import OpenAI from 'openai';

const apiKey = process.env.GROQ_API_KEY;
const refineEnabled = Boolean(apiKey);

const client = refineEnabled
  ? new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

const MODEL_CANDIDATES = [
  process.env.GROQ_TEXT_MODEL,
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
].filter(Boolean);
const BATCH_SIZE = 40;

const cleanRomanText = (value) => {
  const text = String(value || '');
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/([a-zA-Z])\1{3,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
};

const languageRule = (language) => {
  if (language === 'english') return 'Keep all text in natural English.';
  if (language === 'hindi') {
    return 'Keep Hindi speech in Roman/Latin script only. Do not use Devanagari.';
  }
  return (
    'For Hinglish: keep English words in English, and keep Hindi words in Roman Hindi. ' +
    'Do not translate meaning between languages.'
  );
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    const match = String(value).match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const refineBatchWithModel = async (captions, language, model) => {
  if (!client) return captions;

  const payload = captions.map((c, i) => ({ i, text: cleanRomanText(c.text) }));

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'You clean ASR subtitle text for spelling/recognition errors. ' +
          'Do minimal edits only. Never translate meaning. Preserve language and tone. ' +
          'Return only valid JSON array with objects: {"i": number, "text": string}.',
      },
      {
        role: 'user',
        content:
          `Fix the caption text with maximum accuracy while preserving meaning exactly. ${languageRule(language)} ` +
          'Keep sentence boundaries as-is. Do not merge or split items.\n\n' +
          `Input JSON:\n${JSON.stringify(payload)}`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content || '[]';
  const parsed = safeJsonParse(content);
  if (!Array.isArray(parsed) || parsed.length !== payload.length) return captions;

  const byIndex = new Map(parsed.map((item) => [Number(item.i), cleanRomanText(item.text)]));
  return captions.map((c, idx) => ({
    ...c,
    text: byIndex.get(idx) || cleanRomanText(c.text),
  }));
};

const refineBatch = async (captions, language) => {
  let lastError = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const refined = await refineBatchWithModel(captions, language, model);
      console.log(`✨ Caption refinement model: ${model}`);
      return refined;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Refinement model failed (${model}): ${err.message}`);
    }
  }

  if (lastError) {
    console.warn('⚠️ All refinement models failed, using cleaned ASR output');
  }

  return captions.map((c) => ({ ...c, text: cleanRomanText(c.text) }));
};

export const refineCaptions = async (captions, language = 'hinglish') => {
  if (!Array.isArray(captions) || captions.length === 0) return captions;
  if (!client) return captions;

  try {
    const batches = chunk(captions, BATCH_SIZE);
    const output = [];

    for (const batch of batches) {
      const refined = await refineBatch(batch, language);
      output.push(...refined);
    }

    return output;
  } catch (err) {
    console.warn('⚠️ Caption refinement skipped:', err.message);
    return captions;
  }
};
