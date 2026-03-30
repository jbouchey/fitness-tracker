-- Migration: RPG Campaign System
-- Replaces Quest model with Campaign + WeeklyProgress + StoryCard + CardHistory + CampaignBadge
-- adventureTotalXp type changed from Int to Float
-- adventureClaimed renamed to adventureCardGenerated on workouts

-- ── Drop old Quest table ──────────────────────────────────────────────────────
DROP TABLE IF EXISTS "quests";

-- ── Update users table ────────────────────────────────────────────────────────
-- Change adventureTotalXp from Int to Float (keep existing values)
ALTER TABLE "users" ALTER COLUMN "adventureTotalXp" TYPE DOUBLE PRECISION USING "adventureTotalXp"::DOUBLE PRECISION;

-- ── Update workouts table ─────────────────────────────────────────────────────
-- Rename adventureClaimed → adventureCardGenerated (same semantics, new name)
ALTER TABLE "workouts" RENAME COLUMN "adventureClaimed" TO "adventureCardGenerated";

-- ── Create campaigns table ────────────────────────────────────────────────────
CREATE TABLE "campaigns" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "userId"         TEXT NOT NULL,
  "campaignNumber" INTEGER NOT NULL,
  "archetype"      TEXT NOT NULL,
  "startDate"      TIMESTAMP(3) NOT NULL,
  "endDate"        TIMESTAMP(3),
  "currentWeek"    INTEGER NOT NULL DEFAULT 1,
  "currentAct"     INTEGER NOT NULL DEFAULT 1,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "campaigns_userId_campaignNumber_key" ON "campaigns"("userId", "campaignNumber");
CREATE INDEX "campaigns_userId_isActive_idx" ON "campaigns"("userId", "isActive");

-- ── Create weekly_progress table ──────────────────────────────────────────────
CREATE TABLE "weekly_progress" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "userId"           TEXT NOT NULL,
  "campaignId"       TEXT NOT NULL,
  "weekNumber"       INTEGER NOT NULL,
  "weekStart"        TIMESTAMP(3) NOT NULL,
  "weekEnd"          TIMESTAMP(3) NOT NULL,
  "difficulty"       TEXT NOT NULL,
  "targetMinutes"    INTEGER NOT NULL,
  "earnedMinutes"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "earnedXp"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "questBonusXp"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "questStatus"      TEXT NOT NULL DEFAULT 'active',
  "storyBeatsServed" INTEGER NOT NULL DEFAULT 0,
  "workoutCount"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "weekly_progress_userId_fkey"   FOREIGN KEY ("userId")     REFERENCES "users"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "weekly_progress_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "weekly_progress_userId_weekStart_key" ON "weekly_progress"("userId", "weekStart");
CREATE INDEX "weekly_progress_userId_weekStart_idx" ON "weekly_progress"("userId", "weekStart" DESC);
CREATE INDEX "weekly_progress_campaignId_weekNumber_idx" ON "weekly_progress"("campaignId", "weekNumber");

-- ── Create story_cards table ──────────────────────────────────────────────────
CREATE TABLE "story_cards" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "archetype"    TEXT NOT NULL,
  "weekNumber"   INTEGER,
  "actNumber"    INTEGER,
  "cardType"     TEXT NOT NULL,
  "beatNumber"   INTEGER,
  "title"        TEXT NOT NULL,
  "narrative"    TEXT NOT NULL,
  "playerPrompt" TEXT,
  "questTheme"   TEXT,
  "isGeneric"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "story_cards_archetype_weekNumber_cardType_idx" ON "story_cards"("archetype", "weekNumber", "cardType");
CREATE INDEX "story_cards_cardType_isGeneric_idx" ON "story_cards"("cardType", "isGeneric");

-- ── Create card_history table ─────────────────────────────────────────────────
CREATE TABLE "card_history" (
  "id"                     TEXT NOT NULL PRIMARY KEY,
  "userId"                 TEXT NOT NULL,
  "storyCardId"            TEXT NOT NULL,
  "weeklyProgressId"       TEXT,
  "workoutId"              TEXT,
  "workoutDurationMinutes" DOUBLE PRECISION,
  "xpEarned"               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "seenAt"                 TIMESTAMP(3),
  "deliveredAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "card_history_userId_fkey"           FOREIGN KEY ("userId")           REFERENCES "users"("id")           ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "card_history_storyCardId_fkey"      FOREIGN KEY ("storyCardId")      REFERENCES "story_cards"("id")     ON UPDATE CASCADE,
  CONSTRAINT "card_history_weeklyProgressId_fkey" FOREIGN KEY ("weeklyProgressId") REFERENCES "weekly_progress"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "card_history_userId_seenAt_idx"      ON "card_history"("userId", "seenAt");
CREATE INDEX "card_history_userId_deliveredAt_idx" ON "card_history"("userId", "deliveredAt" DESC);

-- ── Create campaign_badges table ──────────────────────────────────────────────
CREATE TABLE "campaign_badges" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "userId"           TEXT NOT NULL,
  "campaignId"       TEXT UNIQUE,
  "campaignNumber"   INTEGER NOT NULL,
  "archetype"        TEXT NOT NULL,
  "difficulty"       TEXT NOT NULL,
  "weeksCompleted"   INTEGER NOT NULL,
  "questsCompleted"  INTEGER NOT NULL,
  "isFullCompletion" BOOLEAN NOT NULL DEFAULT false,
  "earnedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_badges_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "users"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_badges_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "campaign_badges_userId_earnedAt_idx" ON "campaign_badges"("userId", "earnedAt" DESC);
