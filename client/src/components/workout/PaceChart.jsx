import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_MAX_POINTS } from '../../utils/constants';
import { formatPace } from '../../utils/formatters';

const METERS_PER_MILE = 1609.344;

function downsample(arr, maxPoints) {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}

export default function PaceChart({ trackPoints, onHover }) {
  if (!trackPoints?.length) return null;

  const raw = [];
  let cumDistM = 0;

  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const curr = trackPoints[i];

    if (prev.latitude == null || curr.latitude == null || prev.elapsedSec == null || curr.elapsedSec == null) continue;

    const dLat = ((curr.latitude - prev.latitude) * Math.PI) / 180;
    const dLng = ((curr.longitude - prev.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((prev.latitude * Math.PI) / 180) * Math.cos((curr.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const segDistM = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (segDistM < 1) continue;
    cumDistM += segDistM;

    const dSec = curr.elapsedSec - prev.elapsedSec;
    if (dSec <= 0) continue;

    const paceSecPerMile = dSec / (segDistM / METERS_PER_MILE);
    // Filter outliers: 3 min/mi – 30 min/mi
    if (paceSecPerMile < 180 || paceSecPerMile > 1800) continue;

    raw.push({
      mile: parseFloat((cumDistM / METERS_PER_MILE).toFixed(2)),
      pace: Math.round(paceSecPerMile),
      sec: curr.elapsedSec,
    });
  }

  if (!raw.length) return null;

  const data = downsample(raw, CHART_MAX_POINTS);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Pace</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          syncId="workout"
          onMouseMove={(state) => {
            if (onHover && state.isTooltipActive && state.activePayload?.[0]) {
              const sec = state.activePayload[0].payload.sec;
              if (sec != null) onHover(sec);
            }
          }}
          onMouseLeave={() => onHover?.(null)}
          margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="mile" tickFormatter={(v) => `${v} mi`} tick={{ fontSize: 11 }} />
          <YAxis
            reversed
            tickFormatter={(v) => formatPace(v)}
            tick={{ fontSize: 11 }}
            width={55}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(v) => [formatPace(v), 'Pace']}
            labelFormatter={(l) => `${l} mi`}
            contentStyle={{ fontSize: 12 }}
          />
          <Line type="monotone" dataKey="pace" stroke="#6366f1" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      {raw.length > data.length && (
        <p className="text-xs text-gray-400 mt-1 text-right">
          Showing {data.length.toLocaleString()} of {raw.length.toLocaleString()} points
        </p>
      )}
    </div>
  );
}
