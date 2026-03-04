import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adventureApi } from '../api/adventure';

const ARCHETYPES = ['wizard', 'archer', 'warrior'];
const GENDERS = ['male', 'female'];
const COLORS = ['blue', 'green', 'red', 'yellow'];
const DIFFICULTIES = [
  { key: 'easy',   label: 'Easy',   sub: '1 hour / week' },
  { key: 'medium', label: 'Medium', sub: '5 hours / week' },
  { key: 'hard',   label: 'Hard',   sub: '10 hours / week' },
  { key: 'epic',   label: 'Epic',   sub: '20 hours / week' },
];

const COLOR_RING = {
  blue:   'ring-blue-500',
  green:  'ring-green-500',
  red:    'ring-red-500',
  yellow: 'ring-yellow-500',
};

export default function AdventureSelectPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();

  const [selected, setSelected] = useState({ archetype: null, gender: null, color: null });
  const [activeArchetype, setActiveArchetype] = useState('wizard');
  const [activeGender, setActiveGender] = useState('male');
  const [activeDifficulty, setActiveDifficulty] = useState('medium');
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function selectColor(color) {
    setSelected({ archetype: activeArchetype, gender: activeGender, color });
  }

  function isSelected(color) {
    return (
      selected.archetype === activeArchetype &&
      selected.gender === activeGender &&
      selected.color === color
    );
  }

  function handleBeginClick() {
    if (!selected.archetype) {
      setError('Please select a character first.');
      return;
    }
    setError(null);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      await adventureApi.updateCharacter(selected);
      await adventureApi.setDifficulty(activeDifficulty);
      const user = await adventureApi.toggleMode(true);
      updateUser(user);
      navigate('/adventure');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Something went wrong.';
      setError(msg);
      setShowConfirm(false);
      setSaving(false);
    }
  }

  const selectedDiff = DIFFICULTIES.find((d) => d.key === activeDifficulty);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Choose Your Character</h1>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Archetype tabs */}
      <div className="flex gap-2 mb-6">
        {ARCHETYPES.map((a) => (
          <button
            key={a}
            onClick={() => setActiveArchetype(a)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              activeArchetype === a
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Gender tabs */}
      <div className="flex gap-2 mb-6">
        {GENDERS.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGender(g)}
            className={`py-1.5 px-5 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeGender === g
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Color tiles */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => selectColor(color)}
            className={`
              rounded-2xl bg-white border border-gray-100 overflow-hidden flex flex-col
              transition-all duration-150
              ${isSelected(color) ? `ring-4 ${COLOR_RING[color]} ring-offset-2 scale-105` : 'hover:scale-105'}
            `}
          >
            <img
              src={`/characters/${activeArchetype}-${activeGender}-${color}.png`}
              alt={`${color} ${activeArchetype}`}
              className="w-full object-contain"
            />
            <p className="text-xs font-semibold text-gray-500 capitalize text-center py-1.5">{color}</p>
          </button>
        ))}
      </div>

      {/* Difficulty picker */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">Quest Difficulty</p>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map(({ key, label, sub }) => (
            <button
              key={key}
              onClick={() => setActiveDifficulty(key)}
              className={`py-2.5 px-3 rounded-lg text-left transition-colors ${
                activeDifficulty === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <p className="text-xs font-semibold">{label}</p>
              <p className={`text-xs mt-0.5 ${activeDifficulty === key ? 'text-indigo-200' : 'text-gray-400'}`}>{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected summary */}
      {selected.archetype && (
        <p className="text-sm text-gray-500 mb-4 text-center">
          Selected:{' '}
          <span className="font-semibold text-gray-700 capitalize">
            {selected.color} {selected.archetype} ({selected.gender})
          </span>
        </p>
      )}

      {error && <p className="text-sm text-red-600 mb-4 text-center">{error}</p>}

      <button
        onClick={handleBeginClick}
        disabled={!selected.archetype}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ⚔ Begin Adventure
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Begin Your Quest?</h2>
            <p className="text-sm text-gray-500 mb-4 capitalize">
              {selected.color} {selected.archetype} · {selectedDiff?.label} ({selectedDiff?.sub})
            </p>

            <ul className="space-y-2 mb-6">
              <li className="flex gap-2 text-sm text-gray-600">
                <span className="text-amber-500 flex-shrink-0">⚠</span>
                Your quest is locked to this week (Mon–Sun). Difficulty cannot be changed once you log your first workout.
              </li>
              <li className="flex gap-2 text-sm text-gray-600">
                <span className="text-indigo-500 flex-shrink-0">✦</span>
                Workouts you've already logged this week will be counted immediately when the quest loads.
              </li>
              <li className="flex gap-2 text-sm text-gray-600">
                <span className="text-indigo-500 flex-shrink-0">✦</span>
                Future progress updates automatically via Strava sync or file upload.
              </li>
            </ul>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={saving}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Starting…' : 'Start Quest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
