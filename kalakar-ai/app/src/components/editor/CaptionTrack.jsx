import { useEffect, useRef, useState } from 'react';

const MIN_LEN = 0.15;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const CaptionTrack = ({ subtitles, duration, selectedId, onSelect, onUpdateSubtitle }) => {
  const laneRef = useRef(null);
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    if (!drag) return;

    const onMove = (e) => {
      const lane = laneRef.current;
      if (!lane || !duration) return;

      const w = lane.clientWidth || 1;
      const delta = ((e.clientX - drag.sx) / w) * duration;

      if (drag.mode === 'move') {
        const len = drag.oe - drag.os;
        const s = clamp(drag.os + delta, 0, Math.max(0, duration - len));
        onUpdateSubtitle(drag.id, { start: s, end: s + len });
      } else if (drag.mode === 'left') {
        onUpdateSubtitle(drag.id, { start: clamp(drag.os + delta, 0, drag.oe - MIN_LEN) });
      } else {
        onUpdateSubtitle(drag.id, { end: clamp(drag.oe + delta, drag.os + MIN_LEN, duration) });
      }
    };

    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, duration, onUpdateSubtitle]);

  const begin = (e, id, mode, sub) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(id);
    setDrag({ id, mode, sx: e.clientX, os: sub.start, oe: sub.end });
  };

  return (
    <div
      ref={laneRef}
      className="relative h-10 mx-2 mb-1 select-none"
    >
      {subtitles.map((sub) => {
        if (!duration) return null;
        const left = (sub.start / duration) * 100;
        const w = ((sub.end - sub.start) / duration) * 100;
        const active = selectedId === sub.id;

        return (
          <div
            key={sub.id}
            className={`absolute top-1 h-8 rounded flex items-center group cursor-grab active:cursor-grabbing transition-colors
              ${active ? 'bg-primary-500/90 ring-1 ring-primary-400' : 'bg-surface-500/70 hover:bg-surface-500'}`}
            style={{ left: `${left}%`, width: `${Math.max(1.5, w)}%` }}
            onMouseDown={(e) => begin(e, sub.id, 'move', sub)}
            title={`${sub.start.toFixed(2)}s – ${sub.end.toFixed(2)}s`}
          >
            {/* Left resize handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-l bg-white/20 hover:bg-white/40"
              onMouseDown={(e) => begin(e, sub.id, 'left', sub)}
            />

            <span className="truncate text-[9px] font-medium text-white/90 px-2.5 pointer-events-none">
              {sub.text}
            </span>

            {/* Right resize handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-r bg-white/20 hover:bg-white/40"
              onMouseDown={(e) => begin(e, sub.id, 'right', sub)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default CaptionTrack;
