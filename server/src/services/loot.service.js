const prisma = require('../config/database');
const { DIFFICULTY_RARITY, STREAK_RARITY, pickRandomItem } = require('../utils/lootCatalog');

/**
 * Grants one random loot item based on the completed quest difficulty.
 */
async function grantQuestLoot(userId, difficulty) {
  const rarity = DIFFICULTY_RARITY[difficulty];
  if (!rarity) return;
  const item = pickRandomItem(rarity);
  if (!item) return;
  return prisma.loot.create({
    data: { userId, itemSlug: item.slug, rarity, source: 'quest_completion' },
  });
}

/**
 * Increments the user's quest streak (or resets to 1 if previous week had no completed quest).
 * Grants a bonus loot drop if the new streak hits a milestone (2, 4, 8, 12).
 */
async function updateStreakAndGrantLoot(userId, questWeekStart) {
  const prevWeekStart = new Date(questWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [prevQuest, user] = await Promise.all([
    prisma.weeklyProgress.findFirst({ where: { userId, weekStart: prevWeekStart, questStatus: 'completed' } }),
    prisma.user.findUnique({ where: { id: userId }, select: { adventureQuestStreak: true } }),
  ]);

  const newStreak = prevQuest ? (user?.adventureQuestStreak ?? 0) + 1 : 1;

  await prisma.user.update({
    where: { id: userId },
    data: { adventureQuestStreak: newStreak },
  });

  const streakRarity = STREAK_RARITY[newStreak];
  if (streakRarity) {
    const item = pickRandomItem(streakRarity);
    if (item) {
      await prisma.loot.create({
        data: { userId, itemSlug: item.slug, rarity: streakRarity, source: 'streak_bonus' },
      });
    }
  }

  return newStreak;
}

/**
 * Returns all loot for the user, newest first.
 */
async function getUserLoot(userId) {
  return prisma.loot.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' },
  });
}

module.exports = { grantQuestLoot, updateStreakAndGrantLoot, getUserLoot };
