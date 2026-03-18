import { CAPTION_THEMES, splitToWordChunks } from './captionThemes.js';

export const DEFAULT_STYLE = {
  fontSize: 48,
  color: '#ffffff',
  stroke: '#000000',
  fontFamily: 'Poppins',
  align: 'center',
  position: 'bottom', // top | middle | bottom | custom
  xPct: 0.5,
  yPct: 0.9,
  theme: 'classic',
};

const POSITION_Y = { top: 0.1, middle: 0.5, bottom: 0.9 };

export const positionToYPct = (position) => POSITION_Y[position] ?? 0.9;

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
  const text = String(value || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[/|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
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

// Extract the first font name from a CSS font-family string (e.g. '"Anton", sans-serif' → 'Anton')
const extractFirstFont = (cssFontFamily) => {
  const match = String(cssFontFamily || 'Arial').match(/["']?([a-zA-Z][^"',]*)["']?/);
  return match ? match[1].trim() : 'Arial';
};

const positionToAssAlignment = (position) => {
  if (position === 'top') return 8;
  if (position === 'middle') return 5;
  if (position === 'custom') return 5;
  return 2;
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
  // Build one ASS style per unique theme used
  const usedKeys = [...new Set(['classic', ...subtitles.map((s) => s.style?.theme || 'classic')])];

  const styleLines = usedKeys.map((key) => {
    const t = CAPTION_THEMES[key] || CAPTION_THEMES.classic;
    const rep = subtitles.find((s) => (s.style?.theme || 'classic') === key);
    const rst = rep?.style || {};
    const fontName = extractFirstFont(rst.fontFamily || t.fontFamily);
    const isAliAbdaal = key === 'aliAbdaal';
    const primaryColor = hexToAssBGR(rst.color ?? (isAliAbdaal ? '#111111' : t.color));
    const fs = rst.fontSize ?? t.fontSize;
    const bold = t.fontWeight === '900' || t.fontWeight === '700' ? 1 : 0;
    const spacing = parseFloat(t.letterSpacing) || 0;

    const hasBox = !!t.background;
    // For Ali Abdaal: Use BorderStyle 3 (box) with rounded corners via border/shadow
    // For other themes: use their original border styles
    const borderStyle = isAliAbdaal ? 3 : (hasBox ? 3 : 1);
    const outline = isAliAbdaal
      ? 15   // Larger outline for smoother rounded effect
      : (hasBox ? 10 : ((t.strokeWidth ?? 2) / 2));
    const shadow = isAliAbdaal ? 4 : (hasBox ? 0 : 1);
    // For Ali Abdaal: white background (via large outline), dark text
    const outlineColor = isAliAbdaal
      ? hexToAssBGR('#FFFFFF')  // white outline creates the pill background
      : hasBox
      ? hexToAssBGR(t.background)
      : hexToAssBGR(rst.stroke ?? t.stroke);
    const backColor = isAliAbdaal
      ? hexToAssBGR('#FFFFFF') // white background for box style
      : hasBox
      ? hexToAssBGR(t.background) // Use theme background color for other boxes
      : '&H80000000'; // transparent for non-box styles
    const secondaryAss = isAliAbdaal ? hexToAssBGR(t.secondaryColor || '#9CA3AF') : '&H000000FF';

    return `Style: ${key},${fontName},${fs},${primaryColor},&H000000FF,${outlineColor},${backColor},${bold},0,0,0,100,100,${spacing},0,${borderStyle},${outline},${shadow},2,10,10,30,1`;
  }).join('\n');

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
      const themeKey = st.theme || 'classic';
      const theme = CAPTION_THEMES[themeKey] || CAPTION_THEMES.classic;

      let text = normalizeToLatin(sub.text);
      if (theme.textTransform === 'uppercase') text = text.toUpperCase();

      const posX = Math.round((st.xPct !== undefined ? st.xPct : 0.5) * vw);
      const posY = Math.round((st.yPct !== undefined ? st.yPct : 0.9) * vh);
      const alignment = positionToAssAlignment(st.position);
      const overrides = [`\\an${alignment}`, `\\pos(${posX},${posY})`];

      const repSt = subtitles.find((s2) => (s2.style?.theme || 'classic') === themeKey)?.style || {};
      if (st.fontSize && st.fontSize !== (repSt.fontSize ?? theme.fontSize)) overrides.push(`\\fs${st.fontSize}`);
      if (st.color && st.color !== (repSt.color ?? theme.color)) overrides.push(`\\1c${hexToAssColor(st.color)}`);
      if (!theme.background && st.stroke && st.stroke !== (repSt.stroke ?? theme.stroke)) {
        overrides.push(`\\3c${hexToAssColor(st.stroke)}`);
      }

      // ── Ali Abdaal: Force white box with rounded corners using BorderStyle 3 ─────
      if (themeKey === 'aliAbdaal') {
        // Use dark text color for all words
        const activeAss = hexToAssColor(theme.activeColor || '#111111');
        
        // Force white box with smoother rounded effect
        const aliOverrides = [
          ...overrides,
          '\\1c' + activeAss,  // dark text
          '\\3c&HFFFFFF&',    // white outline (blends with background)
          '\\4c&H00FFFFFF&',  // white background
          '\\bord15',         // larger outline for smoother corners
          '\\shad4',          // larger shadow for rounded effect
          '\\b3'               // BorderStyle 3 (box)
        ];
        
        const tags = `{${aliOverrides.join('')}}`;
        return `Dialogue: 0,${toAssTime(sub.start)},${toAssTime(sub.end)},${themeKey},,0,0,0,,${tags}${text}`;
      }

      // ── Regular themes ─────────────────────────────────────────────
      if (theme.wordSplit) {
        const chunks = splitToWordChunks(text, theme.wordsPerLine ?? 2);
        text = chunks.join('\\N');
      }

      const tags = `{${overrides.join('')}}`;
      return `Dialogue: 0,${toAssTime(sub.start)},${toAssTime(sub.end)},${themeKey},,0,0,0,,${tags}${text}`;
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
