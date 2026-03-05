ALTER TABLE "users" ADD COLUMN "adventureQuestStreak" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "loot" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "itemSlug"  TEXT NOT NULL,
  "rarity"    TEXT NOT NULL,
  "source"    TEXT NOT NULL,
  "earnedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "loot_userId_earnedAt_idx" ON "loot"("userId", "earnedAt" DESC);
