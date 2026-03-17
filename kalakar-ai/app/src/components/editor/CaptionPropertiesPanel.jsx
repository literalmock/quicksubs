import { CAPTION_THEMES, THEME_KEYS } from '../../utils/captionThemes';

const FONTS = ['Poppins', 'Inter', 'Arial', 'Helvetica', 'Georgia', 'Verdana', 'Courier New'];

const Field = ({ label, children }) => (
  <label className="block text-xs text-surface-400">
    {label}
    <div className="mt-1">{children}</div>
  </label>
);

const input =
  'w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors';

const CaptionPropertiesPanel = ({
  subtitle,
  onUpdateSubtitle,
  onUpdateStyle,
  
  onDelete,
}) => {
  if (!subtitle) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-sm text-surface-500 text-center">
          Select a caption to edit its properties.
        </p>
      </div>
    );
  }

  const st = subtitle.style || {};

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
          Caption Properties
        </h3>
        <button
          onClick={() => onDelete(subtitle.id)}
          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Text */}
      <Field label="Text">
        <textarea
          value={subtitle.text}
          onChange={(e) => onUpdateSubtitle(subtitle.id, { text: e.target.value })}
          rows={3}
          className={`${input} resize-none`}
        />
      </Field>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start (s)">
          <input
            type="number"
            step="0.1"
            min="0"
            value={subtitle.start}
            onChange={(e) => onUpdateSubtitle(subtitle.id, { start: Number(e.target.value) })}
            className={input}
          />
        </Field>
        <Field label="End (s)">
          <input
            type="number"
            step="0.1"
            min="0"
            value={subtitle.end}
            onChange={(e) => onUpdateSubtitle(subtitle.id, { end: Number(e.target.value) })}
            className={input}
          />
        </Field>
      </div>

      <hr className="border-surface-700" />

      {/* Style header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Style</h3>
      </div>

      {/* Theme selector */}
      <div>
        <p className="text-xs text-surface-400 mb-2">Caption Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_KEYS.map((key) => {
            const theme = CAPTION_THEMES[key];
            const isActive = (st.theme || 'classic') === key;
            return (
              <button
                key={key}
                onClick={() => {
                  const t = CAPTION_THEMES[key];
                  onUpdateStyle(subtitle.id, {
                    theme: key,
                    fontSize: t.fontSize,
                    color: t.color,
                    stroke: t.stroke,
                    fontFamily: key === 'classic' ? 'Poppins' : (key === 'viral' ? 'Anton' : 'Impact'),
                  });
                }}
                className={`relative rounded-lg border-2 py-3 px-1 flex flex-col items-center gap-1 transition-all ${
                  isActive
                    ? 'border-primary-500 bg-primary-600/15'
                    : 'border-surface-700 bg-surface-800 hover:border-surface-500'
                }`}
              >
                {/* Mini preview text */}
                <span
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: '11px',
                    fontWeight: theme.fontWeight || '700',
                    color: theme.color,
                    WebkitTextStroke: `0.5px ${theme.stroke}`,
                    paintOrder: 'stroke fill',
                    textTransform: theme.textTransform || 'none',
                    lineHeight: 1,
                    ...(theme.background
                      ? { background: theme.background, padding: '1px 4px', borderRadius: 3 }
                      : {}),
                  }}
                >
                  Aa
                </span>
                <span className="text-[9px] text-surface-400">{theme.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font family */}
      <Field label="Font Family">
        <select
          value={st.fontFamily || 'Poppins'}
          onChange={(e) => onUpdateStyle(subtitle.id, { fontFamily: e.target.value })}
          className={input}
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Field>

      {/* Font size */}
      <Field label={`Font Size (${st.fontSize || 48}px)`}>
        <input
          type="range"
          min="16"
          max="120"
          value={st.fontSize || 48}
          onChange={(e) => onUpdateStyle(subtitle.id, { fontSize: Number(e.target.value) })}
          className="w-full accent-primary-500"
        />
      </Field>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Text Color">
          <input
            type="color"
            value={st.color || '#ffffff'}
            onChange={(e) => onUpdateStyle(subtitle.id, { color: e.target.value })}
            className="h-9 w-full rounded-lg bg-surface-900 border border-surface-700 p-1 cursor-pointer"
          />
        </Field>
        <Field label="Stroke Color">
          <input
            type="color"
            value={st.stroke || '#000000'}
            onChange={(e) => onUpdateStyle(subtitle.id, { stroke: e.target.value })}
            className="h-9 w-full rounded-lg bg-surface-900 border border-surface-700 p-1 cursor-pointer"
          />
        </Field>
      </div>

      {/* Position */}
      <Field label="Position">
        <select
          value={st.position || 'bottom'}
          onChange={(e) => onUpdateStyle(subtitle.id, { position: e.target.value })}
          className={input}
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
          <option value="custom">Custom</option>
        </select>
      </Field>

      {/* Custom position sliders — visible only in custom mode */}
      {st.position === 'custom' && (
        <div className="space-y-3">
          <Field label={`Horizontal (${Math.round((st.xPct ?? 0.5) * 100)}%)`}>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((st.xPct ?? 0.5) * 100)}
              onChange={(e) => onUpdateStyle(subtitle.id, { xPct: Number(e.target.value) / 100 })}
              className="w-full accent-primary-500"
            />
          </Field>
          <Field label={`Vertical (${Math.round((st.yPct ?? 0.9) * 100)}%)`}>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((st.yPct ?? 0.9) * 100)}
              onChange={(e) => onUpdateStyle(subtitle.id, { yPct: Number(e.target.value) / 100 })}
              className="w-full accent-primary-500"
            />
          </Field>
        </div>
      )}

      {/* Hint */}
      <p className="text-[10px] text-surface-600 leading-relaxed">
        Drag the caption inside the video frame to reposition it while staying within the safe area.
      </p>
    </div>
  );
};

export default CaptionPropertiesPanel;
