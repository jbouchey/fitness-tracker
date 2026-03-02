import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workoutsApi } from '../api/workouts';
import WorkoutHeader from '../components/workout/WorkoutHeader';
import MetricsGrid from '../components/workout/MetricsGrid';
import RouteMap from '../components/workout/RouteMap';
import ElevationChart from '../components/workout/ElevationChart';
import HeartRateChart from '../components/workout/HeartRateChart';
import PaceChart from '../components/workout/PaceChart';
import SplitsTable from '../components/workout/SplitsTable';
import ErrorBanner from '../components/shared/ErrorBanner';

function WorkoutDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded" />
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="h-6 w-48 bg-gray-200 rounded mb-3" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-6 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 h-80" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 h-52" />
        <div className="bg-white rounded-xl border border-gray-200 h-52" />
      </div>
    </div>
  );
}

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const [workout, setWorkout] = useState(null);
  const [trackPoints, setTrackPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredSec, setHoveredSec] = useState(null);

  useEffect(() => {
    workoutsApi
      .getById(id)
      .then(({ workout, trackPoints }) => {
        setWorkout(workout);
        setTrackPoints(trackPoints);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load workout.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <WorkoutDetailSkeleton />;
  if (error) return (
    <div className="max-w-3xl mx-auto">
      <ErrorBanner message={error} />
      <Link to="/" className="btn-secondary mt-4 inline-flex">← Back to dashboard</Link>
    </div>
  );
  if (!workout) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 gap-1">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      <WorkoutHeader workout={workout} onUpdate={setWorkout} />

      <MetricsGrid workout={workout} />

      <RouteMap trackPoints={trackPoints} hoveredSec={hoveredSec} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ElevationChart trackPoints={trackPoints} onHover={setHoveredSec} />
        <HeartRateChart trackPoints={trackPoints} avgHeartRate={workout.avgHeartRate} onHover={setHoveredSec} />
      </div>

      <PaceChart trackPoints={trackPoints} onHover={setHoveredSec} />

      <SplitsTable splits={workout.splits} />
    </div>
  );
}
