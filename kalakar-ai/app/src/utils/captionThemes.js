/**
 * Caption style themes for TikTok / Reels style captions.
 *
 * Each theme exposes:
 *   fontFamily, fontSize, fontWeight, color, stroke, strokeWidth,
 *   textTransform, wordSplit, wordsPerLine, background, letterSpacing
 */

export const CAPTION_THEMES = {
  classic: {
    label: 'Classic',
    fontFamily: '"Poppins", sans-serif',
    fontSize: 52,
    fontWeight: '700',
    color: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    textTransform: 'none',
    wordSplit: false,
    wordsPerLine: 3,
    background: null,
    letterSpacing: '0px',
  },
  viral: {
    label: 'Viral',
    fontFamily: '"Anton", "Impact", sans-serif',
    fontSize: 72,
    fontWeight: '900',
    color: '#FFE600',
    stroke: '#000000',
    strokeWidth: 5,
    textTransform: 'uppercase',
    wordSplit: true,
    wordsPerLine: 2,
    background: null,
    letterSpacing: '1px',
  },
  mrbeast: {
    label: 'MrBeast',
    fontFamily: '"Impact", "Anton", sans-serif',
    fontSize: 76,
    fontWeight: '900',
    color: '#FFFFFF',
    stroke: '#000000',
    strokeWidth: 4,
    textTransform: 'uppercase',
    wordSplit: true,
    wordsPerLine: 1,
    background: '#FFD700',
    letterSpacing: '2px',
  },
};

export const THEME_KEYS = Object.keys(CAPTION_THEMES);

/**
 * Split text into chunks of `wordsPerLine` words for multi-line viral captions.
 */
export function splitToWordChunks(text, wordsPerLine = 2) {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [''];
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    chunks.push(words.slice(i, i + wordsPerLine).join(' '));
  }
  return chunks;
}
