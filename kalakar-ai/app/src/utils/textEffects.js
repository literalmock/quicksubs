const EFFECT_EASE_MS = {
  short: 250,
  medium: 400,
  long: 500,
};

export const TEXT_EFFECTS = {
  none: {
    name: 'None',
    animation: 'none',
    duration: 0,
    previewClass: '',
    description: 'No animation.',
  },
  fade: {
    name: 'Fade In',
    animation: 'fadeIn',
    duration: 0.4,
    previewClass: 'caption-effect--fade',
    description: 'Subtle fade for calm educational captions.',
  },
  wordPop: {
    name: 'Word Pop',
    animation: 'popWord',
    duration: 0.25,
    previewClass: 'caption-effect--word-pop',
    description: 'Adds a gentle pulse to the active word.',
  },
  slideUp: {
    name: 'Slide Up',
    animation: 'slideUp',
    duration: 0.4,
    previewClass: 'caption-effect--slide-up',
    description: 'Slides the line upward with soft easing.',
  },
  highlightSweep: {
    name: 'Highlight',
    animation: 'highlightSweep',
    duration: 0.5,
    previewClass: 'caption-effect--highlight-sweep',
    description: 'Premium highlight pass for focus moments.',
  },
  aliAbdaal: {
    name: 'Ali Abdaal',
    animation: 'aliAbdaal',
    duration: 0.4,
    previewClass: 'caption-effect--ali-abdaal',
    description: 'Smooth fade-up with subtle scale settle — clean & professional.',
  },
};

export const TEXT_EFFECT_KEYS = Object.keys(TEXT_EFFECTS);

export const getTextEffect = (effectKey) => TEXT_EFFECTS[effectKey] || TEXT_EFFECTS.fade;

export const getEffectClassName = (effectKey) => getTextEffect(effectKey).previewClass;

const toAssScale = (value) => Math.round(value * 100);

export const buildAssEffectTags = ({
  effectKey,
  durationSeconds,
  posX,
  posY,
  highlightColor,
  baseColor,
  travelY = 26,
}) => {
  const effect = getTextEffect(effectKey);
  const durationMs = Math.max(120, Math.round((durationSeconds || effect.duration || 0.3) * 1000));

  switch (effectKey) {
    case 'none':
      return [];
    case 'slideUp':
      return [
        `\\move(${posX},${posY + travelY},${posX},${posY},0,${durationMs})`,
        `\\fad(${Math.round(EFFECT_EASE_MS.short * 0.8)},0)`,
      ];
    case 'aliAbdaal':
      // fade + subtle upward travel + gentle scale settle
      return [
        `\\move(${posX},${posY + 10},${posX},${posY},0,${durationMs})`,
        `\\fad(${Math.round(durationMs * 0.6)},0)`,
        `\\fscx${toAssScale(0.98)}\\fscy${toAssScale(0.98)}`,
        `\\t(0,${Math.round(durationMs * 0.6)},\\fscx${toAssScale(1.01)}\\fscy${toAssScale(1.01)})`,
        `\\t(${Math.round(durationMs * 0.6)},${durationMs},\\fscx100\\fscy100)`,
      ];
    case 'highlightSweep':
      return [
        `\\1c${highlightColor}`,
        `\\t(0,${Math.round(durationMs * 0.55)},\\1c${baseColor})`,
      ];
    case 'wordPop':
      return [
        `\\fscx${toAssScale(0.94)}`,
        `\\fscy${toAssScale(0.94)}`,
        `\\t(0,${durationMs},\\fscx${toAssScale(1.06)}\\fscy${toAssScale(1.06)})`,
        `\\t(${durationMs},${durationMs + EFFECT_EASE_MS.short},\\fscx100\\fscy100)`,
      ];
    case 'fade':
    default:
      return [`\\fad(${EFFECT_EASE_MS.medium},0)`];
  }
};
