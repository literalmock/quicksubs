const ProcessingProgress = ({ progress = 0, status = 'processing', message }) => {
  const statusMessages = {
    uploading: 'Uploading video...',
    processing: 'Processing video...',
    extracting: 'Extracting audio...',
    transcribing: 'Generating transcript...',
    syncing: 'Syncing subtitles...',
    completing: 'Finalizing...',
  };

  const displayMessage = message || statusMessages[status] || 'Processing...';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-surface-300">{displayMessage}</p>
        <p className="text-xs text-surface-500">{Math.round(progress)}%</p>
      </div>
      <div className="w-full h-2 bg-surface-700/50 rounded-full overflow-hidden border border-surface-600/50">
        <div
          className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex gap-1 text-[10px] text-surface-500">
        <span>Processing step {Math.ceil(progress / 25)} of 4</span>
      </div>
    </div>
  );
};

export default ProcessingProgress;
