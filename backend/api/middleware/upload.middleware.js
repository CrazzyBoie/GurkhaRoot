import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Use memory storage — files are streamed directly to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only JPEG, PNG, and WebP allowed.'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

/**
 * Initialise Cloudinary lazily from env vars (safe for serverless cold starts).
 */
const getCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
  return cloudinary;
};

/**
 * Upload a single buffer to Cloudinary via a readable stream.
 * Returns the secure HTTPS URL.
 */
const uploadToCloudinary = (buffer, mimetype) =>
  new Promise((resolve, reject) => {
    const cld    = getCloudinary();
    const stream = cld.uploader.upload_stream(
      {
        folder:         'gurkha-roots/products',
        resource_type:  'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

/**
 * After multer puts files in memory, upload each to Cloudinary
 * and attach the public HTTPS URLs to req.imageUrls.
 */
export const handleFirebaseUpload = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      req.imageUrls = [];
      return next();
    }

    const urls = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, file.mimetype))
    );

    req.imageUrls = urls;
    next();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Failed to upload images' });
  }
};

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')  return res.status(400).json({ message: 'File too large. Max 5MB.' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ message: 'Too many files. Max 5.' });
    return res.status(400).json({ message: err.message });
  }
  if (err) return res.status(400).json({ message: err.message });
  next();
};

export default upload;
