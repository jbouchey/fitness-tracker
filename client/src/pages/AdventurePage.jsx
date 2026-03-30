import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adventureApi } from '../api/adventure';
import { workoutsApi } from '../api/workouts';
import { formatDuration, formatDistance, formatDate, formatWorkoutType } from '../utils/formatters';
import { xpProgress, getMilestoneTitle } from '../utils/adventureUtils';

const REGION_SEQUENCE = {
  blue:   ['blue', 'blue', 'green', 'green', 'red',    'yellow', 'yellow'],
  green:  ['green','green','red',   'red',   'yellow', 'blue',   'blue'  ],
  red:    ['red',  'red',  'yellow','yellow','blue',   'green',  'green' ],
  yellow: ['yellow','yellow','blue','blue',  'green',  'red',    'red'   ],
};

const REGION_META = {
  blue:   { name: 'Woodlands',    emoji: '\u{1F332}', bg: 'bg-emerald-800', text: 'text-emerald-100' },
  green:  { name: 'Grasslands',   emoji: '\u{1F33F}', bg: 'bg-green-600',   text: 'text-green-100'   },
  red:    { name: 'Desert Dunes', emoji: '\u{1F3DC}\uFE0F', bg: 'bg-orange-700', text: 'text-orange-100' },
  yellow: { name: 'Ice Tundra',   emoji: '\u2744\uFE0F', bg: 'bg-blue-300', text: 'text-blue-900'    },
};

const ARCHETYPE_EMOJI = { wizard: '\u{1F9D9}', archer: '\u{1F3F9}', warrior: '\u2694\uFE0F' };

const WORKOUT_EMOJI = {
  TRAIL_RUN: '\u{1F3D4}\uFE0F',
  ROAD_RUN:  '\u{1F3C3}',
  HIKE:      '\u{1F97E}',
  CYCLING:   '\u{1F6B4}',
  STRENGTH:  '\u{1F4AA}',
  OTHER:     '\u26A1\uFE0F',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];


export default function AdventurePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  // Data state
  const [worldData, setWorldData] = useState(null);
  const [pendingCards, setPendingCards] = useState([]);
  const [recentWorkout, setRecentWorkout] = useState(null);

  // Pending-card modal state
  const [showCards, setShowCards] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  // Misc UI state
  const [exiting, setExiting] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!user?.adventureCharacterArchetype) {
    return <Navigate to="/adventure/select" replace />;
  }

  const {
    adventureCharacterArchetype: archetype,
    adventureCharacterGender: gender,
    adventureCharacterColor: color,
    adventureTotalXp: totalXp = 0,
  } = user;
  const { level, currentXp, neededXp, pct: xpPct } = xpProgress(totalXp);
  const milestoneTitle = getMilestoneTitle(level);

  function loadAll() {
    Promise.all([
      adventureApi.getWorld().then((d) => setWorldData(d)).catch(() => {}),
      adventureApi.getPendingCards().then(({ cards }) => setPendingCards(cards ?? [])).catch(() => {}),
      workoutsApi.getAll({ limit: 1, page: 1 }).then(({ workouts }) => setRecentWorkout(workouts?.[0] ?? null)).catch(() => {}),
    ]);
  }

  useEffect(() => { loadAll(); }, []);

  // Derived values
  const claimedDays    = worldData?.claimedDays ?? 0;
  const currentTile    = Math.min(claimedDays, 6);
  const regionSequence = REGION_SEQUENCE[color] ?? REGION_SEQUENCE.blue;
  const questComplete  = worldData?.quest?.status === 'completed';

  // ── Pending-card modal ───────────────────────────────────────────────────────

  function openCards() { setCardIndex(0); setShowCards(true); }

  async function advanceCard() {
    if (cardIndex < pendingCards.length - 1) {
      setCardIndex(cardIndex + 1);
    } else {
      // Mark all as seen, close modal, refresh
      const ids = pendingCards.map((c) => c.id);
      setShowCards(false);
      setPendingCards([]);
      try { await adventureApi.markCardsSeen(ids); } catch { /* ignore */ }
      adventureApi.getWorld().then((d) => setWorldData(d)).catch(() => {});
    }
  }

  // ── Other handlers ──────────────────────────────────────────────────────────

  async function handleExit() {
    setExiting(true);
    try {
      const updated = await adventureApi.toggleMode(false);
      updateUser(updated);
      navigate('/');
    } catch {
      setExiting(false);
    }
  }

  async function handleResetQuest() {
    if (!window.confirm("Reset this week's quest? All progress will be deleted.")) return;
    setResetting(true);
    try {
      await adventureApi.resetQuest();
      setPendingCards([]);
      setShowCards(false);
      loadAll();
    } catch { /* ignore */ }
    finally { setResetting(false); }
  }

  // ── Journey strip ────────────────────────────────────────────────────────────

  function JourneyStrip({ activeTiles }) {
    const tile = Math.min(activeTiles, 6);
    const regionMeta = REGION_META[regionSequence[tile] ?? color] ?? REGION_META.blue;
    return (
      <div className="rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
        {/* Region header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${activeTiles === 0 ? 'bg-gray-700' : regionMeta.bg}`}>
            <span>{activeTiles === 0 ? (ARCHETYPE_EMOJI[archetype] ?? '\u{1F9D9}') : regionMeta.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {activeTiles === 0 ? 'Awaiting Departure' : 'Currently Exploring'}
            </p>
            <p className="text-sm font-semibold text-white">
              {activeTiles === 0 ? 'Your Homeland' : regionMeta.name}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500">This Week</p>
            <p className="text-sm font-bold text-white">
              {activeTiles} <span className="text-gray-500 text-xs font-normal">/ 7 days</span>
            </p>
          </div>
        </div>

        {/* Tiles */}
        <div className="flex gap-1.5 px-4 pb-1">
          {regionSequence.map((region, i) => {
            const meta = REGION_META[region];
            const isActive = i < activeTiles;
            const isCurrent = i === tile;
            return (
              <div
                key={i}
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? `${meta.bg} ring-2 ring-white`
                    : isActive
                    ? meta.bg
                    : 'bg-gray-800 opacity-40'
                }`}
              >
                <span className="text-base leading-none">
                  {isCurrent
                    ? (ARCHETYPE_EMOJI[archetype] ?? '\u{1F9D9}')
                    : isActive
                    ? meta.emoji
                    : '\u2753'}
                </span>
              </div>
            );
          })}
          {/* Mystery World */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
              questComplete
                ? 'bg-purple-900 ring-2 ring-purple-500 hover:bg-purple-800'
                : 'bg-gray-800 opacity-40'
            }`}
            onClick={() => questComplete && navigate('/adventure/world')}
          >
            <span className="text-base">{questComplete ? '\u{1F300}' : '\u{1F512}'}</span>
          </div>
        </div>

        {/* Day labels */}
        <div className="flex gap-1.5 px-4 pb-3 mt-1">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className="flex-shrink-0 w-10 text-center">
              <span className={`text-xs ${i < activeTiles ? 'text-gray-400' : 'text-gray-700'}`}>{d}</span>
            </div>
          ))}
          <div className="flex-shrink-0 w-10 text-center">
            <span className="text-xs text-purple-600">???</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending-card modal ───────────────────────────────────────────────────────

  if (showCards && pendingCards.length > 0) {
    const card = pendingCards[cardIndex];
    const isLast = cardIndex === pendingCards.length - 1;
    return (
      <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
            {/* Progress dots */}
            {pendingCards.length > 1 && (
              <div className="flex justify-center gap-1.5 mb-4">
                {pendingCards.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === cardIndex ? 'w-4 bg-white' : i < cardIndex ? 'w-1.5 bg-gray-500' : 'w-1.5 bg-gray-700'}`}
                  />
                ))}
              </div>
            )}

            {/* Card type badge */}
            <p className="text-xs text-indigo-400 uppercase tracking-widest mb-1">{card?.cardType?.replace('_', ' ')}</p>
            <p className="text-base font-bold text-white mb-3">{card?.title}</p>

            {/* Workout summary (if available) */}
            {card?.workoutType && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{WORKOUT_EMOJI[card.workoutType] ?? '\u26A1\uFE0F'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{card.workoutName || formatWorkoutType(card.workoutType)}</p>
                  <p className="text-xs text-gray-400">
                    {card.distanceMiles > 0 ? `${formatDistance(card.distanceMiles)} \u00B7 ` : ''}
                    {formatDuration(card.elapsedSeconds)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-indigo-400 font-semibold">+{Math.round(card.xpEarned)} XP</p>
                  <p className="text-xs text-gray-500">{cardIndex + 1} of {pendingCards.length}</p>
                </div>
              </div>
            )}

            {/* Narrative */}
            <p className="text-sm text-gray-300 italic leading-relaxed mb-4">
              &ldquo;{card?.narrative}&rdquo;
            </p>

            {/* Player prompt */}
            {card?.playerPrompt && (
              <p className="text-xs text-indigo-300 mb-4 border-l-2 border-indigo-700 pl-3 italic">{card.playerPrompt}</p>
            )}

            <button
              onClick={advanceCard}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
            >
              {isLast ? 'Return to Adventure \u2192' : 'Continue \u2192'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg">
      {/* Character card — compact */}
      <div
        className="relative rounded-xl overflow-hidden mb-4"
        style={{ backgroundImage: `url(/homelands/${color}.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative flex items-center gap-3 p-3">
          <div className="flex-shrink-0 w-20 rounded-lg overflow-hidden">
            <img
              src={`/characters/${archetype}-${gender}-${color}.png`}
              alt={`${color} ${archetype}`}
              className="w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-xl font-extrabold text-yellow-400">Lv.{level}</span>
              <span className="text-xs text-white/70 capitalize">{milestoneTitle}</span>
            </div>
            <p className="text-sm font-semibold text-white capitalize mb-1.5">{color} {archetype}</p>
            <div className="w-full bg-white/20 rounded-full h-1.5 mb-0.5">
              <div
                className="h-1.5 rounded-full bg-yellow-400 transition-all duration-500"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <p className="text-xs text-white/50">{level < 99 ? `${currentXp} / ${neededXp} XP` : 'Max Level'}</p>
          </div>
          <button
            onClick={() => navigate('/adventure/select')}
            className="self-start text-xs text-white/60 hover:text-white transition-colors"
          >
            Change
          </button>
        </div>
      </div>

      {/* Pending story cards banner */}
      {pendingCards.length > 0 && (
        <div className="rounded-xl bg-indigo-600 p-4 mb-4 flex items-center gap-4">
          <div className="text-3xl flex-shrink-0">&#x1F4DC;</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">
              {pendingCards.length} new story card{pendingCards.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-indigo-200 mt-0.5">Your recent expeditions have a tale to tell</p>
          </div>
          <button
            onClick={openCards}
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors"
          >
            Read
          </button>
        </div>
      )}

      {/* Journey Panel */}
      <div className="mb-4">
        <JourneyStrip activeTiles={currentTile} />

        {recentWorkout && (
          <div className="mt-2 bg-gray-900 border border-gray-800 rounded-xl px-4 pb-4 pt-0">
            <div
              className="bg-gray-800 rounded-lg p-3 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => navigate(`/workouts/${recentWorkout.id}`)}
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Last Expedition</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{WORKOUT_EMOJI[recentWorkout.type] ?? '\u26A1\uFE0F'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {recentWorkout.name || formatWorkoutType(recentWorkout.type)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(recentWorkout.startTime)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {recentWorkout.distanceMiles > 0 && (
                    <p className="text-sm font-semibold text-white">{formatDistance(recentWorkout.distanceMiles)}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatDuration(recentWorkout.elapsedSeconds)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top-level nav */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => navigate('/adventure/quest-log')}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 font-semibold text-xs hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl">{'\u{1F4DC}'}</span>
          Quest Log
        </button>
        <button
          onClick={() => navigate('/adventure/world')}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 font-semibold text-xs hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl">{'\u{1F5FA}\uFE0F'}</span>
          World Map
        </button>
        <button
          onClick={() => navigate('/adventure/loot')}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-amber-950 border border-amber-800 text-amber-300 font-semibold text-xs hover:bg-amber-900 transition-colors"
        >
          <span className="text-2xl">{'\u{1F9F0}'}</span>
          Treasure Chest
        </button>
      </div>

      <button
        onClick={handleExit}
        disabled={exiting}
        className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exiting ? 'Exiting\u2026' : 'Exit Adventure Mode'}
      </button>

      <button
        onClick={handleResetQuest}
        disabled={resetting}
        className="mt-3 w-full text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
      >
        {resetting ? 'Resetting\u2026' : 'Reset Quest (testing)'}
      </button>
    </div>
  );
}
