-- Add adventureClaimed flag to workouts table
-- Existing workouts default to false (unclaimed); they predate the gated-claim
-- system so they will never appear as pending.
ALTER TABLE "workouts" ADD COLUMN "adventureClaimed" BOOLEAN NOT NULL DEFAULT false;
