import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adventureApi } from '../api/adventure';

const COLOR_BG = {
  blue:   'bg-blue-400',
  green:  'bg-green-400',
  red:    'bg-red-400',
  yellow: 'bg-yellow-400',
};

function ArchetypeIcon({ archetype }) {
  if (archetype === 'wizard') {
    return (
      <svg viewBox="0 0 24 24" fill="white" className="w-12 h-12 drop-shadow">
        <path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z" />
      </svg>
    );
  }
  if (archetype === 'archer') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 drop-shadow">
        <path d="M5 19L19 5" />
        <path d="M19 5h-6M19 5v6" />
        <path d="M5 19l3-3" />
        <circle cx="3.5" cy="20.5" r="1.5" fill="white" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 drop-shadow">
      <path d="M12 22V12" />
      <path d="M5 12c0-3.866 3.134-7 7-7s7 3.134 7 7H5z" fill="white" stroke="none" />
      <rect x="5" y="12" width="14" height="7" rx="1" fill="none" stroke="white" strokeWidth="2" />
    </svg>
  );
}

export default function AdventurePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [exiting, setExiting] = useState(false);

  // No character yet — send to selection
  if (!user?.adventureCharacterArchetype) {
    return <Navigate to="/adventure/select" replace />;
  }

  const { adventureCharacterArchetype: archetype, adventureCharacterGender: gender, adventureCharacterColor: color } = user;
  const bgClass = COLOR_BG[color] ?? 'bg-gray-400';

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

      {/* Quest placeholder — Phase 2 */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-2">Weekly Quest</h2>
        <p className="text-sm text-gray-400 italic">Quests unlock in Phase 2. Keep training, adventurer.</p>
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
