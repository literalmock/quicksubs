import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getUploadSignature,
  registerVideo,
  uploadLocalVideo,
  listVideos,
  getVideoStatus,
  streamVideoSource,
  retranscribeVideo,
  deleteVideo,
} from '../controllers/videoController.js';
import { saveSubtitles, renderVideo } from '../controllers/subtitleController.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Mullter setup for local uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.get('/upload-signature', protect, getUploadSignature);
router.post('/register', protect, registerVideo);
router.post('/upload-local', protect, upload.single('file'), uploadLocalVideo);
router.get('/list', protect, listVideos);
router.get('/status/:id', protect, getVideoStatus);
router.get('/source/:id', streamVideoSource); // Made public to allow cross-origin streaming without auth headers
router.delete('/:id', protect, deleteVideo);
router.post('/:id/retranscribe', protect, retranscribeVideo);

// Subtitle actions
router.post('/save-subtitles', protect, saveSubtitles);
router.post('/render', protect, renderVideo);

export default router;
