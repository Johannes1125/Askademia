"use client";

// Dashboard Page
import {
  ChatBubbleIcon,
  ReaderIcon,
  CheckCircledIcon,
  ArchiveIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

function StatCard({ title, value, delta, icon, accent }: { title: string; value: string; delta: string; icon: React.ReactNode; accent: "yellow" | "blue" | "green" | "orange" }) {
  const accentBg =
    accent === "yellow"
      ? "bg-[var(--brand-yellow)]"
      : accent === "blue"
      ? "bg-[var(--brand-blue)]"
      : accent === "green"
      ? "bg-emerald-500"
      : "bg-orange-500";
  return (
    <div className="card p-5 sm:p-6 bg-card text-foreground border-theme hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm text-muted truncate uppercase tracking-wide font-semibold">{title}</div>
          <div className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold text-foreground">{value}</div>
          <div className="mt-1 sm:mt-2 text-xs text-emerald-500 font-medium">{delta}</div>
        </div>
        <div className={`h-11 w-11 sm:h-12 sm:w-12 shrink-0 grid place-items-center rounded-lg ${accentBg}`} style={{ color: 'var(--card)' }}>{icon}</div>
      </div>
    </div>
  );
}

function UsageBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-sm">
      <div className="flex justify-between mb-2 text-foreground font-medium">
        <span>{label}</span>
        <span className="text-muted text-xs">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full subtle-bg overflow-hidden border border-theme">
        <div className="h-full" style={{ width: `${value}%`, background: "linear-gradient(90deg, var(--brand-yellow), var(--brand-blue))" }} />
      </div>
    </div>
  );
}

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

  const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '0');
  const pct = (part?: number, total?: number) => {
    if (!part || !total || total === 0) return '+0% this month';
    const p = Math.round((part / total) * 100);
    return `+${p}% this month`;
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Queries" value={fmt(allTime?.prompts)} delta={pct(thisMonth?.prompts, allTime?.prompts)} icon={<ChatBubbleIcon />} accent="yellow" />
        <StatCard title="Conversations" value={fmt(allTime?.conversations)} delta={pct(thisMonth?.conversations, allTime?.conversations)} icon={<ReaderIcon />} accent="blue" />
        <StatCard title="Citations Created" value={fmt(allTime?.citations)} delta={pct(thisMonth?.citations, allTime?.citations)} icon={<CheckCircledIcon />} accent="green" />
        <StatCard title="Documents Checked" value="0" delta="+0% this month" icon={<ArchiveIcon />} accent="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 sm:p-7 bg-card border-theme text-foreground hover:shadow-lg transition-shadow">
          <h2 className="text-lg sm:text-xl font-bold mb-1">Quick Access Tools</h2>
          <p className="text-xs sm:text-sm text-muted mb-5 sm:mb-6">Get started with your most-used features</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <ToolCard href="/chat" label="Start Chat" icon={<ChatBubbleIcon />} />
            <ToolCard href="/tools/citation" label="Create Citation" icon={<ReaderIcon />} />
            <ToolCard href="/tools/grammar" label="Grammar Check" icon={<CheckCircledIcon />} />
            <ToolCard href="/tools/grammar" label="Check Content" icon={<ArchiveIcon />} />
          </div>
        </div>
        <div className="card p-6 sm:p-7 bg-card border-theme text-foreground hover:shadow-lg transition-shadow">
          <h2 className="text-lg sm:text-xl font-bold mb-5 sm:mb-6">Weekly Usage</h2>
          <div className="space-y-3.5">
            <UsageBar label="Mon" value={92} />
            <UsageBar label="Tue" value={94} />
            <UsageBar label="Wed" value={53} />
            <UsageBar label="Thu" value={66} />
            <UsageBar label="Fri" value={82} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white"
      style={{ background: "var(--brand-blue)" }}
    >
      {label}
    </a>
  );
}

function ToolCard({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-theme bg-card p-5 sm:p-6 flex flex-col items-center justify-center text-center hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{ '--ring-offset-color': 'var(--app-bg)' } as any}
    >
      <div className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center rounded-lg mb-2.5 sm:mb-3" style={{ background: 'color-mix(in oklab, var(--foreground) 12%, transparent)', color: 'var(--primary)' }}>
        {icon}
      </div>
      <div className="text-xs sm:text-sm font-semibold text-foreground">{label}</div>
    </Link>
  );
}


