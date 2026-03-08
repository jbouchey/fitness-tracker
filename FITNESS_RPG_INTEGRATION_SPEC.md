# Fitness RPG System — Integration Spec

## Overview

This document specifies the complete integration of an RPG leveling and narrative system into an existing fitness tracker application. The RPG system rewards workouts with story beats, XP, and character progression across three fantasy archetypes.

**Existing Stack:**
- Frontend: React + Vite, React Router, Zustand, Tailwind CSS, Mapbox GL, Chart.js, Axios
- Backend: Node.js + Express, Prisma ORM, PostgreSQL (Railway), JWT auth, Multer, Resend
- Integrations: Strava OAuth + webhook, Open-Meteo weather API
- Hosting: Railway (client + server services)
- Repo: github.com/jbouchey/fitness-tracker

**What This Adds:**
- Player archetype selection and character progression (Levels 1–99, 4 visual tiers)
- XP system with steep curve, soft weekly cap, difficulty multiplier, and quest bonus
- 12-week campaign structure with weekly quests and story beat cards
- Story beat delivery on every workout completion via Strava webhook
- Quest completion tracking based on weekly workout time

---

## 1. Prisma Schema Additions

Add these models to the existing `schema.prisma`. The `User` model already exists — extend it with RPG fields.

```prisma
// ── Add to existing User model ──
model User {
  // ... existing fields ...

  // RPG fields
  archetype        Archetype?
  rpgLevel         Int          @default(1)
  totalXp          Float        @default(0)
  difficulty       Difficulty   @default(EASY)
  currentCampaignId String?
  currentCampaign  Campaign?    @relation(fields: [currentCampaignId], references: [id])
  campaigns        Campaign[]   @relation("UserCampaigns")
  weeklyProgress   WeeklyProgress[]
  cardHistory      CardHistory[]
}

enum Archetype {
  WIZARD
  ARCHER
  WARRIOR
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
  EPIC
}

enum CardType {
  CHALLENGE
  REFLECTION
  RELEASE
  CONNECTION
  MILESTONE
  WILDCARD
  QUEST_COMPLETE
  QUEST_MISSED
  CAMPAIGN_ARC
  ENCORE
  LAZY
}

enum QuestStatus {
  ACTIVE
  COMPLETED
  MISSED
}

// ── Campaign (12-week arc) ──
model Campaign {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation("UserCampaigns", fields: [userId], references: [id])
  activeUser    User?    @relation
  campaignNumber Int              // 1, 2, 3... (which campaign is this for the user)
  archetype     Archetype
  startDate     DateTime
  endDate       DateTime?
  currentWeek   Int      @default(1)
  currentAct    Int      @default(1)   // 1-4
  isActive      Boolean  @default(true)
  weeklyProgress WeeklyProgress[]
  createdAt     DateTime @default(now())
}

// ── Weekly Quest Progress ──
model WeeklyProgress {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  campaignId      String
  campaign        Campaign    @relation(fields: [campaignId], references: [id])
  weekNumber      Int                    // 1-12
  difficulty      Difficulty
  totalMinutes    Float       @default(0)
  totalXpEarned   Float       @default(0)
  questTarget     Int                    // in minutes: 60, 240, 600, 900
  questStatus     QuestStatus @default(ACTIVE)
  questBonusXp    Float       @default(0)
  storyBeatsServed Int        @default(0) // how many of the 7 unique beats served
  workoutCount    Int         @default(0)
  weekStartDate   DateTime
  weekEndDate     DateTime
  cardHistory     CardHistory[]
  createdAt       DateTime    @default(now())

  @@unique([userId, campaignId, weekNumber])
}

// ── Story Beat Cards ──
model StoryCard {
  id          String    @id @default(cuid())
  archetype   Archetype
  weekNumber  Int?               // null for non-week-specific cards (encore, lazy)
  act         Int?               // 1-4, null for non-act cards
  cardType    CardType
  beatNumber  Int?               // 1-7 for story beats, null for others
  title       String
  narrative   String             // 2-3 sentence story beat
  playerPrompt String?           // reflection question for the player
  questTheme  String?            // e.g. "The Locked Library"
  isGeneric   Boolean  @default(false)  // true for lazy/encore beats
  cardHistory CardHistory[]
  createdAt   DateTime @default(now())

  @@index([archetype, weekNumber, cardType])
}

// ── Card Delivery History ──
model CardHistory {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  storyCardId      String
  storyCard        StoryCard @relation(fields: [storyCardId], references: [id])
  weeklyProgressId String?
  weeklyProgress   WeeklyProgress? @relation(fields: [weeklyProgressId], references: [id])
  workoutDuration  Float?          // minutes of the triggering workout
  xpEarned         Float           // XP from this specific card delivery
  deliveredAt      DateTime @default(now())

  @@index([userId, deliveredAt])
}
```

---

## 2. XP Calculation Engine

Create this as `server/src/rpg/xpEngine.js`. This is the core math — every number has been simulation-tested.

```javascript
// ═══════════════════════════════════════════════════════
// XP ENGINE — All RPG math lives here
// ═══════════════════════════════════════════════════════

// ── Constants ──
const DIFFICULTY_TARGETS = {
  EASY: 60,      // 1 hour
  MEDIUM: 240,   // 4 hours
  HARD: 600,     // 10 hours
  EPIC: 900,     // 15 hours
};

const FOCUS_MULTIPLIERS = {
  EASY: 2.5,
  MEDIUM: 1.5,
  HARD: 1.0,
  EPIC: 1.0,
};

const QUEST_BONUS_MULTIPLIER = 0.50;
const SOFT_CAP_THRESHOLD = 400;
const SOFT_CAP_RATE = 0.50;
const LAZY_THRESHOLD_MINUTES = 5;
const MAX_LEVEL = 99;

// ── Curve C: XP cost per level ──
function xpCostForLevel(level) {
  if (level <= 25) return 3 + level * 0.5;
  if (level <= 50) return 10 + (level - 25) * 1.5;
  if (level <= 70) return 40 + (level - 50) * 4;
  if (level <= 85) {
    const x = level - 70;
    return Math.floor(120 + x * 10 + Math.pow(x, 1.8));
  }
  const x = level - 85;
  return Math.floor(400 + x * 25 + Math.pow(x, 2.5));
}

// ── Build cumulative XP table (call once on server start, cache it) ──
function buildXpTable() {
  const table = [];
  let cumulative = 0;
  for (let level = 1; level <= MAX_LEVEL; level++) {
    cumulative += xpCostForLevel(level);
    table.push({ level, cost: xpCostForLevel(level), cumulative });
  }
  return table;
}

const XP_TABLE = buildXpTable();
const MAX_XP = XP_TABLE[XP_TABLE.length - 1].cumulative; // ~17,909

// ── Level from total XP ──
function levelFromXp(totalXp) {
  for (const entry of XP_TABLE) {
    if (totalXp < entry.cumulative) return entry.level;
  }
  return MAX_LEVEL;
}

// ── Visual tier from level ──
function tierFromLevel(level) {
  if (level <= 15) return 'NOVICE';
  if (level <= 35) return 'STANDARD';
  if (level <= 60) return 'SKILLED';
  return 'MASTER';
}

// ── Progress within current level (0-100%) ──
function levelProgress(totalXp) {
  const level = levelFromXp(totalXp);
  if (level >= MAX_LEVEL) return 100;
  const prevCumulative = level >= 2 ? XP_TABLE[level - 2].cumulative : 0;
  const nextCumulative = XP_TABLE[level - 1].cumulative;
  return Math.min(100, ((totalXp - prevCumulative) / (nextCumulative - prevCumulative)) * 100);
}

// ── Soft weekly cap ──
function applySoftCap(weeklyXp) {
  if (weeklyXp <= SOFT_CAP_THRESHOLD) return weeklyXp;
  return SOFT_CAP_THRESHOLD + (weeklyXp - SOFT_CAP_THRESHOLD) * SOFT_CAP_RATE;
}

// ── Calculate XP for a single workout ──
// This is called every time a Strava webhook fires
function calculateWorkoutXp(durationMinutes, difficulty, currentWeekXpBeforeCap) {
  const baseXp = durationMinutes; // 1 min = 1 XP
  const multiplier = FOCUS_MULTIPLIERS[difficulty];
  const multipliedXp = baseXp * multiplier;

  // Soft cap is applied at the WEEKLY level, not per-workout
  // So we need to know where this workout sits in the week's running total
  const weekTotalBefore = currentWeekXpBeforeCap;
  const weekTotalAfter = weekTotalBefore + multipliedXp;
  const cappedBefore = applySoftCap(weekTotalBefore);
  const cappedAfter = applySoftCap(weekTotalAfter);
  const effectiveXp = cappedAfter - cappedBefore;

  return {
    baseXp,
    multipliedXp,
    effectiveXp,
    isLazy: durationMinutes < LAZY_THRESHOLD_MINUTES,
  };
}

// ── Calculate quest completion bonus ──
function calculateQuestBonus(difficulty) {
  const target = DIFFICULTY_TARGETS[difficulty];
  return Math.floor(target * QUEST_BONUS_MULTIPLIER);
}

// ── Check if quest is complete ──
function checkQuestCompletion(totalMinutesThisWeek, difficulty) {
  return totalMinutesThisWeek >= DIFFICULTY_TARGETS[difficulty];
}

// ── Get current act from week number ──
function actFromWeek(weekNumber) {
  if (weekNumber <= 3) return 1;  // Setup
  if (weekNumber <= 6) return 2;  // Rising Action
  if (weekNumber <= 9) return 3;  // Crisis
  return 4;                        // Resolution
}

// ── Get act label ──
function actLabel(act) {
  const labels = {
    1: 'Setup',
    2: 'Rising Action',
    3: 'Crisis',
    4: 'Resolution',
  };
  return labels[act] || 'Unknown';
}

module.exports = {
  DIFFICULTY_TARGETS,
  FOCUS_MULTIPLIERS,
  QUEST_BONUS_MULTIPLIER,
  SOFT_CAP_THRESHOLD,
  SOFT_CAP_RATE,
  LAZY_THRESHOLD_MINUTES,
  MAX_LEVEL,
  MAX_XP,
  XP_TABLE,
  xpCostForLevel,
  levelFromXp,
  tierFromLevel,
  levelProgress,
  applySoftCap,
  calculateWorkoutXp,
  calculateQuestBonus,
  checkQuestCompletion,
  actFromWeek,
  actLabel,
};
```

---

## 3. Card Delivery Engine

Create as `server/src/rpg/cardEngine.js`. Decides which story beat to serve after each workout.

```javascript
const { LAZY_THRESHOLD_MINUTES } = require('./xpEngine');

// ── Card selection priority ──
// After each workout, determine which card to serve
async function selectCard(prisma, userId, workoutDuration, weeklyProgress) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { currentCampaign: true },
  });

  if (!user || !user.currentCampaign || !user.archetype) return null;

  const { archetype } = user;
  const { weekNumber, storyBeatsServed, workoutCount } = weeklyProgress;
  const campaign = user.currentCampaign;

  // 1. Lazy beat (workout < 5 min)
  if (workoutDuration < LAZY_THRESHOLD_MINUTES) {
    return await getRandomCard(prisma, archetype, 'LAZY');
  }

  // 2. Story beat (beats 1-7 for this week, not yet served)
  if (storyBeatsServed < 7) {
    const nextBeat = storyBeatsServed + 1;
    const card = await prisma.storyCard.findFirst({
      where: {
        archetype,
        weekNumber,
        beatNumber: nextBeat,
        cardType: { in: ['CHALLENGE', 'REFLECTION', 'RELEASE', 'CONNECTION', 'MILESTONE', 'WILDCARD'] },
      },
    });
    if (card) return { card, incrementBeat: true };
  }

  // 3. Encore beat (8th+ workout this week)
  return await getRandomCard(prisma, archetype, 'ENCORE');
}

// ── Quest completion card ──
async function getQuestCompleteCard(prisma, archetype, weekNumber) {
  return await prisma.storyCard.findFirst({
    where: { archetype, weekNumber, cardType: 'QUEST_COMPLETE' },
  });
}

// ── Quest missed card ──
async function getQuestMissedCard(prisma, archetype, weekNumber) {
  return await prisma.storyCard.findFirst({
    where: { archetype, weekNumber, cardType: 'QUEST_MISSED' },
  });
}

// ── Campaign arc card (at act boundaries: weeks 3, 6, 9, 12) ──
async function getCampaignArcCard(prisma, archetype, weekNumber) {
  const act = Math.ceil(weekNumber / 3);
  return await prisma.storyCard.findFirst({
    where: { archetype, act, cardType: 'CAMPAIGN_ARC' },
  });
}

// ── Random card from a pool (for lazy/encore) ──
async function getRandomCard(prisma, archetype, cardType) {
  const cards = await prisma.storyCard.findMany({
    where: { archetype, cardType, isGeneric: true },
  });
  if (cards.length === 0) return null;
  const card = cards[Math.floor(Math.random() * cards.length)];
  return { card, incrementBeat: false };
}

module.exports = {
  selectCard,
  getQuestCompleteCard,
  getQuestMissedCard,
  getCampaignArcCard,
};
```

---

## 4. API Endpoints

Add these routes. All require JWT auth (existing middleware).

### 4.1 RPG Setup

```
POST /api/rpg/setup
```
Player selects archetype and starts first campaign. Call once during onboarding or when player opts into RPG mode.

Request body:
```json
{
  "archetype": "WIZARD",
  "difficulty": "EASY"
}
```

Response:
```json
{
  "archetype": "WIZARD",
  "difficulty": "EASY",
  "campaign": {
    "id": "...",
    "campaignNumber": 1,
    "startDate": "2026-03-07",
    "currentWeek": 1,
    "currentAct": 1
  },
  "level": 1,
  "totalXp": 0,
  "tier": "NOVICE"
}
```

Logic:
- Set `archetype` and `difficulty` on User
- Create Campaign record (12 weeks from today)
- Create first WeeklyProgress record
- Set `currentCampaignId` on User

### 4.2 Get Player RPG State

```
GET /api/rpg/state
```

Returns everything the frontend needs to render the RPG UI.

Response:
```json
{
  "archetype": "WIZARD",
  "level": 46,
  "totalXp": 760,
  "xpToNextLevel": 48,
  "levelProgress": 72.5,
  "tier": "SKILLED",
  "difficulty": "EASY",
  "focusMultiplier": 2.5,
  "campaign": {
    "number": 1,
    "week": 12,
    "act": 4,
    "actLabel": "Resolution",
    "questTheme": "The First Incantation",
    "questTarget": 60,
    "weekMinutesLogged": 45,
    "questStatus": "ACTIVE",
    "storyBeatsServed": 3,
    "workoutCount": 3
  },
  "recentCards": [ /* last 5 CardHistory entries with StoryCard data */ ]
}
```

### 4.3 Change Difficulty

```
PUT /api/rpg/difficulty
```

Player can change each week.

Request body:
```json
{ "difficulty": "MEDIUM" }
```

Logic:
- Update User.difficulty
- Update current WeeklyProgress.difficulty and questTarget
- Only allowed if the current week's quest hasn't been completed yet
  (or allow change anytime — design decision, recommend anytime)

### 4.4 Workout Complete (Strava Webhook Handler Extension)

This extends the existing Strava webhook handler. When a new activity arrives:

```
POST /api/strava/webhook (existing endpoint — add RPG logic)
```

RPG processing steps (add to existing webhook handler):

1. Get workout duration in minutes from Strava activity
2. Look up user's current WeeklyProgress
3. Calculate XP: `calculateWorkoutXp(duration, difficulty, weekXpBeforeCap)`
4. Select card: `selectCard(prisma, userId, duration, weeklyProgress)`
5. Apply XP to user: update `totalXp`, recalculate `rpgLevel`
6. Update WeeklyProgress: `totalMinutes`, `totalXpEarned`, `storyBeatsServed`, `workoutCount`
7. Check quest completion: if newly complete, award bonus XP and serve quest complete card
8. Record CardHistory
9. Check for level-up → if tier changed, flag for frontend notification
10. Check for act boundary (weeks 3, 6, 9, 12) → serve campaign arc card at week end

Return or push (via websocket/polling) the card to the frontend.

Response payload to store for frontend:
```json
{
  "workout": {
    "duration": 30,
    "baseXp": 30,
    "multipliedXp": 75,
    "effectiveXp": 75,
    "isLazy": false
  },
  "card": {
    "id": "...",
    "type": "REFLECTION",
    "title": "The Silent Familiar",
    "narrative": "Your spirit familiar refuses to fetch another scroll...",
    "playerPrompt": "What are you researching that you already know enough to try?"
  },
  "progression": {
    "previousLevel": 45,
    "newLevel": 46,
    "leveledUp": true,
    "tierChanged": false,
    "totalXp": 760,
    "levelProgress": 72.5
  },
  "quest": {
    "weekMinutes": 45,
    "target": 60,
    "percentComplete": 75,
    "justCompleted": false
  }
}
```

### 4.5 Weekly Transition (Cron Job)

```
Cron: Run every Monday at 00:00 UTC (or user's timezone)
```

At the end of each week:
1. Check all active WeeklyProgress records where `weekEndDate` has passed
2. For each: if quest not completed, set `questStatus = MISSED`, serve missed quest card
3. If this was an act boundary week (3, 6, 9, 12), serve campaign arc card
4. If week 12, end the campaign: set `isActive = false`, `endDate = now`
5. Create new WeeklyProgress for next week (or new Campaign if week 12 completed)
6. Auto-create next campaign if user has `archetype` set (prompt user to confirm via frontend)

### 4.6 Card History

```
GET /api/rpg/cards?limit=20&offset=0
```

Returns paginated card history for the player. Frontend uses this for a "story so far" journal view.

### 4.7 XP Chart Data

```
GET /api/rpg/xp-chart?range=campaign
```

Returns weekly XP data for Chart.js visualization.

Response:
```json
{
  "weeks": [
    { "week": 1, "baseXp": 40, "questBonus": 0, "totalXp": 100, "cumulativeXp": 100, "level": 15 },
    { "week": 2, "baseXp": 60, "questBonus": 30, "totalXp": 225, "cumulativeXp": 325, "level": 31 }
  ]
}
```

---

## 5. Strava Webhook Extension

The existing Strava webhook handler needs this addition. Insert after activity data is saved:

```javascript
// In your existing Strava webhook handler, after saving the activity:

const { calculateWorkoutXp, checkQuestCompletion, calculateQuestBonus, levelFromXp, tierFromLevel } = require('../rpg/xpEngine');
const { selectCard, getQuestCompleteCard } = require('../rpg/cardEngine');

async function processRpgReward(prisma, userId, activityDurationMinutes) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { currentCampaign: true },
  });

  // Skip if user hasn't set up RPG
  if (!user.archetype || !user.currentCampaignId) return null;

  // Get current week's progress
  const weeklyProgress = await prisma.weeklyProgress.findFirst({
    where: {
      userId,
      campaignId: user.currentCampaignId,
      weekEndDate: { gte: new Date() },
      weekStartDate: { lte: new Date() },
    },
  });

  if (!weeklyProgress) return null;

  // Calculate XP
  const currentWeekMultipliedXp = weeklyProgress.totalXpEarned; // XP before cap this week
  const xpResult = calculateWorkoutXp(
    activityDurationMinutes,
    user.difficulty,
    currentWeekMultipliedXp
  );

  // Select story card
  const cardResult = await selectCard(prisma, userId, activityDurationMinutes, weeklyProgress);

  // Check quest completion (before this workout vs after)
  const wasComplete = weeklyProgress.questStatus === 'COMPLETED';
  const newTotalMinutes = weeklyProgress.totalMinutes + activityDurationMinutes;
  const isNowComplete = checkQuestCompletion(newTotalMinutes, user.difficulty);
  const justCompletedQuest = !wasComplete && isNowComplete;

  let questBonusXp = 0;
  let questCard = null;
  if (justCompletedQuest) {
    questBonusXp = calculateQuestBonus(user.difficulty);
    questCard = await getQuestCompleteCard(prisma, user.archetype, weeklyProgress.weekNumber);
  }

  // Total effective XP this workout
  const totalEffectiveXp = xpResult.effectiveXp + questBonusXp;

  // Previous state for comparison
  const prevLevel = user.rpgLevel;
  const prevTier = tierFromLevel(prevLevel);

  // Update user XP and level
  const newTotalXp = user.totalXp + totalEffectiveXp;
  const newLevel = levelFromXp(newTotalXp);
  const newTier = tierFromLevel(newLevel);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalXp: newTotalXp,
      rpgLevel: newLevel,
    },
  });

  // Update weekly progress
  await prisma.weeklyProgress.update({
    where: { id: weeklyProgress.id },
    data: {
      totalMinutes: newTotalMinutes,
      totalXpEarned: weeklyProgress.totalXpEarned + xpResult.multipliedXp,
      workoutCount: weeklyProgress.workoutCount + 1,
      storyBeatsServed: cardResult?.incrementBeat
        ? weeklyProgress.storyBeatsServed + 1
        : weeklyProgress.storyBeatsServed,
      questStatus: isNowComplete ? 'COMPLETED' : 'ACTIVE',
      questBonusXp: weeklyProgress.questBonusXp + questBonusXp,
    },
  });

  // Record card delivery
  if (cardResult?.card) {
    await prisma.cardHistory.create({
      data: {
        userId,
        storyCardId: cardResult.card.id,
        weeklyProgressId: weeklyProgress.id,
        workoutDuration: activityDurationMinutes,
        xpEarned: totalEffectiveXp,
      },
    });
  }

  // Record quest completion card
  if (questCard) {
    await prisma.cardHistory.create({
      data: {
        userId,
        storyCardId: questCard.id,
        weeklyProgressId: weeklyProgress.id,
        workoutDuration: activityDurationMinutes,
        xpEarned: questBonusXp,
      },
    });
  }

  return {
    workout: {
      duration: activityDurationMinutes,
      ...xpResult,
    },
    card: cardResult?.card || null,
    questCard: questCard || null,
    progression: {
      previousLevel: prevLevel,
      newLevel,
      leveledUp: newLevel > prevLevel,
      tierChanged: newTier !== prevTier,
      previousTier: prevTier,
      newTier,
      totalXp: newTotalXp,
    },
    quest: {
      weekMinutes: newTotalMinutes,
      target: weeklyProgress.questTarget,
      percentComplete: Math.min(100, (newTotalMinutes / weeklyProgress.questTarget) * 100),
      justCompleted: justCompletedQuest,
    },
  };
}

module.exports = { processRpgReward };
```

---

## 6. Weekly Cron Job

Create as `server/src/rpg/weeklyCron.js`. Run via node-cron or Railway cron.

```javascript
const cron = require('node-cron');
const { actFromWeek } = require('./xpEngine');
const { getQuestMissedCard, getCampaignArcCard } = require('./cardEngine');

function startWeeklyCron(prisma) {
  // Run every Monday at 00:00 UTC
  cron.schedule('0 0 * * 1', async () => {
    try {
      await processWeekTransitions(prisma);
    } catch (err) {
      console.error('Weekly RPG cron failed:', err);
    }
  });
}

async function processWeekTransitions(prisma) {
  const now = new Date();

  // Find all expired weekly progress records that are still ACTIVE
  const expiredWeeks = await prisma.weeklyProgress.findMany({
    where: {
      weekEndDate: { lt: now },
      questStatus: 'ACTIVE',
    },
    include: {
      user: true,
      campaign: true,
    },
  });

  for (const wp of expiredWeeks) {
    // Mark quest as missed
    await prisma.weeklyProgress.update({
      where: { id: wp.id },
      data: { questStatus: 'MISSED' },
    });

    // Serve missed quest card
    const missedCard = await getQuestMissedCard(prisma, wp.user.archetype, wp.weekNumber);
    if (missedCard) {
      await prisma.cardHistory.create({
        data: {
          userId: wp.userId,
          storyCardId: missedCard.id,
          weeklyProgressId: wp.id,
          xpEarned: 0,
        },
      });
    }

    // Campaign arc card at act boundaries
    if ([3, 6, 9, 12].includes(wp.weekNumber)) {
      const arcCard = await getCampaignArcCard(prisma, wp.user.archetype, wp.weekNumber);
      if (arcCard) {
        await prisma.cardHistory.create({
          data: {
            userId: wp.userId,
            storyCardId: arcCard.id,
            weeklyProgressId: wp.id,
            xpEarned: 0,
          },
        });
      }
    }

    // If week 12, end campaign
    if (wp.weekNumber >= 12) {
      await prisma.campaign.update({
        where: { id: wp.campaignId },
        data: { isActive: false, endDate: now },
      });

      // Auto-start next campaign
      const nextCampaignNumber = wp.campaign.campaignNumber + 1;
      const newCampaign = await prisma.campaign.create({
        data: {
          userId: wp.userId,
          campaignNumber: nextCampaignNumber,
          archetype: wp.user.archetype,
          startDate: now,
          isActive: true,
        },
      });

      await prisma.user.update({
        where: { id: wp.userId },
        data: { currentCampaignId: newCampaign.id },
      });

      // Create week 1 of new campaign
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);

      await prisma.weeklyProgress.create({
        data: {
          userId: wp.userId,
          campaignId: newCampaign.id,
          weekNumber: 1,
          difficulty: wp.user.difficulty,
          questTarget: getQuestTarget(wp.user.difficulty),
          weekStartDate: now,
          weekEndDate: weekEnd,
        },
      });
    } else {
      // Create next week
      const nextWeek = wp.weekNumber + 1;
      const weekStart = new Date(wp.weekEndDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      await prisma.weeklyProgress.create({
        data: {
          userId: wp.userId,
          campaignId: wp.campaignId,
          weekNumber: nextWeek,
          difficulty: wp.user.difficulty,
          questTarget: getQuestTarget(wp.user.difficulty),
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
        },
      });

      // Update campaign week
      await prisma.campaign.update({
        where: { id: wp.campaignId },
        data: {
          currentWeek: nextWeek,
          currentAct: actFromWeek(nextWeek),
        },
      });
    }
  }
}

function getQuestTarget(difficulty) {
  const targets = { EASY: 60, MEDIUM: 240, HARD: 600, EPIC: 900 };
  return targets[difficulty];
}

module.exports = { startWeeklyCron, processWeekTransitions };
```

---

## 7. Seed Data

Create as `server/prisma/seed-rpg.js`. Seeds the quest themes and placeholder cards.

The quest themes per archetype and week:

**Wizard (Analysis Paralysis):**
1. The Locked Library
2. The Thousand Scrolls
3. The Enchanter's Doubt
4. The Map That Grows
5. The Translated Tongue
6. The Familiar's Rebellion
7. The Tower Without Stairs
8. The Blank Page
9. The Burning Archive
10. The Spell From Memory
11. The Open Door
12. The First Incantation

**Archer (Perfectionism):**
1. The Perfect Arrow
2. Fog on the Range
3. The Missed Target
4. The Borrowed Bow
5. Arrow Without a Target
6. The Fraying String
7. The Scorekeeper's Shadow
8. Shooting in the Dark
9. The Shattered Bullseye
10. The Arrow That Curved
11. The Empty Quiver
12. The Archer's Release

**Warrior (Self-Worth):**
1. The Shield You Carry
2. Blood on the Training Ground
3. The War Council
4. The Scar That Speaks
5. The Warrior Rests
6. The Hollow Victory
7. The Arena of Mirrors
8. The Unarmed Round
9. The Battle You Can't Win
10. The Feast After the Fight
11. The Broken Oath
12. The Warrior Unburdened

Card type assignment per week (7 beats):
- Beat 1: Challenge
- Beat 2: Reflection
- Beat 3: Release
- Beat 4: Connection
- Beat 5: Milestone
- Beat 6: Wildcard
- Beat 7: Wildcard

Plus per week: 1 Quest Complete card, 1 Quest Missed card.
At weeks 3, 6, 9, 12: 1 Campaign Arc card.
Per archetype: 5 Encore cards (generic), 5 Lazy cards (generic).

The seed script should create placeholder StoryCard records with title = quest theme + card type, and empty narrative/prompt fields to be filled in later. The lazy beat cards already have draft narratives — seed those from this data:

**Wizard Lazy Beats:**
- "The wizard reads a spell title, nods wisely, and goes back to bed."
- "Your familiar yawns so hard it accidentally casts a sleep spell on itself."
- "You opened the grimoire. That counts as cardio for the mind. Barely."
- "The wizard stretches one arm. Declares it 'active recovery.' Questionable."
- "A potion bubbles on the desk. You watched it. Observation is a skill, technically."

**Archer Lazy Beats:**
- "The archer picks up the bow. Puts it down. Adjusts the grip tape. Calls it a session."
- "You polished every arrow for 4 minutes and 58 seconds. Technically maintenance."
- "The archer stares at the target from very far away. 'Visualisation training.'"
- "One stretch. Perfect form. The archer nods approvingly at themselves."
- "You walked to the range. Looked at it. Walked back. Reconnaissance mission complete."

**Warrior Lazy Beats:**
- "The warrior flexes once in the mirror. Nods. Returns to the couch. Honour intact."
- "You put on armour. Took it off. Called it 'equipment testing.' Sure."
- "The warrior grunts menacingly at a dumbbell from across the room. Intimidation training."
- "One push-up. A noble effort. The bards will sing of it. Maybe."
- "You swung a sword once and declared the battle won. The sword was a TV remote."

---

## 8. Frontend Components

All components use Tailwind CSS and follow existing app patterns.

### 8.1 Archetype Selection (Onboarding)

Route: `/rpg/setup`

Full-screen selection with three archetype cards. Each shows:
- Character art (Novice tier placeholder)
- Archetype name and core struggle
- Flavour text
- "Choose" button

After selection, show difficulty picker (Easy/Medium/Hard/Epic) with target descriptions. On confirm, POST to `/api/rpg/setup`.

### 8.2 RPG Dashboard Widget

Add to existing dashboard. Shows:
- Character art (current visual tier)
- Level number + XP bar (progress within level)
- Current tier badge (Novice/Standard/Skilled/Master)
- Current quest: name, progress bar (minutes logged / target), difficulty badge
- "Focus XP: 2.5x" indicator (only for Easy/Medium)
- Campaign progress: "Act 2: Rising Action — Week 5 of 12"

### 8.3 Story Beat Card Modal

Triggered after workout sync. Full-screen modal with:
- Card type badge (Challenge, Reflection, etc.)
- Card title
- Narrative text (2-3 sentences)
- Player prompt (if present) — styled as a question
- XP earned animation (+75 XP with number counting up)
- Level-up animation if applicable
- Tier change celebration if applicable
- "Continue" button

### 8.4 Quest Progress Component

Sidebar or dashboard widget:
- Quest theme name ("The Locked Library")
- Circular progress indicator (minutes / target)
- Difficulty badge
- "Change difficulty" dropdown
- Days remaining in week
- Story beats collected this week (dots: filled for served, empty for remaining)

### 8.5 Story Journal (Card History)

Route: `/rpg/journal`

Scrollable timeline of all cards received. Grouped by campaign → week. Each card shows:
- Card type icon
- Title and narrative
- Date delivered
- XP earned
- Workout that triggered it (duration, type from Strava)

### 8.6 XP Progression Chart

Use Chart.js (already in stack). Stacked bar chart:
- X axis: weeks
- Y axis: XP
- Stacked: base XP (blue), quest bonus (gold)
- Line overlay: cumulative XP
- Horizontal lines at tier boundaries

### 8.7 Zustand Store Extension

Add RPG slice to existing Zustand auth store:

```javascript
// In your existing store, add:
rpg: {
  archetype: null,
  level: 1,
  totalXp: 0,
  tier: 'NOVICE',
  difficulty: 'EASY',
  campaign: null,
  pendingCard: null,        // card to show in modal after workout
  showCardModal: false,
},
setRpgState: (state) => set((prev) => ({ rpg: { ...prev.rpg, ...state } })),
setPendingCard: (card) => set((prev) => ({
  rpg: { ...prev.rpg, pendingCard: card, showCardModal: true }
})),
dismissCard: () => set((prev) => ({
  rpg: { ...prev.rpg, pendingCard: null, showCardModal: false }
})),
```

---

## 9. Open-Meteo Weather Integration

The existing Open-Meteo integration can flavour story beats. When processing a workout:

1. Fetch weather for the workout's time and location (already available from Strava activity)
2. Pass weather conditions as context when selecting cards
3. Optional: add weather flavour text to the card delivery:
   - Rain → "The wizard trained through a storm. The ink ran but the spell held."
   - Extreme heat → "The warrior fought under a burning sun. Even the shield was too hot to hold."
   - Snow → "The archer's breath crystallized with each draw. Precision in the cold is its own reward."

This is an enhancement — not required for MVP. The card system works without it.

---

## 10. Data Model Summary

```
User (existing, extended)
  ├── Campaign (1 active, many historical)
  │     └── WeeklyProgress (12 per campaign)
  │           └── CardHistory (many per week)
  │                 └── StoryCard (reference)
  └── archetype, rpgLevel, totalXp, difficulty
```

Total database records per player per campaign:
- 1 Campaign
- 12 WeeklyProgress records
- ~60-84 CardHistory records (depending on workout frequency)
- StoryCard table is shared (seed once, read-only): ~366 records total

---

## 11. Implementation Order

Recommended build sequence:

1. **Prisma schema** — add models, run migration
2. **XP engine** — pure functions, easy to unit test
3. **Seed script** — populate StoryCard table with placeholder data
4. **RPG setup endpoint** — archetype selection + campaign creation
5. **RPG state endpoint** — frontend can start rendering
6. **Strava webhook extension** — the core reward loop
7. **Card delivery engine** — story beat selection logic
8. **Story beat modal** — the player-facing payoff
9. **Weekly cron** — quest transitions
10. **Dashboard widget** — ongoing RPG state display
11. **Journal view** — card history
12. **XP chart** — progression visualization
13. **Card content** — replace placeholder narratives with real story beats

Steps 1-6 are the critical path. The game works (XP flows, levels go up) even before the card narratives are written.

---

## 12. Environment Variables

Add to existing `.env`:

```
# No new external services required.
# RPG system uses existing PostgreSQL and Strava integration.
# Optional: node-cron for weekly transitions (or use Railway cron jobs)
```

New npm dependencies:
```
npm install node-cron    # for weekly quest transitions
```

---

## 13. Key Constants Reference

| Constant | Value | Location |
|---|---|---|
| XP per minute | 1 | xpEngine.js |
| Soft cap threshold | 400 XP/week | xpEngine.js |
| Soft cap rate above threshold | 50% | xpEngine.js |
| Quest bonus multiplier | 50% of target | xpEngine.js |
| Focus multiplier (Easy) | 2.5x | xpEngine.js |
| Focus multiplier (Medium) | 1.5x | xpEngine.js |
| Focus multiplier (Hard) | 1.0x | xpEngine.js |
| Focus multiplier (Epic) | 1.0x | xpEngine.js |
| Quest target (Easy) | 60 min / week | xpEngine.js |
| Quest target (Medium) | 240 min / week | xpEngine.js |
| Quest target (Hard) | 600 min / week | xpEngine.js |
| Quest target (Epic) | 900 min / week | xpEngine.js |
| Lazy beat threshold | < 5 min | xpEngine.js |
| Max level | 99 | xpEngine.js |
| Total XP to 99 | ~17,909 | xpEngine.js |
| Story beats per week | 7 unique + encore pool | cardEngine.js |
| Campaign length | 12 weeks | Campaign model |
| Acts per campaign | 4 (3 weeks each) | xpEngine.js |
| Visual tiers | Novice 1-15, Standard 16-35, Skilled 36-60, Master 61-99 | xpEngine.js |
