import multer from 'multer';

// Keep files in memory; controllers stream the buffer to Cloudinary.
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
