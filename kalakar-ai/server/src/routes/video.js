import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import rateLimit from 'express-rate-limit';
import { getUploadSignature, registerVideo, uploadLocalVideo, listVideos, getVideoStatus, deleteVideo, retranscribeVideo, streamVideoSource } from '../controllers/videoController.js';
import { saveSubtitles, renderVideo } from '../controllers/subtitleController.js';
import { protect } from '../middleware/auth.js';
import { validate, subtitleRules, videoIdRule } from '../middleware/validate.js';

const router = Router();
const uploadDir = path.resolve(os.tmpdir(), 'quicksubs-r2-upload');

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
	storage: multer.diskStorage({
		destination: (_req, _file, cb) => cb(null, uploadDir),
		filename: (_req, file, cb) => {
			const ext = path.extname(file.originalname) || '.mp4';
			const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '-');
			cb(null, `${Date.now()}-${base}${ext}`);
		},
	}),
	limits: { fileSize: 250 * 1024 * 1024 },
});

const videoWriteLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 40,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Too many video actions, please try again later' },
});

// ── Video CRUD ────────────────────────────────────────
router.get('/upload-signature', protect, videoWriteLimiter, getUploadSignature);
router.post('/register', protect, videoWriteLimiter, registerVideo);
router.post('/upload-local', protect, videoWriteLimiter, upload.single('file'), uploadLocalVideo);
router.get('/list', protect, listVideos);
router.get('/status/:id', protect, getVideoStatus);
router.get('/source/:id', protect, streamVideoSource);
router.delete('/:id', protect, videoWriteLimiter, deleteVideo);
router.post('/:id/retranscribe', protect, videoWriteLimiter, retranscribeVideo);

// ── Subtitle actions ──────────────────────────────────
router.post('/save-subtitles', protect, videoWriteLimiter, validate(subtitleRules), saveSubtitles);
router.post('/render', protect, videoWriteLimiter, validate(videoIdRule), renderVideo);

export default router;
