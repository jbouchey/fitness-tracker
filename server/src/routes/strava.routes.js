const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  connect,
  callback,
  webhookVerify,
  webhookEvent,
  status,
  disconnect,
} = require('../controllers/strava.controller');

const router = express.Router();

router.get('/connect', authenticate, connect);
router.get('/callback', callback);
router.get('/webhook', webhookVerify);
router.post('/webhook', webhookEvent);
router.get('/status', authenticate, status);
router.delete('/disconnect', authenticate, disconnect);

module.exports = router;
