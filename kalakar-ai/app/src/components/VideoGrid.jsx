const VideoGrid = ({ children, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-surface-800/60 rounded-2xl border border-surface-700 overflow-hidden"
          >
            <div className="aspect-video bg-gradient-to-r from-surface-700 to-surface-800 skeleton-loading" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-surface-700 rounded skeleton-loading" />
              <div className="h-3 bg-surface-700 rounded w-3/4 skeleton-loading" />
              <div className="flex gap-2 pt-2">
                <div className="flex-1 h-8 bg-surface-700 rounded skeleton-loading" />
                <div className="flex-1 h-8 bg-surface-700 rounded skeleton-loading" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  );
};

export default VideoGrid;
