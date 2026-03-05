const prisma = require('../config/database');
const { getHistoricalWeather } = require('../utils/weatherApi');
const { generateNarrativeBeat } = require('../utils/narrativeEngine');
const { recalculateXp } = require('./xp.service');
const { grantQuestLoot, updateStreakAndGrantLoot } = require('./loot.service');

const DIFFICULTY_SECONDS = {
  easy:   1 * 3600,   //  1 hour
  medium: 5 * 3600,   //  5 hours
  hard:   10 * 3600,  // 10 hours
  epic:   20 * 3600,  // 20 hours
};

/** Returns the most recent Monday at 00:00:00 UTC. */
function getCurrentMondayUTC() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - daysToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Gets the current week's quest for a user, creating it if it doesn't exist.
 * Uses the user's adventureDifficulty preference.
 */
async function getOrCreateCurrentQuest(userId) {
  const weekStart = getCurrentMondayUTC();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adventureDifficulty: true },
  });
  const difficulty = user?.adventureDifficulty ?? 'medium';
  const targetSeconds = DIFFICULTY_SECONDS[difficulty] ?? DIFFICULTY_SECONDS.medium;

  return prisma.quest.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    update: {},
    create: { userId, weekStart, difficulty, targetSeconds },
  });
}

/**
 * Maps total expedition number to a narrative phase (1–4) so the story arc
 * progresses naturally across the week regardless of workout count.
 */
function expeditionPhase(expeditionNum) {
  if (expeditionNum <= 1) return 1;
  if (expeditionNum <= 3) return 2;
  if (expeditionNum <= 5) return 3;
  return 4;
}

/**
 * Claims all unclaimed workouts for the current week.
 * - Sums their elapsedSeconds into the quest
 * - Generates one narrative beat per workout
 * - Marks workouts as adventureClaimed = true
 * - Fires loot + XP side-effects if the quest just completed
 *
 * Returns: { pendingCount, previousClaimedDays, claimedDays, newBeats, quest, questJustCompleted }
 */
async function claimWorkouts(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adventureModeEnabled: true, adventureCharacterArchetype: true },
  });

  if (!user?.adventureModeEnabled || !user.adventureCharacterArchetype) {
    return { pendingCount: 0, previousClaimedDays: 0, claimedDays: 0, newBeats: [], quest: null, questJustCompleted: false };
  }

  const weekStart = getCurrentMondayUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Workouts already claimed this week (for day counting and expedition numbering)
  const alreadyClaimed = await prisma.workout.findMany({
    where: { userId, adventureClaimed: true, startTime: { gte: weekStart, lt: weekEnd } },
    select: { startTime: true },
    orderBy: { startTime: 'asc' },
  });

  const previousClaimedDays = new Set(
    alreadyClaimed.map((w) => new Date(w.startTime).toISOString().slice(0, 10))
  ).size;

  // Unclaimed workouts this week, ordered oldest-first so story reads chronologically
  const pending = await prisma.workout.findMany({
    where: { userId, adventureClaimed: false, startTime: { gte: weekStart, lt: weekEnd } },
    orderBy: { startTime: 'asc' },
  });

  if (pending.length === 0) {
    const quest = await getOrCreateCurrentQuest(userId);
    return { pendingCount: 0, previousClaimedDays, claimedDays: previousClaimedDays, newBeats: [], quest, questJustCompleted: false };
  }

  const quest = await getOrCreateCurrentQuest(userId);
  const wasCompleted = quest.status === 'completed';

  let earnedSeconds = quest.earnedSeconds;
  const beats = Array.isArray(quest.narrativeBeats) ? [...quest.narrativeBeats] : [];
  const newBeats = [];

  for (let i = 0; i < pending.length; i++) {
    const workout = pending[i];
    earnedSeconds += workout.elapsedSeconds;

    // Narrative phase based on overall expedition number this week
    const expeditionNum = alreadyClaimed.length + i + 1;
    const phase = expeditionPhase(expeditionNum);

    // Weather — best effort, 5 s timeout handled inside getHistoricalWeather
    let weather = null;
    try {
      const tp = await prisma.trackPoint.findFirst({
        where: { workoutId: workout.id },
        orderBy: { sequence: 'asc' },
        select: { latitude: true, longitude: true },
      });
      if (tp?.latitude != null && tp?.longitude != null) {
        weather = await getHistoricalWeather(tp.latitude, tp.longitude, new Date(workout.startTime));
      }
    } catch { /* skip */ }

    const text = generateNarrativeBeat(phase, user.adventureCharacterArchetype, workout, weather);
    const beat = {
      workoutId: workout.id,
      workoutName: workout.title,
      workoutType: workout.workoutType,
      distanceMiles: workout.distanceMiles,
      elapsedSeconds: workout.elapsedSeconds,
      text,
      triggeredAt: new Date().toISOString(),
    };
    beats.push(beat);
    newBeats.push(beat);
  }

  const pct = earnedSeconds / quest.targetSeconds;
  const questJustCompleted = !wasCompleted && pct >= 1;

  const updatedQuest = await prisma.quest.update({
    where: { id: quest.id },
    data: {
      earnedSeconds,
      narrativeBeats: beats,
      ...(pct >= 1 ? { status: 'completed' } : {}),
    },
  });

  // Mark all claimed
  await prisma.workout.updateMany({
    where: { id: { in: pending.map((w) => w.id) } },
    data: { adventureClaimed: true },
  });

  // Claimed days after this claim
  const allClaimedDates = [
    ...alreadyClaimed.map((w) => new Date(w.startTime).toISOString().slice(0, 10)),
    ...pending.map((w) => new Date(w.startTime).toISOString().slice(0, 10)),
  ];
  const claimedDays = new Set(allClaimedDates).size;

  // Fire-and-forget side effects
  setImmediate(() => recalculateXp(userId).catch(() => {}));
  if (questJustCompleted) {
    setImmediate(() => Promise.all([
      grantQuestLoot(userId, quest.difficulty).catch(() => {}),
      updateStreakAndGrantLoot(userId, quest.weekStart).catch(() => {}),
    ]));
  }

  return { pendingCount: pending.length, previousClaimedDays, claimedDays, newBeats, quest: updatedQuest, questJustCompleted };
}

module.exports = { getOrCreateCurrentQuest, claimWorkouts, DIFFICULTY_SECONDS, getCurrentMondayUTC };
