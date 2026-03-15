const almostEqual = (a, b, eps = 0.15) => Math.abs((Number(a) || 0) - (Number(b) || 0)) <= eps;

const dedupeSegments = (segments) => {
  const sorted = [...segments].sort((a, b) => (a.start - b.start) || (a.end - b.end));
  const out = [];

  sorted.forEach((segment) => {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.text === segment.text &&
      almostEqual(prev.start, segment.start) &&
      almostEqual(prev.end, segment.end)
    ) {
      return;
    }

    out.push(segment);
  });

  return out;
};

const shiftWords = (words, offset) =>
  (words || []).map((word) => ({
    ...word,
    start: (Number(word.start) || 0) + offset,
    end: (Number(word.end) || Number(word.start) || 0) + offset,
  }));

const shiftSegments = (segments, offset) =>
  (segments || []).map((segment) => ({
    ...segment,
    start: (Number(segment.start) || 0) + offset,
    end: (Number(segment.end) || Number(segment.start) || 0) + offset,
  }));

export const mergeChunkTranscriptions = (items) => {
  const merged = {
    text: '',
    words: [],
    segments: [],
  };

  items.forEach(({ chunk, transcription }) => {
    if (transcription?.text) {
      merged.text = `${merged.text} ${String(transcription.text).trim()}`.trim();
    }

    merged.words.push(...shiftWords(transcription?.words, chunk.offset));
    merged.segments.push(...shiftSegments(transcription?.segments, chunk.offset));
  });

  merged.segments = dedupeSegments(merged.segments);
  return merged;
};
