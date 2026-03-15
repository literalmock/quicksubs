import mongoose from 'mongoose';

const betaCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  maxUses: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  uses: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

export default mongoose.models.BetaCode || mongoose.model('BetaCode', betaCodeSchema);
