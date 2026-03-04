import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkoutStore } from '../store/workoutStore';
import SportTypeFilter from '../components/dashboard/SportTypeFilter';
import SummaryStats from '../components/dashboard/SummaryStats';
import ActivityChart from '../components/dashboard/ActivityChart';
import FilterBar from '../components/dashboard/FilterBar';
import WorkoutTable from '../components/dashboard/WorkoutTable';
import WorkoutCard from '../components/dashboard/WorkoutCard';
import Pagination from '../components/dashboard/Pagination';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';

const SPORT_STORAGE_KEY = 'dashboard-sport-filter';
const PERIOD_STORAGE_KEY = 'dashboard-stats-period';

// Returns the filter updates for the Zustand store based on sport filter selection.
// Single-type selections (CYCLING, HIKE) use the `type` field so the FilterBar
// dropdown stays in sync. ALL_RUNS uses `types` array for multi-type filtering.
function getSportFilterUpdates(value) {
  if (value === 'ALL_RUNS') return { types: ['TRAIL_RUN', 'ROAD_RUN'], type: '' };
  if (value === 'CYCLING')  return { types: null, type: 'CYCLING' };
  if (value === 'HIKE')     return { types: null, type: 'HIKE' };
  return { types: null, type: '' }; // 'all'
}

// Returns the types array to pass to the activity chart for sport-type filtering.
function getSportTypes(value) {
  if (value === 'ALL_RUNS') return ['TRAIL_RUN', 'ROAD_RUN'];
  if (value === 'CYCLING')  return ['CYCLING'];
  if (value === 'HIKE')     return ['HIKE'];
  return null;
}

export default function DashboardPage() {
  const { workouts, pagination, filters, isLoading, error, setFilters, setPage } =
    useWorkoutStore();

  const [sportFilter, setSportFilter] = useState(
    () => localStorage.getItem(SPORT_STORAGE_KEY) || 'all'
  );
  const [statsPeriod, setStatsPeriod] = useState(
    () => localStorage.getItem(PERIOD_STORAGE_KEY) || 'week'
  );
  const [trendData, setTrendData] = useState([]);

  // Stable reference — only recomputed when sportFilter changes.
  // Without useMemo, getSportTypes creates a new array every render, which
  // causes ActivityChart's useEffect to re-run, triggering onDataLoad,
  // causing another render in an infinite loop.
  const sportTypes = useMemo(() => getSportTypes(sportFilter), [sportFilter]);

  // Apply sticky sport filter on mount
  useEffect(() => {
    setFilters(getSportFilterUpdates(sportFilter));
  }, []);

  const handleSportFilterChange = useCallback((value) => {
    setSportFilter(value);
    localStorage.setItem(SPORT_STORAGE_KEY, value);
    setFilters(getSportFilterUpdates(value));
  }, [setFilters]);

  const handlePeriodChange = useCallback((period) => {
    setStatsPeriod(period);
    localStorage.setItem(PERIOD_STORAGE_KEY, period);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Workouts</h1>
        <Link to="/adventure" className="btn-primary">
          ⚔ Adventure Mode
        </Link>
      </div>

      <SportTypeFilter value={sportFilter} onChange={handleSportFilterChange} />

      <SummaryStats trendData={trendData} period={statsPeriod} />

      <ActivityChart
        period={statsPeriod}
        onPeriodChange={handlePeriodChange}
        types={sportTypes}
        onDataLoad={setTrendData}
      />

      <FilterBar filters={filters} onFilterChange={setFilters} />

      <ErrorBanner message={error} />

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <>
          {/* Desktop table */}
          <WorkoutTable workouts={workouts} />

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {workouts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No workouts found. Upload your first one!
              </div>
            ) : (
              workouts.map((w) => <WorkoutCard key={w.id} workout={w} />)
            )}
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
