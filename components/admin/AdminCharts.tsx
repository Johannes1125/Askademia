'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Activity = { date: string; conversations: number }[];

export default function AdminCharts({ data, period }: { data: Activity; period: 'day' | 'month' | 'year' }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-6 border-theme bg-card hover:shadow-lg transition-shadow">
        <h2 className="text-lg font-bold text-foreground mb-4">
          Activity ({period === 'day' ? 'Daily' : period === 'month' ? 'Monthly' : 'Yearly'})
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklab,var(--foreground) 12%, transparent)" />
            <XAxis dataKey="date" stroke="var(--muted)" />
            <YAxis stroke="var(--muted)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              wrapperStyle={{ color: 'var(--foreground)' }}
            />
            <Legend />
            <Line type="monotone" dataKey="conversations" stroke="#3b82f6" strokeWidth={2} name="Conversations" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-6 border-theme bg-card hover:shadow-lg transition-shadow">
        <h2 className="text-lg font-bold text-foreground mb-4">User Growth</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklab,var(--foreground) 12%, transparent)" />
            <XAxis dataKey="date" stroke="var(--muted)" />
            <YAxis stroke="var(--muted)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              wrapperStyle={{ color: 'var(--foreground)' }}
            />
            <Legend />
            <Bar dataKey="conversations" fill="#10b981" name="Conversations" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


