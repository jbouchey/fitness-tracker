-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('TRAIL_RUN', 'ROAD_RUN', 'HIKE', 'CYCLING', 'STRENGTH', 'OTHER');

-- CreateEnum
CREATE TYPE "FileFormat" AS ENUM ('FIT', 'GPX');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "workoutType" "WorkoutType" NOT NULL DEFAULT 'TRAIL_RUN',
    "fileFormat" "FileFormat" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL,
    "distanceMiles" DOUBLE PRECISION NOT NULL,
    "avgPaceSecPerMile" DOUBLE PRECISION NOT NULL,
    "bestPaceSecPerMile" DOUBLE PRECISION,
    "elevationGainFt" DOUBLE PRECISION NOT NULL,
    "elevationLossFt" DOUBLE PRECISION NOT NULL,
    "avgElevationFt" DOUBLE PRECISION NOT NULL,
    "maxElevationFt" DOUBLE PRECISION,
    "minElevationFt" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "minHeartRate" INTEGER,
    "calories" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "splits" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "splitNumber" INTEGER NOT NULL,
    "distanceMiles" DOUBLE PRECISION NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL,
    "paceSecPerMile" DOUBLE PRECISION NOT NULL,
    "avgHeartRate" INTEGER,
    "elevationGainFt" DOUBLE PRECISION,
    "elevationLossFt" DOUBLE PRECISION,
    "startLat" DOUBLE PRECISION,
    "startLng" DOUBLE PRECISION,

    CONSTRAINT "splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_points" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "elevationM" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3),
    "elapsedSec" INTEGER,
    "heartRate" INTEGER,
    "cadence" INTEGER,
    "speed" DOUBLE PRECISION,

    CONSTRAINT "track_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "workouts_userId_startTime_idx" ON "workouts"("userId", "startTime" DESC);

-- CreateIndex
CREATE INDEX "workouts_userId_workoutType_idx" ON "workouts"("userId", "workoutType");

-- CreateIndex
CREATE INDEX "splits_workoutId_splitNumber_idx" ON "splits"("workoutId", "splitNumber");

-- CreateIndex
CREATE INDEX "track_points_workoutId_sequence_idx" ON "track_points"("workoutId", "sequence");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "splits" ADD CONSTRAINT "splits_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_points" ADD CONSTRAINT "track_points_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
