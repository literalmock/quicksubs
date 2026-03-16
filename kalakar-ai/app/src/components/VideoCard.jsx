import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const VideoCard = ({ video }) => {
  return (
    <div className="group card-hover glass rounded-2xl overflow-hidden">
      {/* Thumbnail / Preview */}
      <div className="aspect-video bg-gradient-to-br from-surface-800 to-surface-900 relative overflow-hidden border-b border-white/10">
        {video.status === 'completed' && video.outputUrl ? (
          <video
            src={video.outputUrl}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            muted
            preload="metadata"
            onMouseOver={(e) => e.target.play()}
            onMouseOut={(e) => {
              e.target.pause();
              e.target.currentTime = 0;
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-600/10 to-primary-500/5">
            <div className="text-center space-y-2">
              <span className="text-5xl block animate-float">🎬</span>
              {video.status === 'processing' && (
                <div className="flex items-center gap-2 text-primary-300 text-xs font-medium">
                  <div className="w-3 h-3 border-2 border-primary-300 border-t-transparent rounded-full animate-spin" />
                  Processing…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status badge - positioned in corner */}
        <div className="absolute top-4 right-4">
          <StatusBadge status={video.status} size="sm" />
        </div>

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
      </div>

      {/* Info */}
      <div className="p-5 space-y-4">
        {/* Title and Date */}
        <div className="min-h-[48px] flex flex-col justify-center">
          <h3 className="font-semibold text-sm text-white group-hover:text-primary-300 transition-colors line-clamp-2">
            {video.title || 'Untitled Video'}
          </h3>
          <p className="text-xs text-surface-500 mt-1">
            {new Date(video.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Error Message - if failed */}
        {video.status === 'failed' && video.errorMessage && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400 line-clamp-2" title={video.errorMessage}>
              {video.errorMessage}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Link
            to={`/editor/${video._id}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-surface-700/80 hover:bg-surface-700 text-white text-xs font-medium rounded-lg transition-all duration-200 active-scale border border-white/10 hover:border-white/20"
          >
            ✏️ Edit
          </Link>

          {video.status === 'completed' && video.outputUrl && (
            <a
              href={video.outputUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-xs font-medium rounded-lg transition-all duration-200 active-scale border border-white/10"
            >
              ⬇️ Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
