const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { uploadWorkout } = require('../controllers/upload.controller');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const requireEmailVerified = require('../middleware/requireEmailVerified');
const { MAX_FILE_SIZE_MB, UPLOADS_PER_HOUR } = require('../config/env');

const router = Router();

// Wrap multer so its errors become proper JSON responses instead of falling
// through to the global 500 handler.
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.` });
    }
    // Wrong extension or other multer validation errors
    res.status(400).json({ error: err.message || 'Invalid file.' });
  });
}

// Per-account ceiling on uploads. Runs after authenticate so it can key on the
// user, and before multer so a blocked request never has its file read into memory.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: UPLOADS_PER_HOUR,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: { error: 'Upload limit reached. Please try again in an hour.' },
});

router.post('/', authenticate, requireEmailVerified, uploadLimiter, handleUpload, uploadWorkout);

module.exports = router;
