import { generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  buildTranscriptFromCaptions,
  containsDevanagari,
  getOverlappingCaptions,
  normalizeCaptionList,
  normalizeCaptionText,
} from './normalizeCaptionText.js';

const googleKey = String(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || ''
).trim();
const deepseekKey = String(process.env.DEEPSEEK_API_KEY || '').trim();
const requestedProvider = String(process.env.HINGLISH_VERIFIER_PROVIDER || '').toLowerCase().trim();

const google = googleKey ? createGoogleGenerativeAI({ apiKey: googleKey }) : null;
const deepseek = deepseekKey ? createDeepSeek({ apiKey: deepseekKey }) : null;

const resolveVerifierProvider = () => {
  if (requestedProvider === 'gemini' && google) return 'gemini';
  if (requestedProvider === 'deepseek' && deepseek) return 'deepseek';
  if (google) return 'gemini';
  if (deepseek) return 'deepseek';
  return 'none';
};

const VERIFIER_PROVIDER = resolveVerifierProvider();
const MODEL = process.env.HINGLISH_VERIFIER_MODEL
  || (VERIFIER_PROVIDER === 'deepseek' ? 'deepseek-chat' : 'gemini-2.5-pro');
const BATCH_SIZE = 10;

const SYSTEM_PROMPT = `You are a strict Hinglish subtitle verifier.

Your job is to produce accurate Roman Hinglish subtitles from noisy ASR output.

Rules:
- Final output must be Roman script only. No Devanagari.
- Preserve English words, names, acronyms, and numbers exactly when correct.
- Keep the spoken meaning and wording as close as possible.
- Do not summarize, rewrite, or add extra words.
- Use the primary captions as the timing source and preserve start/end exactly.
- Use the secondary captions only to cross-check doubtful words.
- If you are unsure, keep the safest wording close to the evidence and lower confidence.

Return only valid JSON in this shape:
{
  "captions": [
    { "start": number, "end": number, "text": string, "confidence": number }
  ],
  "needs_manual_review": boolean,
  "issues": ["string"]
}`;

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    const match = String(value || '').match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const buildFallbackCaptions = (captions = []) =>
  normalizeCaptionList(captions).map((caption) => ({
    ...caption,
    confidence: containsDevanagari(caption.text) ? 0.35 : 0.55,
  }));

const getVerifierModel = () => {
  if (VERIFIER_PROVIDER === 'gemini' && google) {
    return google(MODEL);
  }

  if (VERIFIER_PROVIDER === 'deepseek' && deepseek) {
    return deepseek(MODEL);
  }

  return null;
};

const verifyBatch = async ({
  batch,
  secondaryCaptions,
  primaryProvider,
  secondaryProvider,
}) => {
  const batchStart = batch[0]?.start || 0;
  const batchEnd = batch[batch.length - 1]?.end || batchStart;
  const secondaryContext = getOverlappingCaptions(secondaryCaptions, batchStart, batchEnd);

  const model = getVerifierModel();
  if (!model) {
    throw new Error('No verifier model configured');
  }

  const { text } = await generateText({
    model,
    temperature: 0,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify({
      primary_provider: primaryProvider,
      secondary_provider: secondaryProvider || null,
      primary_transcript_excerpt: buildTranscriptFromCaptions(batch),
      secondary_transcript_excerpt: buildTranscriptFromCaptions(secondaryContext),
      primary_captions: batch.map((caption) => ({
        start: Number(caption.start.toFixed(3)),
        end: Number(caption.end.toFixed(3)),
        text: normalizeCaptionText(caption.text),
      })),
      secondary_captions: secondaryContext,
    }),
  });

  const parsed = safeJsonParse(text);
  if (!parsed || !Array.isArray(parsed.captions) || parsed.captions.length !== batch.length) {
    throw new Error('Verifier returned invalid caption payload');
  }

  return {
    captions: parsed.captions.map((caption, index) => ({
      ...batch[index],
      start: batch[index].start,
      end: batch[index].end,
      text: normalizeCaptionText(caption.text || batch[index].text),
      confidence: Math.max(0, Math.min(1, Number(caption.confidence) || 0)),
    })),
    needsManualReview: Boolean(parsed.needs_manual_review),
    issues: Array.isArray(parsed.issues) ? parsed.issues.map((issue) => normalizeCaptionText(issue)).filter(Boolean) : [],
  };
};

export const verifyHinglishCaptions = async ({
  primaryCaptions = [],
  secondaryCaptions = [],
  primaryProvider = 'groq',
  secondaryProvider = null,
}) => {
  const normalizedPrimary = normalizeCaptionList(primaryCaptions);
  if (!normalizedPrimary.length) {
    return {
      captions: [],
      text: '',
      avgConfidence: 0,
      needsManualReview: true,
      issues: ['No primary captions to verify'],
      verifierProvider: VERIFIER_PROVIDER,
      verifierModel: MODEL,
    };
  }

  if (VERIFIER_PROVIDER === 'none') {
    const fallback = buildFallbackCaptions(normalizedPrimary);
    return {
      captions: fallback,
      text: buildTranscriptFromCaptions(fallback),
      avgConfidence: Number((fallback.reduce((sum, caption) => sum + caption.confidence, 0) / fallback.length).toFixed(3)),
      needsManualReview: true,
      issues: ['No Hinglish verifier configured'],
      verifierProvider: VERIFIER_PROVIDER,
      verifierModel: MODEL,
    };
  }

  try {
    const batches = chunk(normalizedPrimary, BATCH_SIZE);
    const verified = [];
    const issues = [];
    let needsManualReview = false;

    for (const batch of batches) {
      const result = await verifyBatch({
        batch,
        secondaryCaptions,
        primaryProvider,
        secondaryProvider,
      });
      verified.push(...result.captions);
      issues.push(...result.issues);
      needsManualReview = needsManualReview || result.needsManualReview;
    }

    const avgConfidence = verified.length
      ? verified.reduce((sum, caption) => sum + caption.confidence, 0) / verified.length
      : 0;

    return {
      captions: verified,
      text: buildTranscriptFromCaptions(verified),
      avgConfidence: Number(avgConfidence.toFixed(3)),
      needsManualReview,
      issues: [...new Set(issues)],
      verifierProvider: VERIFIER_PROVIDER,
      verifierModel: MODEL,
    };
  } catch (err) {
    const fallback = buildFallbackCaptions(normalizedPrimary);
    return {
      captions: fallback,
      text: buildTranscriptFromCaptions(fallback),
      avgConfidence: Number((fallback.reduce((sum, caption) => sum + caption.confidence, 0) / fallback.length).toFixed(3)),
      needsManualReview: true,
      issues: [`Verifier failed: ${err.message}`],
      verifierProvider: VERIFIER_PROVIDER,
      verifierModel: MODEL,
    };
  }
};
