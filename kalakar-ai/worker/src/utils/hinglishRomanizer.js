import { transliterate } from 'transliteration';

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

const isDevanagariToken = (token) => DEVANAGARI_REGEX.test(token);

export const romanizeHinglishText = (text) => {
  if (!text) return '';

  const raw = String(text);

  const tokens = raw.split(/(\s+)/); // keep spaces as separate tokens

  const mapped = tokens.map((chunk) => {
    if (!chunk.trim()) return chunk;
    if (!isDevanagariToken(chunk)) return chunk;
    return transliterate(chunk);
  });

  let joined = mapped.join('');

  // Basic cleanup:
  joined = joined
    // normalize repeated spaces
    .replace(/\s+/g, ' ')
    // fix space before punctuation
    .replace(/\s+([,.!?])/g, '$1')
    .trim();

  if (!joined) return '';

  // Capitalize first character
  return joined.charAt(0).toUpperCase() + joined.slice(1);
};

export const romanizeCaptions = (captions = []) =>
  captions.map((cap) => ({
    ...cap,
    text: romanizeHinglishText(cap.text),
  }));

