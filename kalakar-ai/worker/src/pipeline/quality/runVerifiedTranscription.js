import { transcribeAudio } from '../transcribe.js';
import {
  buildTranscriptFromCaptions,
  normalizeCaptionList,
  normalizeCaptionText,
} from './normalizeCaptionText.js';
import { verifyHinglishCaptions } from './hinglishVerifier.js';
import { assessHinglishQuality } from './qualityHeuristics.js';

const chooseCrossCheckProvider = (primaryProvider = 'groq') => {
  const hasElevenLabs = Boolean(String(process.env.ELEVENLABS_API_KEY || '').trim());
  const hasAzure = Boolean(
    String(process.env.AZURE_OPENAI_ENDPOINT || '').trim()
    && String(process.env.AZURE_OPENAI_API_KEY || '').trim()
    && String(process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT || '').trim()
  );

  if (primaryProvider === 'elevenlabs') return hasAzure ? 'azure' : null;
  if (primaryProvider === 'azure') return hasElevenLabs ? 'elevenlabs' : null;
  if (primaryProvider === 'groq') return hasElevenLabs ? 'elevenlabs' : (hasAzure ? 'azure' : null);
  if (hasElevenLabs) return 'elevenlabs';
  if (hasAzure) return 'azure';
  return null;
};

const normalizeResult = (result = {}) => {
  const captions = normalizeCaptionList(result.captions || []);
  const text = normalizeCaptionText(result.text) || buildTranscriptFromCaptions(captions);

  return {
    ...result,
    text,
    captions,
  };
};

const buildApprovedQuality = (provider) => ({
  approved: true,
  overallScore: 1,
  avgCaptionConfidence: 1,
  lowConfidenceCaptions: 0,
  suspiciousTokenCount: 0,
  hasDevanagari: false,
  hasNonAscii: false,
  manualReviewCount: 0,
  primaryProvider: provider,
  secondaryProvider: null,
  verifierProvider: 'not_required',
  verifierModel: null,
  issues: [],
});

export const runVerifiedTranscription = async ({
  audioPath,
  language = 'hinglish',
  provider = 'groq',
}) => {
  const primary = normalizeResult(await transcribeAudio(audioPath, language, provider));
  const primaryManualReview = Array.isArray(primary.manualReview) ? primary.manualReview : [];

  if (String(language || '').toLowerCase() !== 'hinglish') {
    return {
      ...primary,
      quality: buildApprovedQuality(provider),
      audit: {
        primaryProvider: provider,
        primaryText: primary.text,
        primaryCaptions: primary.captions,
        secondaryProvider: null,
        secondaryText: null,
        secondaryCaptions: [],
      },
    };
  }

  const secondaryProvider = chooseCrossCheckProvider(provider);
  let secondary = null;
  let secondaryError = null;

  if (secondaryProvider) {
    try {
      secondary = normalizeResult(await transcribeAudio(audioPath, language, secondaryProvider));
    } catch (err) {
      secondaryError = err.message;
      console.warn(`⚠️ Hinglish cross-check provider ${secondaryProvider} failed: ${err.message}`);
    }
  }

  const verified = await verifyHinglishCaptions({
    primaryCaptions: primary.captions,
    secondaryCaptions: secondary?.captions || [],
    primaryProvider: provider,
    secondaryProvider,
  });

  const quality = assessHinglishQuality({
    verified,
    primaryProvider: provider,
    secondaryProvider,
    secondaryError,
    manualReviewCount: primaryManualReview.length + (secondary?.manualReview?.length || 0),
  });

  return {
    ...primary,
    text: verified.text || primary.text,
    captions: verified.captions?.length ? verified.captions : primary.captions,
    manualReview: [
      ...primaryManualReview,
      ...(Array.isArray(secondary?.manualReview) ? secondary.manualReview : []),
    ],
    quality,
    audit: {
      primaryProvider: provider,
      primaryText: primary.text,
      primaryCaptions: primary.captions,
      secondaryProvider,
      secondaryText: secondary?.text || null,
      secondaryCaptions: secondary?.captions || [],
      verifier: {
        provider: verified.verifierProvider,
        model: verified.verifierModel,
        avgConfidence: verified.avgConfidence,
        issues: verified.issues,
      },
      secondaryError,
    },
  };
};
