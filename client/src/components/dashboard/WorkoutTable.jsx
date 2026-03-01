import { Link } from 'react-router-dom';
import Badge from '../shared/Badge';
import { formatDate, formatDistance, formatDuration, formatPace, formatElevation, formatHeartRate } from '../../utils/formatters';

const columns = [
  { key: 'title', label: 'Workout' },
  { key: 'startTime', label: 'Date' },
  { key: 'distanceMiles', label: 'Distance' },
  { key: 'elapsedSeconds', label: 'Duration' },
  { key: 'avgPaceSecPerMile', label: 'Avg Pace' },
  { key: 'elevationGainFt', label: 'Elev Gain' },
  { key: 'avgHeartRate', label: 'Avg HR' },
];

export default function WorkoutTable({ workouts }) {
  if (!workouts.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">No workouts found. Upload your first one!</p>
      </div>
    );
  }

  return (
    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {workouts.map((w) => (
            <tr key={w.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <Link to={`/workouts/${w.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                  {w.title}
                </Link>
                <div className="mt-1">
                  <Badge type={w.workoutType} />
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{formatDate(w.startTime)}</td>
              <td className="px-4 py-3 text-gray-900 font-medium">{formatDistance(w.distanceMiles)}</td>
              <td className="px-4 py-3 text-gray-600">{formatDuration(w.elapsedSeconds)}</td>
              <td className="px-4 py-3 text-gray-600">{formatPace(w.avgPaceSecPerMile)}</td>
              <td className="px-4 py-3 text-gray-600">{formatElevation(w.elevationGainFt)}</td>
              <td className="px-4 py-3 text-gray-600">{formatHeartRate(w.avgHeartRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
