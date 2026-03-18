import { splitLongChunks } from './captionFormatter.js';

/**
 * Caption Segmentation Pipeline Step
 *
 * Converts raw Whisper transcription output into an array of timed caption
 * objects: { start, end, text }.
 *
 * Also generates SRT content for subtitle burning.
 */

const WORDS_PER_CAP = 3;
const MAX_CAPTION_DURATION = 2.5;
const MIN_CAPTION_DURATION = 0.8;
const WORD_PAUSE_THRESHOLD = 0.45;
const SEGMENT_OVERLAP_EPSILON = 0.15;

/**
 * Converts seconds to SRT timestamp: HH:MM:SS,mmm
 */
const toSrtTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

/**
 * Decides whether word-level timestamps cover enough of the audio.
 * Groq's Whisper sometimes only returns word timestamps for the first ~30 s.
 */
const getWordCoverage = (words, segments) => {
  const hasWords = Array.isArray(words) && words.length > 0;
  if (!hasWords) return { hasWords: false, lastWordEnd: 0, lastSegEnd: 0, ratio: 0 };

  const lastSegEnd =
    Array.isArray(segments) && segments.length
      ? Number(segments[segments.length - 1].end) || 0
      : 0;
  const lastWordEnd = Number(words[words.length - 1].end) || 0;
  const ratio = lastSegEnd > 0 ? lastWordEnd / lastSegEnd : 1;

  return { hasWords: true, lastWordEnd, lastSegEnd, ratio };
};

const endsSentence = (token) => /[.!?]$/.test(String(token || '').trim());

const clampCaption = (caption) => {
  const start = Math.max(0, Number(caption.start) || 0);
  const rawEnd = Math.max(start + 0.2, Number(caption.end) || start + MIN_CAPTION_DURATION);
  const boundedEnd = Math.min(rawEnd, start + MAX_CAPTION_DURATION);

  return {
    start,
    end: Math.max(start + 0.2, boundedEnd),
    text: String(caption.text || '').replace(/\s+/g, ' ').trim(),
  };
};

const normalizeCaptions = (captions) => {
  const normalized = [];

  captions
    .map(clampCaption)
    .filter((caption) => caption.text)
    .sort((a, b) => a.start - b.start)
    .forEach((caption) => {
      const previous = normalized[normalized.length - 1];
      if (previous && caption.start < previous.end) {
        caption.start = previous.end + 0.02;
      }
      caption.end = Math.max(caption.start + 0.2, caption.end);
      normalized.push(caption);
    });

  return normalized;
};

/**
 * Groups word-level timestamps into caption chunks.
 * @param {Array} words – Whisper word objects ({ word, start, end })
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
const wordsToCaption = (words) => {
  const captions = [];
  let group = [];

  const flush = () => {
    if (!group.length) return;
    captions.push({
      start: group[0].start,
      end: group[group.length - 1].end,
      text: group.map((w) => w.word).join(' ').trim(),
      words: [...group], // Include words array for frontend rendering
    });
    group = [];
  };

  words.forEach((word, index) => {
    const current = {
      word: String(word.word || '').trim(),
      start: Number(word.start) || 0,
      end: Number(word.end) || Number(word.start) || 0,
    };

    if (!current.word) return;

    const previous = group[group.length - 1];
    const gap = previous ? current.start - previous.end : 0;
    const wouldExceedDuration = previous && current.end - group[0].start > MAX_CAPTION_DURATION;

    if (group.length && (gap >= WORD_PAUSE_THRESHOLD || wouldExceedDuration)) {
      flush();
    }

    group.push(current);

    if (group.length >= WORDS_PER_CAP || endsSentence(current.word)) {
      flush();
    }
  });

  flush();

  return normalizeCaptions(captions);
};

const estimateChunkDuration = (wordCount) => {
  const estimated = wordCount * 0.42;
  return Math.max(MIN_CAPTION_DURATION, Math.min(MAX_CAPTION_DURATION, estimated));
};

const segmentTextToChunks = (text) => {
  const rawWords = String(text || '').trim().split(/\s+/).filter(Boolean);
  const chunks = [];
  let current = [];

  rawWords.forEach((word) => {
    current.push(word);
    if (current.length >= WORDS_PER_CAP || endsSentence(word)) {
      chunks.push(current);
      current = [];
    }
  });

  if (current.length) chunks.push(current);
  return chunks;
};

const buildSyntheticWords = (text, start, end) => {
  const rawWords = String(text || '').trim().split(/\s+/).filter(Boolean);
  const duration = end - start;
  const avgWordDuration = duration / Math.max(rawWords.length, 1);
  
  return rawWords.map((word, index) => ({
    word,
    start: start + (index * avgWordDuration),
    end: start + ((index + 1) * avgWordDuration),
  }));
};

const buildSegmentCaptions = (segments, minStart = 0) => {
  const captions = [];

  segments.forEach((seg) => {
    const segStart = Math.max(minStart, Number(seg.start) || 0);
    const segEnd = Math.max(segStart, Number(seg.end) || segStart);
    const chunks = segmentTextToChunks(seg.text);
    if (!chunks.length) return;

    const estimatedDurations = chunks.map((chunk) => estimateChunkDuration(chunk.length));
    const totalEstimated = estimatedDurations.reduce((sum, value) => sum + value, 0);
    const available = Math.max(MIN_CAPTION_DURATION, segEnd - segStart);
    const scale = totalEstimated > available ? available / totalEstimated : 1;

    let cursor = segStart;
    chunks.forEach((chunk, index) => {
      const duration = Math.max(
        MIN_CAPTION_DURATION,
        Math.min(MAX_CAPTION_DURATION, estimatedDurations[index] * scale),
      );
      const remaining = segEnd - cursor;
      const safeDuration = Math.min(duration, Math.max(MIN_CAPTION_DURATION, remaining));
      const start = cursor;
      const end = Math.min(segEnd, start + safeDuration);

      const syntheticWords = buildSyntheticWords(chunk.join(' '), start, end);
      
      captions.push({
        start,
        end,
        text: chunk.join(' '),
        words: syntheticWords, // Include synthetic words for frontend rendering
      });

      cursor = end + 0.05;
      if (cursor >= segEnd) {
        cursor = segEnd;
      }
    });
  });

  return normalizeCaptions(captions);
};

const mergeCaptions = (captions) => {
  if (!captions.length) return [];

  const merged = [];
  captions.forEach((caption) => {
    const previous = merged[merged.length - 1];
    if (
      previous
      && previous.text === caption.text
      && Math.abs(previous.end - caption.start) < 0.12
    ) {
      previous.end = Math.max(previous.end, caption.end);
      return;
    }
    merged.push({ ...caption });
  });

  return normalizeCaptions(merged);
};

/**
 * Finds time ranges (gaps) between consecutive word-level captions that
 * are large enough to contain missing speech (≥ minGap seconds).
 */
const findUncoveredGaps = (wordCaptions, minGap = 0.5) => {
  if (wordCaptions.length < 2) return [];
  const sorted = [...wordCaptions].sort((a, b) => a.start - b.start);
  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    if (gapEnd - gapStart >= minGap) {
      gaps.push({ start: gapStart, end: gapEnd });
    }
  }
  return gaps;
};

/**
 * For every uncovered time gap, finds all segments that overlap with it and
 * generates segment-based captions trimmed to the gap boundaries.
 */
const fillGapsWithSegments = (gaps, segments) => {
  const filled = [];
  gaps.forEach((gap) => {
    const overlapping = segments.filter((seg) => {
      const ss = Number(seg.start) || 0;
      const se = Number(seg.end) || 0;
      return se > gap.start + 0.1 && ss < gap.end - 0.1 && String(seg.text || '').trim();
    });

    overlapping.forEach((seg) => {
      const trimmed = {
        ...seg,
        start: Math.max(Number(seg.start) || 0, gap.start),
        end: Math.min(Number(seg.end) || 0, gap.end),
      };
      const caps = buildSegmentCaptions([trimmed], gap.start);
      filled.push(...caps);
    });
  });
  return filled;
};

/**
 * Splits segment-level results into caption-sized chunks with evenly
 * distributed timing.
 * @param {Array} segments – Whisper segment objects ({ text, start, end })
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
const segmentsToCaptions = (segments, minStart = 0) => buildSegmentCaptions(segments, minStart);

/**
 * Converts a captions array to SRT format.
 * @param {Array<{ start: number, end: number, text: string }>} captions
 * @returns {string}
 */
export const captionsToSrt = (captions) => {
  return captions
    .map((cap, i) => `${i + 1}\n${toSrtTime(cap.start)} --> ${toSrtTime(cap.end)}\n${cap.text}`)
    .join('\n\n');
};

/**
 * Segments raw Whisper output into timed captions.
 *
 * @param {{ words?: Array, segments?: Array }} transcriptionResult
 *   – The verbose_json result from Whisper API
 * @returns {{ captions: Array<{ start: number, end: number, text: string }>, srt: string }}
 */
export const segmentCaptions = (transcriptionResult) => {
  const { words = [], segments = [] } = transcriptionResult;
  const coverage = getWordCoverage(words, segments);

  // ── Pure segment mode (no word timestamps available) ─────────────────────
  if (!coverage.hasWords) {
    const rawCaptions = mergeCaptions(segmentsToCaptions(segments));
    const captions = splitLongChunks(rawCaptions); // Apply long chunk splitting
    console.log('📝 Segment-level captions (word timestamps not available)');
    return { captions, srt: captionsToSrt(captions) };
  }

  // ── Hybrid mode ──────────────────────────────────────────────────────────
  // 1. Word-level captions for every range that has word timestamps
  const wordCaptions = wordsToCaption(words);

  // 2. Internal gaps: time ranges between word captions that have no word data
  //    but DO have segment coverage (e.g. Groq skipped word timestamps for a
  //    middle passage while still returning a segment for it).
  const internalGaps = findUncoveredGaps(wordCaptions, 0.5);
  const gapFillCaptions = fillGapsWithSegments(internalGaps, segments);

  // 3. Trailing segments: content that ends after the last word timestamp
  const trailingSegments = segments.filter(
    (segment) => Number(segment.end) > coverage.lastWordEnd + SEGMENT_OVERLAP_EPSILON,
  );
  const trailingCaptions = trailingSegments.length
    ? segmentsToCaptions(trailingSegments, coverage.lastWordEnd + 0.05)
    : [];

  const allCaptions = [...wordCaptions, ...gapFillCaptions, ...trailingCaptions];
  const mergedCaptions = mergeCaptions(allCaptions);
  const captions = splitLongChunks(mergedCaptions); // Apply long chunk splitting

  if (internalGaps.length || trailingSegments.length) {
    console.log(
      `⚠️  Partial word coverage — filled ${internalGaps.length} internal gap(s)` +
      ` + ${trailingSegments.length} trailing segment(s) with fallback captions`,
    );
  } else {
    console.log(`📝 Word-level captions (${words.length} words → ${captions.length} captions)`);
  }

  const srt = captionsToSrt(captions);
  return { captions, srt };
};
