import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { signup, login, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

const authAttemptLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Too many requests, please try again later' },
});

router.post('/signup', authAttemptLimiter, signup);
router.post('/login', authAttemptLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
