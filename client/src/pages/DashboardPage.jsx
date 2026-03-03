import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWorkoutStore } from '../store/workoutStore';
import { SPORT_FILTER_OPTIONS } from '../utils/constants';
import SportTypeFilter from '../components/dashboard/SportTypeFilter';
import SummaryStats from '../components/dashboard/SummaryStats';
import ActivityChart from '../components/dashboard/ActivityChart';
import PersonalRecords from '../components/dashboard/PersonalRecords';
import FilterBar from '../components/dashboard/FilterBar';
import WorkoutTable from '../components/dashboard/WorkoutTable';
import WorkoutCard from '../components/dashboard/WorkoutCard';
import Pagination from '../components/dashboard/Pagination';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';

const SPORT_STORAGE_KEY = 'dashboard-sport-filter';
const PERIOD_STORAGE_KEY = 'dashboard-stats-period';

function getSportTypes(filterValue) {
  const opt = SPORT_FILTER_OPTIONS.find((o) => o.value === filterValue);
  return opt?.types || null;
}

export default function DashboardPage() {
  const { workouts, pagination, filters, isLoading, error, setFilters, setPage, personalRecords, fetchPersonalRecords } =
    useWorkoutStore();

  const [sportFilter, setSportFilter] = useState(
    () => localStorage.getItem(SPORT_STORAGE_KEY) || 'all'
  );
  const [statsPeriod, setStatsPeriod] = useState(
    () => localStorage.getItem(PERIOD_STORAGE_KEY) || 'week'
  );
  const [trendData, setTrendData] = useState([]);

  // On mount: apply sticky sport filter and fetch personal records
  useEffect(() => {
    const types = getSportTypes(sportFilter);
    setFilters({ types: types || [] });
    fetchPersonalRecords();
  }, []);

  const handleSportFilterChange = useCallback((value) => {
    setSportFilter(value);
    localStorage.setItem(SPORT_STORAGE_KEY, value);
    const types = getSportTypes(value);
    setFilters({ types: types || [], type: '' });
  }, [setFilters]);

  const handlePeriodChange = useCallback((period) => {
    setStatsPeriod(period);
    localStorage.setItem(PERIOD_STORAGE_KEY, period);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Workouts</h1>
        <Link to="/upload" className="btn-primary">
          Upload Workout
        </Link>
      </div>

      <SportTypeFilter value={sportFilter} onChange={handleSportFilterChange} />

      <SummaryStats trendData={trendData} period={statsPeriod} />

      <ActivityChart
        period={statsPeriod}
        onPeriodChange={handlePeriodChange}
        types={getSportTypes(sportFilter)}
        onDataLoad={setTrendData}
      />

      <PersonalRecords records={personalRecords} />

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
