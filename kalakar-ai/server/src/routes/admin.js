import { Router } from 'express';
import { promoteBeta } from '../controllers/authController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/promote-beta', protect, requireAdmin, promoteBeta);

export default router;
