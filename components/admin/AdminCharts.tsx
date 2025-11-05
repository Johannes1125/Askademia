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
      <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Activity ({period === 'day' ? 'Daily' : period === 'month' ? 'Monthly' : 'Yearly'})
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00000020" />
            <XAxis dataKey="date" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0,0,0,0.1)',
                color: '#0f172a',
              }}
              wrapperStyle={{ color: '#0f172a' }}
            />
            <Legend />
            <Line type="monotone" dataKey="conversations" stroke="#3b82f6" strokeWidth={2} name="Conversations" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">User Growth</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00000020" />
            <XAxis dataKey="date" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0,0,0,0.1)',
                color: '#0f172a',
              }}
              wrapperStyle={{ color: '#0f172a' }}
            />
            <Legend />
            <Bar dataKey="conversations" fill="#10b981" name="Conversations" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


