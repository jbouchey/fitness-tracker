-- AlterTable
ALTER TABLE "quests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adventureStartedAt" TIMESTAMP(3),
ADD COLUMN     "adventureTotalXp" INTEGER NOT NULL DEFAULT 0;
