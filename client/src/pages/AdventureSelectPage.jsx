import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adventureApi } from '../api/adventure';

const ARCHETYPES = ['wizard', 'archer', 'warrior'];
const GENDERS = ['male', 'female'];
const COLORS = ['blue', 'green', 'red', 'yellow'];

const COLOR_BG = {
  blue:   'bg-blue-400',
  green:  'bg-green-400',
  red:    'bg-red-400',
  yellow: 'bg-yellow-400',
};

const COLOR_RING = {
  blue:   'ring-blue-500',
  green:  'ring-green-500',
  red:    'ring-red-500',
  yellow: 'ring-yellow-500',
};

// Simple inline SVG icons for each archetype
function ArchetypeIcon({ archetype }) {
  if (archetype === 'wizard') {
    return (
      <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10 drop-shadow">
        <path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z" />
      </svg>
    );
  }
  if (archetype === 'archer') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 drop-shadow">
        <path d="M5 19L19 5" />
        <path d="M19 5h-6M19 5v6" />
        <path d="M5 19l3-3" />
        <circle cx="3.5" cy="20.5" r="1.5" fill="white" stroke="none" />
      </svg>
    );
  }
  // warrior
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 drop-shadow">
      <path d="M12 22V12" />
      <path d="M5 12c0-3.866 3.134-7 7-7s7 3.134 7 7H5z" fill="white" stroke="none" />
      <rect x="5" y="12" width="14" height="7" rx="1" fill="none" stroke="white" strokeWidth="2" />
    </svg>
  );
}

export default function AdventureSelectPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();

  const [selected, setSelected] = useState({ archetype: null, gender: null, color: null });
  const [activeArchetype, setActiveArchetype] = useState('wizard');
  const [activeGender, setActiveGender] = useState('male');
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

  async function handleBeginAdventure() {
    if (!selected.archetype) {
      setError('Please select a character first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let user = await adventureApi.updateCharacter(selected);
      user = await adventureApi.toggleMode(true);
      updateUser(user);
      navigate('/adventure');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Something went wrong.';
      setError(msg);
      setSaving(false);
    }
  }

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
      <div className="grid grid-cols-4 gap-4 mb-8">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => selectColor(color)}
            className={`
              ${COLOR_BG[color]}
              aspect-square rounded-2xl flex flex-col items-center justify-center gap-2
              transition-all duration-150
              ${isSelected(color) ? `ring-4 ${COLOR_RING[color]} ring-offset-2 scale-105` : 'hover:scale-105'}
            `}
          >
            <ArchetypeIcon archetype={activeArchetype} />
            <span className="text-white text-xs font-semibold capitalize drop-shadow">{color}</span>
          </button>
        ))}
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
        onClick={handleBeginAdventure}
        disabled={!selected.archetype || saving}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Starting Adventure…' : '⚔ Begin Adventure'}
      </button>
    </div>
  );
}
