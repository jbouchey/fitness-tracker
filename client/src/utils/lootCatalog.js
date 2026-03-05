export const LOOT_CATALOG = {
  common:    [
    { slug: 'copper_ring',   name: 'Copper Ring',   emoji: '\u{1FA99}' },
    { slug: 'stone_pendant', name: 'Stone Pendant', emoji: '\u{1FAA8}' },
    { slug: 'iron_bangle',   name: 'Iron Bangle',   emoji: '\u2699\uFE0F' },
    { slug: 'clay_amulet',   name: 'Clay Amulet',   emoji: '\u{1F3FA}' },
  ],
  uncommon:  [
    { slug: 'silver_ring',     name: 'Silver Ring',     emoji: '\u{1F48D}' },
    { slug: 'jade_torc',       name: 'Jade Torc',       emoji: '\u{1F9A2}' },
    { slug: 'moonstone',       name: 'Moonstone',       emoji: '\u{1F319}' },
    { slug: 'bronze_bracelet', name: 'Bronze Bracelet', emoji: '\u{1F517}' },
  ],
  rare:      [
    { slug: 'gold_ring',          name: 'Gold Ring',          emoji: '\u{1F4B0}' },
    { slug: 'sapphire_amulet',    name: 'Sapphire Amulet',    emoji: '\u{1F48E}' },
    { slug: 'enchanted_bracelet', name: 'Enchanted Bracelet', emoji: '\u2728' },
    { slug: 'crystal_orb',        name: 'Crystal Orb',        emoji: '\u{1F52E}' },
  ],
  epic:      [
    { slug: 'ruby_crown',    name: 'Ruby Crown',    emoji: '\u{1F451}' },
    { slug: 'mystic_orb',    name: 'Mystic Orb',    emoji: '\u{1F7E3}' },
    { slug: 'arcane_gem',    name: 'Arcane Gem',    emoji: '\u{1F4A0}' },
    { slug: 'platinum_torc', name: 'Platinum Torc', emoji: '\u{1F537}' },
  ],
  legendary: [
    { slug: 'dragons_eye',   name: "Dragon's Eye",  emoji: '\u{1F409}' },
    { slug: 'phoenix_crown', name: 'Phoenix Crown', emoji: '\u{1F525}' },
    { slug: 'void_crystal',  name: 'Void Crystal',  emoji: '\u26AB' },
    { slug: 'eternal_ring',  name: 'Eternal Ring',  emoji: '\u267E\uFE0F' },
  ],
};

export const RARITY_META = {
  common:    { label: 'Common',    bg: 'bg-gray-100',    text: 'text-gray-600',   border: 'border-gray-200',   glow: '' },
  uncommon:  { label: 'Uncommon',  bg: 'bg-green-50',    text: 'text-green-700',  border: 'border-green-200',  glow: '' },
  rare:      { label: 'Rare',      bg: 'bg-blue-50',     text: 'text-blue-700',   border: 'border-blue-200',   glow: '' },
  epic:      { label: 'Epic',      bg: 'bg-purple-50',   text: 'text-purple-700', border: 'border-purple-200', glow: '' },
  legendary: { label: 'Legendary', bg: 'bg-amber-50',    text: 'text-amber-700',  border: 'border-amber-300',  glow: 'ring-1 ring-amber-400' },
};

// Flat slug -> catalog entry lookup
export const LOOT_BY_SLUG = Object.values(LOOT_CATALOG).flat().reduce((acc, item) => {
  acc[item.slug] = item;
  return acc;
}, {});
