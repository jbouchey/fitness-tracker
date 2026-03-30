/**
 * RPG Seed Script
 * Populates the story_cards table with placeholder cards for all 3 archetypes.
 *
 * Run: node server/prisma/seed-rpg.js
 * (from repo root, or adjust DATABASE_URL in .env)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Quest themes per archetype × week ────────────────────────────────────────

const QUEST_THEMES = {
  wizard: [
    'The Locked Library',
    'The Thousand Scrolls',
    "The Enchanter's Doubt",
    'The Map That Grows',
    'The Translated Tongue',
    "The Familiar's Rebellion",
    'The Tower Without Stairs',
    'The Blank Page',
    'The Burning Archive',
    'The Spell From Memory',
    'The Open Door',
    'The First Incantation',
  ],
  archer: [
    'The Perfect Arrow',
    'Fog on the Range',
    'The Missed Target',
    'The Borrowed Bow',
    'Arrow Without a Target',
    'The Fraying String',
    "The Scorekeeper's Shadow",
    'Shooting in the Dark',
    'The Shattered Bullseye',
    'The Arrow That Curved',
    'The Empty Quiver',
    "The Archer's Release",
  ],
  warrior: [
    'The Shield You Carry',
    'Blood on the Training Ground',
    'The War Council',
    'The Scar That Speaks',
    'The Warrior Rests',
    'The Hollow Victory',
    'The Arena of Mirrors',
    'The Unarmed Round',
    "The Battle You Can't Win",
    'The Feast After the Fight',
    'The Broken Oath',
    'The Warrior Unburdened',
  ],
};

// ── Weekly beat sequence ──────────────────────────────────────────────────────

const BEAT_TYPES = [
  'CHALLENGE',
  'REFLECTION',
  'RELEASE',
  'CONNECTION',
  'MILESTONE',
  'WILDCARD',
  'WILDCARD',
];

// ── Act boundary weeks ────────────────────────────────────────────────────────

const ACT_BOUNDARY_WEEKS = [3, 6, 9, 12];
const ACT_LABELS = { 3: 'Setup', 6: 'Rising Action', 9: 'Crisis', 12: 'Resolution' };
const ACT_NUMBERS = { 3: 1, 6: 2, 9: 3, 12: 4 };

// ── Lazy card narratives ──────────────────────────────────────────────────────

const LAZY_NARRATIVES = {
  wizard: [
    'The wizard reads a spell title, nods wisely, and goes back to bed.',
    'Your familiar yawns so hard it accidentally casts a sleep spell on itself.',
    'You opened the grimoire. That counts as cardio for the mind. Barely.',
    "The wizard stretches one arm. Declares it 'active recovery.' Questionable.",
    'A potion bubbles on the desk. You watched it. Observation is a skill, technically.',
  ],
  archer: [
    "The archer picks up the bow. Puts it down. Adjusts the grip tape. Calls it a session.",
    "You polished every arrow for 4 minutes and 58 seconds. Technically maintenance.",
    "The archer stares at the target from very far away. 'Visualisation training.'",
    'One stretch. Perfect form. The archer nods approvingly at themselves.',
    'You walked to the range. Looked at it. Walked back. Reconnaissance mission complete.',
  ],
  warrior: [
    'The warrior flexes once in the mirror. Nods. Returns to the couch. Honour intact.',
    "You put on armour. Took it off. Called it 'equipment testing.' Sure.",
    'The warrior grunts menacingly at a dumbbell from across the room. Intimidation training.',
    'One push-up. A noble effort. The bards will sing of it. Maybe.',
    'You swung a sword once and declared the battle won. The sword was a TV remote.',
  ],
};

// ── Encore card placeholder narratives ───────────────────────────────────────

const ENCORE_NARRATIVES = {
  wizard: [
    'The spell is well-practiced now. Each repetition deepens the groove in the aether.',
    'Even the most learned arcanist returns to fundamentals. This week, you have done more.',
    'The library is well-thumbed. Another chapter committed to memory.',
    'Excess study is rarely punished. The knowledge sits, patient, waiting to be called.',
    'The tome stays open. You keep reading. The arcane rewards the relentless.',
  ],
  archer: [
    'The range is familiar ground now. More arrows, more certainty.',
    'A quiver emptied and refilled. The range knows your name.',
    'Extra shots do not go to waste. Form builds in silence.',
    'The bullseye has grown used to your company. Keep arriving.',
    'Another session beyond the quota. Precision is a habit formed by repetition.',
  ],
  warrior: [
    'The training ground is tired of you. You are not tired of it.',
    'A warrior trains when the work is done and starts again.',
    'The extra round always costs something. It also always pays back.',
    'Sweat on the stones again. Good.',
    'Some warriors quit when the week is won. You are not some warriors.',
  ],
};

// ── Helper: beat title ────────────────────────────────────────────────────────

function beatTitle(questTheme, beatType, beatNumber) {
  return `${questTheme} — ${beatType.charAt(0) + beatType.slice(1).toLowerCase()} ${beatNumber}`;
}

// ── Build cards array ─────────────────────────────────────────────────────────

async function buildCards() {
  const cards = [];
  const archetypes = ['wizard', 'archer', 'warrior'];

  for (const archetype of archetypes) {
    const themes = QUEST_THEMES[archetype];

    // ── Per-week cards ──────────────────────────────────────────────────────

    for (let week = 1; week <= 12; week++) {
      const theme = themes[week - 1];
      const act = week <= 3 ? 1 : week <= 6 ? 2 : week <= 9 ? 3 : 4;

      // 7 story beats
      for (let beat = 0; beat < 7; beat++) {
        const cardType = BEAT_TYPES[beat];
        const beatNumber = beat + 1;
        cards.push({
          archetype,
          weekNumber: week,
          actNumber: act,
          cardType,
          beatNumber,
          title: beatTitle(theme, cardType, beatNumber),
          narrative: `[Week ${week}, Beat ${beatNumber} — ${cardType}] Narrative for ${theme}. To be written.`,
          playerPrompt: null,
          questTheme: theme,
          isGeneric: false,
        });
      }

      // Quest Complete card
      cards.push({
        archetype,
        weekNumber: week,
        actNumber: act,
        cardType: 'QUEST_COMPLETE',
        beatNumber: null,
        title: `${theme} — Quest Complete`,
        narrative: `[Week ${week} — QUEST_COMPLETE] The quest is fulfilled. Narrative for ${theme} to be written.`,
        playerPrompt: null,
        questTheme: theme,
        isGeneric: false,
      });

      // Quest Missed card
      cards.push({
        archetype,
        weekNumber: week,
        actNumber: act,
        cardType: 'QUEST_MISSED',
        beatNumber: null,
        title: `${theme} — Quest Missed`,
        narrative: `[Week ${week} — QUEST_MISSED] The quest slipped by. Narrative for ${theme} to be written.`,
        playerPrompt: null,
        questTheme: theme,
        isGeneric: false,
      });

      // Campaign Arc card (only at act boundary weeks)
      if (ACT_BOUNDARY_WEEKS.includes(week)) {
        const actNum = ACT_NUMBERS[week];
        const actLabel = ACT_LABELS[week];
        cards.push({
          archetype,
          weekNumber: week,
          actNumber: actNum,
          cardType: 'CAMPAIGN_ARC',
          beatNumber: null,
          title: `Act ${actNum}: ${actLabel} — The Arc Turns`,
          narrative: `[Act ${actNum}: ${actLabel} — CAMPAIGN_ARC] The story reaches a turning point. Narrative to be written.`,
          playerPrompt: null,
          questTheme: theme,
          isGeneric: false,
        });
      }
    }

    // ── Generic pool cards (lazy / encore) ──────────────────────────────────

    const lazyTexts = LAZY_NARRATIVES[archetype];
    for (let i = 0; i < lazyTexts.length; i++) {
      cards.push({
        archetype,
        weekNumber: null,
        actNumber: null,
        cardType: 'LAZY',
        beatNumber: null,
        title: `The ${archetype.charAt(0).toUpperCase() + archetype.slice(1)}'s Short Session`,
        narrative: lazyTexts[i],
        playerPrompt: null,
        questTheme: null,
        isGeneric: true,
      });
    }

    const encoreTexts = ENCORE_NARRATIVES[archetype];
    for (let i = 0; i < encoreTexts.length; i++) {
      cards.push({
        archetype,
        weekNumber: null,
        actNumber: null,
        cardType: 'ENCORE',
        beatNumber: null,
        title: `${archetype.charAt(0).toUpperCase() + archetype.slice(1)}'s Extra Mile`,
        narrative: encoreTexts[i],
        playerPrompt: null,
        questTheme: null,
        isGeneric: true,
      });
    }

    // ── Campaign Complete / Consolation (generic, end of 12-week arc) ───────

    cards.push({
      archetype,
      weekNumber: null,
      actNumber: 4,
      cardType: 'CAMPAIGN_COMPLETE',
      beatNumber: null,
      title: 'Campaign Complete — The Journey Ends Here',
      narrative: '[CAMPAIGN_COMPLETE] Twelve weeks done. All quests met. Narrative to be written.',
      playerPrompt: null,
      questTheme: null,
      isGeneric: true,
    });

    cards.push({
      archetype,
      weekNumber: null,
      actNumber: 4,
      cardType: 'CAMPAIGN_CONSOLATION',
      beatNumber: null,
      title: 'Campaign End — The Road Continues',
      narrative: '[CAMPAIGN_CONSOLATION] Twelve weeks done. The journey was real regardless. Narrative to be written.',
      playerPrompt: null,
      questTheme: null,
      isGeneric: true,
    });
  }

  return cards;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding RPG story cards...');

  // Clear existing cards
  const deleted = await prisma.storyCard.deleteMany({});
  console.log(`  Deleted ${deleted.count} existing story cards.`);

  const cards = await buildCards();
  console.log(`  Inserting ${cards.length} cards...`);

  await prisma.storyCard.createMany({ data: cards });

  // Summary
  const counts = await prisma.storyCard.groupBy({
    by: ['cardType'],
    _count: { _all: true },
    orderBy: { cardType: 'asc' },
  });
  console.log('\nCard counts by type:');
  for (const row of counts) {
    console.log(`  ${row.cardType.padEnd(24)} ${row._count._all}`);
  }
  console.log(`\nTotal: ${cards.length} cards seeded across ${Object.keys(QUEST_THEMES).length} archetypes.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
