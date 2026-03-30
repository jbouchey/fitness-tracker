const { catchAsync } = require('../middleware/errorHandler');
const prisma = require('../config/database');
const { DIFFICULTY_TARGETS } = require('../rpg/xpEngine');
const {
  getOrCreateActiveCampaign,
  getOrCreateCurrentWeek,
} = require('../rpg/campaignService');
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
  adventureQuestStreak: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCurrentMondayUTC() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - daysBack);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Fetch CardHistory for a WeeklyProgress row, enrich with Workout info,
 * and return in the format the frontend narrative log expects.
 */
async function getNarrativeBeats(weeklyProgressId) {
  const cards = await prisma.cardHistory.findMany({
    where: { weeklyProgressId, workoutId: { not: null } },
    include: { storyCard: { select: { cardType: true, narrative: true } } },
    orderBy: { deliveredAt: 'asc' },
  });

  // Bulk-fetch the workouts so we can enrich the beats
  const workoutIds = cards.map((c) => c.workoutId).filter(Boolean);
  const workouts =
    workoutIds.length > 0
      ? await prisma.workout.findMany({
          where: { id: { in: workoutIds } },
          select: { id: true, title: true, workoutType: true, distanceMiles: true, elapsedSeconds: true },
        })
      : [];
  const workoutMap = Object.fromEntries(workouts.map((w) => [w.id, w]));

  return cards.map((ch) => {
    const w = ch.workoutId ? workoutMap[ch.workoutId] : null;
    return {
      triggeredAt: ch.deliveredAt,
      workoutName: w?.title ?? 'Expedition',
      workoutType: w?.workoutType ?? null,
      distanceMiles: w?.distanceMiles ?? 0,
      elapsedSeconds: w?.elapsedSeconds ?? 0,
      text: ch.storyCard?.narrative ?? '',
    };
  });
}

/**
 * Build the backward-compatible "quest" shape from a WeeklyProgress row.
 * QuestLogPage, WorldMapPage, and AdventurePage all consume this shape.
 */
async function buildQuestShape(week) {
  const narrativeBeats = await getNarrativeBeats(week.id);
  return {
    id: week.id,
    status: week.questStatus,
    difficulty: week.difficulty,
    earnedSeconds: Math.round(week.earnedMinutes * 60),
    targetSeconds: week.targetMinutes * 60,
    earnedMinutes: week.earnedMinutes,
    targetMinutes: week.targetMinutes,
    storyBeatsServed: week.storyBeatsServed,
    workoutCount: week.workoutCount,
    weekNumber: week.weekNumber,
    narrativeBeats,
  };
}

// ── Character & mode ──────────────────────────────────────────────────────────

const updateCharacter = catchAsync(async (req, res) => {
  const { archetype, gender, color } = req.body;

  if (!VALID_ARCHETYPES.includes(archetype)) return res.status(400).json({ error: 'Invalid archetype.' });
  if (!VALID_GENDERS.includes(gender))       return res.status(400).json({ error: 'Invalid gender.' });
  if (!VALID_COLORS.includes(color))         return res.status(400).json({ error: 'Invalid color.' });

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { adventureCharacterArchetype: archetype, adventureCharacterGender: gender, adventureCharacterColor: color },
    select: ADVENTURE_SELECT,
  });

  res.json({ user });
});

const toggleMode = catchAsync(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean.' });

  const data = { adventureModeEnabled: enabled };
  if (enabled) {
    const existing = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { adventureStartedAt: true },
    });
    if (!existing?.adventureStartedAt) data.adventureStartedAt = new Date();
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: ADVENTURE_SELECT,
  });

  res.json({ user });
});

// ── Quest (weekly progress) ───────────────────────────────────────────────────

/** GET /api/adventure/quest — returns the current week's quest in legacy-compatible shape */
const getQuest = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      adventureModeEnabled: true,
      adventureCharacterArchetype: true,
      adventureDifficulty: true,
    },
  });

  if (!user?.adventureModeEnabled || !user.adventureCharacterArchetype) {
    return res.json({ quest: null });
  }

  const campaign = await getOrCreateActiveCampaign(prisma, { ...user, id: req.user.id });
  const week = await getOrCreateCurrentWeek(prisma, { ...user, id: req.user.id }, campaign);
  const quest = await buildQuestShape(week);

  res.json({ quest });
});

/** PATCH /api/adventure/difficulty */
const setDifficulty = catchAsync(async (req, res) => {
  const { difficulty } = req.body;
  if (!VALID_DIFFICULTIES.includes(difficulty)) return res.status(400).json({ error: 'Invalid difficulty.' });

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { adventureDifficulty: difficulty },
    select: ADVENTURE_SELECT,
  });

  // Update the current week's difficulty/target if no minutes earned yet
  const campaign = await getOrCreateActiveCampaign(prisma, { ...user, id: req.user.id });
  const week = await getOrCreateCurrentWeek(prisma, { ...user, id: req.user.id }, campaign);

  let finalWeek = week;
  if (week.earnedMinutes === 0) {
    finalWeek = await prisma.weeklyProgress.update({
      where: { id: week.id },
      data: { difficulty, targetMinutes: DIFFICULTY_TARGETS[difficulty] },
    });
  }

  const quest = await buildQuestShape(finalWeek);
  res.json({ user, quest });
});

/** DELETE /api/adventure/quest — reset this week for testing */
const resetQuest = catchAsync(async (req, res) => {
  const weekStart = getCurrentMondayUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find and delete the current WeeklyProgress (cascades to CardHistory)
  await prisma.weeklyProgress.deleteMany({
    where: { userId: req.user.id, weekStart },
  });

  // Un-mark workouts so they can be processed again
  await prisma.workout.updateMany({
    where: { userId: req.user.id, startTime: { gte: weekStart, lt: weekEnd } },
    data: { adventureCardGenerated: false },
  });

  res.json({ ok: true });
});

// ── Pending cards ─────────────────────────────────────────────────────────────

/** GET /api/adventure/cards/pending — unseen CardHistory entries */
const getPendingCards = catchAsync(async (req, res) => {
  const cards = await prisma.cardHistory.findMany({
    where: { userId: req.user.id, seenAt: null },
    include: { storyCard: true },
    orderBy: { deliveredAt: 'asc' },
  });

  // Enrich with workout data
  const workoutIds = cards.map((c) => c.workoutId).filter(Boolean);
  const workouts =
    workoutIds.length > 0
      ? await prisma.workout.findMany({
          where: { id: { in: workoutIds } },
          select: { id: true, title: true, workoutType: true, distanceMiles: true, elapsedSeconds: true },
        })
      : [];
  const workoutMap = Object.fromEntries(workouts.map((w) => [w.id, w]));

  const enriched = cards.map((ch) => {
    const w = ch.workoutId ? workoutMap[ch.workoutId] : null;
    return {
      id: ch.id,
      deliveredAt: ch.deliveredAt,
      xpEarned: ch.xpEarned,
      cardType: ch.storyCard?.cardType,
      title: ch.storyCard?.title,
      narrative: ch.storyCard?.narrative,
      playerPrompt: ch.storyCard?.playerPrompt,
      workoutName: w?.title ?? null,
      workoutType: w?.workoutType ?? null,
      distanceMiles: w?.distanceMiles ?? 0,
      elapsedSeconds: w?.elapsedSeconds ?? 0,
    };
  });

  res.json({ cards: enriched });
});

/** PATCH /api/adventure/cards/seen — mark a list of card IDs as seen */
const markCardsSeen = catchAsync(async (req, res) => {
  const { cardIds } = req.body;
  if (!Array.isArray(cardIds) || cardIds.length === 0) return res.json({ updated: 0 });

  const result = await prisma.cardHistory.updateMany({
    where: { id: { in: cardIds }, userId: req.user.id, seenAt: null },
    data: { seenAt: new Date() },
  });

  res.json({ updated: result.count });
});

// ── Loot ─────────────────────────────────────────────────────────────────────

const getLoot = catchAsync(async (req, res) => {
  const loot = await getUserLoot(req.user.id);
  res.json({ loot });
});

// ── Campaign badges ───────────────────────────────────────────────────────────

const getCampaignBadges = catchAsync(async (req, res) => {
  const badges = await prisma.campaignBadge.findMany({
    where: { userId: req.user.id },
    orderBy: { earnedAt: 'desc' },
  });
  res.json({ badges });
});

// ── World map ─────────────────────────────────────────────────────────────────

/** GET /api/adventure/world */
const getWorld = catchAsync(async (req, res) => {
  const weekStart = getCurrentMondayUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Days with at least one processed workout this week
  const workouts = await prisma.workout.findMany({
    where: { userId: req.user.id, startTime: { gte: weekStart, lt: weekEnd } },
    select: { startTime: true, adventureCardGenerated: true },
  });

  const claimedDates = new Set();
  for (const w of workouts) {
    if (w.adventureCardGenerated) {
      claimedDates.add(new Date(w.startTime).toISOString().slice(0, 10));
    }
  }

  // Current week's quest in legacy-compatible shape (null if no campaign yet)
  let quest = null;
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { adventureModeEnabled: true, adventureCharacterArchetype: true, adventureDifficulty: true },
  });

  if (user?.adventureModeEnabled && user.adventureCharacterArchetype) {
    const campaign = await prisma.campaign.findFirst({ where: { userId: req.user.id, isActive: true } });
    if (campaign) {
      const week = await prisma.weeklyProgress.findFirst({
        where: { userId: req.user.id, weekStart },
      });
      if (week) {
        quest = await buildQuestShape(week);
      }
    }
  }

  res.json({ claimedDays: claimedDates.size, quest });
});

module.exports = {
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
};
