import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adventureApi } from '../api/adventure';
import { LOOT_BY_SLUG, RARITY_META } from '../utils/lootCatalog';

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

function groupLoot(loot) {
  const groups = {};
  for (const drop of loot) {
    const key = drop.itemSlug;
    if (!groups[key]) {
      groups[key] = { ...drop, count: 0, latestEarnedAt: drop.earnedAt };
    }
    groups[key].count += 1;
    if (drop.earnedAt > groups[key].latestEarnedAt) {
      groups[key].latestEarnedAt = drop.earnedAt;
    }
  }
  return Object.values(groups).sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    return ra !== rb ? ra - rb : a.itemSlug.localeCompare(b.itemSlug);
  });
}

export default function LootPage() {
  const navigate = useNavigate();
  const [loot, setLoot] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adventureApi.getLoot()
      .then(({ loot: items }) => setLoot(items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupLoot(loot);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/adventure')}
          className="text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Treasure Chest</h1>
          {!loading && (
            <p className="text-xs text-gray-500">
              {grouped.length === 0
                ? 'No loot yet — complete quests to earn rewards'
                : `${loot.length} item${loot.length !== 1 ? 's' : ''} collected`}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🧰</div>
            <p className="text-gray-500 text-sm">Complete weekly quests to earn loot.</p>
            <p className="text-gray-400 text-xs mt-1">Harder quests drop rarer items.</p>
          </div>
        ) : (
          <>
            {RARITY_ORDER.map((rarity) => {
              const items = grouped.filter((g) => g.rarity === rarity);
              if (items.length === 0) return null;
              const meta = RARITY_META[rarity];
              return (
                <div key={rarity} className="mb-6">
                  <h2 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${meta.text}`}>
                    {meta.label}
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {items.map((item) => {
                      const catalog = LOOT_BY_SLUG[item.itemSlug];
                      return (
                        <div
                          key={item.itemSlug}
                          className={`relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl border ${meta.bg} ${meta.border} ${meta.glow}`}
                        >
                          <span className="text-3xl leading-none">{catalog?.emoji ?? '?'}</span>
                          <span className={`text-xs font-medium text-center leading-tight ${meta.text}`}>
                            {catalog?.name ?? item.itemSlug}
                          </span>
                          {item.count > 1 && (
                            <span className={`absolute top-1.5 right-1.5 text-xs font-bold px-1 rounded ${meta.text} opacity-70`}>
                              ×{item.count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
