const prisma = require('../config/database');

// XP awarded on quest completion by difficulty
const QUEST_XP = {
  easy:   50,
  medium: 150,
  hard:   300,
  epic:   600,
};

// Level N requires N*4 XP to reach from level N-1.
// Total XP to reach level N = sum(1..N) * 4 = N*(N+1)/2 * 4 = 2*N*(N+1)
// Inverse: given totalXp, solve for max N where 2*N*(N+1) <= totalXp
function calculateLevel(totalXp) {
  // Binary search for highest level where cumulative cost <= totalXp
  let level = 1;
  for (let n = 1; n <= 99; n++) {
    const cost = 2 * n * (n + 1); // cumulative XP to complete level n
    if (cost <= totalXp) {
      level = n;
    } else {
      break;
    }
  }
  return Math.min(level, 99);
}

// XP needed to complete level N (i.e., reach level N from level N-1)
function xpForLevel(n) {
  return n * 4;
}

// Cumulative XP required to have reached level N
function totalXpForLevel(n) {
  return 2 * n * (n + 1);
}

// XP within the current level (progress toward next level)
function xpProgress(totalXp) {
  const level = calculateLevel(totalXp);
  if (level >= 99) return { level: 99, currentXp: totalXp, neededXp: 0, pct: 100 };
  const xpAtCurrentLevel = totalXpForLevel(level);
  const xpAtNextLevel = totalXpForLevel(level + 1);
  const currentXp = totalXp - xpAtCurrentLevel;
  const neededXp = xpAtNextLevel - xpAtCurrentLevel; // = xpForLevel(level + 1)
  const pct = Math.min(100, Math.round((currentXp / neededXp) * 100));
  return { level, currentXp, neededXp, pct };
}

const MILESTONE_TITLES = [
  { min: 1,  max: 9,  title: 'Wandering' },
  { min: 10, max: 19, title: 'Scout' },
  { min: 20, max: 29, title: 'Ranger' },
  { min: 30, max: 39, title: 'Champion' },
  { min: 40, max: 49, title: 'Veteran' },
  { min: 50, max: 59, title: 'Warlord' },
  { min: 60, max: 69, title: 'Mythic' },
  { min: 70, max: 79, title: 'Legend' },
  { min: 80, max: 89, title: 'Ascendant' },
  { min: 90, max: 98, title: 'Immortal' },
  { min: 99, max: 99, title: 'Eternal' },
];

function getMilestoneTitle(level) {
  const entry = MILESTONE_TITLES.find(t => level >= t.min && level <= t.max);
  return entry ? entry.title : 'Wandering';
}

/**
 * Recalculates a user's total XP from scratch and updates the DB.
 * XP sources:
 *   1 XP per minute of workout elapsed time (workouts since adventureStartedAt)
 *   + quest completion bonus (completed quests since the week of adventureStartedAt)
 */
async function recalculateXp(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adventureModeEnabled: true, adventureStartedAt: true },
  });

  if (!user?.adventureModeEnabled || !user.adventureStartedAt) return;

  const startedAt = new Date(user.adventureStartedAt);

  // 1. Workout XP: 1 XP per minute since adventureStartedAt
  const workoutAgg = await prisma.workout.aggregate({
    where: { userId, startTime: { gte: startedAt } },
    _sum: { elapsedSeconds: true },
  });
  const workoutXp = Math.floor((workoutAgg._sum.elapsedSeconds ?? 0) / 60);

  // 2. Quest XP: bonus for each completed quest since the week adventure started
  // Use start of the week of adventureStartedAt so mid-week activation counts that week's quest
  const startedWeek = getWeekStart(startedAt);
  const completedQuests = await prisma.quest.findMany({
    where: { userId, status: 'completed', weekStart: { gte: startedWeek } },
    select: { difficulty: true },
  });
  const questXp = completedQuests.reduce((sum, q) => sum + (QUEST_XP[q.difficulty] ?? 0), 0);

  const totalXp = workoutXp + questXp;

  await prisma.user.update({
    where: { id: userId },
    data: { adventureTotalXp: totalXp },
  });

  return totalXp;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

module.exports = { recalculateXp, calculateLevel, xpProgress, getMilestoneTitle, xpForLevel, totalXpForLevel, QUEST_XP };
