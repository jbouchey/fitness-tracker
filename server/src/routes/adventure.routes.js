const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { updateCharacter, toggleMode, getQuest, setDifficulty, resetQuest, getLoot, getWorld } = require('../controllers/adventure.controller');

router.patch('/character',   authenticate, updateCharacter);
router.patch('/mode',        authenticate, toggleMode);
router.get('/quest',         authenticate, getQuest);
router.patch('/difficulty',  authenticate, setDifficulty);
router.delete('/quest',      authenticate, resetQuest);
router.get('/loot',          authenticate, getLoot);
router.get('/world',         authenticate, getWorld);

module.exports = router;
