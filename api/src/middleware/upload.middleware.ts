import multer from 'multer';

// Explicit whitelist — no SVG (can embed scripts) and no generic image/*.
// The declared mimetype is client-controlled; real content validation happens
// in processImageUpload, where sharp must successfully decode the buffer.
const ALLOWED_MIMETYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPEG, WebP or GIF images are allowed'));
  }
});
