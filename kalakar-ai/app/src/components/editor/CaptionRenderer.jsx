import { CAPTION_THEMES } from '../../utils/captionThemes';
import { getEffectClassName } from '../../utils/textEffects';

const WORD_EPSILON = 0.02;

const fallbackWords = (subtitle) => {
  const tokens = String(subtitle?.text || '')
    .split(/\s+/)
    .filter(Boolean);
  const start = Number(subtitle?.start) || 0;
  const end = Math.max(start + 0.2, Number(subtitle?.end) || start + 0.2);
  const duration = end - start;
  return tokens.map((word, index) => ({
    word,
    start: start + (duration * index) / Math.max(tokens.length, 1),
    end: index === tokens.length - 1
      ? end
      : start + (duration * (index + 1)) / Math.max(tokens.length, 1),
  }));
};

const getWordText = (word) => String(word?.word ?? word?.text ?? '').trim();

const getActiveWordIndex = (words, currentTime) =>
  words.findIndex(
    (word) =>
      currentTime >= (word.start ?? -Infinity) - WORD_EPSILON &&
      currentTime <= (word.end ?? Infinity) + WORD_EPSILON
  );

const chunkWordItems = (words, wordsPerLine = 3) => {
  if (!words.length) return [[]];
  const chunks = [];
  for (let index = 0; index < words.length; index += wordsPerLine) {
    chunks.push(words.slice(index, index + wordsPerLine));
  }
  return chunks;
};

const resolveTemplate = (key) => CAPTION_THEMES[key] || CAPTION_THEMES.classic;

const CaptionRenderer = ({ subtitle, currentTime = 0, templateKey = 'classic', effectKey }) => {
  const resolvedTemplateKey = subtitle?.style?.theme || templateKey || 'classic';
  const template = resolveTemplate(resolvedTemplateKey);
  const resolvedEffectKey = effectKey || subtitle?.effect || 'fade';
  const isAliAbdaal = resolvedTemplateKey === 'aliAbdaal';

  // UPGRADED: Use word-level timing from segmentation, fallback to synthesis
  const words = Array.isArray(subtitle?.words) && subtitle.words.length
    ? subtitle.words
    : fallbackWords(subtitle);

  const wordLines = (template.wordSplit && !isAliAbdaal
    ? chunkWordItems(words, template.wordsPerLine ?? 2)
    : [words]
  ).reduce((lines, line) => {
    const startIndex = lines.length
      ? lines[lines.length - 1].startIndex + lines[lines.length - 1].words.length
      : 0;
    lines.push({ startIndex, words: line });
    return lines;
  }, []);

  const activeWordIndex = getActiveWordIndex(words, currentTime);
  const effectClassName = getEffectClassName(resolvedEffectKey);

  // Ali Abdaal colours
  const activeColor    = template.activeColor    || '#111111';
  const secondaryColor = template.secondaryColor || '#9CA3AF';

  return (
    <div
      className={[
        'caption-renderer',
        effectClassName,
        template.background && !isAliAbdaal ? 'caption-renderer--boxed' : '',
        template.wordSplit ? 'caption-renderer--stacked' : '',
        isAliAbdaal ? 'caption-renderer--ali-abdaal' : '',
      ].filter(Boolean).join(' ')}
      data-effect={resolvedEffectKey}
      data-theme={resolvedTemplateKey}
    >
      {wordLines.map((line, lineIndex) => (
        <div
          key={`${subtitle.id ?? 'caption'}-line-${lineIndex}`}
          className={`caption-line ${template.background && !isAliAbdaal ? 'caption-line--boxed' : ''}`}
        >
          {line.words.map((word, wordIndex) => {
            const absoluteIndex = line.startIndex + wordIndex;
            const label = getWordText(word);
            const isActive = absoluteIndex === activeWordIndex;
            
            // UPGRADED: Support keyword highlighting from segmentation
            const shouldHighlight = word?.highlight === true;

            // Ali Abdaal: spoken (past + current) = dark, future = gray
            const wordStyle = isAliAbdaal
              ? {
                  color: activeWordIndex === -1
                    ? activeColor
                    : absoluteIndex <= activeWordIndex
                    ? activeColor
                    : secondaryColor,
                  fontWeight: absoluteIndex <= activeWordIndex ? '700' : '400',
                  transition: 'color 0.06s ease',
                }
              : shouldHighlight
              ? {
                  fontWeight: '700',
                  textDecoration: 'underline',
                  textDecorationColor: 'rgba(59, 130, 246, 0.5)',
                  textUnderlineOffset: '2px',
                }
              : {};

            return (
              <span
                key={`${subtitle.id ?? 'caption'}-${lineIndex}-${wordIndex}-${label}`}
                style={wordStyle}
                className={[
                  'caption-word',
                  isActive ? 'active-word' : 'inactive-word',
                  isActive && resolvedEffectKey === 'wordPop' ? 'caption-word--pop' : '',
                  isActive && resolvedEffectKey === 'highlightSweep' ? 'caption-word--sweep' : '',
                  shouldHighlight ? 'caption-word--keyword' : '',
                ].filter(Boolean).join(' ')}
              >
                {label}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CaptionRenderer;
