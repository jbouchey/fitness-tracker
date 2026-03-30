const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  updateCharacter,
  toggleMode,
  getQuest,
  setDifficulty,
  resetQuest,
  getPendingCards,
  markCardsSeen,
  getLoot,
  getCampaignBadges,
  getWorld,
} = require('../controllers/adventure.controller');

router.patch('/character',        authenticate, updateCharacter);
router.patch('/mode',             authenticate, toggleMode);
router.get('/quest',              authenticate, getQuest);
router.patch('/difficulty',       authenticate, setDifficulty);
router.delete('/quest',           authenticate, resetQuest);
router.get('/cards/pending',      authenticate, getPendingCards);
router.patch('/cards/seen',       authenticate, markCardsSeen);
router.get('/loot',               authenticate, getLoot);
router.get('/badges',             authenticate, getCampaignBadges);
router.get('/world',              authenticate, getWorld);

module.exports = router;
