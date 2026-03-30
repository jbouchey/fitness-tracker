/**
 * XP Engine — all RPG math lives here.
 * Simulation-tested for a ~1-year journey to level 99 at medium difficulty.
 */

// ── Difficulty configuration ──────────────────────────────────────────────────

const DIFFICULTY_TARGETS = {
  easy:   60,   // 1 hour / week
  medium: 240,  // 4 hours / week
  hard:   600,  // 10 hours / week
  epic:   900,  // 15 hours / week
};

// Focus multiplier: easier difficulties earn more XP per minute as a reward
// for consistent short sessions. Hard/epic are its own challenge.
const FOCUS_MULTIPLIERS = {
  easy:   2.5,
  medium: 1.5,
  hard:   1.0,
  epic:   1.0,
};

// Quest completion bonus: 50% of the target minutes, awarded as bonus XP
const QUEST_BONUS_MULTIPLIER = 0.50;

// Weekly XP soft cap: above this, extra XP is halved to discourage bingeing
const SOFT_CAP_THRESHOLD = 400;
const SOFT_CAP_RATE = 0.50;

// Workouts shorter than this get a Lazy story card instead of a normal beat
const LAZY_THRESHOLD_MINUTES = 5;

const MAX_LEVEL = 99;

// ── Level curve ───────────────────────────────────────────────────────────────
// Steep early, very steep late. Total XP to 99 ≈ 17,900.

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

// Build cumulative XP table once on module load
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
const MAX_XP = XP_TABLE[XP_TABLE.length - 1].cumulative;

// ── Level lookups ─────────────────────────────────────────────────────────────

function levelFromXp(totalXp) {
  for (const entry of XP_TABLE) {
    if (totalXp < entry.cumulative) return entry.level;
  }
  return MAX_LEVEL;
}

// Progress within current level (0–100)
function levelProgress(totalXp) {
  const level = levelFromXp(totalXp);
  if (level >= MAX_LEVEL) return 100;
  const prevCumulative = level >= 2 ? XP_TABLE[level - 2].cumulative : 0;
  const nextCumulative = XP_TABLE[level - 1].cumulative;
  const pct = ((totalXp - prevCumulative) / (nextCumulative - prevCumulative)) * 100;
  return Math.min(100, Math.max(0, pct));
}

// XP needed to reach next level from current total
function xpToNextLevel(totalXp) {
  const level = levelFromXp(totalXp);
  if (level >= MAX_LEVEL) return 0;
  return XP_TABLE[level - 1].cumulative - totalXp;
}

// ── Soft cap ──────────────────────────────────────────────────────────────────

function applySoftCap(weeklyXp) {
  if (weeklyXp <= SOFT_CAP_THRESHOLD) return weeklyXp;
  return SOFT_CAP_THRESHOLD + (weeklyXp - SOFT_CAP_THRESHOLD) * SOFT_CAP_RATE;
}

// ── Per-workout XP calculation ────────────────────────────────────────────────
// weeklyXpBeforeCap: the sum of multiplied XP already earned this week
// (used to calculate where the soft cap kicks in for this workout)

function calculateWorkoutXp(durationMinutes, difficulty, weeklyXpBeforeCap = 0) {
  const baseXp = durationMinutes;
  const multiplier = FOCUS_MULTIPLIERS[difficulty] ?? 1.0;
  const multipliedXp = baseXp * multiplier;

  // Soft cap is applied at the weekly level across all workouts
  const cappedBefore = applySoftCap(weeklyXpBeforeCap);
  const cappedAfter  = applySoftCap(weeklyXpBeforeCap + multipliedXp);
  const effectiveXp  = cappedAfter - cappedBefore;

  return {
    baseXp,
    multipliedXp,
    effectiveXp: Math.round(effectiveXp * 10) / 10, // 1 decimal
    isLazy: durationMinutes < LAZY_THRESHOLD_MINUTES,
  };
}

// ── Quest bonus ───────────────────────────────────────────────────────────────

function calculateQuestBonus(difficulty) {
  return Math.floor(DIFFICULTY_TARGETS[difficulty] * QUEST_BONUS_MULTIPLIER);
}

function checkQuestCompletion(totalMinutes, difficulty) {
  return totalMinutes >= DIFFICULTY_TARGETS[difficulty];
}

// ── Campaign structure ────────────────────────────────────────────────────────

function actFromWeek(weekNumber) {
  if (weekNumber <= 3)  return 1; // Setup
  if (weekNumber <= 6)  return 2; // Rising Action
  if (weekNumber <= 9)  return 3; // Crisis
  return 4;                       // Resolution
}

const ACT_LABELS = {
  1: 'Setup',
  2: 'Rising Action',
  3: 'Crisis',
  4: 'Resolution',
};

// Act boundary weeks that get a Campaign Arc card
const ACT_BOUNDARY_WEEKS = [3, 6, 9, 12];

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
  levelProgress,
  xpToNextLevel,
  applySoftCap,
  calculateWorkoutXp,
  calculateQuestBonus,
  checkQuestCompletion,
  actFromWeek,
  ACT_LABELS,
  ACT_BOUNDARY_WEEKS,
};
