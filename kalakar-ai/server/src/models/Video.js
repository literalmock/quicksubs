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
    enum: ['english', 'hinglish'],
    default: 'hinglish',
  },
  originalUrl: {
    type: String,
    required: true,
  },
  originalPublicId: {
    type: String,
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
  status: {
    type: String,
    enum: ['uploading', 'queued', 'processing', 'completed', 'failed'],
    default: 'uploading',
  },
  errorMessage: {
    type: String,
    default: null,
  },
}, { timestamps: true });

export default mongoose.model('Video', videoSchema);
