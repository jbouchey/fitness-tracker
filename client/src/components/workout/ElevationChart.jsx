import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_MAX_POINTS } from '../../utils/constants';

const FEET_PER_METER = 3.28084;
const METERS_PER_MILE = 1609.344;

function downsample(arr, maxPoints) {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}

export default function ElevationChart({ trackPoints, onHover }) {
  if (!trackPoints?.length) return null;

  // Build data: cumulative distance (miles) vs elevation (ft)
  let cumDistM = 0;
  const raw = trackPoints
    .filter((tp) => tp.elevationM != null)
    .map((tp, i, arr) => {
      if (i > 0) {
        const p = arr[i - 1];
        const dLat = ((tp.latitude - p.latitude) * Math.PI) / 180;
        const dLng = ((tp.longitude - p.longitude) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((p.latitude * Math.PI) / 180) * Math.cos((tp.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
        cumDistM += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      return {
        mile: parseFloat((cumDistM / METERS_PER_MILE).toFixed(2)),
        elev: Math.round(tp.elevationM * FEET_PER_METER),
        sec: tp.elapsedSec,
      };
    });

  if (!raw.length) return null;

  const data = downsample(raw, CHART_MAX_POINTS);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Elevation Profile</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
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
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="mile" tickFormatter={(v) => `${v} mi`} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${v} ft`} tick={{ fontSize: 11 }} width={55} />
          <Tooltip
            formatter={(v) => [`${v} ft`, 'Elevation']}
            labelFormatter={(l) => `${l} mi`}
            contentStyle={{ fontSize: 12 }}
          />
          <Area type="monotone" dataKey="elev" stroke="#f97316" strokeWidth={2} fill="url(#elevGradient)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      {raw.length > data.length && (
        <p className="text-xs text-gray-400 mt-1 text-right">
          Showing {data.length.toLocaleString()} of {raw.length.toLocaleString()} points
        </p>
      )}
    </div>
  );
}
