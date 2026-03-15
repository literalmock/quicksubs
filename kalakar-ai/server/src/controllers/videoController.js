import cloudinary from '../config/cloudinary.js';
import { videoQueue, redisConnection } from '../config/redis.js';
import Video from '../models/Video.js';
import fs from 'fs';
import axios from 'axios';
import { serializeVideoForClient } from '../utils/videoUrls.js';
import { deleteFromR2, isR2Url, uploadOriginalToR2 } from '../config/r2.js';
import { consumeVideoCreditForUser } from '../middleware/usage.js';

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

    const creditResult = await consumeVideoCreditForUser(req.user);
    if (!creditResult.ok) {
      return res.status(creditResult.status).json(creditResult.payload);
    }

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
  const uploadedFile = req.file;
  try {
    const { title, language: rawLang } = req.body;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'Video file is required' });
    }

    const language = VALID_LANGUAGES.includes(rawLang) ? rawLang : 'hinglish';

    const creditResult = await consumeVideoCreditForUser(req.user);
    if (!creditResult.ok) {
      return res.status(creditResult.status).json(creditResult.payload);
    }

    const uploadedToR2 = await uploadOriginalToR2({
      filePath: uploadedFile.path,
      originalName: uploadedFile.originalname,
      mimeType: uploadedFile.mimetype,
    });

    const video = await Video.create({
      userId: req.user._id,
      title: title || uploadedFile.originalname || 'Untitled Video',
      language,
      originalUrl: uploadedToR2.url,
      originalPublicId: uploadedToR2.key,
      status: 'queued',
    });

    await videoQueue.add('process-video', {
      videoId: video._id.toString(),
      originalUrl: uploadedToR2.url,
      originalPublicId: uploadedToR2.key,
      language,
    });

    res.status(201).json({ success: true, video: serializeVideoForClient(req, video) });
  } catch (err) {
    next(err);
  } finally {
    if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
      try { fs.unlinkSync(uploadedFile.path); } catch { /* best-effort cleanup */ }
    }
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

// ── Stream preview/original video via API (same-origin playback) ──
export const streamVideoSource = async (req, res, next) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    const variant = req.query.variant === 'preview' ? 'preview' : 'original';
    const sourceUrl = variant === 'preview' ? (video?.previewUrl || video?.originalUrl) : video?.originalUrl;

    if (!sourceUrl) {
      return res.status(404).json({ success: false, message: 'Video source not found' });
    }

    if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      const upstream = await axios.get(sourceUrl, {
        responseType: 'stream',
        headers: req.headers.range ? { Range: req.headers.range } : {},
        validateStatus: () => true,
      });

      const passthroughHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control',
        'etag',
        'last-modified',
      ];

      res.status(upstream.status);
      passthroughHeaders.forEach((name) => {
        const value = upstream.headers[name];
        if (value) res.setHeader(name, value);
      });

      upstream.data.pipe(res);
      return;
    }

    if (fs.existsSync(sourceUrl)) {
      return res.sendFile(sourceUrl);
    }

    return res.status(404).json({ success: false, message: 'Video source not found' });
  } catch (err) {
    next(err);
  }
};

// ── Re-run transcription on an existing video ─────────
export const retranscribeVideo = async (req, res, next) => {
  try {
    const requestedProvider = String(req.body?.transcriptionProvider || req.query?.provider || 'groq').toLowerCase();
    const transcriptionProvider = requestedProvider === 'azure' ? 'azure' : 'groq';

    const video = await Video.findOne({ _id: req.params.id, userId: req.user._id });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const creditResult = await consumeVideoCreditForUser(req.user);
    if (!creditResult.ok) {
      return res.status(creditResult.status).json(creditResult.payload);
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
      transcriptionProvider,
      audioUrl: video.audioUrl || null,
      audioPublicId: video.audioPublicId || null,
      previewUrl: video.previewUrl || null,
      previewPublicId: video.previewPublicId || null,
      transcriptionEngine: 'cloudinary',
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

    if (video.previewPublicId && isR2Url(video.previewUrl)) {
      try { await deleteFromR2(video.previewPublicId); } catch { /* best-effort cleanup */ }
    }

    if (video.originalPublicId && isR2Url(video.originalUrl)) {
      try { await deleteFromR2(video.originalPublicId); } catch { /* best-effort cleanup */ }
    } else if (video.originalUrl && fs.existsSync(video.originalUrl)) {
      try { fs.unlinkSync(video.originalUrl); } catch { /* best-effort cleanup */ }
    }

    res.json({ success: true, message: 'Video deleted' });
  } catch (err) {
    next(err);
  }
};


