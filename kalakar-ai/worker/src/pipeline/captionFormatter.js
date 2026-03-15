const MAX_CHARS_PER_LINE = 42;
const MAX_LINES = 2;
const MIN_DURATION = 1;
const MAX_DURATION = 4;

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

export const formatCaptionsFromSegments = (segments) => {
  const captions = (segments || []).flatMap(segmentToCaptions);
  return captions.sort((a, b) => a.start - b.start);
};
