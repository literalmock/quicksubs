const MAX_CHARS_PER_LINE = 28;
const MAX_LINES = 2;
const MIN_DURATION = 1;
const MAX_DURATION = 4;
const MAX_WORDS_PER_SEGMENT = 5; // New: split segments with more than 5 words

const normalizeText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

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

const segmentToCaptions = (segment) => {
  const text = normalizeText(segment.text);
  if (!text) return [];

  const words = text.split(' ');
  const blocks = splitWordsToBlocks(words);
  if (!blocks.length) return [];

  const start = Math.max(0, Number(segment.start) || 0);
  const end = Math.max(start + 0.2, Number(segment.end) || start + 0.2);
  const totalDuration = end - start;

  let perCaption = totalDuration / blocks.length;
  if (totalDuration >= blocks.length) {
    perCaption = Math.max(MIN_DURATION, Math.min(MAX_DURATION, perCaption));
  } else {
    perCaption = Math.min(MAX_DURATION, perCaption);
  }

  const captions = [];
  let cursor = start;

  blocks.forEach((block, index) => {
    const isLast = index === blocks.length - 1;
    const nextEnd = isLast ? end : Math.min(end, cursor + perCaption);

    captions.push({
      start: cursor,
      end: Math.max(cursor + 0.2, nextEnd),
      text: block,
      lines: Math.min(MAX_LINES, block.split('\n').length),
    });

    cursor = Math.max(cursor + 0.2, nextEnd);
  });

  return captions;
};

export const splitLongChunks = (captions) => {
  const result = [];
  
  captions.forEach((caption) => {
    // If caption has words array and exceeds max words, split it
    if (caption.words && caption.words.length > MAX_WORDS_PER_SEGMENT) {
      const words = caption.words;
      const totalDuration = caption.end - caption.start;
      const avgWordDuration = totalDuration / words.length;
      
      // Split into chunks of max MAX_WORDS_PER_SEGMENT
      for (let i = 0; i < words.length; i += MAX_WORDS_PER_SEGMENT) {
        const chunkWords = words.slice(i, i + MAX_WORDS_PER_SEGMENT);
        const chunkStart = caption.start + (i * avgWordDuration);
        const chunkEnd = Math.min(
          caption.start + ((i + MAX_WORDS_PER_SEGMENT) * avgWordDuration),
          caption.end
        );
        
        result.push({
          start: chunkStart,
          end: chunkEnd,
          text: chunkWords.map(w => w.word || w).join(' '),
          words: chunkWords,
        });
      }
    } else {
      // Keep original caption if it's already short enough
      result.push(caption);
    }
  });
  
  return result;
};

export const formatCaptionsFromSegments = (segments) => {
  const captions = (segments || []).flatMap(segmentToCaptions);
  return splitLongChunks(captions.sort((a, b) => a.start - b.start));
};
