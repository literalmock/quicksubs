import { Link } from 'react-router-dom';

const statusConfig = {
  uploading: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Uploading' },
  queued: { color: 'bg-blue-500/20 text-blue-400', label: 'Queued' },
  processing: { color: 'bg-purple-500/20 text-purple-400', label: 'Processing' },
  completed: { color: 'bg-green-500/20 text-green-400', label: 'Completed' },
  failed: { color: 'bg-red-500/20 text-red-400', label: 'Failed' },
};

const VideoCard = ({ video }) => {
  const status = statusConfig[video.status] || statusConfig.queued;

  return (
    <div className="bg-surface-800/60 rounded-2xl border border-surface-700 overflow-hidden hover:border-surface-600 transition-all duration-300 group">
      {/* Thumbnail / Preview */}
      <div className="aspect-video bg-surface-900 relative overflow-hidden">
        {video.status === 'completed' && video.outputUrl ? (
          <video
            src={video.outputUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
            onMouseOver={(e) => e.target.play()}
            onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl">🎬</span>
              {video.status === 'processing' && (
                <div className="mt-3 flex items-center gap-2 text-purple-400 text-sm">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Processing…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-sm truncate mb-2 group-hover:text-primary-400 transition-colors">
          {video.title || 'Untitled Video'}
        </h3>
        <p className="text-xs text-surface-500">
          {new Date(video.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </p>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            to={`/editor/${video._id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            ✏️ Edit Captions
          </Link>

          {video.status === 'completed' && video.outputUrl && (
            <a
              href={video.outputUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ⬇️ Download
            </a>
          )}
        </div>

        {video.status === 'failed' && video.errorMessage && (
          <p className="mt-2 text-xs text-red-400 truncate" title={video.errorMessage}>
            Error: {video.errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
