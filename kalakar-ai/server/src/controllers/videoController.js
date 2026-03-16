import cloudinary from '../config/cloudinary.js';
import { videoQueue, redisConnection } from '../config/redis.js';
import Video from '../models/Video.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { serializeVideoForClient } from '../utils/videoUrls.js';
import { uploadOriginalToR2 } from '../config/r2.js';

const VALID_LANGUAGES = ['english', 'hindi', 'hinglish'];

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

// ── Upload video to local storage ──
export const uploadLocalVideo = async (req, res, next) => {
  try {
    const { title, language: rawLang } = req.body;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'Video file is required' });
    }

    const language = VALID_LANGUAGES.includes(rawLang) ? rawLang : 'hinglish';
    
    // 1. Upload the local file to R2
    console.log(`📦 uploadLocalVideo: Moving large file to Cloudflare R2: ${uploadedFile.originalname} (${uploadedFile.size} bytes)`);
    const r2Result = await uploadOriginalToR2({
      filePath: uploadedFile.path,
      originalName: uploadedFile.originalname,
      mimeType: uploadedFile.mimetype,
    });

    // 2. Register the video with the R2 URL
    const video = await Video.create({
      userId: req.user._id,
      title: title || uploadedFile.originalname || 'Untitled Video',
      language,
      originalUrl: r2Result.url,
      originalPublicId: r2Result.key, // Store R2 key for potential deletion later
      status: 'queued',
    });

    // 3. Queue the job
    await videoQueue.add('process-video', {
      videoId: video._id.toString(),
      originalUrl: r2Result.url,
      originalPublicId: r2Result.key,
      language,
    });

    // 4. Delete the local temporary file
    try {
      fs.unlinkSync(uploadedFile.path);
      console.log(`✅ uploadLocalVideo: Local temp file deleted: ${uploadedFile.path}`);
    } catch (err) {
      console.warn(`⚠️ uploadLocalVideo: Failed to delete local temp file: ${err.message}`);
    }

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

    if ((video.status === 'completed' && video.outputUrl) || video.status === 'failed') {
      await redisConnection.set(cacheKey, JSON.stringify(video), 'EX', 300);
    }

    res.json({ success: true, video: serializeVideoForClient(req, video) });
  } catch (err) {
    next(err);
  }
};

// ── Stream preview/original video via API (restored same-origin playback) ──
export const streamVideoSource = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).lean();

    if (!video) {
        return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const variant = req.query.variant === 'preview' ? 'preview' : 'original';
    const sourceUrl = variant === 'preview' ? (video?.previewUrl || video?.originalUrl) : video?.originalUrl;

    if (!sourceUrl) {
      return res.status(404).json({ success: false, message: 'Video source not found' });
    }

    if (sourceUrl.startsWith('http')) {
      const upstream = await axios.get(sourceUrl, {
        responseType: 'stream',
        headers: req.headers.range ? { Range: req.headers.range } : {},
        validateStatus: () => true,
      });

      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

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

    const fullPath = path.resolve(sourceUrl);
    if (fs.existsSync(fullPath)) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.sendFile(fullPath);
    }

    return res.status(404).json({ success: false, message: 'Video source not found' });
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

    const { provider = 'groq', language } = req.body || {};
    const chosenLanguage = VALID_LANGUAGES.includes(language)
      ? language
      : video.language || 'hinglish';

    const cacheKey = `video:${video._id}:${req.user._id}`;
    await redisConnection.del(cacheKey);

    await video.updateOne({
      status: 'queued',
      subtitleSrt: '',
      transcription: '',
      language: chosenLanguage,
      failureCount: 0,
    });

    await videoQueue.add('process-video', {
      videoId: video._id.toString(),
      originalUrl: video.originalUrl,
      originalPublicId: video.originalPublicId,
      language: chosenLanguage,
      provider,
    });

    res.json({
      success: true,
      message: `Re-transcription queued (provider: ${provider}, language: ${chosenLanguage})`,
    });
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
