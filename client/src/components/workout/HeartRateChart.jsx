import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CHART_MAX_POINTS } from '../../utils/constants';
import { formatDuration } from '../../utils/formatters';

function downsample(arr, maxPoints) {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}

export default function HeartRateChart({ trackPoints, avgHeartRate }) {
  const withHR = trackPoints?.filter((tp) => tp.heartRate != null && tp.elapsedSec != null);
  if (!withHR?.length) return null;

  const raw = withHR.map((tp) => ({
    sec: tp.elapsedSec,
    hr: tp.heartRate,
  }));

  const data = downsample(raw, CHART_MAX_POINTS);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Heart Rate</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="sec" tickFormatter={(v) => formatDuration(v)} tick={{ fontSize: 11 }} />
          <YAxis domain={['auto', 'auto']} tickFormatter={(v) => `${v}`} tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(v) => [`${v} bpm`, 'Heart Rate']}
            labelFormatter={(l) => formatDuration(l)}
            contentStyle={{ fontSize: 12 }}
          />
          {avgHeartRate && (
            <ReferenceLine y={avgHeartRate} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Avg', position: 'right', fontSize: 10 }} />
          )}
          <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
