import { Link } from 'react-router-dom';
import { formatPace, formatDistance, formatElevation, formatDate } from '../../utils/formatters';

function PRTile({ label, value, subtitle, workoutId }) {
  const content = (
    <div className="metric-card">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>}
    </div>
  );

  if (workoutId) {
    return <Link to={`/workouts/${workoutId}`} className="block hover:opacity-80 transition-opacity">{content}</Link>;
  }
  return content;
}

export default function PersonalRecords({ records }) {
  if (!records) return null;

  const { fastestSplit, longestRun, mostElevation } = records;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Records</h2>
      <div className="grid grid-cols-3 gap-3">
        <PRTile
          label="Fastest Mile Split"
          value={fastestSplit ? formatPace(fastestSplit.paceSecPerMile) : '—'}
          subtitle={fastestSplit ? `${fastestSplit.workout.title} · ${formatDate(fastestSplit.workout.startTime)}` : null}
          workoutId={fastestSplit?.workout.id}
        />
        <PRTile
          label="Longest Run"
          value={longestRun ? formatDistance(longestRun.distanceMiles) : '—'}
          subtitle={longestRun ? `${longestRun.title} · ${formatDate(longestRun.startTime)}` : null}
          workoutId={longestRun?.id}
        />
        <PRTile
          label="Most Elevation"
          value={mostElevation ? formatElevation(mostElevation.elevationGainFt) : '—'}
          subtitle={mostElevation ? `${mostElevation.title} · ${formatDate(mostElevation.startTime)}` : null}
          workoutId={mostElevation?.id}
        />
      </div>
    </div>
  );
}
