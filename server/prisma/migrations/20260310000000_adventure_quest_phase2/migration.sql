-- AlterTable: add adventureDifficulty to users
ALTER TABLE "users" ADD COLUMN "adventureDifficulty" TEXT NOT NULL DEFAULT 'medium';

-- CreateTable: quests
CREATE TABLE "quests" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "weekStart"      TIMESTAMP(3) NOT NULL,
  "difficulty"     TEXT NOT NULL,
  "targetSeconds"  INTEGER NOT NULL,
  "earnedSeconds"  INTEGER NOT NULL DEFAULT 0,
  "status"         TEXT NOT NULL DEFAULT 'active',
  "waypoint1Hit"   BOOLEAN NOT NULL DEFAULT false,
  "waypoint2Hit"   BOOLEAN NOT NULL DEFAULT false,
  "waypoint3Hit"   BOOLEAN NOT NULL DEFAULT false,
  "questCompleted" BOOLEAN NOT NULL DEFAULT false,
  "narrativeBeats" JSONB NOT NULL DEFAULT '[]',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "quests_userId_weekStart_key" ON "quests"("userId", "weekStart");
CREATE INDEX "quests_userId_weekStart_idx" ON "quests"("userId", "weekStart" DESC);
