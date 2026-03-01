import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { workoutsApi } from '../../api/workouts';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildWeeklyScaffold(rows) {
  const lookup = {};
  for (const row of rows) {
    // row.day is returned as a JS Date at midnight UTC of the local date
    const key = new Date(row.day).toISOString().slice(0, 10);
    lookup[key] = row;
  }

  // Build 7 slots: 6 days ago → today
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0); // use noon so toISOString gives the correct local date
    const key = d.toISOString().slice(0, 10);
    const found = lookup[key];
    result.push({
      label: DAY_LABELS[d.getDay()],
      miles: found ? Number(Number(found.miles).toFixed(2)) : 0,
      runs: found ? Number(found.runs) : 0,
      elevation: found ? Math.round(Number(found.elevation)) : 0,
    });
  }
  return result;
}

function buildMonthlyScaffold(rows) {
  const lookup = {};
  for (const row of rows) {
    lookup[Number(row.week_num)] = row;
  }

  // Determine how many weeks the current month has (4 or 5)
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const numWeeks = Math.ceil(lastDay / 7);

  return Array.from({ length: numWeeks }, (_, i) => {
    const wk = i + 1;
    const found = lookup[wk];
    return {
      label: `Wk ${wk}`,
      miles: found ? Number(Number(found.miles).toFixed(2)) : 0,
      runs: found ? Number(found.runs) : 0,
      elevation: found ? Math.round(Number(found.elevation)) : 0,
    };
  });
}

export default function ActivityChart() {
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    workoutsApi.getActivityTrends(period)
      .then(({ trends }) => {
        setData(period === 'week' ? buildWeeklyScaffold(trends) : buildMonthlyScaffold(trends));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Activity</h2>
        <div className="flex gap-1">
          {['week', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                period === p
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value, name) => name === 'miles' ? [`${value} mi`, 'Miles'] : [value, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="miles" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
