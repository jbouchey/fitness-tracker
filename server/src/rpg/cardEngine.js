/**
 * Card Engine — selects which StoryCard to serve after each workout
 * and handles quest / campaign card delivery.
 */

const { LAZY_THRESHOLD_MINUTES } = require('./xpEngine');

// Card types (must match values stored in story_cards table)
const CARD_TYPES = {
  // Per-workout story beats (7 per week, served in order)
  CHALLENGE:            'CHALLENGE',
  REFLECTION:           'REFLECTION',
  RELEASE:              'RELEASE',
  CONNECTION:           'CONNECTION',
  MILESTONE:            'MILESTONE',
  WILDCARD:             'WILDCARD',
  // Generic pools
  ENCORE:               'ENCORE',
  LAZY:                 'LAZY',
  // Weekly
  QUEST_COMPLETE:       'QUEST_COMPLETE',
  QUEST_MISSED:         'QUEST_MISSED',
  // Campaign
  CAMPAIGN_ARC:         'CAMPAIGN_ARC',
  CAMPAIGN_COMPLETE:    'CAMPAIGN_COMPLETE',
  CAMPAIGN_CONSOLATION: 'CAMPAIGN_CONSOLATION',
};

// The 7 beat types served in sequence each week
const WEEKLY_BEAT_SEQUENCE = [
  CARD_TYPES.CHALLENGE,
  CARD_TYPES.REFLECTION,
  CARD_TYPES.RELEASE,
  CARD_TYPES.CONNECTION,
  CARD_TYPES.MILESTONE,
  CARD_TYPES.WILDCARD,
  CARD_TYPES.WILDCARD,
];

/**
 * Select a story beat card for a workout.
 * Priority: lazy → weekly beat (if <7 served) → encore
 *
 * @param {object} prisma
 * @param {string} archetype
 * @param {number} durationMinutes
 * @param {object} weeklyProgress  — { weekNumber, storyBeatsServed }
 * @returns {{ card: StoryCard|null, incrementBeat: boolean }}
 */
async function selectWorkoutCard(prisma, archetype, durationMinutes, weeklyProgress) {
  // 1. Lazy beat (workout too short)
  if (durationMinutes < LAZY_THRESHOLD_MINUTES) {
    const card = await getRandomCard(prisma, archetype, CARD_TYPES.LAZY);
    return { card, incrementBeat: false };
  }

  // 2. Typed story beat (slots 1-7)
  if (weeklyProgress.storyBeatsServed < 7) {
    const beatIndex = weeklyProgress.storyBeatsServed;
    const cardType  = WEEKLY_BEAT_SEQUENCE[beatIndex];
    const beatNumber = beatIndex + 1;

    const card = await prisma.storyCard.findFirst({
      where: { archetype, weekNumber: weeklyProgress.weekNumber, cardType, beatNumber },
    });

    if (card) return { card, incrementBeat: true };

    // Fallback: any card of the right type for this week
    const fallback = await prisma.storyCard.findFirst({
      where: { archetype, weekNumber: weeklyProgress.weekNumber, cardType },
    });
    if (fallback) return { card: fallback, incrementBeat: true };
  }

  // 3. Encore (8th+ workout this week)
  const card = await getRandomCard(prisma, archetype, CARD_TYPES.ENCORE);
  return { card, incrementBeat: false };
}

/**
 * Returns the quest complete card for a given archetype + week.
 */
async function getQuestCompleteCard(prisma, archetype, weekNumber) {
  return prisma.storyCard.findFirst({
    where: { archetype, weekNumber, cardType: CARD_TYPES.QUEST_COMPLETE },
  });
}

/**
 * Returns the quest missed card for a given archetype + week.
 */
async function getQuestMissedCard(prisma, archetype, weekNumber) {
  return prisma.storyCard.findFirst({
    where: { archetype, weekNumber, cardType: CARD_TYPES.QUEST_MISSED },
  });
}

/**
 * Returns the campaign arc card at an act boundary (weeks 3, 6, 9).
 */
async function getCampaignArcCard(prisma, archetype, weekNumber) {
  return prisma.storyCard.findFirst({
    where: { archetype, weekNumber, cardType: CARD_TYPES.CAMPAIGN_ARC },
  });
}

/**
 * Returns the campaign complete card (week 12, quest done).
 */
async function getCampaignCompleteCard(prisma, archetype) {
  return prisma.storyCard.findFirst({
    where: { archetype, cardType: CARD_TYPES.CAMPAIGN_COMPLETE, isGeneric: true },
  });
}

/**
 * Returns the campaign consolation card (week 12, quest not done).
 */
async function getCampaignConsolationCard(prisma, archetype) {
  return prisma.storyCard.findFirst({
    where: { archetype, cardType: CARD_TYPES.CAMPAIGN_CONSOLATION, isGeneric: true },
  });
}

/**
 * Pick a random card from the generic pool for a given type.
 */
async function getRandomCard(prisma, archetype, cardType) {
  const cards = await prisma.storyCard.findMany({
    where: { isGeneric: true, cardType, archetype: { in: [archetype, 'any'] } },
  });
  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}

module.exports = {
  CARD_TYPES,
  WEEKLY_BEAT_SEQUENCE,
  selectWorkoutCard,
  getQuestCompleteCard,
  getQuestMissedCard,
  getCampaignArcCard,
  getCampaignCompleteCard,
  getCampaignConsolationCard,
};
