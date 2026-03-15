import TextStyleCard from './TextStyleCard';
import { BASIC_TEXT_STYLES, VIRAL_TEXT_STYLES } from '../config/textStyles';

const TextStylePanel = ({ activeStyleId, onSelectStyle }) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-surface-300 mb-2">Text Styles</h4>

        <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-2">Viral Styles</p>
        <div className="grid grid-cols-3 gap-2">
          {VIRAL_TEXT_STYLES.map((style) => (
            <TextStyleCard
              key={style.id}
              stylePreset={style}
              active={activeStyleId === style.id}
              onSelect={onSelectStyle}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-2">Basic Styles</p>
        <div className="grid grid-cols-3 gap-2">
          {BASIC_TEXT_STYLES.map((style) => (
            <TextStyleCard
              key={style.id}
              stylePreset={style}
              active={activeStyleId === style.id}
              onSelect={onSelectStyle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextStylePanel;
