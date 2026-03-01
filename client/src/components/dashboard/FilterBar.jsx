import { useCallback, useRef } from 'react';
import { WORKOUT_TYPES, SORT_OPTIONS } from '../../utils/constants';

export default function FilterBar({ filters, onFilterChange }) {
  const searchTimer = useRef(null);

  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      onFilterChange({ search: value });
    }, 300);
  }, [onFilterChange]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search workouts..."
            defaultValue={filters.search}
            onChange={handleSearch}
            className="form-input"
          />
        </div>

        {/* Workout type */}
        <select
          value={filters.type}
          onChange={(e) => onFilterChange({ type: e.target.value })}
          className="form-input w-auto"
        >
          <option value="">All types</option>
          {WORKOUT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => onFilterChange({ startDate: e.target.value })}
          className="form-input w-auto"
          title="Start date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => onFilterChange({ endDate: e.target.value })}
          className="form-input w-auto"
          title="End date"
        />

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ sortBy: e.target.value })}
          className="form-input w-auto"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={() => onFilterChange({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
          className="btn-secondary px-3"
          title={`Sort ${filters.sortDir === 'asc' ? 'descending' : 'ascending'}`}
        >
          {filters.sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );
}
