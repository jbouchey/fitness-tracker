const { REQUIRE_EMAIL_VERIFICATION } = require('../config/env');

function requireEmailVerified(req, res, next) {
  if (REQUIRE_EMAIL_VERIFICATION && !req.user.emailVerified) {
    return res.status(403).json({
      error: 'Please verify your email address to upload workouts.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
}

module.exports = requireEmailVerified;
