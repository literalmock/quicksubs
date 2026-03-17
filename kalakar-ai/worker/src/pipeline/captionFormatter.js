const MAX_CHARS_PER_LINE = 28;
const MAX_LINES = 2;
const MIN_DURATION = 1;
const MAX_DURATION = 4;
const MAX_WORDS_PER_SEGMENT = 5; // Split if segment exceeds this word count

const normalizeText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

/**
 * Marks keywords for highlighting in word-level captions
 */
const KEYWORDS_FOR_HIGHLIGHTING = ['Delhi', 'Dubai', 'war', 'investors', 'million', 'billion', 'success', 'growth'];

const markHighlights = (word) => {
  const normalizedWord = String(word || '').toLowerCase().replace(/[.,!?;:'"]/g, '');
  return KEYWORDS_FOR_HIGHLIGHTING.some((keyword) =>
    normalizedWord.includes(keyword.toLowerCase())
  );
};

const splitWordsToBlocks = (words) => {
  const blocks = [];
  let line1 = '';
  let line2 = '';

  const flush = () => {
    const content = [line1.trim(), line2.trim()].filter(Boolean).join('\n').trim();
    if (content) blocks.push(content);
    line1 = '';
    line2 = '';
  };

  words.forEach((word) => {
    const token = normalizeText(word);
    if (!token) return;

    if (!line1) {
      line1 = token;
      return;
    }

    const tryLine1 = `${line1} ${token}`.trim();
    if (tryLine1.length <= MAX_CHARS_PER_LINE) {
      line1 = tryLine1;
      return;
    }

    if (!line2) {
      line2 = token;
      return;
    }

    const tryLine2 = `${line2} ${token}`.trim();
    if (tryLine2.length <= MAX_CHARS_PER_LINE) {
      line2 = tryLine2;
      return;
    }

    flush();
    line1 = token;
  });

  flush();
  return blocks;
};

/**
 * Converts word objects to captions with word-level timing and highlights
 */
const buildWordLevelCaptions = (words, start, end) => {
  const captions = [];
  let group = [];
  let groupStart = null;

  const flush = () => {
    if (!group.length) return;
    
    const words_detail = group.map((w) => ({
      word: w,
      start: words.findIndex((word) => word === w) < words.length ? start : start,
      end: end,
      highlight: markHighlights(w),
    }));
    
    const caption = {
      start: groupStart,
      end: end,
      text: group.join(' '),
      words: words_detail,
    };
    captions.push(caption);
    group = [];
    groupStart = null;
  };

  words.forEach((word) => {
    if (groupStart === null) groupStart = start;
    group.push(word);
    
    if (group.length >= MAX_WORDS_PER_SEGMENT) {
      flush();
    }
  });

  if (group.length) flush();
  return captions;
};

/**
 * UPGRADED: Handles word-level timing if available, otherwise falls back to block-based
 */
const segmentToCaptions = (segment) => {
  const text = normalizeText(segment.text);
  if (!text) return [];

  const start = Math.max(0, Number(segment.start) || 0);
  const end = Math.max(start + 0.2, Number(segment.end) || start + 0.2);
  
  // If segment has word-level timing info, use it
  if (Array.isArray(segment.words) && segment.words.length > 0) {
    return buildWordLevelCaptions(
      segment.words.map((w) => w.word || w),
      start,
      end
    );
  }

  // Fallback: block-based splitting for text-only segments
  const words = text.split(' ');
  
  // Split long segments into smaller chunks
  if (words.length > MAX_WORDS_PER_SEGMENT) {
    const chunks = [];
    for (let i = 0; i < words.length; i += MAX_WORDS_PER_SEGMENT) {
      chunks.push(words.slice(i, i + MAX_WORDS_PER_SEGMENT));
    }
    
    const totalDuration = end - start;
    let cursor = start;
    
    return chunks.map((chunk, index) => {
      const isLast = index === chunks.length - 1;
      const chunkDuration = totalDuration / chunks.length;
      const nextEnd = isLast ? end : Math.min(end, cursor + chunkDuration);
      
      const words_detail = chunk.map((word) => ({
        word,
        start: cursor,
        end: nextEnd,
        highlight: markHighlights(word),
      }));
      
      const caption = {
        start: cursor,
        end: Math.max(cursor + 0.2, nextEnd),
        text: chunk.join(' '),
        words: words_detail,
      };
      
      cursor = Math.max(cursor + 0.2, nextEnd);
      return caption;
    });
  }

  // Short segments: single caption
  const words_detail = words.map((word) => ({
    word,
    start,
    end,
    highlight: markHighlights(word),
  }));
  
  return [{
    start,
    end: Math.max(start + 0.2, end),
    text: text,
    words: words_detail,
  }];
};

export const formatCaptionsFromSegments = (segments) => {
  const captions = (segments || []).flatMap(segmentToCaptions);
  return captions.sort((a, b) => a.start - b.start);
};
