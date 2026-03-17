/**
 * Caption style themes for TikTok / Reels style captions.
 *
 * Each theme exposes:
 *   fontFamily, fontSize, fontWeight, color, stroke, strokeWidth,
 *   textTransform, wordSplit, wordsPerLine, background, letterSpacing
 *
 * Ali Abdaal theme extras:
 *   secondaryColor  — color of future (not-yet-spoken) words
 *   activeColor     — color of spoken / currently active words
 *   backgroundRadius — px radius for the rounded box
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

  /**
   * Ali Abdaal style — as seen in his YouTube videos and kalakar.io:
   *
   * • White rounded-rectangle background box
   * • Dark/black bold text for words that have been spoken (past + current)
   * • Light gray text for words not yet spoken (future)
   * • Clean Inter font, no stroke
   *
   * Color logic in renderer:
   *   index <= activeWordIndex  →  activeColor  (#111111, bold)
   *   index >  activeWordIndex  →  secondaryColor (#9CA3AF, gray)
   */
  aliAbdaal: {
    label: 'Ali Abdaal',
    fontFamily: '"Inter", "Poppins", sans-serif',
    fontSize: 52,
    fontWeight: '700',
    // Primary text colour (spoken / active words)
    color: '#111111',
    activeColor: '#111111',
    // Future word colour (not yet spoken)
    secondaryColor: '#9CA3AF',
    // No outline — white box provides contrast
    stroke: 'transparent',
    strokeWidth: 0,
    textTransform: 'none',
    wordSplit: false,
    wordsPerLine: 4,
    // White pill-shaped background box
    background: '#FFFFFF',
    backgroundRadius: 18,
    letterSpacing: '-0.5px',
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
