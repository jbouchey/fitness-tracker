const multer = require('multer');
const { MAX_FILE_SIZE_MB } = require('../config/env');

const ALLOWED_EXTENSIONS = /\.(fit|gpx|tcx)$/i;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
    return cb(new Error('Only .fit, .gpx, and .tcx files are allowed.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;
