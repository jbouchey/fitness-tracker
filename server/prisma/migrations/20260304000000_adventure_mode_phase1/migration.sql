-- AlterTable: add adventure mode fields to users
ALTER TABLE "users"
  ADD COLUMN "adventureModeEnabled"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adventureCharacterArchetype" TEXT,
  ADD COLUMN "adventureCharacterGender"    TEXT,
  ADD COLUMN "adventureCharacterColor"     TEXT;
