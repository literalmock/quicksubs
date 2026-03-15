import { transliterate } from 'transliteration';
import Video from '../models/Video.js';
import { videoQueue } from '../config/redis.js';
import { serializeVideoForClient } from '../utils/videoUrls.js';

// ── Helpers ───────────────────────────────────────────

const formatSrtTime = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.round((safe % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

const jsonToSrt = (subtitles) =>
  subtitles
    .map((item, index) => {
      const text = transliterate(String(item.text || '').trim())
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return `${index + 1}\n${formatSrtTime(item.start)} --> ${formatSrtTime(item.end)}\n${text}`;
    })
    .join('\n\n');

const subtitlesToTranscript = (subtitles) =>
  subtitles
    .map((s) => transliterate(String(s.text || '')))
    .join(' ')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ── Save Subtitles (instant — no FFmpeg re-render) ────
export const saveSubtitles = async (req, res, next) => {
  const { videoId, subtitles, ass, srt } = req.body;

  try {
    const video = await Video.findOne({ _id: videoId, userId: req.user._id });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    video.subtitleSrt = srt || jsonToSrt(subtitles);
    video.subtitleAss = ass || null;
    video.transcription = subtitlesToTranscript(subtitles);
    await video.save();

    res.json({ success: true, video: serializeVideoForClient(req, video) });
  } catch (err) {
    next(err);
  }
};

// ── Render Video (queues FFmpeg burn via BullMQ worker) ──
export const renderVideo = async (req, res, next) => {
  const { videoId } = req.body;

  try {
    const video = await Video.findOne({ _id: videoId, userId: req.user._id });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (!video.subtitleSrt && !video.subtitleAss) {
      return res.status(400).json({
        success: false,
        message: 'Save subtitles before rendering',
      });
    }

    video.status = 'processing';
    video.errorMessage = null;
    await video.save();

    await videoQueue.add('render-subtitles', {
      videoId: video._id.toString(),
      originalUrl: video.originalUrl,
      ass: video.subtitleAss || null,
      srt: video.subtitleSrt,
    });

    res.json({ success: true, video: serializeVideoForClient(req, video) });
  } catch (err) {
    next(err);
  }
};
