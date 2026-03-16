import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Toolbar from '../components/editor/Toolbar';
import VideoCanvas from '../components/editor/VideoCanvas';
import CaptionPropertiesPanel from '../components/editor/CaptionPropertiesPanel';
import Timeline from '../components/editor/Timeline';
import {
  DEFAULT_STYLE,
  findActiveSubtitle,
  generateSeedSubtitles,
  normalizeSubtitle,
  normalizeToLatin,
  parseSrtToSubtitles,
  positionToYPct,
  subtitlesToAss,
  subtitlesToSrt,
} from '../utils/subtitles';
import { downloadSRT } from '../utils/exportSRT';

const SEED_DURATION = 12;

const VideoEditor = () => {
  const { id } = useParams();
  const videoRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsDurationSync, setNeedsDurationSync] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retranscribing, setRetranscribing] = useState(false);
  const [exportPhase, setExportPhase] = useState('');
  const [error, setError] = useState('');

  const selectedSubtitle = useMemo(
    () => subtitles.find((s) => s.id === selectedId) || subtitles[0] || null,
    [subtitles, selectedId]
  );

  const activeSubtitle = useMemo(
    () => findActiveSubtitle(subtitles, currentTime),
    [subtitles, currentTime]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/video/status/${id}`);
        setVideo(data.video);

        const parsed = data.video.subtitleSrt
          ? parseSrtToSubtitles(data.video.subtitleSrt)
          : generateSeedSubtitles(data.video.transcription || '', SEED_DURATION);

        setSubtitles(parsed);
        setSelectedId(parsed[0]?.id || null);
        setNeedsDurationSync(!data.video.subtitleSrt);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    let raf;
    const tick = () => {
      const v = videoRef.current;
      if (v && !v.paused) setCurrentTime(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    if (isPlaying) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        seek(Math.max(0, (videoRef.current?.currentTime || 0) - 5));
      } else if (e.code === 'ArrowRight') {
        seek(Math.min(duration, (videoRef.current?.currentTime || 0) + 5));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((t) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = t;
      setCurrentTime(t);
    }
  }, []);

  const updateSubtitle = useCallback((uid, patch) => {
    setSubtitles((prev) =>
      prev
        .map((s) =>
          s.id === uid
            ? normalizeSubtitle({
                ...s,
                ...patch,
                text: patch.text !== undefined ? normalizeToLatin(patch.text) : s.text,
              })
            : s
        )
        .sort((a, b) => a.start - b.start)
    );
  }, []);

  const updateSubtitleStyle = useCallback((uid, patch) => {
    setSubtitles((prev) =>
      prev.map((s) => {
        const merged = { ...s.style, ...patch };
        if (patch.position && patch.position !== 'custom') {
          merged.yPct = positionToYPct(patch.position);
          merged.xPct = 0.5;
        }
        return normalizeSubtitle({ ...s, style: merged });
      })
    );
  }, []);

  const addSubtitle = useCallback(() => {
    const last = subtitles[subtitles.length - 1];
    const start = last ? Math.min(duration || 9999, last.end + 0.2) : 0;
    const end = Math.min(duration || start + 2, start + 2);
    const next = normalizeSubtitle({
      id: Date.now(),
      start,
      end,
      text: 'new caption',
      style: selectedSubtitle?.style || DEFAULT_STYLE,
    });
    setSubtitles((prev) => [...prev, next].sort((a, b) => a.start - b.start));
    setSelectedId(next.id);
  }, [subtitles, duration, selectedSubtitle]);

  const deleteSubtitle = useCallback(
    (uid) => {
      setSubtitles((prev) => {
        const next = prev.filter((s) => s.id !== uid);
        if (selectedId === uid) setSelectedId(next[0]?.id || null);
        return next;
      });
    },
    [selectedId]
  );

  const handleLoadedMetadata = useCallback((nativeW, nativeH) => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration || 0;
    setDuration(d);

    if (nativeW && nativeH) setIsVertical(nativeH > nativeW);

    if (!needsDurationSync || !subtitles.length || !d) return;
    const ratio = d / SEED_DURATION;
    setSubtitles((prev) =>
      prev.map((s) => normalizeSubtitle({ ...s, start: s.start * ratio, end: Math.min(d, s.end * ratio) }))
    );
    setNeedsDurationSync(false);
  }, [needsDurationSync, subtitles.length]);

  const handleRetranscribe = useCallback(async () => {
    if (!video?._id || retranscribing) return;
    if (!window.confirm('Re-generate captions? This will overwrite your current captions.')) return;

    try {
      setRetranscribing(true);
      setError('');
      await api.post(`/video/${video._id}/retranscribe`, {
        provider: 'elevenlabs'
      });

      const poll = setInterval(async () => {
        try {
          const { data } = await api.get(`/video/status/${video._id}`);
          if (data.video.status === 'completed') {
            clearInterval(poll);
            setRetranscribing(false);
            const parsed = data.video.subtitleSrt ? parseSrtToSubtitles(data.video.subtitleSrt) : [];
            setSubtitles(parsed);
            setSelectedId(parsed[0]?.id || null);
          } else if (data.video.status === 'failed') {
            clearInterval(poll);
            setRetranscribing(false);
            setError(data.video.errorMessage || 'Re-transcription failed');
          }
        } catch {
          // keep polling
        }
      }, 3000);
    } catch (err) {
      setRetranscribing(false);
      setError(err.response?.data?.message || 'Failed to start re-transcription');
    }
  }, [video, retranscribing]);

  const handleExportSRT = useCallback(() => {
    if (!subtitles || subtitles.length === 0) {
      setError('No captions to export');
      return;
    }
    try {
      const normalized = subtitles
        .map((s, i) => normalizeSubtitle({ ...s, id: i + 1 }, i))
        .sort((a, b) => a.start - b.start);
      const filename = video?.title ? `${video.title}.srt` : 'subtitles.srt';
      downloadSRT(normalized, filename);
      setError('');
    } catch (err) {
      setError(`Failed to export SRT: ${err.message}`);
    }
  }, [subtitles, video]);

  const pollRef = useRef(null);
  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleExport = useCallback(async () => {
    if (!video?._id || !subtitles.length) return;

    try {
      setSaving(true);
      setExportPhase('saving');
      setError('');

      const normalized = subtitles
        .map((s, i) => normalizeSubtitle({ ...s, id: i + 1, text: normalizeToLatin(s.text) }, i))
        .sort((a, b) => a.start - b.start);

      const vw = videoRef.current?.videoWidth || 1920;
      const vh = videoRef.current?.videoHeight || 1080;
      const ass = subtitlesToAss(normalized, vw, vh);
      const srt = subtitlesToSrt(normalized);

      const { data: saveData } = await api.post('/video/save-subtitles', {
        videoId: video._id,
        subtitles: normalized,
        ass,
        srt,
      });
      setVideo(saveData.video);

      setExportPhase('rendering');
      await api.post('/video/render', { videoId: video._id });

      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const { data: pollData } = await api.get(`/video/status/${video._id}`);
          setVideo(pollData.video);

          if (pollData.video.status === 'completed') {
            clearInterval(pollRef.current);
            setExportPhase('done');
            setSaving(false);
          } else if (pollData.video.status === 'failed') {
            clearInterval(pollRef.current);
            setExportPhase('');
            setError(pollData.video.errorMessage || 'Render failed');
            setSaving(false);
          }
        } catch {
          // keep polling
        }
      }, 3000);
    } catch (err) {
      setExportPhase('');
      setError(err.response?.data?.message || 'Export failed');
      setSaving(false);
    }
  }, [video, subtitles]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-900">
        <p className="text-sm text-surface-400 animate-pulse">Loading editor...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-900">
        <p className="text-sm text-red-400">Video not found.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-surface-950 text-white overflow-hidden z-[100] w-full h-full">
      <Toolbar
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onExport={handleExport}
        onExportSRT={handleExportSRT}
        saving={saving}
        exportPhase={exportPhase}
        outputUrl={video?.outputUrl}
        currentTime={currentTime}
        duration={duration}
        canExport={subtitles.length > 0}
      />

      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-xs text-red-300">
          {error}
        </div>
      )}

      {exportPhase === 'done' && !error && (
        <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/30 text-xs text-green-300 flex items-center gap-2">
          <span>Export complete - subtitles burned into video.</span>
          {video?.outputUrl && (
            <a
              href={video.outputUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-200"
            >
              Open video
            </a>
          )}
          <button
            onClick={() => setExportPhase('')}
            className="ml-auto text-green-500 hover:text-green-300"
          >
            x
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <aside className="w-64 border-r border-surface-700 bg-surface-900 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-700">
            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
              Subtitles
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRetranscribe}
                disabled={retranscribing}
                title="Re-generate captions from audio"
                className="text-[10px] px-2 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-surface-300 disabled:opacity-50 transition-colors"
              >
                {retranscribing ? '...' : '↻'}
              </button>
              <button
                onClick={addSubtitle}
                className="text-[10px] px-2 py-0.5 rounded bg-primary-600 hover:bg-primary-500 text-white transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-surface-800">
            {subtitles.map((sub) => (
              <button
                key={sub.id}
                onClick={() => {
                  setSelectedId(sub.id);
                  seek(sub.start);
                }}
                className={`w-full text-left px-3 py-2.5 transition-colors ${
                  selectedId === sub.id
                    ? 'bg-primary-600/15 border-l-2 border-primary-500'
                    : 'hover:bg-surface-800 border-l-2 border-transparent'
                }`}
              >
                <div className="text-[10px] text-surface-500 font-mono tabular-nums">
                  {sub.start.toFixed(2)}s - {sub.end.toFixed(2)}s
                </div>
                <div className="text-xs text-surface-200 truncate mt-0.5">{sub.text}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex items-center justify-center bg-surface-950 p-4 min-h-0 min-w-0 relative">
          <div
            className="w-full h-full flex items-center justify-center"
            style={isVertical ? { maxWidth: '520px' } : { maxWidth: '1000px' }}
          >
            <VideoCanvas
              videoSrc={video?._id ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/video/source/${video._id}?variant=preview` : video.previewUrl || video.originalUrl}
              videoRef={videoRef}
              activeSubtitle={activeSubtitle}
              onLoadedMetadata={handleLoadedMetadata}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onUpdateStyle={updateSubtitleStyle}
            />
          </div>
        </main>

        <aside className="w-80 border-l border-surface-700 bg-surface-900 shrink-0 min-h-0">
          <CaptionPropertiesPanel
            subtitle={selectedSubtitle}
            onUpdateSubtitle={updateSubtitle}
            onUpdateStyle={updateSubtitleStyle}
            onDelete={deleteSubtitle}
          />
        </aside>
      </div>

      <Timeline
        subtitles={subtitles}
        selectedId={selectedId}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onSelect={(idToSelect) => {
          setSelectedId(idToSelect);
          const found = subtitles.find((s) => s.id === idToSelect);
          if (found) seek(found.start);
        }}
        onSeek={seek}
        onUpdateSubtitle={updateSubtitle}
      />
    </div>
  );
};

export default VideoEditor;
