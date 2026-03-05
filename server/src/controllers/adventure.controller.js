const { catchAsync } = require('../middleware/errorHandler');
const prisma = require('../config/database');
const { getOrCreateCurrentQuest, claimWorkouts, DIFFICULTY_SECONDS, getCurrentMondayUTC } = require('../services/quest.service');
const { getUserLoot } = require('../services/loot.service');

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
  adventureStartedAt: true,
  adventureTotalXp: true,
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

  const data = { adventureModeEnabled: enabled };
  if (enabled) {
    const existing = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { adventureStartedAt: true },
    });
    if (!existing?.adventureStartedAt) {
      data.adventureStartedAt = new Date();
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: ADVENTURE_SELECT,
  });

  res.json({ user });
});

/** GET /api/adventure/quest — returns current week's stored quest (no auto-recalculation). */
const getQuest = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { adventureModeEnabled: true },
  });

  if (!user?.adventureModeEnabled) {
    return res.json({ quest: null });
  }

  const quest = await getOrCreateCurrentQuest(req.user.id);
  res.json({ quest });
});

/** PATCH /api/adventure/difficulty */
const setDifficulty = catchAsync(async (req, res) => {
  const { difficulty } = req.body;

  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid difficulty.' });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { adventureDifficulty: difficulty },
    select: ADVENTURE_SELECT,
  });

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

/** DELETE /api/adventure/quest — resets current week's quest + unflags workouts (for testing) */
const resetQuest = catchAsync(async (req, res) => {
  const weekStart = getCurrentMondayUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  await prisma.quest.deleteMany({ where: { userId: req.user.id, weekStart } });

  // Reset claimed flag so this week's workouts show as pending again
  await prisma.workout.updateMany({
    where: { userId: req.user.id, startTime: { gte: weekStart, lt: weekEnd } },
    data: { adventureClaimed: false },
  });

  res.json({ ok: true });
});

/** GET /api/adventure/loot */
const getLoot = catchAsync(async (req, res) => {
  const loot = await getUserLoot(req.user.id);
  res.json({ loot });
});

/**
 * GET /api/adventure/world
 * claimedDays:  distinct UTC days with at least one claimed workout this week.
 * pendingDays:  distinct UTC days with unclaimed workouts (ready to claim).
 * pendingCount: raw count of unclaimed workouts.
 * quest:        { status, difficulty, earnedSeconds, targetSeconds }
 */
const getWorld = catchAsync(async (req, res) => {
  const weekStart = getCurrentMondayUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const workouts = await prisma.workout.findMany({
    where: { userId: req.user.id, startTime: { gte: weekStart, lt: weekEnd } },
    select: { startTime: true, adventureClaimed: true },
  });

  const claimedDates = new Set();
  const pendingDates = new Set();
  let pendingCount = 0;

  for (const w of workouts) {
    const day = new Date(w.startTime).toISOString().slice(0, 10);
    if (w.adventureClaimed) {
      claimedDates.add(day);
    } else {
      pendingDates.add(day);
      pendingCount++;
    }
  }

  const quest = await prisma.quest.findFirst({
    where: { userId: req.user.id, weekStart },
    select: { status: true, difficulty: true, earnedSeconds: true, targetSeconds: true },
  });

  res.json({
    claimedDays: claimedDates.size,
    pendingDays: pendingDates.size,
    pendingCount,
    quest,
  });
});

/** POST /api/adventure/claim — process all unclaimed workouts for the current week */
const claim = catchAsync(async (req, res) => {
  const result = await claimWorkouts(req.user.id);
  res.json(result);
});

module.exports = { updateCharacter, toggleMode, getQuest, setDifficulty, resetQuest, getLoot, getWorld, claim };
