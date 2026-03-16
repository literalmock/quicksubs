import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const requiredEnv = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_BASE_URL',
];

const missingEnv = requiredEnv.filter((name) => !process.env[name]);

const r2Enabled = missingEnv.length === 0;

const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '');
const sanitizeBaseName = (value) => String(value || 'video').replace(/[^a-zA-Z0-9_-]/g, '-');

const r2Client = r2Enabled
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

const publicBaseUrl = normalizeBaseUrl(process.env.R2_PUBLIC_BASE_URL);

export const isR2Url = (value) => Boolean(publicBaseUrl) && String(value || '').startsWith(publicBaseUrl);

const ensureR2Configured = () => {
  if (!r2Enabled) {
    throw new Error(`Cloudflare R2 is not configured. Missing env: ${missingEnv.join(', ')}`);
  }
};

export const uploadOriginalToR2 = async ({ filePath, originalName, mimeType }) => {
  ensureR2Configured();

  const ext = path.extname(originalName || filePath || '') || '.mp4';
  const base = sanitizeBaseName(path.basename(originalName || 'video', ext));
  const key = `originals/${Date.now()}-${base}${ext}`;

  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fs.createReadStream(filePath),
    ContentType: mimeType || 'video/mp4',
  }));

  return {
    key,
    url: `${publicBaseUrl}/${key}`,
  };
};

export const deleteFromR2 = async (key) => {
  ensureR2Configured();
  if (!key) return;

  await r2Client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }));
};
