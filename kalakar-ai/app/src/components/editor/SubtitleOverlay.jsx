import { useRef } from 'react';
import { splitToWordChunks } from '../../utils/captionThemes';
import { resolveCaptionRenderStyle } from '../../utils/subtitles';

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
  const resolved = resolveCaptionRenderStyle(st);

  // fontSize / color / stroke / fontFamily are synced into st when theme is selected,
  // so read directly from st for both live preview and export consistency.
  const fontSize = Math.max(10, Math.round(resolved.fontSize * fontScale));
  const strokeWidth = resolved.hasBox ? 0 : Math.max(1, 1.2 * fontScale);
  const textColor = resolved.color;
  const strokeColor = resolved.stroke;
  const textTransform = resolved.textTransform;
  const letterSpacing = resolved.letterSpacing;
  const lineHeight = resolved.lineHeight;
  const shadow = resolved.shadowEnabled ? resolved.shadow : 'none';
  const background = resolved.backgroundColor;

  // Build CSS font-family: use the bare st.fontFamily name + preset's full fallback stack
  const fontFamily = st.fontFamily
    ? `"${st.fontFamily}", ${resolved.fontFamily}`
    : resolved.fontFamily;

  const rawText = subtitle.text || '';
  const displayText = textTransform === 'uppercase' ? rawText.toUpperCase() : rawText;

  const lines = textTransform === 'uppercase'
    ? splitToWordChunks(displayText, 2)
    : [displayText];

  // Position relative to the container (matches video display area)
  const x = (st.xPct ?? 0.5) * containerWidth;
  const y = (st.yPct ?? 0.85) * containerHeight;

  /* ── Pointer drag ─────────────────────────────────────────── */
  const onPointerDown = (e) => {
    e.stopPropagation();
    dragRef.current?.setPointerCapture(e.pointerId);
    pointerStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      xPct: st.xPct ?? 0.5,
      yPct: st.yPct ?? 0.85,
    };
  };

  const onPointerMove = (e) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.clientX;
    const dy = e.clientY - pointerStart.current.clientY;
    onUpdateStyle(subtitle.id, {
      position: 'custom',
      xPct: Math.min(1, Math.max(0, pointerStart.current.xPct + dx / containerWidth)),
      yPct: Math.min(1, Math.max(0, pointerStart.current.yPct + dy / containerHeight)),
    });
  };

  const onPointerUp = () => {
    pointerStart.current = null;
  };

  /* ── Line rendering ───────────────────────────────────────── */
  const lineStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight: '800',
    color: textColor,
    WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
    paintOrder: 'stroke fill',
    textTransform,
    textAlign: 'center',
    letterSpacing,
    lineHeight,
    display: 'block',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    textShadow: shadow,
    ...(background
      ? {
          background,
          padding: `${Math.round(3 * fontScale)}px ${Math.round(10 * fontScale)}px`,
          borderRadius: `${Math.round(4 * fontScale)}px`,
          marginBottom: `${Math.round(4 * fontScale)}px`,
          WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
          textShadow: shadow,
        }
      : { marginBottom: `${Math.round(2 * fontScale)}px` }),
  };

  return (
    <div
      ref={dragRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        cursor: 'move',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
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
