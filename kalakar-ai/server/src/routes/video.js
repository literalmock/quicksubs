import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUploadSignature, registerVideo, uploadLocalVideo, listVideos, getVideoStatus, deleteVideo, retranscribeVideo } from '../controllers/videoController.js';
import { saveSubtitles, renderVideo } from '../controllers/subtitleController.js';
import { protect } from '../middleware/auth.js';
import { validate, subtitleRules, videoIdRule } from '../middleware/validate.js';

const router = Router();
const uploadDir = path.resolve(process.cwd(), 'uploads', 'originals');

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

// ── Video CRUD ────────────────────────────────────────
router.get('/upload-signature', protect, getUploadSignature);
router.post('/register', protect, registerVideo);
router.post('/upload-local', protect, upload.single('file'), uploadLocalVideo);
router.get('/list', protect, listVideos);
router.get('/status/:id', protect, getVideoStatus);
router.delete('/:id', protect, deleteVideo);
router.post('/:id/retranscribe', protect, retranscribeVideo);

// ── Subtitle actions ──────────────────────────────────
router.post('/save-subtitles', protect, validate(subtitleRules), saveSubtitles);
router.post('/render', protect, validate(videoIdRule), renderVideo);

export default router;
