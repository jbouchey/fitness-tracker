const { Router } = require('express');
const { uploadWorkout } = require('../controllers/upload.controller');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const requireEmailVerified = require('../middleware/requireEmailVerified');
const { MAX_FILE_SIZE_MB } = require('../config/env');

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

router.post('/', authenticate, requireEmailVerified, handleUpload, uploadWorkout);

module.exports = router;
