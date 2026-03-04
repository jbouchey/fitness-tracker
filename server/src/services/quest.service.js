const prisma = require('../config/database');
const { getHistoricalWeather } = require('../utils/weatherApi');
const { generateNarrativeBeat } = require('../utils/narrativeEngine');

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
 * Updates quest progress after a workout is recorded.
 * Called fire-and-forget after upload or Strava sync.
 */
async function updateQuestProgress(userId, workout) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adventureModeEnabled: true, adventureCharacterArchetype: true },
  });

  if (!user?.adventureModeEnabled || !user.adventureCharacterArchetype) return;

  // Only count workouts that fall in the current quest week
  const weekStart = getCurrentMondayUTC();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const workoutDate = new Date(workout.startTime);
  if (workoutDate < weekStart || workoutDate >= weekEnd) return;

  const quest = await getOrCreateCurrentQuest(userId);
  if (quest.status !== 'active') return;

  const newEarned = quest.earnedSeconds + workout.elapsedSeconds;
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

      // Try to get weather for the narrative beat
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
      } catch {
        // Weather is optional — skip silently
      }

      const text = generateNarrativeBeat(num, user.adventureCharacterArchetype, workout, weather);
      beats.push({ waypointNum: num, text, triggeredAt: new Date().toISOString() });
    }
  }

  if (pct >= 1) updates.status = 'completed';
  updates.narrativeBeats = beats;

  await prisma.quest.update({ where: { id: quest.id }, data: updates });
}

module.exports = { getOrCreateCurrentQuest, updateQuestProgress, DIFFICULTY_SECONDS, getCurrentMondayUTC };
