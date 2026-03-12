import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Scissors, MousePointer2 } from 'lucide-react';
import CaptionTrack from './CaptionTrack';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const fmtRuler = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const Timeline = ({
  subtitles,
  duration,
  currentTime,
  isPlaying,
  selectedId,
  onSelect,
  onUpdateSubtitle,
  onSeek,
}) => {
  const trackRef = useRef(null);
  const scrollRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!isPlaying || !duration || !scrollRef.current) return;
    const container = scrollRef.current;
    
    // Current playhead in pixels relative to the scroll container's full inner width
    const playheadPx = (currentTime / duration) * container.scrollWidth;
    
    const viewWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    
    // If playhead crosses 80% of view or is behind left edge, center it smoothly
    if (playheadPx > scrollLeft + viewWidth * 0.8 || playheadPx < scrollLeft) {
      container.scrollTo({ left: Math.max(0, playheadPx - viewWidth / 2), behavior: 'smooth' });
    }
  }, [currentTime, duration, isPlaying]);

  const handleClick = useCallback(
    (e) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const x = e.clientX - rect.left;
      onSeek(clamp((x / rect.width) * duration, 0, duration));
    },
    [duration, onSeek]
  );

  // Ruler tick marks
  const ticks = [];
  if (duration > 0) {
    // dynamically adjust step size based on zoom and duration to avoid overlapping text
    const visibleDuration = duration / zoom;
    const step = visibleDuration <= 15 ? 2 : visibleDuration <= 60 ? 5 : visibleDuration <= 180 ? 10 : 30;
    for (let t = 0; t <= duration; t += step) ticks.push(Math.round(t));
  }

  const playheadPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-48 pb-4 bg-surface-800 border-t border-surface-700 shrink-0 flex flex-col select-none box-border">

      {/* Zoom Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-900 border-b border-surface-700/60 shadow-sm shrink-0 z-10 relative">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-200 tracking-wider uppercase">
            Timeline
          </span>
          <div className="h-4 w-px bg-surface-700 mx-2"></div>
          {/* Optional visual tools */}
          <button className="text-surface-400 hover:text-primary-400 transition-colors p-1.5 rounded hover:bg-surface-800" title="Select (V)">
            <MousePointer2 className="w-3.5 h-3.5" />
          </button>
          <button className="text-surface-400 hover:text-primary-400 transition-colors p-1.5 rounded hover:bg-surface-800" title="Split (S)">
            <Scissors className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 bg-surface-950 px-3 py-1.5 rounded-lg border border-surface-800 shadow-inner">
          <button 
            onClick={() => setZoom(z => Math.max(1, z - 0.5))} 
            className="text-surface-400 hover:text-white transition-colors flex items-center justify-center p-1 rounded hover:bg-surface-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <div className="relative flex items-center w-28 group">
            <input
              type="range"
              min="1"
              max="10"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-surface-700 rounded-full appearance-none outline-none cursor-pointer accent-primary-500 hover:accent-primary-400 transition-all"
            />
          </div>

          <button 
            onClick={() => setZoom(z => Math.min(10, z + 0.5))} 
            className="text-surface-400 hover:text-white transition-colors flex items-center justify-center p-1 rounded hover:bg-surface-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar">
        <div style={{ width: `${zoom * 100}%` }} className="h-full flex flex-col min-w-full relative pb-4">
          
          {/* Ruler */}
          <div className="relative h-5 bg-surface-900/50 border-b border-surface-700 overflow-hidden shrink-0">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0.5 text-[9px] text-surface-500 -translate-x-1/2"
                style={{ left: `${(t / duration) * 100}%` }}
              >
                {fmtRuler(t)}
              </span>
            ))}
            {/* Playhead on ruler */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent z-20 pointer-events-none"
              style={{ left: `${playheadPct}%` }}
            />
          </div>

          {/* Tracks area */}
          <div
            ref={trackRef}
            className="flex-1 relative cursor-pointer pb-6 mt-1"
            onClick={handleClick}
          >
            {/* Video track (decorative) */}
            <div className="h-7 px-2 flex items-center shrink-0">
              <div className="w-full h-4 rounded bg-surface-700/60 flex items-center px-2">
                <span className="text-[9px] text-surface-500 font-medium tracking-wide uppercase">
                  Video
                </span>
              </div>
            </div>

            {/* Caption track */}
            <div className="px-0 mt-1">
              <div className="flex items-center h-5 px-2">
                <span className="text-[9px] text-surface-500 font-medium tracking-wide uppercase">
                  Captions
                </span>
              </div>
              <CaptionTrack
                subtitles={subtitles}
                duration={duration}
                selectedId={selectedId}
                onSelect={onSelect}
                onUpdateSubtitle={onUpdateSubtitle}
              />
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[1px] bg-accent z-10 pointer-events-none"
              style={{ left: `${playheadPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
