-- AlterEnum
ALTER TYPE "FileFormat" ADD VALUE 'STRAVA';

-- AlterTable: add Strava fields to users
ALTER TABLE "users"
  ADD COLUMN "stravaAthleteId"    TEXT,
  ADD COLUMN "stravaAccessToken"  TEXT,
  ADD COLUMN "stravaRefreshToken" TEXT,
  ADD COLUMN "stravaTokenExpiry"  TIMESTAMP(3);

-- AlterTable: add stravaActivityId to workouts
ALTER TABLE "workouts"
  ADD COLUMN "stravaActivityId" TEXT;

-- CreateIndex: unique constraints
CREATE UNIQUE INDEX "users_stravaAthleteId_key" ON "users"("stravaAthleteId");
CREATE UNIQUE INDEX "workouts_stravaActivityId_key" ON "workouts"("stravaActivityId");
