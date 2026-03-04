import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adventureApi } from '../api/adventure';
import { formatDuration } from '../utils/formatters';

const COLOR_BG = {
  blue:   'bg-blue-400',
  green:  'bg-green-400',
  red:    'bg-red-400',
  yellow: 'bg-yellow-400',
};

const DIFFICULTY_LABELS = {
  easy:   'Easy — 1 hour',
  medium: 'Medium — 5 hours',
  hard:   'Hard — 10 hours',
  epic:   'Epic — 20 hours',
};

const WAYPOINT_LABELS = ['I', 'II', 'III', 'IV'];

function ArchetypeIcon({ archetype, size = 'w-12 h-12' }) {
  if (archetype === 'wizard') {
    return (
      <svg viewBox="0 0 24 24" fill="white" className={`${size} drop-shadow`}>
        <path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z" />
      </svg>
    );
  }
  if (archetype === 'archer') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${size} drop-shadow`}>
        <path d="M5 19L19 5" /><path d="M19 5h-6M19 5v6" /><path d="M5 19l3-3" />
        <circle cx="3.5" cy="20.5" r="1.5" fill="white" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${size} drop-shadow`}>
      <path d="M12 22V12" />
      <path d="M5 12c0-3.866 3.134-7 7-7s7 3.134 7 7H5z" fill="white" stroke="none" />
      <rect x="5" y="12" width="14" height="7" rx="1" fill="none" stroke="white" strokeWidth="2" />
    </svg>
  );
}

export default function AdventurePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [quest, setQuest] = useState(null);
  const [questLoading, setQuestLoading] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [difficultyChanging, setDifficultyChanging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // No character yet — send to selection
  if (!user?.adventureCharacterArchetype) {
    return <Navigate to="/adventure/select" replace />;
  }

  const { adventureCharacterArchetype: archetype, adventureCharacterGender: gender, adventureCharacterColor: color } = user;
  const bgClass = COLOR_BG[color] ?? 'bg-gray-400';

  function fetchQuest(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    adventureApi.getQuest()
      .then(({ quest: q }) => setQuest(q))
      .catch(() => {})
      .finally(() => {
        setQuestLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => { fetchQuest(); }, []);

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

  async function handleDifficultyChange(difficulty) {
    if (difficultyChanging) return;
    setDifficultyChanging(true);
    try {
      const { user: updatedUser, quest: updatedQuest } = await adventureApi.setDifficulty(difficulty);
      updateUser(updatedUser);
      setQuest(updatedQuest);
    } catch {
      // silently ignore
    } finally {
      setDifficultyChanging(false);
    }
  }

  const pct = quest ? Math.min(100, Math.round((quest.earnedSeconds / quest.targetSeconds) * 100)) : 0;
  const waypointHits = quest
    ? [quest.waypoint1Hit, quest.waypoint2Hit, quest.waypoint3Hit, quest.questCompleted]
    : [false, false, false, false];

  // Build a map of waypointNum → narrative text
  const beatMap = {};
  if (quest?.narrativeBeats) {
    for (const beat of quest.narrativeBeats) {
      beatMap[beat.waypointNum] = beat.text;
    }
  }

  const weekLabel = quest
    ? (() => {
        const start = new Date(quest.weekStart);
        const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
        const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${fmt(start)} – ${fmt(end)}`;
      })()
    : '';

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
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4 flex items-center gap-5">
        <div className={`${bgClass} w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0`}>
          <ArchetypeIcon archetype={archetype} />
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Your Character</p>
          <h2 className="text-lg font-bold text-gray-900 capitalize">{color} {archetype}</h2>
          <p className="text-sm text-gray-500 capitalize">{gender}</p>
        </div>
        <button
          onClick={() => navigate('/adventure/select')}
          className="ml-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Change
        </button>
      </div>

      {/* Quest card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-800">Weekly Quest</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchQuest(true)}
              disabled={refreshing}
              className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
            {quest && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                quest.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : quest.status === 'failed'
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-indigo-50 text-indigo-600'
              }`}>
                {quest.status === 'completed' ? 'Complete' : quest.difficulty}
              </span>
            )}
          </div>
        </div>

        {questLoading ? (
          <p className="text-sm text-gray-400 mt-3">Loading quest…</p>
        ) : !quest ? (
          <p className="text-sm text-gray-400 mt-3 italic">Quest unavailable.</p>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">{weekLabel}</p>

            {/* Completion banner */}
            {quest.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm font-semibold text-green-700">Quest Complete!</p>
                <p className="text-xs text-green-600 mt-0.5">You conquered this week's challenge. New quest starts next Monday.</p>
              </div>
            )}

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{pct}% complete</span>
                <span>{formatDuration(quest.earnedSeconds)} / {formatDuration(quest.targetSeconds)}</span>
              </div>
              <div className="bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${quest.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Difficulty picker — only if no progress yet */}
            {quest.earnedSeconds === 0 && quest.status === 'active' && (
              <div className="mb-5">
                <p className="text-xs text-gray-500 mb-2">Choose difficulty:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['easy', 'medium', 'hard', 'epic'].map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDifficultyChange(d)}
                      disabled={difficultyChanging}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize transition-colors disabled:opacity-50 ${
                        quest.difficulty === d
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 italic">Waiting for your first workout this week to begin the quest…</p>
              </div>
            )}

            {/* Waypoints */}
            <div className="space-y-3">
              {[1, 2, 3, 4].map((num, i) => {
                const hit = waypointHits[i];
                const text = beatMap[num];
                return (
                  <div key={num} className={`flex gap-3 ${!hit ? 'opacity-40' : ''}`}>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                      hit ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {hit ? '✓' : WAYPOINT_LABELS[i]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Waypoint {WAYPOINT_LABELS[i]} — {[25, 50, 75, 100][i]}%</p>
                      {text && <p className="text-sm text-gray-700 mt-0.5 leading-relaxed italic">"{text}"</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleExit}
        disabled={exiting}
        className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exiting ? 'Exiting…' : 'Exit Adventure Mode'}
      </button>
    </div>
  );
}
