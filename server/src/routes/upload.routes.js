const { Router } = require('express');
const { uploadWorkout } = require('../controllers/upload.controller');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');

const router = Router();

router.post('/', authenticate, upload.single('file'), uploadWorkout);

module.exports = router;
