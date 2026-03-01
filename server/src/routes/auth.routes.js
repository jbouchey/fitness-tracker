const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me, updateProfile, verifyEmail, forgotPassword, resetPassword, logout } = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();

// Stricter limiter for credential endpoints — prevents brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tight limiter for password reset requests (prevent email spam)
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);
router.patch('/profile', authenticate, updateProfile);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);
router.post('/logout', authenticate, logout);

module.exports = router;
