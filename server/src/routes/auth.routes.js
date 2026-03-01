const { Router } = require('express');
const { register, login, me, updateProfile } = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.patch('/profile', authenticate, updateProfile);

module.exports = router;
