const prisma = require('../config/database');
const { getHistoricalWeather } = require('../utils/weatherApi');
const { generateNarrativeBeat } = require('../utils/narrativeEngine');
const { recalculateXp } = require('./xp.service');

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
 * Recalculates quest progress from scratch by summing all workouts in the current week.
 * Called on GET /quest so progress is always accurate — handles workouts uploaded before
 * adventure mode was active, deleted workouts, and missed webhook events.
 * Only generates narrative beats for waypoints that haven't been hit yet.
 */
async function recalculateQuestProgress(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adventureModeEnabled: true, adventureCharacterArchetype: true },
  });
  if (!user?.adventureModeEnabled) return null;

  const quest = await getOrCreateCurrentQuest(userId);
  if (quest.status !== 'active') return quest;

  const weekStart = getCurrentMondayUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Sum all workouts for the current week
  const agg = await prisma.workout.aggregate({
    where: { userId, startTime: { gte: weekStart, lt: weekEnd } },
    _sum: { elapsedSeconds: true },
  });
  const newEarned = agg._sum.elapsedSeconds ?? 0;
  const pct = newEarned / quest.targetSeconds;

  const beats = Array.isArray(quest.narrativeBeats) ? [...quest.narrativeBeats] : [];
  const updates = { earnedSeconds: newEarned };

  const WAYPOINTS = [
    [1, 0.25, 'waypoint1Hit'],
    [2, 0.50, 'waypoint2Hit'],
    [3, 0.75, 'waypoint3Hit'],
    [4, 1.00, 'questCompleted'],
  ];

  for (const [num, threshold, field] of WAYPOINTS) {
    if (!quest[field] && pct >= threshold) {
      updates[field] = true;
      if (user.adventureCharacterArchetype) {
        // Use the most recent workout in the week for narrative context
        const triggerWorkout = await prisma.workout.findFirst({
          where: { userId, startTime: { gte: weekStart, lt: weekEnd } },
          orderBy: { startTime: 'desc' },
        });
        if (triggerWorkout) {
          let weather = null;
          try {
            const tp = await prisma.trackPoint.findFirst({
              where: { workoutId: triggerWorkout.id },
              orderBy: { sequence: 'asc' },
              select: { latitude: true, longitude: true },
            });
            if (tp?.latitude != null && tp?.longitude != null) {
              weather = await getHistoricalWeather(tp.latitude, tp.longitude, new Date(triggerWorkout.startTime));
            }
          } catch { /* skip */ }
          const text = generateNarrativeBeat(num, user.adventureCharacterArchetype, triggerWorkout, weather);
          beats.push({ waypointNum: num, text, triggeredAt: new Date().toISOString() });
        }
      }
    }
  }

  if (pct >= 1) updates.status = 'completed';
  updates.narrativeBeats = beats;

  const updated = await prisma.quest.update({ where: { id: quest.id }, data: updates });

  // Recalculate XP fire-and-forget — catches both new workout minutes and quest completion bonus
  setImmediate(() => recalculateXp(userId).catch(() => {}));

  return updated;
}

/**
 * Incremental update called fire-and-forget after a new workout is recorded.
 * Delegates to recalculateQuestProgress so progress is always accurate.
 */
async function updateQuestProgress(userId, workout) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adventureModeEnabled: true, adventureCharacterArchetype: true },
  });
  if (!user?.adventureModeEnabled || !user.adventureCharacterArchetype) return;

  // Only bother if the workout falls in the current week
  const weekStart = getCurrentMondayUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const workoutDate = new Date(workout.startTime);
  if (workoutDate < weekStart || workoutDate >= weekEnd) return;

  await recalculateQuestProgress(userId);
}

module.exports = { getOrCreateCurrentQuest, recalculateQuestProgress, updateQuestProgress, DIFFICULTY_SECONDS, getCurrentMondayUTC };
