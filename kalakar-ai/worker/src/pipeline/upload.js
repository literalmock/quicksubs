import cloudinary from '../config/cloudinary.js';

/**
 * Uploads the processed video to Cloudinary.
 * @param {string} filePath – local path to the captioned video
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadProcessed = async (filePath) => {
  console.log('☁️  Uploading processed video to Cloudinary…');

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'video',
    folder: 'quicksubs/processed',
  });

  console.log('✅ Upload complete:', result.secure_url);
  return { url: result.secure_url, publicId: result.public_id };
};
