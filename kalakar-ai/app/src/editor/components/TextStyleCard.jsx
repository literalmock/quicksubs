const TextStyleCard = ({ stylePreset, active, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(stylePreset)}
      className={`rounded-lg border p-2 text-left transition-all ${
        active
          ? 'border-primary-500 bg-primary-600/15'
          : 'border-surface-700 bg-surface-800 hover:border-surface-500'
      }`}
    >
      <div
        className="rounded-md px-2 py-1.5 text-center mb-1 overflow-hidden"
        style={{
          fontFamily: stylePreset.fontFamily,
          fontSize: '11px',
          fontWeight: 800,
          color: stylePreset.color,
          WebkitTextStroke: `0.6px ${stylePreset.stroke}`,
          textTransform: stylePreset.textTransform,
          letterSpacing: stylePreset.letterSpacing,
          lineHeight: stylePreset.lineHeight,
          textShadow: stylePreset.shadow,
          background: stylePreset.background || 'transparent',
        }}
      >
        HELLO WORLD
      </div>
      <div className="text-[10px] text-surface-300 truncate">{stylePreset.name}</div>
    </button>
  );
};

export default TextStyleCard;
