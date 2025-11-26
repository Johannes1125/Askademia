"use client";

// Dashboard Page
import {
  ChatBubbleIcon,
  ReaderIcon,
  CheckCircledIcon,
  FileTextIcon,
  RocketIcon,
  ArrowRightIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

function StatCard({ 
  title, 
  value, 
  delta, 
  icon, 
  gradient 
}: { 
  title: string; 
  value: string; 
  delta: string; 
  icon: React.ReactNode; 
  gradient: string;
}) {
  return (
    <div className="group relative bg-card border border-theme rounded-2xl p-5 hover:border-white/20 transition-all duration-300 overflow-hidden">
      {/* Background gradient on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${gradient}`} />
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted uppercase tracking-wider font-medium mb-3">{title}</div>
          <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
          <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {delta}
          </div>
        </div>
        <div className={`h-12 w-12 shrink-0 grid place-items-center rounded-xl ${gradient} shadow-lg`}>
          <span className="text-white">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div className="group">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-subtle-bg overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${value}%`, 
            background: "linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899)",
            animationDelay: `${delay}ms`
          }} 
        />
      </div>
    </div>
  );
}

function ToolCard({ href, label, icon, description, color }: { 
  href: string; 
  label: string; 
  icon: React.ReactNode;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group relative bg-card border border-theme rounded-2xl p-6 hover:border-white/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
      
      <div className="relative flex flex-col items-center text-center">
        <div className={`h-12 w-12 grid place-items-center rounded-xl ${color} shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <span className="text-white">{icon}</span>
        </div>
        <div className="text-base font-semibold text-foreground mb-1 group-hover:text-[var(--brand-blue)] transition-colors">{label}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
    </Link>
  );
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DashboardPage() {
  const supabase = createClient();
  const startOfMonth = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(), []);
  const nowIso = useMemo(() => new Date().toISOString(), []);

  const { data: allTime } = useSWR(['user_stats', null, null], async () => {
    const { data, error } = await supabase.rpc('user_stats', { p_start: null, p_end: null });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }, { revalidateOnFocus: false });

  const { data: thisMonth } = useSWR(['user_stats_month', startOfMonth, nowIso], async ([, s, e]) => {
    const { data, error } = await supabase.rpc('user_stats', { p_start: s, p_end: e });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }, { revalidateOnFocus: false });

  // Fetch weekly activity data
  const { data: weeklyData } = useSWR('/api/stats/weekly', fetcher, { revalidateOnFocus: false });

  const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '0');
  const pct = (part?: number, total?: number) => {
    if (!part || !total || total === 0) return '+0%';
    const p = Math.round((part / total) * 100);
    return `+${p}%`;
  };

  // Get current day for weekly usage
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const todayName = days[today];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Queries" 
          value={fmt(allTime?.prompts)} 
          delta={pct(thisMonth?.prompts, allTime?.prompts)} 
          icon={<ChatBubbleIcon className="h-5 w-5" />} 
          gradient="bg-gradient-to-br from-amber-400 to-orange-500" 
        />
        <StatCard 
          title="Conversations" 
          value={fmt(allTime?.conversations)} 
          delta={pct(thisMonth?.conversations, allTime?.conversations)} 
          icon={<ReaderIcon className="h-5 w-5" />} 
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600" 
        />
        <StatCard 
          title="Citations" 
          value={fmt(allTime?.citations)} 
          delta={pct(thisMonth?.citations, allTime?.citations)} 
          icon={<CheckCircledIcon className="h-5 w-5" />} 
          gradient="bg-gradient-to-br from-emerald-400 to-teal-500" 
        />
        <StatCard 
          title="Grammar Checks" 
          value="0" 
          delta="+0%" 
          icon={<FileTextIcon className="h-5 w-5" />} 
          gradient="bg-gradient-to-br from-rose-400 to-pink-500" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Access Tools */}
        <div className="lg:col-span-2 bg-card border border-theme rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <LightningBoltIcon className="h-5 w-5 text-[var(--brand-yellow)]" />
                Quick Access
              </h2>
              <p className="text-xs text-muted mt-1">Jump into your favorite tools</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <ToolCard 
              href="/chat" 
              label="AI Chat" 
              icon={<ChatBubbleIcon className="h-5 w-5" />}
              description="Research assistant"
              color="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <ToolCard 
              href="/citations" 
              label="Citations" 
              icon={<ReaderIcon className="h-5 w-5" />}
              description="Generate references"
              color="bg-gradient-to-br from-emerald-400 to-teal-500"
            />
            <ToolCard 
              href="/tools/grammar" 
              label="Grammar Check" 
              icon={<CheckCircledIcon className="h-5 w-5" />}
              description="Improve your writing"
              color="bg-gradient-to-br from-purple-500 to-pink-500"
            />
            <ToolCard 
              href="/tools/questions" 
              label="Question Generator" 
              icon={<FileTextIcon className="h-5 w-5" />}
              description="Create survey questions"
              color="bg-gradient-to-br from-amber-400 to-orange-500"
            />
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-card border border-theme rounded-2xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-2">This Week</h2>
          <p className="text-xs text-muted mb-6">Your daily activity (messages + citations)</p>
          
          <div className="space-y-5">
            {(weeklyData?.daily || []).slice(0, 5).map((dayData: { day: string; count: number; percentage: number }) => {
              const isToday = todayName === dayData.day;
              return (
                <div key={dayData.day} className={`${isToday ? 'opacity-100' : 'opacity-70'}`}>
                  <div className="flex justify-between mb-2">
                    <span className={`text-sm font-medium ${isToday ? 'text-[var(--brand-blue)]' : 'text-foreground'}`}>
                      {dayData.day} {isToday && <span className="text-xs text-muted ml-1">(Today)</span>}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{dayData.count} items</span>
                  </div>
                  <div className="h-2 rounded-full bg-subtle-bg overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.max(dayData.percentage, 5)}%`, 
                        background: isToday 
                          ? "linear-gradient(90deg, var(--brand-blue), #8B5CF6)" 
                          : "linear-gradient(90deg, #64748B, #94A3B8)"
                      }} 
                    />
                  </div>
                </div>
              );
            })}
            {!weeklyData?.daily && (
              <div className="text-center py-4 text-muted text-sm">Loading activity...</div>
            )}
            {weeklyData?.daily?.length === 0 && (
              <div className="text-center py-4 text-muted text-sm">No activity this week</div>
            )}
          </div>
          
          <div className="mt-6 pt-5 border-t border-theme">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Weekly Total</span>
              <span className="font-bold text-foreground">{weeklyData?.total || 0} items</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
