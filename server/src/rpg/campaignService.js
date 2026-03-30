/**
 * Campaign Service
 * Orchestrates the RPG reward loop: XP, story beats, quest tracking.
 * Called after every workout (Strava webhook or file upload).
 */

const {
  DIFFICULTY_TARGETS,
  calculateWorkoutXp,
  calculateQuestBonus,
  checkQuestCompletion,
  actFromWeek,
  ACT_BOUNDARY_WEEKS,
} = require('./xpEngine');

const { grantQuestLoot, updateStreakAndGrantLoot } = require('../services/loot.service');

const {
  selectWorkoutCard,
  getQuestCompleteCard,
  getCampaignArcCard,
  getCampaignCompleteCard,
  getCampaignConsolationCard,
} = require('./cardEngine');

// ── Week helpers ──────────────────────────────────────────────────────────────

function getCurrentMondayUTC() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysBack = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - daysBack);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function getWeekEnd(weekStart) {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

// ── Get or create the active campaign for a user ──────────────────────────────

async function getOrCreateActiveCampaign(prisma, user) {
  const existing = await prisma.campaign.findFirst({
    where: { userId: user.id, isActive: true },
  });
  if (existing) return existing;

  // Count past campaigns to determine number
  const count = await prisma.campaign.count({ where: { userId: user.id } });
  const campaignNumber = count + 1;

  return prisma.campaign.create({
    data: {
      userId: user.id,
      campaignNumber,
      archetype: user.adventureCharacterArchetype,
      startDate: new Date(),
      currentWeek: 1,
      currentAct: 1,
      isActive: true,
    },
  });
}

// ── Get or create this week's WeeklyProgress ──────────────────────────────────

async function getOrCreateCurrentWeek(prisma, user, campaign) {
  const weekStart = getCurrentMondayUTC();

  const existing = await prisma.weeklyProgress.findFirst({
    where: { userId: user.id, weekStart },
  });
  if (existing) return existing;

  const difficulty = user.adventureDifficulty;
  const weekNumber = campaign.currentWeek;

  return prisma.weeklyProgress.create({
    data: {
      userId: user.id,
      campaignId: campaign.id,
      weekNumber,
      weekStart,
      weekEnd: getWeekEnd(weekStart),
      difficulty,
      targetMinutes: DIFFICULTY_TARGETS[difficulty],
      earnedMinutes: 0,
      earnedXp: 0,
      questBonusXp: 0,
      questStatus: 'active',
      storyBeatsServed: 0,
      workoutCount: 0,
    },
  });
}

// ── Deliver a card (create CardHistory record) ────────────────────────────────

async function deliverCard(prisma, { userId, storyCardId, weeklyProgressId, workoutId, durationMinutes, xpEarned }) {
  return prisma.cardHistory.create({
    data: {
      userId,
      storyCardId,
      weeklyProgressId: weeklyProgressId ?? null,
      workoutId: workoutId ?? null,
      workoutDurationMinutes: durationMinutes ?? null,
      xpEarned,
    },
  });
}

// ── Main reward loop — call after every workout sync ─────────────────────────

async function processWorkoutReward(prisma, userId, workout) {
  // Guard: adventure mode must be enabled with a character
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      adventureModeEnabled: true,
      adventureCharacterArchetype: true,
      adventureDifficulty: true,
      adventureTotalXp: true,
    },
  });

  if (!user?.adventureModeEnabled || !user.adventureCharacterArchetype) return null;

  // Guard: don't double-process the same workout
  const alreadyDone = await prisma.workout.findUnique({
    where: { id: workout.id },
    select: { adventureCardGenerated: true },
  });
  if (alreadyDone?.adventureCardGenerated) return null;

  const archetype = user.adventureCharacterArchetype;
  const difficulty = user.adventureDifficulty;
  const durationMinutes = Math.floor((workout.elapsedSeconds ?? 0) / 60);

  // Get or create campaign and current week
  const campaign = await getOrCreateActiveCampaign(prisma, user);
  const week = await getOrCreateCurrentWeek(prisma, user, campaign);

  // ── XP calculation ──────────────────────────────────────────────────────────
  // earnedXp tracks multiplied XP (pre-soft-cap) for the week so we can
  // correctly calculate where the cap kicks in for each successive workout.
  const xpResult = calculateWorkoutXp(durationMinutes, difficulty, week.earnedXp);

  // ── Story beat selection ────────────────────────────────────────────────────
  const { card: storyCard, incrementBeat } = await selectWorkoutCard(
    prisma,
    archetype,
    durationMinutes,
    { weekNumber: week.weekNumber, storyBeatsServed: week.storyBeatsServed }
  );

  // ── Quest completion check ──────────────────────────────────────────────────
  const wasComplete = week.questStatus === 'completed';
  const newEarnedMinutes = week.earnedMinutes + durationMinutes;
  const nowComplete = !wasComplete && checkQuestCompletion(newEarnedMinutes, difficulty);
  const questBonusXp = nowComplete ? calculateQuestBonus(difficulty) : 0;

  // ── Total effective XP for this workout ─────────────────────────────────────
  const totalEffectiveXp = xpResult.effectiveXp + questBonusXp;

  // ── Persist all updates in a transaction ────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // 1. Update WeeklyProgress
    await tx.weeklyProgress.update({
      where: { id: week.id },
      data: {
        earnedMinutes: newEarnedMinutes,
        // earnedXp stores the multiplied (pre-cap) running total for cap math
        earnedXp: week.earnedXp + xpResult.multipliedXp,
        questBonusXp: week.questBonusXp + questBonusXp,
        questStatus: nowComplete ? 'completed' : week.questStatus,
        storyBeatsServed: incrementBeat ? week.storyBeatsServed + 1 : week.storyBeatsServed,
        workoutCount: week.workoutCount + 1,
      },
    });

    // 2. Update user total XP
    await tx.user.update({
      where: { id: userId },
      data: { adventureTotalXp: { increment: totalEffectiveXp } },
    });

    // 3. Deliver story beat card (if one was selected)
    if (storyCard) {
      await deliverCard(tx, {
        userId,
        storyCardId: storyCard.id,
        weeklyProgressId: week.id,
        workoutId: workout.id,
        durationMinutes,
        xpEarned: totalEffectiveXp,
      });
    }

    // 4. Deliver quest complete card (if quest just finished)
    if (nowComplete) {
      const questCard = await getQuestCompleteCard(tx, archetype, week.weekNumber);
      if (questCard) {
        await deliverCard(tx, {
          userId,
          storyCardId: questCard.id,
          weeklyProgressId: week.id,
          workoutId: workout.id,
          durationMinutes,
          xpEarned: questBonusXp,
        });
      }
    }

    // 5. Mark workout as processed
    await tx.workout.update({
      where: { id: workout.id },
      data: { adventureCardGenerated: true },
    });
  });

  // Fire-and-forget loot/streak grants outside the transaction (non-critical)
  if (nowComplete) {
    setImmediate(async () => {
      try {
        await grantQuestLoot(userId, difficulty);
        await updateStreakAndGrantLoot(userId, week.weekStart);
      } catch (err) {
        console.error('[RPG] loot grant failed:', err);
      }
    });
  }

  return { xpEarned: totalEffectiveXp, questCompleted: nowComplete };
}

// ── Weekly transition (called by cron every Monday 00:00 UTC) ─────────────────
// Handles: quest missed, campaign arc cards, week/act advance, campaign end.

async function processWeekTransition(prisma) {
  const now = new Date();

  // Find all expired active quest weeks
  const expired = await prisma.weeklyProgress.findMany({
    where: { weekEnd: { lt: now }, questStatus: 'active' },
    include: {
      user: { select: { id: true, adventureCharacterArchetype: true, adventureDifficulty: true } },
      campaign: true,
    },
  });

  for (const wp of expired) {
    const { user, campaign } = wp;
    if (!user.adventureCharacterArchetype) continue;

    const archetype = user.adventureCharacterArchetype;

    // Mark quest missed
    await prisma.weeklyProgress.update({
      where: { id: wp.id },
      data: { questStatus: 'missed' },
    });

    // Deliver quest missed card
    const { getQuestMissedCard } = require('./cardEngine');
    const missedCard = await getQuestMissedCard(prisma, archetype, wp.weekNumber);
    if (missedCard) {
      await deliverCard(prisma, {
        userId: user.id,
        storyCardId: missedCard.id,
        weeklyProgressId: wp.id,
        xpEarned: 0,
      });
    }

    // Campaign arc card at act boundary weeks
    if (ACT_BOUNDARY_WEEKS.includes(wp.weekNumber)) {
      const arcCard = await getCampaignArcCard(prisma, archetype, wp.weekNumber);
      if (arcCard) {
        await deliverCard(prisma, {
          userId: user.id,
          storyCardId: arcCard.id,
          weeklyProgressId: wp.id,
          xpEarned: 0,
        });
      }
    }

    if (wp.weekNumber >= 12) {
      // End of campaign
      const questsCompleted = await prisma.weeklyProgress.count({
        where: { campaignId: campaign.id, questStatus: 'completed' },
      });
      const isFullCompletion = questsCompleted === 12;

      // Deliver campaign complete or consolation card
      const campaignEndCard = isFullCompletion
        ? await getCampaignCompleteCard(prisma, archetype)
        : await getCampaignConsolationCard(prisma, archetype);

      if (campaignEndCard) {
        await deliverCard(prisma, {
          userId: user.id,
          storyCardId: campaignEndCard.id,
          weeklyProgressId: wp.id,
          xpEarned: 0,
        });
      }

      // Close campaign, create badge
      await prisma.$transaction([
        prisma.campaign.update({
          where: { id: campaign.id },
          data: { isActive: false, endDate: now },
        }),
        prisma.campaignBadge.create({
          data: {
            userId: user.id,
            campaignId: campaign.id,
            campaignNumber: campaign.campaignNumber,
            archetype,
            difficulty: user.adventureDifficulty,
            weeksCompleted: 12,
            questsCompleted,
            isFullCompletion,
          },
        }),
      ]);

      // New campaign starts next Monday — it will be auto-created when needed
    } else {
      // Advance week within campaign
      const nextWeek = wp.weekNumber + 1;
      const nextAct = actFromWeek(nextWeek);

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { currentWeek: nextWeek, currentAct: nextAct },
      });
      // The next WeeklyProgress row is created lazily when the user's first
      // workout of the new week fires (getOrCreateCurrentWeek).
    }
  }
}

module.exports = {
  getOrCreateActiveCampaign,
  getOrCreateCurrentWeek,
  processWorkoutReward,
  processWeekTransition,
};
