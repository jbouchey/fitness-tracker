const { catchAsync } = require('../middleware/errorHandler');
const prisma = require('../config/database');
const { getOrCreateCurrentQuest, recalculateQuestProgress, DIFFICULTY_SECONDS } = require('../services/quest.service');

const VALID_ARCHETYPES = ['wizard', 'archer', 'warrior'];
const VALID_GENDERS = ['male', 'female'];
const VALID_COLORS = ['blue', 'green', 'red', 'yellow'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'epic'];

const ADVENTURE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  emailVerified: true,
  createdAt: true,
  adventureModeEnabled: true,
  adventureCharacterArchetype: true,
  adventureCharacterGender: true,
  adventureCharacterColor: true,
  adventureDifficulty: true,
};

const updateCharacter = catchAsync(async (req, res) => {
  const { archetype, gender, color } = req.body;

  if (!VALID_ARCHETYPES.includes(archetype)) {
    return res.status(400).json({ error: 'Invalid archetype.' });
  }
  if (!VALID_GENDERS.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender.' });
  }
  if (!VALID_COLORS.includes(color)) {
    return res.status(400).json({ error: 'Invalid color.' });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      adventureCharacterArchetype: archetype,
      adventureCharacterGender: gender,
      adventureCharacterColor: color,
    },
    select: ADVENTURE_SELECT,
  });

  res.json({ user });
});

const toggleMode = catchAsync(async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean.' });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { adventureModeEnabled: enabled },
    select: ADVENTURE_SELECT,
  });

  res.json({ user });
});

/** GET /api/adventure/quest — returns current week's quest (creates if needed) */
const getQuest = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { adventureModeEnabled: true },
  });

  if (!user?.adventureModeEnabled) {
    return res.json({ quest: null });
  }

  // Recalculate from all workouts this week so progress is always accurate
  const quest = await recalculateQuestProgress(req.user.id);
  res.json({ quest });
});

/** PATCH /api/adventure/difficulty — update difficulty preference + current quest if unlocked */
const setDifficulty = catchAsync(async (req, res) => {
  const { difficulty } = req.body;

  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty.' });
  }

  // Update user preference
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { adventureDifficulty: difficulty },
    select: ADVENTURE_SELECT,
  });

  // If current quest has no progress yet, update its difficulty too
  const quest = await getOrCreateCurrentQuest(req.user.id);
  let updatedQuest = quest;
  if (quest.earnedSeconds === 0) {
    updatedQuest = await prisma.quest.update({
      where: { id: quest.id },
      data: { difficulty, targetSeconds: DIFFICULTY_SECONDS[difficulty] },
    });
  }

  res.json({ user, quest: updatedQuest });
});

module.exports = { updateCharacter, toggleMode, getQuest, setDifficulty };
