import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adventureApi } from '../api/adventure';
import { workoutsApi } from '../api/workouts';
import { formatDuration, formatDistance, formatDate, formatWorkoutType } from '../utils/formatters';
import { xpProgress, getMilestoneTitle } from '../utils/adventureUtils';

const DIFFICULTY_LABELS = {
  easy:   'Easy \u2014 1 hour',
  medium: 'Medium \u2014 5 hours',
  hard:   'Hard \u2014 10 hours',
  epic:   'Epic \u2014 20 hours',
};

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

// How long each tile lights up during the claim animation (ms)
const TILE_ANIM_DELAY = 600;

export default function AdventurePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  // Data state
  const [quest, setQuest] = useState(null);
  const [questLoading, setQuestLoading] = useState(true);
  const [worldData, setWorldData] = useState(null);
  const [recentWorkout, setRecentWorkout] = useState(null);

  // Claim flow state
  // phase: 'idle' | 'claiming' | 'animating' | 'stories' | 'done'
  const [claimPhase, setClaimPhase] = useState('idle');
  const [claimResult, setClaimResult] = useState(null);
  // animatedTile: the highest tile index currently lit during animation
  const [animatedTile, setAnimatedTile] = useState(null);
  // storyIndex: which story card the user is on
  const [storyIndex, setStoryIndex] = useState(0);

  // Misc UI state
  const [exiting, setExiting] = useState(false);
  const [difficultyChanging, setDifficultyChanging] = useState(false);
  const [resetting, setResetting] = useState(false);

  const animTimers = useRef([]);

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
    setQuestLoading(true);
    Promise.all([
      adventureApi.getQuest().then(({ quest: q }) => setQuest(q)).catch(() => {}),
      adventureApi.getWorld().then((d) => setWorldData(d)).catch(() => {}),
      workoutsApi.getAll({ limit: 1, page: 1 }).then(({ workouts }) => setRecentWorkout(workouts?.[0] ?? null)).catch(() => {}),
    ]).finally(() => setQuestLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  // Derived world values
  const claimedDays  = claimPhase === 'idle' ? (worldData?.claimedDays ?? 0) : (claimResult?.claimedDays ?? 0);
  const pendingDays  = worldData?.pendingDays ?? 0;
  const pendingCount = worldData?.pendingCount ?? 0;

  // During animation, show partial tile progress
  const displayedTile = claimPhase === 'animating' && animatedTile !== null
    ? animatedTile
    : claimedDays;

  const currentTile = Math.min(displayedTile, 6);
  const regionSequence = REGION_SEQUENCE[color] ?? REGION_SEQUENCE.blue;
  const questComplete = (claimPhase === 'done' ? claimResult?.quest : quest)?.status === 'completed';

  // ── Claim flow ──────────────────────────────────────────────────────────────

  async function handleClaim() {
    setClaimPhase('claiming');
    let result;
    try {
      result = await adventureApi.claim();
    } catch {
      setClaimPhase('idle');
      return;
    }

    setClaimResult(result);

    // Start tile animation: advance one tile per TILE_ANIM_DELAY ms
    const prev = result.previousClaimedDays;
    const next = result.claimedDays;

    if (next > prev) {
      setClaimPhase('animating');
      setAnimatedTile(prev);

      animTimers.current.forEach(clearTimeout);
      animTimers.current = [];

      for (let i = prev + 1; i <= next; i++) {
        const t = setTimeout(() => {
          setAnimatedTile(i);
          if (i === next) {
            // All tiles done — move to story cards (or done if no beats)
            setTimeout(() => {
              if (result.newBeats?.length > 0) {
                setStoryIndex(0);
                setClaimPhase('stories');
              } else {
                setClaimPhase('done');
                finaliseAfterClaim(result);
              }
            }, 400);
          }
        }, (i - prev) * TILE_ANIM_DELAY);
        animTimers.current.push(t);
      }
    } else {
      // No new tiles (e.g. same day, second workout) — go straight to stories
      if (result.newBeats?.length > 0) {
        setStoryIndex(0);
        setClaimPhase('stories');
      } else {
        setClaimPhase('done');
        finaliseAfterClaim(result);
      }
    }
  }

  function advanceStory() {
    const beats = claimResult?.newBeats ?? [];
    if (storyIndex < beats.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else {
      setClaimPhase('done');
      finaliseAfterClaim(claimResult);
    }
  }

  function finaliseAfterClaim(result) {
    // Refresh world data so the pending count resets
    adventureApi.getWorld().then((d) => setWorldData(d)).catch(() => {});
    // Update quest from result
    if (result?.quest) setQuest(result.quest);
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
      setClaimPhase('idle');
      setClaimResult(null);
      setAnimatedTile(null);
      loadAll();
    } catch { /* ignore */ }
    finally { setResetting(false); }
  }

  async function handleDifficultyChange(difficulty) {
    if (difficultyChanging) return;
    setDifficultyChanging(true);
    try {
      const { user: updatedUser, quest: updatedQuest } = await adventureApi.setDifficulty(difficulty);
      updateUser(updatedUser);
      setQuest(updatedQuest);
    } catch { /* ignore */ }
    finally { setDifficultyChanging(false); }
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  const displayQuest = (claimPhase === 'done' || claimPhase === 'stories') && claimResult?.quest
    ? claimResult.quest
    : quest;

  const questPct = displayQuest
    ? Math.min(100, Math.round((displayQuest.earnedSeconds / displayQuest.targetSeconds) * 100))
    : 0;

  // ── Journey strip (shared between normal view and animation) ────────────────

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

  // ── Story card overlay ──────────────────────────────────────────────────────

  if (claimPhase === 'stories') {
    const beats = claimResult?.newBeats ?? [];
    const beat = beats[storyIndex];
    const isLast = storyIndex === beats.length - 1;
    const isQuestComplete = claimResult?.questJustCompleted && isLast;

    return (
      <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-50 p-4">
        <div className="w-full max-w-md">
          {/* Journey strip mini — shows final tile position */}
          <div className="mb-4">
            <JourneyStrip activeTiles={claimResult?.claimedDays ?? claimedDays} />
          </div>

          {/* Story card */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
            {/* Progress dots */}
            {beats.length > 1 && (
              <div className="flex justify-center gap-1.5 mb-4">
                {beats.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === storyIndex ? 'bg-white w-4' : i < storyIndex ? 'bg-gray-500' : 'bg-gray-700'}`}
                  />
                ))}
              </div>
            )}

            {/* Quest complete banner */}
            {isQuestComplete && (
              <div className="bg-green-900/40 border border-green-700 rounded-lg px-3 py-2 mb-4 text-center">
                <p className="text-sm font-bold text-green-400">\u2728 Quest Complete!</p>
              </div>
            )}

            {/* Workout summary */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{WORKOUT_EMOJI[beat?.workoutType] ?? '\u26A1\uFE0F'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{beat?.workoutName || formatWorkoutType(beat?.workoutType)}</p>
                <p className="text-xs text-gray-400">
                  {beat?.distanceMiles > 0 ? `${formatDistance(beat.distanceMiles)} \u00B7 ` : ''}
                  {formatDuration(beat?.elapsedSeconds)}
                </p>
              </div>
              <div className="text-xs text-gray-500 text-right flex-shrink-0">
                Expedition {storyIndex + 1} of {beats.length}
              </div>
            </div>

            {/* Narrative */}
            <p className="text-sm text-gray-300 italic leading-relaxed mb-6">
              &ldquo;{beat?.text}&rdquo;
            </p>

            {/* Quest progress bar */}
            {displayQuest && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Quest Progress</span>
                  <span>{formatDuration(displayQuest.earnedSeconds)} / {formatDuration(displayQuest.targetSeconds)}</span>
                </div>
                <div className="bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${displayQuest.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`}
                    style={{ width: `${questPct}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={advanceStory}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
            >
              {isLast ? (isQuestComplete ? 'Claim Your Rewards \u2192' : 'Return to Adventure \u2192') : 'Continue \u2192'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Adventure Mode</h1>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Active
        </span>
      </div>

      {/* Character card */}
      <div
        className="relative rounded-xl overflow-hidden mb-4 min-h-40"
        style={{ backgroundImage: `url(/homelands/${color}.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="relative flex items-end gap-4 p-4">
          <div className="flex-shrink-0 w-32 rounded-xl overflow-hidden">
            <img
              src={`/characters/${archetype}-${gender}-${color}.png`}
              alt={`${color} ${archetype}`}
              className="w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 uppercase tracking-wide mb-0.5">Your Character</p>
            <h2 className="text-lg font-bold text-white capitalize">{color} {archetype}</h2>
            <p className="text-xs text-white/70 capitalize mb-2">{milestoneTitle} &middot; Level {level}</p>
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
            className="ml-auto text-sm text-white/80 hover:text-white font-medium"
          >
            Change
          </button>
        </div>
      </div>

      {/* Pending claim prompt */}
      {pendingCount > 0 && claimPhase === 'idle' && (
        <div className="rounded-xl bg-indigo-600 p-4 mb-4 flex items-center gap-4">
          <div className="text-3xl flex-shrink-0">\u2694\uFE0F</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">
              {pendingCount} expedition{pendingCount !== 1 ? 's' : ''} await{pendingCount === 1 ? 's' : ''}
            </p>
            <p className="text-xs text-indigo-200 mt-0.5">
              {pendingDays} new day{pendingDays !== 1 ? 's' : ''} of adventure ready to claim
            </p>
          </div>
          <button
            onClick={handleClaim}
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Claiming spinner */}
      {claimPhase === 'claiming' && (
        <div className="rounded-xl bg-gray-800 border border-gray-700 p-4 mb-4 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin flex-shrink-0" />
          <p className="text-sm text-gray-300">Preparing your expeditions\u2026</p>
        </div>
      )}

      {/* Journey Panel */}
      <div className="mb-4">
        <JourneyStrip activeTiles={currentTile} />

        {/* Recent workout — shown only in idle/done state, not during animation */}
        {(claimPhase === 'idle' || claimPhase === 'done') && recentWorkout && (
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

      {/* Quest card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-800">Weekly Quest</h2>
          {displayQuest && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
              displayQuest.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {displayQuest.status === 'completed' ? 'Complete' : displayQuest.difficulty}
            </span>
          )}
        </div>

        {questLoading ? (
          <p className="text-sm text-gray-400 mt-3">Loading quest\u2026</p>
        ) : !displayQuest ? (
          <p className="text-sm text-gray-400 mt-3 italic">Quest unavailable.</p>
        ) : (
          <>
            {displayQuest.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 mt-3">
                <p className="text-sm font-semibold text-green-700">Quest Complete!</p>
                <p className="text-xs text-green-600 mt-0.5">You conquered this week&apos;s challenge. New quest starts next Monday.</p>
              </div>
            )}

            {/* Progress bar */}
            <div className="mb-4 mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{questPct}% complete</span>
                <span>{formatDuration(displayQuest.earnedSeconds)} / {formatDuration(displayQuest.targetSeconds)}</span>
              </div>
              <div className="bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${displayQuest.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${questPct}%` }}
                />
              </div>
            </div>

            {/* Difficulty picker — only if no progress yet */}
            {displayQuest.earnedSeconds === 0 && displayQuest.status === 'active' && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Choose difficulty:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['easy', 'medium', 'hard', 'epic'].map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDifficultyChange(d)}
                      disabled={difficultyChanging}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-colors disabled:opacity-50 ${
                        displayQuest.difficulty === d
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
                {pendingCount === 0 && (
                  <p className="text-xs text-gray-400 mt-3 italic">Upload a workout, then return here to claim your first expedition.</p>
                )}
              </div>
            )}

            {/* Past story beats */}
            {displayQuest.narrativeBeats?.length > 0 && (
              <div className="space-y-3 mt-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Expedition Log</p>
                {[...displayQuest.narrativeBeats].reverse().slice(0, 3).map((beat, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5">
                      <span className="text-xs">{WORKOUT_EMOJI[beat.workoutType] ?? '\u26A1\uFE0F'}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 truncate">{beat.workoutName}</p>
                      <p className="text-sm text-gray-700 mt-0.5 leading-relaxed italic">&ldquo;{beat.text}&rdquo;</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* World Map + Treasure Chest */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={() => navigate('/adventure/world')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 font-semibold text-sm hover:bg-gray-700 transition-colors"
        >
          <span className="text-xl">{'\u{1F5FA}\uFE0F'}</span>
          World Map
        </button>
        <button
          onClick={() => navigate('/adventure/loot')}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-colors"
        >
          <span className="text-xl">{'\u{1F9F0}'}</span>
          Chest
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
