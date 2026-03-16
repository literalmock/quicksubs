import { containsDevanagari, normalizeCaptionText } from './normalizeCaptionText.js';

const APOSTROPHE_ARTIFACT_REGEX = /[A-Za-z]+['`][A-Za-z]+/;
const MIXED_CASE_REGEX = /\b[a-z]+[A-Z][a-zA-Z]*\b/;
const REPEATED_CHAR_REGEX = /([A-Za-z])\1{2,}/;
const NON_ASCII_REGEX = /[^\x00-\x7F]/;

const MIN_AVG_CONFIDENCE = Math.max(
  0.5,
  Math.min(0.99, Number(process.env.HINGLISH_MIN_AVG_CONFIDENCE) || 0.86),
);
const MAX_LOW_CONFIDENCE_CAPTIONS = Math.max(
  0,
  Number.parseInt(process.env.HINGLISH_MAX_LOW_CONFIDENCE_CAPTIONS || '1', 10),
);

const tokenize = (text) => normalizeCaptionText(text).match(/[A-Za-z0-9'%-]+/g) || [];

const countSuspiciousTokens = (captions = []) =>
  captions.reduce((count, caption) => {
    const tokens = tokenize(caption.text);
    return count + tokens.filter((token) =>
      APOSTROPHE_ARTIFACT_REGEX.test(token)
      || MIXED_CASE_REGEX.test(token)
      || REPEATED_CHAR_REGEX.test(token)
    ).length;
  }, 0);

export const assessHinglishQuality = ({
  verified,
  primaryProvider,
  secondaryProvider = null,
  secondaryError = null,
  manualReviewCount = 0,
}) => {
  const captions = Array.isArray(verified?.captions) ? verified.captions : [];
  const avgCaptionConfidence = Number(verified?.avgConfidence || 0);
  const lowConfidenceCaptions = captions.filter((caption) => Number(caption.confidence || 0) < 0.75).length;
  const suspiciousTokenCount = countSuspiciousTokens(captions);
  const tokenCount = captions.reduce((sum, caption) => sum + tokenize(caption.text).length, 0);
  const hasDevanagari = captions.some((caption) => containsDevanagari(caption.text));
  const hasNonAscii = captions.some((caption) => NON_ASCII_REGEX.test(String(caption.text || '')));

  const issues = [...new Set([
    ...(Array.isArray(verified?.issues) ? verified.issues : []),
    ...(secondaryError ? [`Cross-check provider failed: ${secondaryError}`] : []),
  ])];

  if (manualReviewCount > 0) issues.push(`ASR flagged ${manualReviewCount} chunk(s) for manual review`);
  if (hasDevanagari) issues.push('Verified captions still contain Devanagari');
  if (hasNonAscii) issues.push('Verified captions still contain non-ASCII text');
  if (avgCaptionConfidence < MIN_AVG_CONFIDENCE) {
    issues.push(`Average Hinglish confidence ${avgCaptionConfidence.toFixed(2)} is below ${MIN_AVG_CONFIDENCE.toFixed(2)}`);
  }
  if (lowConfidenceCaptions > MAX_LOW_CONFIDENCE_CAPTIONS) {
    issues.push(`${lowConfidenceCaptions} caption(s) are still low-confidence`);
  }
  if (tokenCount > 0 && suspiciousTokenCount / tokenCount > 0.06) {
    issues.push('Too many suspicious Romanized spellings remain after verification');
  }

  let overallScore = avgCaptionConfidence;
  overallScore -= suspiciousTokenCount / Math.max(tokenCount, 1);
  if (manualReviewCount > 0) overallScore -= 0.3;
  if (hasDevanagari || hasNonAscii) overallScore -= 0.25;
  if (lowConfidenceCaptions > MAX_LOW_CONFIDENCE_CAPTIONS) overallScore -= 0.15;
  overallScore = Math.max(0, Math.min(1, overallScore));

  const approved = captions.length > 0
    && manualReviewCount === 0
    && !hasDevanagari
    && !hasNonAscii
    && avgCaptionConfidence >= MIN_AVG_CONFIDENCE
    && lowConfidenceCaptions <= MAX_LOW_CONFIDENCE_CAPTIONS
    && suspiciousTokenCount / Math.max(tokenCount, 1) <= 0.06;

  return {
    approved,
    overallScore: Number(overallScore.toFixed(3)),
    avgCaptionConfidence: Number(avgCaptionConfidence.toFixed(3)),
    lowConfidenceCaptions,
    suspiciousTokenCount,
    hasDevanagari,
    hasNonAscii,
    manualReviewCount,
    primaryProvider,
    secondaryProvider,
    verifierProvider: verified?.verifierProvider || 'none',
    verifierModel: verified?.verifierModel || null,
    issues: [...new Set(issues)],
  };
};
