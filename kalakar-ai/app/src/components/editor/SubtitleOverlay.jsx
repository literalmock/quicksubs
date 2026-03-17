import { useRef } from 'react';
import { CAPTION_THEMES, splitToWordChunks } from '../../utils/captionThemes';

const SAFE_AREA_X = 0.1;
const SAFE_AREA_Y = 0.08;

const clamp = (value, min, max) => {
  if (max <= min) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
};

/**
 * HTML/CSS subtitle overlay — renders captions with:
 * - WebkitTextStroke for crisp outlines
 * - textTransform (uppercase for viral/mrbeast themes)
 * - center alignment
 * - multi-line word-split for viral captions
 * - pointer-events drag to reposition
 *
 * `fontScale` maps reference-resolution sizes to current display size.
 */
const SubtitleOverlay = ({ subtitle, containerWidth, containerHeight, fontScale = 1, onUpdateStyle }) => {
  const dragRef = useRef(null);
  const pointerStart = useRef(null);

  if (!subtitle) return null;

  const st = subtitle.style || {};
  const theme = CAPTION_THEMES[st.theme] || CAPTION_THEMES.classic;

  // fontSize / color / stroke / fontFamily are synced into st when theme is selected,
  // so read directly from st for both live preview and export consistency.
  const fontSize = Math.max(10, Math.round((st.fontSize ?? theme.fontSize) * fontScale));
  const strokeWidth = Math.max(1, (theme.strokeWidth ?? 2) * fontScale);
  const textColor = st.color ?? theme.color;
  const strokeColor = st.stroke ?? theme.stroke;
  // Build CSS font-family: use the bare st.fontFamily name + theme's full fallback stack
  const fontFamily = st.fontFamily
    ? `"${st.fontFamily}", ${theme.fontFamily}`
    : theme.fontFamily;

  const rawText = subtitle.text || '';
  const displayText =
    theme.textTransform === 'uppercase' ? rawText.toUpperCase() : rawText;

  const position = st.position || 'bottom';
  const safeInsetX = Math.max(14, containerWidth * SAFE_AREA_X);
  const safeInsetY = Math.max(14, containerHeight * SAFE_AREA_Y);
  const overlayWidth = Math.max(0, containerWidth - safeInsetX * 2);
  const maxOverlayHeight = Math.max(0, containerHeight - safeInsetY * 2);
  const centerX = (st.xPct ?? 0.5) * containerWidth;
  const centerY = (st.yPct ?? 0.9) * containerHeight;

  const lines = theme.wordSplit
    ? splitToWordChunks(displayText, theme.wordsPerLine ?? 2)
    : [displayText];

  /* ── Pointer drag ─────────────────────────────────────────── */
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

  const onPointerUp = () => {
    pointerStart.current = null;
  };

  /* ── Line rendering ───────────────────────────────────────── */
  const lineStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight: theme.fontWeight || '700',
    color: textColor,
    WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
    paintOrder: 'stroke fill',
    textTransform: theme.textTransform || 'none',
    textAlign: 'center',
    letterSpacing: theme.letterSpacing || '0px',
    lineHeight: 1.25,
    display: 'block',
    userSelect: 'none',
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    textShadow: theme.background
      ? '0 2px 10px rgba(0,0,0,0.45)'
      : [
          '0 0 6px rgba(0,0,0,0.98)',
          '0 0 18px rgba(0,0,0,0.9)',
          '0 4px 14px rgba(0,0,0,0.75)',
        ].join(', '),
    ...(theme.background
      ? {
          background: theme.background,
          padding: `${Math.round(5 * fontScale)}px ${Math.round(12 * fontScale)}px`,
          borderRadius: `${Math.round(8 * fontScale)}px`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
          textShadow: '0 1px 0 rgba(0,0,0,0.2)',
        }
      : {}),
  };

  const wrapperStyle = {
    position: 'absolute',
    left: position === 'custom' ? centerX : containerWidth / 2,
    maxWidth: `${overlayWidth}px`,
    width: 'max-content',
    textAlign: 'center',
    cursor: 'grab',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `${Math.max(4, Math.round(6 * fontScale))}px`,
    touchAction: 'none',
    overflow: 'hidden',
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
