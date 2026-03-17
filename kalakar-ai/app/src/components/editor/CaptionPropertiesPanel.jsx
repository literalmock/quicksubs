import { useState } from 'react';
import { CAPTION_THEMES, THEME_KEYS } from '../../utils/captionThemes';
import { TEXT_EFFECTS, TEXT_EFFECT_KEYS } from '../../utils/textEffects';

const FONTS = ['Poppins', 'Inter', 'Montserrat', 'Arial', 'Helvetica', 'Georgia', 'Verdana', 'Courier New'];

const TABS = [
  { id: 'text', label: 'Text' },
  { id: 'templates', label: 'Templates' },
  { id: 'transitions', label: 'Transitions' },
];

const Field = ({ label, children }) => (
  <label className="block text-xs text-surface-400">
    {label}
    <div className="mt-1">{children}</div>
  </label>
);

const inputCls =
  'w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors';

/* ─────────────────────────────────────────────────────────
   TEXT TAB
───────────────────────────────────────────────────────── */
const TextTab = ({ subtitle, onUpdateSubtitle, onUpdateStyle }) => {
  const st = subtitle.style || {};
  return (
    <div className="space-y-4 px-4 py-3">
      {/* Text content */}
      <Field label="Caption Text">
        <textarea
          value={subtitle.text}
          onChange={(e) => onUpdateSubtitle(subtitle.id, { text: e.target.value })}
          rows={3}
          className={`${inputCls} resize-none`}
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
            className={inputCls}
          />
        </Field>
        <Field label="End (s)">
          <input
            type="number"
            step="0.1"
            min="0"
            value={subtitle.end}
            onChange={(e) => onUpdateSubtitle(subtitle.id, { end: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="h-px bg-surface-700" />

      {/* Font family */}
      <Field label="Font Family">
        <select
          value={st.fontFamily || 'Poppins'}
          onChange={(e) => onUpdateStyle(subtitle.id, { fontFamily: e.target.value })}
          className={inputCls}
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </Field>

      {/* Font size */}
      <Field label={`Font Size — ${st.fontSize || 48}px`}>
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
          className={inputCls}
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
          <option value="custom">Custom</option>
        </select>
      </Field>

      {st.position === 'custom' && (
        <div className="space-y-3">
          <Field label={`Horizontal — ${Math.round((st.xPct ?? 0.5) * 100)}%`}>
            <input
              type="range" min="0" max="100"
              value={Math.round((st.xPct ?? 0.5) * 100)}
              onChange={(e) => onUpdateStyle(subtitle.id, { xPct: Number(e.target.value) / 100 })}
              className="w-full accent-primary-500"
            />
          </Field>
          <Field label={`Vertical — ${Math.round((st.yPct ?? 0.9) * 100)}%`}>
            <input
              type="range" min="0" max="100"
              value={Math.round((st.yPct ?? 0.9) * 100)}
              onChange={(e) => onUpdateStyle(subtitle.id, { yPct: Number(e.target.value) / 100 })}
              className="w-full accent-primary-500"
            />
          </Field>
        </div>
      )}

      <p className="text-[10px] text-surface-600 leading-relaxed pt-1">
        Drag captions in the preview to reposition.
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   TEMPLATES TAB
   Shows caption themes incluing Ali Abdaal
───────────────────────────────────────────────────────── */
const TemplatesTab = ({ subtitle, onUpdateStyle }) => {
  const st = subtitle.style || {};
  const activeTheme = st.theme || 'classic';

  return (
    <div className="px-4 py-3 space-y-3">
      <p className="text-[11px] text-surface-500 leading-relaxed">
        Choose a caption style. Each template sets font, size, colour, and layout.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {THEME_KEYS.map((key) => {
          const theme = CAPTION_THEMES[key];
          const isActive = activeTheme === key;

          // Pick a representative font family string for the mini preview
          const previewFont = theme.fontFamily;
          const isAliAbdaal = key === 'aliAbdaal';

          return (
            <button
              key={key}
              onClick={() => {
                onUpdateStyle(subtitle.id, {
                  theme: key,
                  fontSize: theme.fontSize,
                  color: theme.color,
                  stroke: theme.stroke,
                  fontFamily:
                    key === 'classic' ? 'Poppins'
                    : key === 'viral'  ? 'Anton'
                    : key === 'aliAbdaal' ? 'Inter'
                    : 'Impact',
                });
              }}
              className={`relative rounded-xl border-2 py-4 px-2 flex flex-col items-center gap-2 transition-all ${
                isActive
                  ? 'border-primary-500 bg-primary-600/15'
                  : 'border-surface-700 bg-surface-800 hover:border-surface-500 hover:bg-surface-750'
              }`}
            >
              {/* Mini preview */}
              <div
                className="flex items-center justify-center rounded-lg w-full overflow-hidden"
                style={{
                  background: isAliAbdaal
                    ? 'transparent'
                    : theme.background
                    ? theme.background
                    : 'rgba(0,0,0,0.5)',
                  minHeight: 44,
                  padding: '4px',
                }}
              >
                {isAliAbdaal ? (
                  // White rounded box with dark + gray words — exactly like the screenshot
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    display: 'inline-block',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: '700', color: '#111111', lineHeight: 1 }}>
                      The quick{' '}
                    </span>
                    <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '11px', fontWeight: '400', color: '#9CA3AF', lineHeight: 1 }}>
                      brown fox
                    </span>
                  </div>
                ) : (
                  <span
                    style={{
                      fontFamily: previewFont,
                      fontSize: '12px',
                      fontWeight: theme.fontWeight || '700',
                      color: theme.color,
                      WebkitTextStroke: `0.5px ${theme.stroke}`,
                      paintOrder: 'stroke fill',
                      textTransform: theme.textTransform || 'none',
                      lineHeight: 1,
                      letterSpacing: theme.letterSpacing || '0px',
                    }}
                  >
                    Hello World
                  </span>
                )}
              </div>

              <span className="text-[10px] font-medium text-surface-300">{theme.label}</span>

              {isAliAbdaal && (
                <span className="absolute top-1.5 right-1.5 text-[8px] bg-primary-600 text-white px-1.5 py-0.5 rounded-full font-semibold tracking-wide uppercase">
                  New
                </span>
              )}

              {isActive && (
                <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>

      {activeTheme === 'aliAbdaal' && (
        <div className="mt-1 rounded-lg bg-surface-800 border border-surface-700 p-3">
          <p className="text-[10px] text-surface-400 leading-relaxed">
            <span className="text-primary-400 font-semibold">Ali Abdaal style</span> — white pill box,
            spoken words turn <strong className="text-white">dark bold</strong>, upcoming words stay{' '}
            <span className="text-surface-400">gray</span>. Synced word-by-word to audio.
          </p>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   TRANSITIONS TAB
───────────────────────────────────────────────────────── */
const TransitionsTab = ({ subtitle, onUpdateSubtitle }) => {
  const activeEffect = subtitle.effect || 'fade';

  return (
    <div className="px-4 py-3 space-y-3">
      <p className="text-[11px] text-surface-500 leading-relaxed">
        Controls how each caption animates in when it appears.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {TEXT_EFFECT_KEYS.map((key) => {
          const effect = TEXT_EFFECTS[key];
          const isActive = activeEffect === key;
          const isAliAbdaal = key === 'aliAbdaal';

          return (
            <button
              key={key}
              onClick={() => onUpdateSubtitle(subtitle.id, { effect: key })}
              className={`relative rounded-xl border-2 py-3 px-2 flex flex-col items-center gap-1.5 transition-all ${
                isActive
                  ? 'border-primary-500 bg-primary-600/15'
                  : 'border-surface-700 bg-surface-800 hover:border-surface-500'
              }`}
            >
              {/* Icon / mini animation name */}
              <span className="text-base select-none">
                {key === 'none'           && '✕'}
                {key === 'fade'           && '◌'}
                {key === 'slideUp'        && '↑'}
                {key === 'wordPop'        && '◉'}
                {key === 'highlightSweep' && '✦'}
                {key === 'aliAbdaal'      && '✶'}
              </span>
              <span className={`text-[10px] font-medium text-center leading-tight ${isActive ? 'text-primary-300' : 'text-surface-300'}`}>
                {effect.name}
              </span>

              {isAliAbdaal && (
                <span className="absolute top-1.5 right-1.5 text-[8px] bg-primary-600 text-white px-1 py-0.5 rounded-full font-semibold tracking-wide uppercase leading-none">
                  New
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Short description of selected effect */}
      <div className="rounded-lg bg-surface-800 border border-surface-700 p-3">
        <p className="text-[10px] text-surface-400 leading-relaxed">
          <span className="text-white font-medium">{TEXT_EFFECTS[activeEffect]?.name}</span>
          {' — '}
          {TEXT_EFFECTS[activeEffect]?.description}
        </p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MAIN PANEL
───────────────────────────────────────────────────────── */
const CaptionPropertiesPanel = ({
  subtitle,
  onUpdateSubtitle,
  onUpdateStyle,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState('text');

  if (!subtitle) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-surface-500 text-lg">
          ✦
        </div>
        <p className="text-sm text-surface-500 text-center leading-relaxed">
          Select a caption to edit its properties.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar — matches the screenshot design */}
      <div className="flex items-center border-b border-surface-700 shrink-0 bg-surface-900">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-[12px] font-semibold tracking-wide transition-all relative ${
                isActive
                  ? 'text-white'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}

        {/* Delete button */}
        <button
          onClick={() => onDelete(subtitle.id)}
          title="Delete caption"
          className="px-3 py-3 text-surface-600 hover:text-red-400 transition-colors text-sm shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'text' && (
          <TextTab
            subtitle={subtitle}
            onUpdateSubtitle={onUpdateSubtitle}
            onUpdateStyle={onUpdateStyle}
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesTab
            subtitle={subtitle}
            onUpdateStyle={onUpdateStyle}
          />
        )}
        {activeTab === 'transitions' && (
          <TransitionsTab
            subtitle={subtitle}
            onUpdateSubtitle={onUpdateSubtitle}
          />
        )}
      </div>
    </div>
  );
};

export default CaptionPropertiesPanel;
