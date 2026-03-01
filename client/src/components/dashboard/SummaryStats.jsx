import { formatDistance, formatElevation } from '../../utils/formatters';

export default function SummaryStats({ stats }) {
  const tiles = [
    { label: 'Total Workouts', value: stats.totalWorkouts.toLocaleString() },
    { label: 'Total Distance', value: formatDistance(stats.totalMiles) },
    { label: 'Total Elevation', value: formatElevation(stats.totalElevationGain) },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {tiles.map(({ label, value }) => (
        <div key={label} className="metric-card text-center">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}
