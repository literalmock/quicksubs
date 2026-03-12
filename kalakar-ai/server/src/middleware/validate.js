import mongoose from 'mongoose';

/**
 * Returns a middleware that validates required body fields.
 * Responds 400 with the first missing/invalid field message.
 *
 * Usage:
 *   router.post('/save-subtitles', protect, validate([
 *     { field: 'videoId', check: (v) => !!v, message: 'videoId is required' },
 *     { field: 'subtitles', check: (v) => Array.isArray(v) && v.length > 0, message: '...' },
 *   ]), saveSubtitles);
 */
export const validate = (rules) => (req, res, next) => {
  for (const rule of rules) {
    const value = req.body?.[rule.field];
    if (!rule.check(value)) {
      return res.status(400).json({ success: false, message: rule.message });
    }
  }
  next();
};

/** Validates that a string is a valid MongoDB ObjectId */
export const isObjectId = (value) => mongoose.isValidObjectId(value);

/** Shared ruleset — subtitles array */
export const subtitleRules = [
  {
    field: 'videoId',
    check: isObjectId,
    message: 'videoId must be a valid ID',
  },
  {
    field: 'subtitles',
    check: (v) => Array.isArray(v) && v.length > 0,
    message: 'subtitles must be a non-empty array',
  },
];

/** Shared ruleset — videoId only */
export const videoIdRule = [
  {
    field: 'videoId',
    check: isObjectId,
    message: 'videoId must be a valid ID',
  },
];
