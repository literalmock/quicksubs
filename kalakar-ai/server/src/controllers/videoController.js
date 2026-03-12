import cloudinary from '../config/cloudinary.js';
import { videoQueue, redisConnection } from '../config/redis.js';
import Video from '../models/Video.js';
import fs from 'fs';
import { serializeVideoForClient } from '../utils/videoUrls.js';

const VALID_LANGUAGES = ['english', 'hinglish'];

// ── Signed upload params for direct Cloudinary upload ──
export const getUploadSignature = (req, res, next) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'quicksubs/originals';
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET,
    );

    res.json({
      success: true,
      timestamp,
      signature,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (err) {
    next(err);
  }
};

// ── Register video after direct Cloudinary upload ─────
export const registerVideo = async (req, res, next) => {
  try {
    const { cloudinaryUrl, cloudinaryPublicId, title, language: rawLang } = req.body;

    if (!cloudinaryUrl || !cloudinaryPublicId) {
      return res.status(400).json({ success: false, message: 'Missing Cloudinary upload details' });
    }

    const language = VALID_LANGUAGES.includes(rawLang) ? rawLang : 'hinglish';

    const video = await Video.create({
      userId: req.user._id,
      title: title || 'Untitled Video',
      language,
      originalUrl: cloudinaryUrl,
      originalPublicId: cloudinaryPublicId,
      status: 'queued',
    });

    await videoQueue.add('process-video', {
      videoId: video._id.toString(),
      originalUrl: cloudinaryUrl,
      originalPublicId: cloudinaryPublicId,
      language,
    });

    res.status(201).json({ success: true, video: serializeVideoForClient(req, video) });
  } catch (err) {
    next(err);
  }
};

// ── Upload video to local storage when Cloudinary plan cap is exceeded ──
export const uploadLocalVideo = async (req, res, next) => {
  try {
    const { title, language: rawLang } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'Video file is required' });
    }

    const language = VALID_LANGUAGES.includes(rawLang) ? rawLang : 'hinglish';

    const video = await Video.create({
      userId: req.user._id,
      title: title || uploadedFile.originalname || 'Untitled Video',
      language,
      originalUrl: uploadedFile.path,
      status: 'queued',
    });

    await videoQueue.add('process-video', {
      videoId: video._id.toString(),
      originalUrl: uploadedFile.path,
      language,
    });

    res.status(201).json({ success: true, video: serializeVideoForClient(req, video) });
  } catch (err) {
    next(err);
  }
};

// ── List User Videos (paginated) ──────────────────────
export const listVideos = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      Video.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Video.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      success: true,
      videos: videos.map((video) => serializeVideoForClient(req, video)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get Video Status (Redis-cached) ───────────────────
export const getVideoStatus = async (req, res, next) => {
  try {
    const cacheKey = `video:${req.params.id}:${req.user._id}`;
    const cached = await redisConnection.get(cacheKey);

    if (cached) {
      const video = JSON.parse(cached);
      // Only serve cache for terminal states
      if (video.status === 'completed' || video.status === 'failed') {
        return res.json({ success: true, video: serializeVideoForClient(req, video) });
      }
    }

    const video = await Video.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Cache terminal states for 5 minutes — but only if outputUrl is present
    // (transcription-only completion has no outputUrl yet; render sets it later)
    if ((video.status === 'completed' && video.outputUrl) || video.status === 'failed') {
      await redisConnection.set(cacheKey, JSON.stringify(video), 'EX', 300);
    }

    res.json({ success: true, video: serializeVideoForClient(req, video) });
  } catch (err) {
    next(err);
  }
};

// ── Re-run transcription on an existing video ─────────
export const retranscribeVideo = async (req, res, next) => {
  try {
    const video = await Video.findOne({ _id: req.params.id, userId: req.user._id });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Clear the status cache so polling sees the queued/processing state immediately
    const cacheKey = `video:${video._id}:${req.user._id}`;
    await redisConnection.del(cacheKey);

    await video.updateOne({ status: 'queued', subtitleSrt: '', transcription: '' });

    await videoQueue.add('process-video', {
      videoId: video._id.toString(),
      originalUrl: video.originalUrl,
      originalPublicId: video.originalPublicId,
      language: video.language || 'hinglish',
    });

    res.json({ success: true, message: 'Re-transcription queued' });
  } catch (err) {
    next(err);
  }
};

// ── Delete Video ──────────────────────────────────────
export const deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (video.originalUrl && fs.existsSync(video.originalUrl)) {
      try { fs.unlinkSync(video.originalUrl); } catch { /* best-effort cleanup */ }
    }

    res.json({ success: true, message: 'Video deleted' });
  } catch (err) {
    next(err);
  }
};


