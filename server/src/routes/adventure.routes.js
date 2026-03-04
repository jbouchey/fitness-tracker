const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { updateCharacter, toggleMode } = require('../controllers/adventure.controller');

router.patch('/character', authenticate, updateCharacter);
router.patch('/mode', authenticate, toggleMode);

module.exports = router;
