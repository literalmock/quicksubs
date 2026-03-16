import OpenAI from 'openai';

const provider = (process.env.REFINEMENT_PROVIDER || 'groq').toLowerCase().trim();
const groqKey = process.env.GROQ_API_KEY;

// Keep Groq client for fallback
const groqClient = groqKey ? new OpenAI({
  apiKey: groqKey,
  baseURL: 'https://api.groq.com/openai/v1',
}) : null;

const MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';

const BATCH_SIZE = 15;

const EXPERT_SYSTEM_PROMPT = `You are a precise subtitle cleaner.

Goal: MAXIMUM transcription accuracy in Hinglish (Roman Hindi using English letters), NOT flashy social-media styling.

Very important rules:
- DO NOT summarize, shorten, or rephrase sentences.
- Keep wording as close as possible to the input text.
- DO NOT add ALL CAPS styling or extra emphasis words.
- DO NOT invent or guess new words.
- Only fix very obvious spelling mistakes in Hinglish (e.g., "njrandaaj" → "nazarandaaz").
- Keep the same language and meaning as the input.
- Do NOT translate between Hindi and English, only keep Hindi in Roman script.
- Keep 1–3 short lines per caption, but DO NOT change the overall timing logic.

Output format:
- Return ONLY a valid JSON array of objects: {"start": number, "end": number, "text": string}.
- Preserve the "start" and "end" values you receive (small numeric rounding is OK).
- "text" should be simple, accurate Hinglish with normal capitalization (no extra ALL CAPS styling).`;

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

const refineBatchWithModel = async (captions, language) => {
  const payload = captions.map((c) => ({
    start: Number(c.start.toFixed(3)),
    end: Number(c.end.toFixed(3)),
    text: c.text
  }));

  try {
    let parsed = null;

    if (provider !== 'none' && groqClient) {
      const response = await groqClient.chat.completions.create({
        model: MODEL,
        temperature: 0.1,
        messages: [
          { role: 'system', content: EXPERT_SYSTEM_PROMPT },
          { role: 'user', content: `Refine these captions for ${language}. JSON only.\n\nInput:\n${JSON.stringify(payload)}` },
        ],
      });
      parsed = safeJsonParse(response.choices?.[0]?.message?.content);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return captions;
    }

    return parsed.map(c => ({
      start: Number(c.start) || 0,
      end: Number(c.end) || 0,
      text: String(c.text || '').trim(),
      lines: String(c.text || '').split('\n').length
    }));

  } catch (err) {
    console.warn(`🚨 Refiner failed: ${err.message}`);
    return captions;
  }
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const refineCaptions = async (captions, language = 'hinglish') => {
  if (!Array.isArray(captions) || captions.length === 0) return captions;
  if (provider === 'none' || !groqClient) {
    console.log(`✨ Caption refinement disabled (provider=${provider}, groqClient=${!!groqClient}) — returning raw captions`);
    return captions;
  }

  console.log(`✨ Refining ${captions.length} captions using ${provider} (${MODEL})…`);

  try {
    const batches = chunk(captions, BATCH_SIZE);
    const output = [];

    for (const batch of batches) {
      const refined = await refineBatchWithModel(batch, language);
      output.push(...refined);
    }

    return output.sort((a, b) => a.start - b.start);
  } catch (err) {
    console.warn('⚠️ Caption refinement skipped:', err.message);
    return captions;
  }
};
