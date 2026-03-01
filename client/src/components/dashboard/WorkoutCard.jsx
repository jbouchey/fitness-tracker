import { Link } from 'react-router-dom';
import Badge from '../shared/Badge';
import { formatDate, formatDistance, formatDuration, formatPace, formatElevation } from '../../utils/formatters';

export default function WorkoutCard({ workout: w }) {
  return (
    <Link
      to={`/workouts/${w.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900 leading-tight">{w.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(w.startTime)}</p>
        </div>
        <Badge type={w.workoutType} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
        <Stat label="Distance" value={formatDistance(w.distanceMiles)} />
        <Stat label="Duration" value={formatDuration(w.elapsedSeconds)} />
        <Stat label="Pace" value={formatPace(w.avgPaceSecPerMile)} />
        <Stat label="Elev Gain" value={formatElevation(w.elevationGainFt)} />
      </div>
    </Link>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
