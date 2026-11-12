const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Short-lived signed value for the Strava OAuth round trip. The callback is a
// public URL, so the user id must not be accepted as plain text.
function signStravaState(userId) {
  return jwt.sign({ userId, purpose: 'strava-oauth' }, JWT_SECRET, { expiresIn: '10m' });
}

function verifyStravaState(state) {
  const payload = jwt.verify(state, JWT_SECRET);
  if (payload.purpose !== 'strava-oauth' || !payload.userId) throw new Error('Wrong token purpose');
  return payload.userId;
}

module.exports = { signToken, verifyToken, signStravaState, verifyStravaState };
