'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
} from 'recharts';

type Activity = { date: string; conversations: number; messages: number }[];

// Custom tooltip with elegant styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-theme/60 rounded-lg shadow-xl p-3 backdrop-blur-sm">
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>{' '}
            <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Format date labels based on period
const formatDateLabel = (date: string, period: 'day' | 'month' | 'year') => {
  if (period === 'day') {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (period === 'month') {
    const [year, month] = date.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } else {
    return date;
  }
};

export default function AdminCharts({ data, period }: { data: Activity; period: 'day' | 'month' | 'year' }) {
  // Prepare data with formatted labels
  const chartData = data.map(item => ({
    ...item,
    formattedDate: formatDateLabel(item.date, period),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Activity Line Chart with Area Fill */}
      <div className="card p-6 border-theme bg-card hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              Activity ({period === 'day' ? 'Daily' : period === 'month' ? 'Monthly' : 'Yearly'})
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="color-mix(in oklab,var(--foreground) 8%, transparent)"
                vertical={false}
              />
              <XAxis 
                dataKey="formattedDate" 
                stroke="var(--muted)"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--muted)' }}
              />
              <YAxis 
                stroke="var(--muted)"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--muted)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="conversations"
                stroke="url(#lineGradient)"
                strokeWidth={3}
                fill="url(#colorConversations)"
                name="Conversations"
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Messages Bar Chart */}
      <div className="card p-6 border-theme bg-card hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Messages</h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Active</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="color-mix(in oklab,var(--foreground) 8%, transparent)"
                vertical={false}
              />
              <XAxis 
                dataKey="formattedDate" 
                stroke="var(--muted)"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--muted)' }}
              />
              <YAxis 
                stroke="var(--muted)"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={{ stroke: 'var(--muted)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="messages" 
                name="Messages"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


