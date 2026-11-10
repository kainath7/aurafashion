import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret' &&
    process.env.CLOUDINARY_API_KEY !== '123456789012345'
  );
};

export const uploadToCloudinary = async (fileBuffer, folder = 'aura_fashion') => {
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            isLocalFallback: false
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  // Fallback storage for local / offline development when cloud keys aren't provided
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, fileBuffer);

  const backendBase = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');

  return {
    url: `${backendBase}/uploads/${filename}`,
    public_id: `local_${filename}`,
    isLocalFallback: true
  };
};

export const deleteFromCloudinary = async (public_id) => {
  if (!public_id) return true;
  try {
    if (public_id.startsWith('local_')) {
      const filename = public_id.replace(/^local_/, '');
      const uploadsDir = path.join(__dirname, '../../uploads');
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    }
    if (isCloudinaryConfigured()) {
      return await cloudinary.uploader.destroy(public_id);
    }
  } catch (err) {
    console.warn('[Image Deletion Warning] Failed to delete image asset:', err.message);
  }
  return true;
};

export default cloudinary;
