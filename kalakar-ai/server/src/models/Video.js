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
  previewUrl: {
    type: String,
    default: null,
  },
  previewPublicId: {
    type: String,
    default: null,
  },
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
  cachedAudioPath: {
    type: String,
    default: null,
  },
  failureCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

export default mongoose.models.Video || mongoose.model('Video', videoSchema);
