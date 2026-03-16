const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

export const normalizeCaptionText = (value = '') =>
  String(value || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeCaptionList = (captions = []) =>
  (captions || [])
    .map((caption) => ({
      ...caption,
      start: Number(caption.start) || 0,
      end: Number(caption.end) || 0,
      text: normalizeCaptionText(caption.text),
    }))
    .filter((caption) => caption.text);

export const buildTranscriptFromCaptions = (captions = []) =>
  normalizeCaptionText((captions || []).map((caption) => caption.text).join(' '));

export const containsDevanagari = (value = '') => DEVANAGARI_REGEX.test(String(value || ''));

export const getOverlappingCaptions = (captions = [], start = 0, end = 0, padding = 0.35) =>
  (captions || [])
    .filter((caption) => {
      const capStart = Number(caption.start) || 0;
      const capEnd = Number(caption.end) || 0;
      return capEnd >= start - padding && capStart <= end + padding;
    })
    .map((caption) => ({
      start: Number((Number(caption.start) || 0).toFixed(3)),
      end: Number((Number(caption.end) || 0).toFixed(3)),
      text: normalizeCaptionText(caption.text),
    }));
