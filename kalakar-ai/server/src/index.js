import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/video.js';

const app = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

// ── Security headers ───────────────────────────────────
app.use(helmet());

// ── Request logging ────────────────────────────────────
app.use(morgan(isDev ? 'dev' : 'combined'));

// ── CORS ───────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body parsing ───────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// ── Static uploaded originals for editor preview ──────
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// ── Rate limiting ──────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

// ── Routes ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/auth', authLimiter, authRoutes);
app.use('/video', apiLimiter, videoRoutes);

// ── Global Error Handler ───────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: isDev ? err.message : (status < 500 ? err.message : 'Internal server error'),
  });
});

// ── Start ──────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

start();
