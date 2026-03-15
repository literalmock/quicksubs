import { transliterate } from 'transliteration';
import { CAPTION_THEMES, splitToWordChunks } from './captionThemes.js';
import { getTextStyleById } from '../editor/config/textStyles.js';

export const DEFAULT_STYLE = {
  fontSize: 48,
  color: '#ffffff',
  stroke: '#000000',
  fontFamily: 'Poppins',
  textTransform: 'none',
  letterSpacing: '0px',
  lineHeight: 1.14,
  background: null,
  shadow: '0 2px 8px rgba(0,0,0,0.4)',
  animation: 'none', // transitions will be added later
  align: 'center',
  position: 'bottom', // top | middle | bottom | custom
  xPct: 0.5,
  yPct: 0.85,
  theme: 'classic',
};

const POSITION_Y = { top: 0.08, middle: 0.45, bottom: 0.88 };

export const positionToYPct = (position) => POSITION_Y[position] ?? 0.88;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const normalizeSubtitle = (subtitle, index = 0) => {
  const style = { ...DEFAULT_STYLE, ...(subtitle.style || {}) };
  const start = Math.max(0, toNumber(subtitle.start, index * 2));
  const end = Math.max(start + 0.2, toNumber(subtitle.end, start + 2));

  return {
    id: subtitle.id ?? index + 1,
    start,
    end,
    text: normalizeToLatin(String(subtitle.text || '')),
    style,
  };
};

export const normalizeToLatin = (value) => {
  const result = transliterate(String(value || ''));
  return result
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Find the subtitle active at `currentTime`.
 * Uses a small epsilon so floating-point boundary comparisons work reliably.
 */
const EPSILON = 0.04; // ~1 frame at 25fps

export const findActiveSubtitle = (subtitles, currentTime) =>
  subtitles.find(
    (s) => currentTime >= s.start - EPSILON && currentTime <= s.end + EPSILON
  ) || null;

/* ── SRT ─────────────────────────────────────────────── */

const toSrtTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

export const subtitlesToSrt = (subtitles) =>
  subtitles
    .map(
      (sub, i) =>
        `${i + 1}\n${toSrtTime(sub.start)} --> ${toSrtTime(sub.end)}\n${normalizeToLatin(sub.text)}`
    )
    .join('\n\n');

export const parseSrtToSubtitles = (srtContent) => {
  const blocks = String(srtContent || '')
    .replace(/\r/g, '')
    .split('\n\n')
    .map((b) => b.trim())
    .filter(Boolean);

  const toSeconds = (t) => {
    const [h, m, secMs] = t.split(':');
    const [s, ms] = secMs.split(',');
    return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
  };

  return blocks.map((block, index) => {
    const lines = block.split('\n');
    const timeLine = lines.find((l) => l.includes('-->')) || '';
    const textLines = lines.filter((l) => l !== timeLine && !/^\d+$/.test(l));
    const [startRaw, endRaw] = timeLine.split('-->').map((p) => p.trim());

    return normalizeSubtitle(
      { id: index + 1, start: toSeconds(startRaw), end: toSeconds(endRaw), text: textLines.join(' ') },
      index
    );
  });
};

/* ── ASS (Advanced SubStation Alpha) ─────────────────── */

// Used for global styles [V4+ Styles] - &HAABBGGRR (AA = Alpha, 00 = Opaque)
const hexToAssBGR = (hex) => {
  const r = (hex || '#ffffff').slice(1, 3);
  const g = (hex || '#ffffff').slice(3, 5);
  const b = (hex || '#ffffff').slice(5, 7);
  return `&H00${b}${g}${r}`.toUpperCase();
};

// Used for inline event overrides [Events] - &HBBGGRR& (No Alpha)
const hexToAssColor = (hex) => {
  const r = (hex || '#ffffff').slice(1, 3);
  const g = (hex || '#ffffff').slice(3, 5);
  const b = (hex || '#ffffff').slice(5, 7);
  return `&H${b}${g}${r}&`.toUpperCase();
};

const normalizeHex = (value, fallback = '#FFFFFF') => {
  const text = String(value || '').trim();

  const hex6 = text.match(/^#([0-9a-fA-F]{6})$/);
  if (hex6) return `#${hex6[1].toUpperCase()}`;

  const hex3 = text.match(/^#([0-9a-fA-F]{3})$/);
  if (hex3) {
    const [r, g, b] = hex3[1].split('');
    return `#${(r + r + g + g + b + b).toUpperCase()}`;
  }

  const rgb = text.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgb) {
    const r = Math.max(0, Math.min(255, Number(rgb[1]))).toString(16).padStart(2, '0');
    const g = Math.max(0, Math.min(255, Number(rgb[2]))).toString(16).padStart(2, '0');
    const b = Math.max(0, Math.min(255, Number(rgb[3]))).toString(16).padStart(2, '0');
    return `#${(r + g + b).toUpperCase()}`;
  }

  const firstHex = text.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  if (firstHex) return normalizeHex(`#${firstHex[1]}`, fallback);

  return fallback;
};

export const resolveCaptionRenderStyle = (style = {}) => {
  const preset = getTextStyleById(style.theme || 'classic');
  const merged = { ...preset, ...style };

  const backgroundRaw = merged.background;
  const backgroundColor = backgroundRaw ? normalizeHex(backgroundRaw, null) : null;
  const hasBox = Boolean(backgroundColor);

  return {
    theme: merged.theme || preset.id,
    fontFamily: merged.fontFamily || preset.fontFamily || DEFAULT_STYLE.fontFamily,
    fontSize: Number(merged.fontSize || preset.fontSize || DEFAULT_STYLE.fontSize),
    color: normalizeHex(merged.color || preset.color || DEFAULT_STYLE.color, '#FFFFFF'),
    stroke: normalizeHex(merged.stroke || preset.stroke || DEFAULT_STYLE.stroke, '#000000'),
    textTransform: merged.textTransform || preset.textTransform || 'none',
    letterSpacing: merged.letterSpacing ?? preset.letterSpacing ?? '0px',
    lineHeight: Number(merged.lineHeight ?? preset.lineHeight ?? 1.14),
    backgroundColor,
    hasBox,
    shadow: merged.shadow ?? preset.shadow ?? DEFAULT_STYLE.shadow,
    shadowEnabled: !hasBox && String(merged.shadow ?? '').trim() && String(merged.shadow) !== 'none',
  };
};

// Extract the first font name from a CSS font-family string (e.g. '"Anton", sans-serif' → 'Anton')
const extractFirstFont = (cssFontFamily) => {
  const match = String(cssFontFamily || 'Arial').match(/["']?([a-zA-Z][^"',]*)["']?/);
  return match ? match[1].trim() : 'Arial';
};

const toAssTime = (seconds) => {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.round((s % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};


export const subtitlesToAss = (subtitles, vw = 1920, vh = 1080) => {
  // Keep two base styles:
  // - Base: normal outline captions
  // - Box: opaque box captions (BorderStyle=3) for background presets
  const styleLines = [
    'Style: Base,Poppins,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,1.2,1,2,10,10,30,1',
    'Style: Box,Poppins,52,&H00FFFFFF,&H000000FF,&H00FF00FF,&H00000000,1,0,0,0,100,100,0,0,3,8,0,2,10,10,30,1',
  ].join('\n');

  const header = [
    '[Script Info]',
    'Title: QuickSubs Subtitles',
    'ScriptType: v4.00+',
    `PlayResX: ${vw}`,
    `PlayResY: ${vh}`,
    'WrapStyle: 0',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLines,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n');

  const events = subtitles
    .map((sub) => {
      const st = sub.style || DEFAULT_STYLE;
      const resolved = resolveCaptionRenderStyle(st);

      let text = normalizeToLatin(sub.text);
      if (resolved.textTransform === 'uppercase') text = text.toUpperCase();

      // Match preview's split behavior for uppercase viral captions
      if (resolved.textTransform === 'uppercase') {
        const chunks = splitToWordChunks(text, 2);
        text = chunks.join('\\N');
      }

      const fontName = extractFirstFont(st.fontFamily || resolved.fontFamily || DEFAULT_STYLE.fontFamily);
      const fontSize = Number(st.fontSize ?? resolved.fontSize ?? DEFAULT_STYLE.fontSize);
      const primaryColor = resolved.color;
      const outlineColor = resolved.stroke;
      const spacing = parseFloat(resolved.letterSpacing ?? '0') || 0;
      const hasShadow = resolved.shadowEnabled;
      const bgColor = resolved.backgroundColor;
      const useBoxStyle = Boolean(bgColor);

      const posX = Math.round((st.xPct !== undefined ? st.xPct : 0.5) * vw);
      const posY = Math.round((st.yPct !== undefined ? st.yPct : 0.85) * vh);

      // We force center anchor to mirror preview translate(-50%, -50%).
      const overrides = [
        '\\an5',
        `\\pos(${posX},${posY})`,
        `\\fn${fontName}`,
        `\\fs${fontSize}`,
        `\\1c${hexToAssColor(primaryColor)}`,
        `\\fsp${spacing}`,
        `\\shad${useBoxStyle ? 0 : (hasShadow ? 2 : 0)}`,
      ];

      if (bgColor) {
        // BorderStyle=3 uses OutlineColour as box fill color.
        // Keep modest padding via bord and force opaque fill.
        overrides.push('\\bord6');
        overrides.push('\\3a&H00&');
        overrides.push(`\\3c${hexToAssColor(bgColor)}`);
      } else {
        overrides.push('\\bord1.2');
        overrides.push(`\\3c${hexToAssColor(outlineColor)}`);
      }

      const tags = `{${overrides.join('')}}`;
      return `Dialogue: 0,${toAssTime(sub.start)},${toAssTime(sub.end)},${useBoxStyle ? 'Box' : 'Base'},,0,0,0,,${tags}${text}`;
    })
    .join('\n');

  return header + '\n' + events;
};

/* ── Seed Generation ─────────────────────────────────── */

/**
 * Generate seed subtitles using word-count-weighted timing.
 * Longer sentences get proportionally more screen time.
 */
export const generateSeedSubtitles = (text, duration = 12) => {
  const source = (text || '').trim();
  if (!source) {
    return [
      normalizeSubtitle({ id: 1, start: 0, end: Math.max(2, duration * 0.5), text: 'Edit your first subtitle' }, 0),
    ];
  }

  const chunks = source
    .split(/[.!?]\s+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!chunks.length) {
    return [normalizeSubtitle({ id: 1, start: 0, end: Math.max(2, duration * 0.5), text: source }, 0)];
  }

  // Word-count-weighted timing: each chunk gets time proportional to its word count
  const wordCounts = chunks.map((c) => Math.max(1, c.split(/\s+/).length));
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);
  const GAP = 0.05; // small gap between subtitles
  const usable = Math.max(duration - GAP * (chunks.length - 1), chunks.length * 0.5);

  let cursor = 0;
  return chunks.map((chunk, i) => {
    const share = (wordCounts[i] / totalWords) * usable;
    const start = cursor;
    const end = Math.min(duration, cursor + share);
    cursor = end + GAP;

    return normalizeSubtitle(
      { id: i + 1, start, end, text: chunk },
      i
    );
  });
};
