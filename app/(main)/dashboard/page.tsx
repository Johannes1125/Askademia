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
    <div className="card p-4 bg-[#11161d] text-white border-white/10">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-white/70">{title}</div>
          <div className="mt-2 text-3xl font-semibold">{value}</div>
          <div className="mt-2 text-xs text-emerald-400">{delta}</div>
        </div>
        <div className={`h-10 w-10 grid place-items-center rounded-lg ${accentBg} text-[#0f172a]`}>{icon}</div>
      </div>
    </div>
  );
}

function UsageBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-sm">
      <div className="flex justify-between mb-1 text-white/80">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Queries" value={fmt(allTime?.prompts)} delta={pct(thisMonth?.prompts, allTime?.prompts)} icon={<ChatBubbleIcon />} accent="yellow" />
        <StatCard title="Conversations" value={fmt(allTime?.conversations)} delta={pct(thisMonth?.conversations, allTime?.conversations)} icon={<ReaderIcon />} accent="blue" />
        <StatCard title="Citations Created" value={fmt(allTime?.citations)} delta={pct(thisMonth?.citations, allTime?.citations)} icon={<CheckCircledIcon />} accent="green" />
        <StatCard title="Documents Checked" value="0" delta="+0% this month" icon={<ArchiveIcon />} accent="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5 bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 text-slate-900 dark:text-white">
          <h2 className="text-xl font-semibold">Quick Access Tools</h2>
          <p className="text-sm text-slate-600 dark:text-white/60 mb-4">Get started with your most-used features</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ToolCard href="/chat" label="Start Chat" icon={<ChatBubbleIcon />} />
            <ToolCard href="/tools/citation" label="Create Citation" icon={<ReaderIcon />} />
            <ToolCard href="/tools/grammar" label="Grammar Check" icon={<CheckCircledIcon />} />
            <ToolCard href="/tools/grammar" label="Check Content" icon={<ArchiveIcon />} />
          </div>
        </div>
        <div className="card p-5 bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 text-slate-900 dark:text-white">
          <h2 className="text-xl font-semibold mb-4">Weekly Usage</h2>
          <div className="space-y-3">
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
      className="group rounded-xl border border-white/10 bg-white/5 p-10 flex flex-col items-center justify-center text-center hover:border-white/20 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
    >
      <div className="h-10 w-10 grid place-items-center rounded-lg mb-3 text-white/90 bg-white/10 group-hover:bg-white/20">
        {icon}
      </div>
      <div className="font-medium text-white">{label}</div>
    </Link>
  );
}


