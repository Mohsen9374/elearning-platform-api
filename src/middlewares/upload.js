const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const ALLOWED_IMAGE_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const imageStorage = multer.diskStorage({
  destination(req, file, cb) {
    const now = new Date();
    // Fixed: original code used getDay() (weekday 0–6) instead of getDate() (day of month).
    const dir = path.join(
      config.upload.dir,
      'images',
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    // Random name: never trust the client's filename.
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ALLOWED_IMAGE_TYPES[file.mimetype]}`);
  },
});

function imageFilter(req, file, cb) {
  // Fixed: original filter called cb() twice.
  if (ALLOWED_IMAGE_TYPES[file.mimetype]) return cb(null, true);
  return cb(ApiError.badRequest('Only PNG, JPEG and WEBP images are allowed'));
}

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: config.upload.maxImageSize }, // Fixed: was 1024 bytes (1 KB), not 1 MB
});

/** Converts an absolute upload path into a public URL for the current request. */
function publicUrl(req, filePath) {
  const relative = path.relative(config.upload.dir, filePath).split(path.sep).join('/');
  return `${req.protocol}://${req.get('host')}/uploads/${relative}`;
}

module.exports = { uploadImage, publicUrl };
