/**
 * Keyword Highlighting Utility
 *
 * Marks important keywords for visual emphasis in captions.
 * This is customizable per language and use case.
 */

const DEFAULT_KEYWORDS = [
  // Business/Growth
  'Delhi', 'Dubai', 'war', 'investors', 'million', 'billion',
  'success', 'growth', 'startup', 'revenue', 'profit', 'investment',
  
  // Common emphasized words
  'important', 'critical', 'essential', 'key', 'major', 'significant',
];

// Language-specific keyword sets (can be expanded)
const KEYWORD_SETS = {
  english: DEFAULT_KEYWORDS,
  hindi: [
    'दिल्ली', 'दुबई', 'युद्ध', 'निवेशकों', 'सफलता', 'वृद्धि',
    ...DEFAULT_KEYWORDS,
  ],
  hinglish: [
    'Delhi', 'Dubai', 'war', 'investors', 'success', 'growth',
    'million', 'billion', 'startup', 'revenue', 'profit',
  ],
};

/**
 * Checks if a word should be highlighted
 * @param {string} word - The word to check
 * @param {string} language - Language code (english, hindi, hinglish)
 * @returns {boolean}
 */
export const shouldHighlightWord = (word, language = 'english') => {
  const keywords = KEYWORD_SETS[language] || DEFAULT_KEYWORDS;
  const normalizedWord = String(word || '')
    .toLowerCase()
    .replace(/[.,!?;:'"''""–—-]/g, ''); // Remove punctuation
  
  return keywords.some((keyword) =>
    normalizedWord.includes(keyword.toLowerCase())
  );
};

/**
 * Marks all keywords in a caption
 * @param {Object} caption - Caption object with words array
 * @param {string} language - Language code
 * @returns {Object} - Caption with highlight flags added
 */
export const markCaptionKeywords = (caption, language = 'english') => {
  if (!Array.isArray(caption.words)) {
    return caption;
  }

  return {
    ...caption,
    words: caption.words.map((wordObj) => ({
      ...wordObj,
      highlight: shouldHighlightWord(
        typeof wordObj === 'string' ? wordObj : wordObj.word,
        language
      ),
    })),
  };
};

/**
 * Marks all keywords in multiple captions
 * @param {Array} captions - Array of caption objects
 * @param {string} language - Language code
 * @returns {Array} - Captions with highlight flags added
 */
export const markAllKeywords = (captions, language = 'english') => {
  return (captions || []).map((caption) =>
    markCaptionKeywords(caption, language)
  );
};

/**
 * Adds a custom keyword to the highlight set
 * @param {string} keyword - Keyword to add
 * @param {string} language - Language code (default: all)
 */
export const addCustomKeyword = (keyword, language = null) => {
  if (!keyword) return;
  
  if (language) {
    if (!KEYWORD_SETS[language]) {
      KEYWORD_SETS[language] = [];
    }
    if (!KEYWORD_SETS[language].includes(keyword)) {
      KEYWORD_SETS[language].push(keyword);
    }
  } else {
    // Add to all language sets
    Object.keys(KEYWORD_SETS).forEach((lang) => {
      if (!KEYWORD_SETS[lang].includes(keyword)) {
        KEYWORD_SETS[lang].push(keyword);
      }
    });
  }
};

export default {
  shouldHighlightWord,
  markCaptionKeywords,
  markAllKeywords,
  addCustomKeyword,
};
