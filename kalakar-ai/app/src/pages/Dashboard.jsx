import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import VideoCard from '../components/VideoCard';
import VideoGrid from '../components/VideoGrid';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, fetchUser } = useAuth();
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
    fetchUser();
    fetchVideos();
    // Poll every 10s for status updates
    const interval = setInterval(fetchVideos, 10000);
    return () => clearInterval(interval);
  }, [fetchVideos, fetchUser]);

  const processingCount = videos.filter((v) => v.status === 'processing').length;
  const completedCount = videos.filter((v) => v.status === 'completed').length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Your Videos</h2>
            <p className="text-surface-400 text-sm">
              {videos.length} video{videos.length !== 1 ? 's' : ''} total
              {processingCount > 0 && ` • ${processingCount} processing`}
              {completedCount > 0 && ` • ${completedCount} completed`}
            </p>
          </div>
          <a
            href="/upload"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl transition-all duration-300 active-scale border border-white/10 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 whitespace-nowrap"
          >
            <span>➕</span> Upload Video
          </a>
        </div>

        {/* Stats Cards - only show if there are videos */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Total Videos */}
            <div className="glass-sm rounded-xl p-4 space-y-2 border border-white/10">
              <p className="text-xs text-surface-400 font-medium">Total Videos</p>
              <p className="text-2xl font-bold text-white">{videos.length}</p>
            </div>

            {/* Processing */}
            {processingCount > 0 && (
              <div className="glass-sm rounded-xl p-4 space-y-2 border border-purple-500/30 bg-purple-600/10">
                <p className="text-xs text-purple-300 font-medium">Processing</p>
                <p className="text-2xl font-bold text-purple-300">{processingCount}</p>
              </div>
            )}

            {/* Completed */}
            {completedCount > 0 && (
              <div className="glass-sm rounded-xl p-4 space-y-2 border border-green-500/30 bg-green-600/10">
                <p className="text-xs text-green-300 font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-300">{completedCount}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="animate-fade-in">
          <VideoGrid loading={true} />
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon="🎬"
          title="No videos yet"
          description="Upload your first video to get started with AI-powered captions. It takes just a few seconds to process!"
          action={
            <a
              href="/upload"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl transition-all duration-300 active-scale border border-white/10"
            >
              <span>🎥</span> Start Uploading
            </a>
          }
        />
      ) : (
        <div className="animate-fade-in">
          <VideoGrid>
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </VideoGrid>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
