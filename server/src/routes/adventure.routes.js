const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { updateCharacter, toggleMode, getQuest, setDifficulty } = require('../controllers/adventure.controller');

router.patch('/character',   authenticate, updateCharacter);
router.patch('/mode',        authenticate, toggleMode);
router.get('/quest',         authenticate, getQuest);
router.patch('/difficulty',  authenticate, setDifficulty);

module.exports = router;
