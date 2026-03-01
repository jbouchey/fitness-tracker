const { Router } = require('express');
const { uploadWorkout } = require('../controllers/upload.controller');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const requireEmailVerified = require('../middleware/requireEmailVerified');

const router = Router();

router.post('/', authenticate, requireEmailVerified, upload.single('file'), uploadWorkout);

module.exports = router;
