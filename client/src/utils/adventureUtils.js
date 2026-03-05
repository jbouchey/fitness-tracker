// XP needed to complete level N (reach level N from N-1)
export function xpForLevel(n) {
  return n * 4;
}

// Cumulative XP required to have reached level N
export function totalXpForLevel(n) {
  return 2 * n * (n + 1);
}

// Derive current level from total XP (capped at 99)
export function calculateLevel(totalXp) {
  let level = 1;
  for (let n = 1; n <= 99; n++) {
    if (totalXpForLevel(n) <= totalXp) {
      level = n;
    } else {
      break;
    }
  }
  return Math.min(level, 99);
}

// Returns level, XP within current level, XP needed for next level, and % progress
export function xpProgress(totalXp) {
  const level = calculateLevel(totalXp);
  if (level >= 99) return { level: 99, currentXp: totalXp, neededXp: 0, pct: 100 };
  const xpAtCurrentLevel = totalXpForLevel(level);
  const xpAtNextLevel = totalXpForLevel(level + 1);
  const currentXp = totalXp - xpAtCurrentLevel;
  const neededXp = xpAtNextLevel - xpAtCurrentLevel;
  const pct = Math.min(100, Math.round((currentXp / neededXp) * 100));
  return { level, currentXp, neededXp, pct };
}

const MILESTONE_TITLES = [
  { min: 1,  max: 9,  title: 'Wandering' },
  { min: 10, max: 19, title: 'Scout' },
  { min: 20, max: 29, title: 'Ranger' },
  { min: 30, max: 39, title: 'Champion' },
  { min: 40, max: 49, title: 'Veteran' },
  { min: 50, max: 59, title: 'Warlord' },
  { min: 60, max: 69, title: 'Mythic' },
  { min: 70, max: 79, title: 'Legend' },
  { min: 80, max: 89, title: 'Ascendant' },
  { min: 90, max: 98, title: 'Immortal' },
  { min: 99, max: 99, title: 'Eternal' },
];

export function getMilestoneTitle(level) {
  const entry = MILESTONE_TITLES.find(t => level >= t.min && level <= t.max);
  return entry ? entry.title : 'Wandering';
}

// Full character title: "Scout Blue Wizard"
export function getCharacterTitle(totalXp, color, archetype) {
  const level = calculateLevel(totalXp);
  const title = getMilestoneTitle(level);
  return `${title} ${color} ${archetype}`;
}
