import { formatDistance, formatDuration, formatPace, formatElevation, formatHeartRate } from '../../utils/formatters';

export default function MetricsGrid({ workout }) {
  const gainPerMile = workout.distanceMiles > 0
    ? `${Math.round(workout.elevationGainFt / workout.distanceMiles)} ft/mi`
    : '--';

  const tiles = [
    { label: 'Distance', value: formatDistance(workout.distanceMiles) },
    { label: 'Duration', value: formatDuration(workout.elapsedSeconds) },
    { label: 'Avg Pace', value: formatPace(workout.avgPaceSecPerMile) },
    { label: 'Best Pace', value: formatPace(workout.bestPaceSecPerMile) },
    { label: 'Elev Gain', value: formatElevation(workout.elevationGainFt) },
    { label: 'Elev Loss', value: formatElevation(workout.elevationLossFt) },
    { label: 'Gain / Mile', value: gainPerMile },
    { label: 'Avg Heart Rate', value: formatHeartRate(workout.avgHeartRate) },
    { label: 'Max Heart Rate', value: formatHeartRate(workout.maxHeartRate) },
  ];

  const optionalTiles = [
    ...(workout.calories ? [{ label: 'Calories', value: `${workout.calories} cal` }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[...tiles, ...optionalTiles].map(({ label, value }) => (
        <div key={label} className="metric-card">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      ))}
    </div>
  );
}
