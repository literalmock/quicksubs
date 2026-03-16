import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Untitled Video',
    trim: true,
  },
  language: {
    type: String,
    enum: ['english', 'hindi', 'hinglish'],
    default: 'hinglish',
  },
  originalUrl: {
    type: String,
    required: true,
  },
  originalPublicId: {
    type: String,
  },
  // Lightweight preview for editor playback (stored in R2)
  previewUrl: {
    type: String,
    default: null,
  },
  previewPublicId: {
    type: String,
    default: null,
  },
  // Extracted audio URL (stored in R2)
  audioUrl: {
    type: String,
    default: null,
  },
  audioPublicId: {
    type: String,
    default: null,
  },
  outputUrl: {
    type: String,
    default: null,
  },
  outputPublicId: {
    type: String,
    default: null,
  },
  transcription: {
    type: String,
    default: null,
  },
  subtitleSrt: {
    type: String,
    default: null,
  },
  subtitleAss: {
    type: String,
    default: null,
  },
  transcriptionQuality: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  transcriptionEngine: {
    type: String,
    default: 'cloudinary',
  },
  status: {
    type: String,
    enum: ['uploading', 'queued', 'processing', 'completed', 'failed'],
    default: 'uploading',
  },
  errorMessage: {
    type: String,
    default: null,
  },
  // Local path of cached audio file (for workers)
  cachedAudioPath: {
    type: String,
    default: null,
  },
  // Consecutive failure counter
  failureCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

export default mongoose.models.Video || mongoose.model('Video', videoSchema);
