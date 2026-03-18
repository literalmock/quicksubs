import { useRef } from 'react';
import { CAPTION_THEMES, splitToWordChunks } from '../../utils/captionThemes';

const WORD_EPSILON = 0.02;
const SAFE_AREA_X = 0.08;
const SAFE_AREA_Y = 0.08;

const clamp = (value, min, max) => {
  if (max <= min) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
};

/**
 * Word timing helpers
 */
const fallbackWords = (subtitle) => {
  const tokens = String(subtitle?.text || '').split(/\s+/).filter(Boolean);
  const start = Number(subtitle?.start) || 0;
  const end = Math.max(start + 0.2, Number(subtitle?.end) || start + 0.2);
  const duration = end - start;
  return tokens.map((word, i) => ({
    word,
    start: start + (duration * i) / Math.max(tokens.length, 1),
    end: i === tokens.length - 1
      ? end
      : start + (duration * (i + 1)) / Math.max(tokens.length, 1),
  }));
};

const getActiveWordIndex = (words, currentTime) =>
  words.findIndex(
    (w) =>
      currentTime >= (w.start ?? -Infinity) - WORD_EPSILON &&
      currentTime <= (w.end ?? Infinity) + WORD_EPSILON
  );

/**
 * HTML/CSS subtitle overlay.
 *
 * Ali Abdaal mode:
 *   - White rounded-rectangle background box (pill shape)
 *   - Words spoken so far (index <= active): dark/black bold
 *   - Words not yet spoken (index > active): light gray
 *   - No text stroke (box provides contrast)
 *
 * `fontScale` maps reference-resolution sizes to current display size.
 */
const SubtitleOverlay = ({
  subtitle,
  containerWidth,
  containerHeight,
  fontScale = 1,
  onUpdateStyle,
  currentTime = 0,
}) => {
  const dragRef = useRef(null);
  const pointerStart = useRef(null);

  if (!subtitle) return null;

  const st = subtitle.style || {};
  const themeKey = st.theme || 'classic';
  const theme = CAPTION_THEMES[themeKey] || CAPTION_THEMES.classic;
  const isAliAbdaal = themeKey === 'aliAbdaal';

  const fontSize = Math.max(10, Math.round((st.fontSize ?? theme.fontSize) * fontScale));
  const strokeWidth = Math.max(0, (theme.strokeWidth ?? 2) * fontScale);
  const textColor = st.color ?? theme.color;
  const strokeColor = st.stroke ?? theme.stroke;
  const fontFamily = st.fontFamily
    ? `"${st.fontFamily}", ${theme.fontFamily}`
    : theme.fontFamily;

  const rawText = subtitle.text || '';
  const displayText = theme.textTransform === 'uppercase' ? rawText.toUpperCase() : rawText;

  const position = st.position || 'bottom';
  const safeInsetX = Math.max(14, containerWidth * SAFE_AREA_X);
  const safeInsetY = Math.max(14, containerHeight * SAFE_AREA_Y);
  const overlayWidth = Math.max(0, containerWidth - safeInsetX * 2);
  const maxOverlayHeight = Math.max(0, containerHeight - safeInsetY * 2);
  const centerX = (st.xPct ?? 0.5) * containerWidth;
  const centerY = (st.yPct ?? 0.9) * containerHeight;

  // Ali Abdaal: word-by-word data
  const aliWords = isAliAbdaal
    ? (Array.isArray(subtitle?.words) && subtitle.words.length
        ? subtitle.words
        : fallbackWords(subtitle))
    : [];
  const activeWordIdx = isAliAbdaal ? getActiveWordIndex(aliWords, currentTime) : -1;

  // Other themes: line split
  const lines = !isAliAbdaal && theme.wordSplit
    ? splitToWordChunks(displayText, theme.wordsPerLine ?? 2)
    : [displayText];

  /* ── Pointer drag ──────────────────────────────── */
  const onPointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const node = dragRef.current;
    const parent = node?.parentElement;
    if (!node || !parent) return;
    const rect = node.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    dragRef.current?.setPointerCapture(e.pointerId);
    pointerStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      centerX: rect.left - parentRect.left + rect.width / 2,
      centerY: rect.top - parentRect.top + rect.height / 2,
      boxWidth: rect.width,
      boxHeight: rect.height,
    };
  };

  const onPointerMove = (e) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.clientX;
    const dy = e.clientY - pointerStart.current.clientY;
    const nextCenterX = pointerStart.current.centerX + dx;
    const nextCenterY = pointerStart.current.centerY + dy;
    const minCenterX = safeInsetX + pointerStart.current.boxWidth / 2;
    const maxCenterX = containerWidth - safeInsetX - pointerStart.current.boxWidth / 2;
    const minCenterY = safeInsetY + pointerStart.current.boxHeight / 2;
    const maxCenterY = containerHeight - safeInsetY - pointerStart.current.boxHeight / 2;
    onUpdateStyle(subtitle.id, {
      position: 'custom',
      xPct: clamp(nextCenterX, minCenterX, maxCenterX) / containerWidth,
      yPct: clamp(nextCenterY, minCenterY, maxCenterY) / containerHeight,
    });
  };

  const onPointerUp = () => { pointerStart.current = null; };

  /* ── Ali Abdaal box wrapper ────────────────────── */
  const boxRadius = Math.round((theme.backgroundRadius ?? 8) * fontScale);
  const boxPadV   = Math.round(14 * fontScale);
  const boxPadH   = Math.round(24 * fontScale);

  /* ── Shared line/word style ────────────────────── */
  const baseLineStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight: theme.fontWeight || '700',
    textTransform: theme.textTransform || 'none',
    textAlign: 'center',
    letterSpacing: theme.letterSpacing || '0px',
    lineHeight: 1.3,
    display: 'block',
    userSelect: 'none',
    whiteSpace: isAliAbdaal ? 'nowrap' : 'normal',
    overflowWrap: isAliAbdaal ? 'normal' : 'break-word',
    wordBreak: isAliAbdaal ? 'normal' : 'break-word',
    maxWidth: isAliAbdaal ? 'none' : '100%',
  };

  // Standard (non-ali) line style
  const lineStyle = {
    ...baseLineStyle,
    color: textColor,
    WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : 'none',
    paintOrder: 'stroke fill',
    textShadow: theme.background
      ? 'none'
      : [
          '0 0 6px rgba(0,0,0,0.98)',
          '0 0 18px rgba(0,0,0,0.9)',
          '0 4px 14px rgba(0,0,0,0.75)',
        ].join(', '),
    ...(theme.background && !isAliAbdaal
      ? {
          background: theme.background,
          padding: `${Math.round(5 * fontScale)}px ${Math.round(12 * fontScale)}px`,
          borderRadius: `${Math.round(8 * fontScale)}px`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }
      : {}),
  };

  /* ── Wrapper positioning ───────────────────────── */
  const wrapperStyle = {
    position: 'absolute',
    left: position === 'custom' ? centerX : containerWidth / 2,
    maxWidth: isAliAbdaal ? 'none' : `${overlayWidth}px`,
    width: isAliAbdaal ? 'auto' : 'max-content',
    textAlign: 'center',
    cursor: 'grab',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `${Math.max(4, Math.round(6 * fontScale))}px`,
    touchAction: 'none',
    overflow: 'visible',
    maxHeight: `${Math.min(maxOverlayHeight, containerHeight * 0.42)}px`,
  };

  if (position === 'top') {
    wrapperStyle.top = centerY;
    wrapperStyle.transform = 'translateX(-50%)';
  } else if (position === 'middle') {
    wrapperStyle.top = centerY;
    wrapperStyle.transform = 'translate(-50%, -50%)';
  } else if (position === 'custom') {
    wrapperStyle.top = centerY;
    wrapperStyle.transform = 'translate(-50%, -50%)';
  } else {
    wrapperStyle.bottom = Math.max(0, containerHeight - centerY);
    wrapperStyle.transform = 'translateX(-50%)';
  }

  /* ── Ali Abdaal render ─────────────────────────── */
  if (isAliAbdaal) {
    const activeColor    = theme.activeColor    || '#111111';
    const secondaryColor = theme.secondaryColor || '#9CA3AF';

    return (
      <div
        ref={dragRef}
        style={wrapperStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* White rounded box */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: `${boxRadius}px`,
            padding: `${boxPadV}px ${boxPadH}px`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            display: 'inline-block',
            width: 'auto',
            // Removed max-width constraint to allow full text display
          }}
        >
          <span
            style={{
              ...baseLineStyle,
              WebkitTextStroke: 'none',
              textShadow: 'none',
            }}
          >
            {aliWords.map((w, i) => {
              const word = String(w?.word ?? w?.text ?? '').trim();
              // spoken (past + current) = dark; future = gray
              const isSpoken = activeWordIdx === -1 ? false : i <= activeWordIdx;
              return (
                <span
                  key={i}
                  style={{
                    color: isSpoken ? activeColor : secondaryColor,
                    fontWeight: isSpoken ? '700' : '400',
                    transition: 'color 0.06s ease, font-weight 0.06s ease',
                  }}
                >
                  {word}{i < aliWords.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </span>
        </div>
      </div>
    );
  }

  /* ── Standard render ───────────────────────────── */
  return (
    <div
      ref={dragRef}
      style={wrapperStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {lines.map((line, i) => (
        <span key={i} style={lineStyle}>
          {line}
        </span>
      ))}
    </div>
  );
};

export default SubtitleOverlay;
