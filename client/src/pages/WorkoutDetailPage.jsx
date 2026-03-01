import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workoutsApi } from '../api/workouts';
import WorkoutHeader from '../components/workout/WorkoutHeader';
import MetricsGrid from '../components/workout/MetricsGrid';
import RouteMap from '../components/workout/RouteMap';
import ElevationChart from '../components/workout/ElevationChart';
import HeartRateChart from '../components/workout/HeartRateChart';
import SplitsTable from '../components/workout/SplitsTable';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorBanner from '../components/shared/ErrorBanner';

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const [workout, setWorkout] = useState(null);
  const [trackPoints, setTrackPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <LoadingSpinner className="py-24" />;
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

      <RouteMap trackPoints={trackPoints} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ElevationChart trackPoints={trackPoints} />
        <HeartRateChart trackPoints={trackPoints} avgHeartRate={workout.avgHeartRate} />
      </div>

      <SplitsTable splits={workout.splits} />
    </div>
  );
}
