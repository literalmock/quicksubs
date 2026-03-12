import path from 'path';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');

const isLocalUploadPath = (value) => {
  if (!value || typeof value !== 'string' || !path.isAbsolute(value)) return false;
  const relative = path.relative(uploadsRoot, value);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

export const toClientVideoUrl = (req, value) => {
  if (!isLocalUploadPath(value)) return value;

  const relative = path.relative(uploadsRoot, value).split(path.sep).join('/');
  return `${req.protocol}://${req.get('host')}/uploads/${relative}`;
};

export const serializeVideoForClient = (req, video) => {
  if (!video) return video;

  const plain = typeof video.toObject === 'function' ? video.toObject() : { ...video };
  plain.originalUrl = toClientVideoUrl(req, plain.originalUrl);
  return plain;
};