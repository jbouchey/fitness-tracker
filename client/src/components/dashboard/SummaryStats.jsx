import { formatDistance, formatElevation } from '../../utils/formatters';

export default function SummaryStats({ trendData = [], period }) {
  const totalWorkouts = trendData.reduce((s, r) => s + r.runs, 0);
  const totalMiles = trendData.reduce((s, r) => s + r.miles, 0);
  const totalElevation = trendData.reduce((s, r) => s + r.elevation, 0);
  const periodLabel = period === 'week' ? 'This Week' : 'This Month';

  const tiles = [
    { label: 'Workouts', value: totalWorkouts.toLocaleString() },
    { label: 'Distance', value: formatDistance(totalMiles) },
    { label: 'Elevation', value: formatElevation(totalElevation) },
  ];

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{periodLabel}</p>
      <div className="grid grid-cols-3 gap-4">
        {tiles.map(({ label, value }) => (
          <div key={label} className="metric-card text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
