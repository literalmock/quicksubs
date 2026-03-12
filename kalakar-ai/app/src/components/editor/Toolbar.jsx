import { Link } from 'react-router-dom';

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const phaseLabel = (phase) => {
  if (phase === 'saving') return 'Saving…';
  if (phase === 'rendering') return 'Rendering…';
  return 'Processing…';
};

const Toolbar = ({ isPlaying, onTogglePlay, onExport, onExportSRT, saving, exportPhase, outputUrl, currentTime, duration, canExport }) => (
  <header className="h-12 flex items-center justify-between px-4 bg-surface-800 border-b border-surface-700 shrink-0 select-none">
    {/* Left */}
    <div className="flex items-center gap-3">
      <Link
        to="/dashboard"
        className="flex items-center gap-1.5 text-sm text-surface-300 hover:text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        Back
      </Link>
      <div className="w-px h-5 bg-surface-700" />
      <span className="text-sm font-semibold text-surface-200 tracking-tight">QuickSubs Editor</span>
    </div>

    {/* Center – playback */}
    <div className="flex items-center gap-2">
      <button
        onClick={onTogglePlay}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-700 hover:bg-surface-600 transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <span className="text-xs text-surface-400 font-mono w-28 text-center tabular-nums">
        {fmt(currentTime)} / {fmt(duration)}
      </span>
    </div>

    {/* Right – export + download */}
    <div className="flex items-center gap-2">
      {exportPhase === 'done' && outputUrl && (
        <a
          href={outputUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors"
        >
          Download
        </a>
      )}

      <button
        onClick={onExportSRT}
        disabled={!canExport}
        title="Export captions as SRT file"
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-700 hover:bg-surface-600 disabled:bg-surface-700 disabled:text-surface-600 disabled:cursor-not-allowed transition-colors text-surface-300 hover:text-white"
      >
        SRT
      </button>

      <button
        onClick={onExport}
        disabled={saving || !canExport}
        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 transition-colors"
      >
        {saving ? phaseLabel(exportPhase) : exportPhase === 'done' ? 'Re-export' : 'Export'}
      </button>
    </div>
  </header>
);

export default Toolbar;
