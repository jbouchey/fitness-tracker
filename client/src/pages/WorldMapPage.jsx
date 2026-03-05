import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adventureApi } from '../api/adventure';
import { xpProgress } from '../utils/adventureUtils';

// The 7-tile regional sequence for each homeland color.
// Tile 0-1 = home region, 2-3 = first adjacent, 4-5 = second adjacent, 6 = frontier edge.
const REGION_SEQUENCE = {
  blue:   ['blue', 'blue', 'green', 'green', 'red',   'yellow', 'yellow'],
  green:  ['green','green','red',   'red',   'yellow', 'blue',   'blue'  ],
  red:    ['red',  'red',  'yellow','yellow','blue',   'green',  'green' ],
  yellow: ['yellow','yellow','blue','blue',  'green',  'red',    'red'   ],
};

const REGION_META = {
  blue:   { name: 'Woodlands',    emoji: '\u{1F332}', bg: 'bg-emerald-800',  text: 'text-emerald-100' },
  green:  { name: 'Grasslands',   emoji: '\u{1F33F}', bg: 'bg-green-600',    text: 'text-green-100'   },
  red:    { name: 'Desert Dunes', emoji: '\u{1F3DC}\uFE0F', bg: 'bg-orange-700', text: 'text-orange-100' },
  yellow: { name: 'Ice Tundra',   emoji: '\u2744\uFE0F', bg: 'bg-blue-300',  text: 'text-blue-900'    },
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ARCHETYPE_EMOJI = { wizard: '\u{1F9D9}', archer: '\u{1F3F9}', warrior: '\u2694\uFE0F' };

const CREATURES = {
  easy:   { name: 'Forest Goblin',  emoji: '\u{1F47A}', flavor: 'A mischievous goblin scrambles out of the undergrowth, eyes gleaming with mischief...' },
  medium: { name: 'Stone Troll',    emoji: '\u{1F9CC}', flavor: 'A hulking stone troll rises from the ancient boulders, its roar shaking the earth...' },
  hard:   { name: 'Sky Griffin',    emoji: '\u{1F985}', flavor: 'A majestic griffin descends from stormclouds, talons gleaming like moonlit silver...' },
  epic:   { name: 'Ancient Dragon', emoji: '\u{1F409}', flavor: 'The ground trembles. A colossus of scale and flame unfurls its wings across the horizon...' },
};

export default function WorldMapPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [worldData, setWorldData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreature, setShowCreature] = useState(false);

  const color = user?.adventureCharacterColor ?? 'blue';
  const archetype = user?.adventureCharacterArchetype ?? 'warrior';
  const totalXp = user?.adventureTotalXp ?? 0;
  const { level } = xpProgress(totalXp);

  useEffect(() => {
    adventureApi.getWorld()
      .then((data) => setWorldData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeDays = worldData?.activeDaysThisWeek ?? 0;
  const quest = worldData?.quest ?? null;
  const questComplete = quest?.status === 'completed';
  const difficulty = quest?.difficulty ?? 'medium';

  // Current tile index: 0 = homeland (no workouts yet), up to 6
  const currentTile = Math.min(activeDays, 6);

  const regionSequence = REGION_SEQUENCE[color] ?? REGION_SEQUENCE.blue;
  const creature = CREATURES[difficulty] ?? CREATURES.medium;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate('/adventure')}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold">World Map</h1>
          <p className="text-xs text-gray-400">Level {level} · {activeDays} active day{activeDays !== 1 ? 's' : ''} this week</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading…</div>
      ) : (
        <div className="px-4">

          {/* Journey path */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">This Week's Journey</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {regionSequence.map((region, i) => {
                const meta = REGION_META[region];
                const isActive = i < activeDays;
                const isCurrent = i === currentTile;

                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 w-20 rounded-xl flex flex-col items-center justify-between p-2 pt-3 pb-2 border transition-all ${
                      isActive
                        ? `${meta.bg} border-transparent`
                        : 'bg-gray-800 border-gray-700 opacity-40'
                    }`}
                  >
                    {/* Region emoji */}
                    <span className="text-2xl leading-none mb-1">
                      {isCurrent ? (ARCHETYPE_EMOJI[archetype] ?? '\u{1F9D9}') : (isActive ? meta.emoji : '\u2753')}
                    </span>

                    {/* Day label */}
                    <span className={`text-xs font-semibold ${isActive ? meta.text : 'text-gray-500'}`}>
                      {DAY_LABELS[i]}
                    </span>

                    {/* Region name */}
                    <span className={`text-xs text-center leading-tight mt-0.5 ${isActive ? meta.text + ' opacity-75' : 'text-gray-600'}`}>
                      {isActive ? meta.name : '???'}
                    </span>

                    {/* Active dot */}
                    {isActive && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isCurrent ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
                    )}
                  </div>
                );
              })}

              {/* Mystery World tile — always shown, locked unless quest complete */}
              <div
                className={`flex-shrink-0 w-20 rounded-xl flex flex-col items-center justify-between p-2 pt-3 pb-2 border ${
                  questComplete
                    ? 'bg-purple-900 border-purple-600 cursor-pointer hover:bg-purple-800 transition-colors'
                    : 'bg-gray-800 border-gray-700 opacity-40'
                }`}
                onClick={() => questComplete && setShowCreature(true)}
              >
                <span className="text-2xl leading-none mb-1">{questComplete ? '\u{1F300}' : '\u{1F512}'}</span>
                <span className={`text-xs font-semibold ${questComplete ? 'text-purple-200' : 'text-gray-500'}`}>
                  ???
                </span>
                <span className={`text-xs text-center leading-tight mt-0.5 ${questComplete ? 'text-purple-300' : 'text-gray-600'}`}>
                  {questComplete ? 'Mystery' : 'Complete quest'}
                </span>
                {questComplete && (
                  <div className="w-1.5 h-1.5 rounded-full mt-1 bg-purple-400 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* Status card */}
          <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
            {activeDays === 0 ? (
              <p className="text-sm text-gray-400 italic">Log a workout to begin your journey this week.</p>
            ) : questComplete ? (
              <div>
                <p className="text-sm font-semibold text-purple-300">Quest complete — the Mystery World awaits.</p>
                <p className="text-xs text-gray-400 mt-1">Tap the portal tile to encounter the creature. A new journey begins Monday.</p>
                <button
                  onClick={() => setShowCreature(true)}
                  className="mt-3 w-full py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold transition-colors"
                >
                  Enter Mystery World
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-white">
                  Day {activeDays} of 7 — exploring {REGION_META[regionSequence[currentTile]]?.name ?? 'the frontier'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {7 - activeDays} more active day{7 - activeDays !== 1 ? 's' : ''} to reach the frontier.
                  Complete your quest to unlock the Mystery World.
                </p>
              </div>
            )}
          </div>

          {/* Region legend */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">World Regions</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(REGION_META).map(([key, meta]) => (
                <div key={key} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${meta.bg} bg-opacity-30`}>
                  <span className="text-lg">{meta.emoji}</span>
                  <span className={`text-xs font-medium ${meta.text} opacity-90`}>{meta.name}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-purple-900 bg-opacity-40">
                <span className="text-lg">🌀</span>
                <span className="text-xs font-medium text-purple-300">Mystery Zone</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Mystery World encounter overlay */}
      {showCreature && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 p-4">
          <div className="w-full max-w-md bg-gray-900 border border-purple-700 rounded-2xl p-6 text-center">
            <p className="text-xs text-purple-400 uppercase tracking-widest mb-2">Mystery World</p>
            <div className="text-8xl leading-none mb-4">{creature.emoji}</div>
            <h2 className="text-xl font-bold text-white mb-2">{creature.name}</h2>
            <p className="text-sm text-gray-400 italic mb-6 leading-relaxed">"{creature.flavor}"</p>
            <div className="bg-purple-900/40 rounded-xl p-3 mb-6 border border-purple-800">
              <p className="text-xs text-purple-300">Future update: Boss battle minigame coming soon.</p>
            </div>
            <button
              onClick={() => { setShowCreature(false); navigate('/adventure'); }}
              className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold text-sm transition-colors"
            >
              Return Through the Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
