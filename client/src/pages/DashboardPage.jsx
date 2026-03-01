import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkoutStore } from '../store/workoutStore';
import SummaryStats from '../components/dashboard/SummaryStats';
import ActivityChart from '../components/dashboard/ActivityChart';
import PersonalRecords from '../components/dashboard/PersonalRecords';
import FilterBar from '../components/dashboard/FilterBar';
import WorkoutTable from '../components/dashboard/WorkoutTable';
import WorkoutCard from '../components/dashboard/WorkoutCard';
import Pagination from '../components/dashboard/Pagination';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';

export default function DashboardPage() {
  const { workouts, pagination, stats, filters, isLoading, error, fetchWorkouts, setFilters, setPage, personalRecords, fetchPersonalRecords } =
    useWorkoutStore();

  useEffect(() => {
    fetchWorkouts();
    fetchPersonalRecords();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Workouts</h1>
        <Link to="/upload" className="btn-primary">
          Upload Workout
        </Link>
      </div>

      <SummaryStats stats={stats} />

      <ActivityChart />

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
