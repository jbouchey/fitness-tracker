import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adventureApi } from '../api/adventure';
import { formatDuration } from '../utils/formatters';

const DIFFICULTY_LABELS = {
  easy:   'Easy \u2014 1 hour',
  medium: 'Medium \u2014 5 hours',
  hard:   'Hard \u2014 10 hours',
  epic:   'Epic \u2014 20 hours',
};

const WORKOUT_EMOJI = {
  TRAIL_RUN: '\u{1F3D4}\uFE0F',
  ROAD_RUN:  '\u{1F3C3}',
  HIKE:      '\u26F0\uFE0F',
  CYCLING:   '\u{1F6B4}',
  STRENGTH:  '\u{1F4AA}',
  OTHER:     '\u2605',
};

export default function QuestLogPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [quest, setQuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [difficultyChanging, setDifficultyChanging] = useState(false);

  useEffect(() => {
    adventureApi.getQuest()
      .then(({ quest: q }) => setQuest(q))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const questPct = quest
    ? Math.min(100, Math.round((quest.earnedSeconds / quest.targetSeconds) * 100))
    : 0;

  const beats = Array.isArray(quest?.narrativeBeats) ? quest.narrativeBeats : [];

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
          <h1 className="text-lg font-bold">Quest Log</h1>
          <p className="text-xs text-gray-400">This week&apos;s journey</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading&hellip;</div>
      ) : !quest ? (
        <div className="px-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm italic">No active quest. Upload a workout to begin.</p>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-4">

          {/* Quest summary card */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Weekly Quest</p>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                quest.status === 'completed'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-indigo-900 text-indigo-300'
              }`}>
                {quest.status === 'completed' ? 'Complete' : quest.difficulty}
              </span>
            </div>

            {quest.status === 'completed' && (
              <div className="bg-green-900/40 border border-green-700 rounded-lg px-3 py-2 mb-3">
                <p className="text-sm font-semibold text-green-400">Quest Complete!</p>
                <p className="text-xs text-green-500 mt-0.5">You conquered this week&apos;s challenge. New quest starts next Monday.</p>
              </div>
            )}

            {/* Progress bar */}
            <div className="mb-1">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{questPct}% complete</span>
                <span>{formatDuration(quest.earnedSeconds)} / {formatDuration(quest.targetSeconds)}</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${quest.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'}`}
                  style={{ width: `${questPct}%` }}
                />
              </div>
            </div>

            {/* Difficulty picker — only if no progress */}
            {quest.earnedSeconds === 0 && quest.status === 'active' && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2">Choose difficulty:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['easy', 'medium', 'hard', 'epic'].map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDifficultyChange(d)}
                      disabled={difficultyChanging}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                        quest.difficulty === d
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expedition Log */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Expedition Log</p>
            {beats.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-sm text-gray-500 italic">Complete your first expedition to begin the log.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {beats.map((beat, i) => {
                  const date = beat.triggeredAt
                    ? new Date(beat.triggeredAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                    : null;
                  const typeEmoji = WORKOUT_EMOJI[beat.workoutType] ?? '\u2605';
                  return (
                    <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">
                          {typeEmoji} {beat.workoutName ?? 'Expedition'}
                        </span>
                        {date && <span className="text-xs text-gray-500">{date}</span>}
                      </div>
                      {beat.distanceMiles > 0 && (
                        <p className="text-xs text-gray-500 mb-1.5">
                          {beat.distanceMiles.toFixed(1)} mi &middot; {formatDuration(beat.elapsedSeconds)}
                        </p>
                      )}
                      <p className="text-sm text-gray-300 italic leading-relaxed">&ldquo;{beat.text}&rdquo;</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
