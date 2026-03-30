// XP cost per level — must mirror server/src/rpg/xpEngine.js
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

// Build cumulative XP table once at module load
const XP_TABLE = (() => {
  const table = [];
  let cumulative = 0;
  for (let level = 1; level <= 99; level++) {
    cumulative += xpCostForLevel(level);
    table.push({ level, cost: xpCostForLevel(level), cumulative });
  }
  return table;
})();

// Derive current level from total XP (capped at 99)
export function calculateLevel(totalXp) {
  for (const entry of XP_TABLE) {
    if (totalXp < entry.cumulative) return entry.level;
  }
  return 99;
}

// Returns level, XP within current level, XP needed for next level, and % progress
export function xpProgress(totalXp) {
  const level = calculateLevel(totalXp);
  if (level >= 99) return { level: 99, currentXp: totalXp, neededXp: 0, pct: 100 };
  const prevCumulative = level >= 2 ? XP_TABLE[level - 2].cumulative : 0;
  const nextCumulative = XP_TABLE[level - 1].cumulative;
  const currentXp = Math.round(totalXp - prevCumulative);
  const neededXp = Math.round(nextCumulative - prevCumulative);
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
