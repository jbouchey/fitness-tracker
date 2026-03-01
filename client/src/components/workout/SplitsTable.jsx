import { formatPace, formatDuration, formatElevation, formatHeartRate } from '../../utils/formatters';

export default function SplitsTable({ splits }) {
  if (!splits?.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-100">
        Mile Splits
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-2">Mile</th>
              <th className="text-left px-4 py-2">Pace</th>
              <th className="text-left px-4 py-2">Time</th>
              <th className="text-left px-4 py-2">Avg HR</th>
              <th className="text-left px-4 py-2">Elev Gain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {splits.map((s) => (
              <tr key={s.splitNumber} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{s.splitNumber}</td>
                <td className="px-4 py-2.5 text-gray-700">{formatPace(s.paceSecPerMile)}</td>
                <td className="px-4 py-2.5 text-gray-600">{formatDuration(s.elapsedSeconds)}</td>
                <td className="px-4 py-2.5 text-gray-600">{formatHeartRate(s.avgHeartRate)}</td>
                <td className="px-4 py-2.5 text-gray-600">{formatElevation(s.elevationGainFt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
