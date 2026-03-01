const multer = require('multer');
const { MAX_FILE_SIZE_MB } = require('../config/env');

const ALLOWED_EXTENSIONS = /\.(fit|gpx)$/i;
const ALLOWED_MIME_TYPES = ['application/octet-stream', 'application/gpx+xml', 'text/xml', 'application/xml'];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
    return cb(new Error('Only .fit and .gpx files are allowed.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;
