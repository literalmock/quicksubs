import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import VideoCard from '../components/VideoCard';

const Dashboard = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    try {
      const { data } = await api.get('/video/list');
      setVideos(data.videos);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    // Poll every 10s for status updates
    const interval = setInterval(fetchVideos, 10000);
    return () => clearInterval(interval);
  }, [fetchVideos]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Your Videos</h2>
          <p className="text-surface-500 text-sm mt-1">
            {videos.length} video{videos.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <a
          href="/upload"
          className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-sm font-medium rounded-xl transition-all duration-200"
        >
          + Upload Video
        </a>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-800/60 rounded-2xl border border-surface-700 overflow-hidden animate-pulse">
              <div className="aspect-video bg-surface-700" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-surface-700 rounded w-3/4" />
                <div className="h-3 bg-surface-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-6xl mb-4 block">🎬</span>
          <h3 className="text-lg font-medium mb-2">No videos yet</h3>
          <p className="text-surface-500 text-sm mb-6">Upload your first video to get started with AI captions.</p>
          <a
            href="/upload"
            className="inline-flex px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl transition-all hover:from-primary-500 hover:to-primary-400"
          >
            Upload Video
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
