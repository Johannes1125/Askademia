"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
const AdminCharts = dynamic(() => import("@/components/admin/AdminCharts"), {
  ssr: false,
  loading: () => <div className="card p-6">Loading charts…</div>,
});

type Stats = {
  totalUsers: number;
  newUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalCitations: number;
  activityData: Array<{ date: string; conversations: number }>;
  period: string;
};

type Feedback = {
  id: string;
  user: string;
  message: string;
  rating: number;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const statsQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.startDate) params.append("startDate", dateRange.startDate);
    if (dateRange.endDate) params.append("endDate", dateRange.endDate);
    params.append("period", period);
    return `/api/admin/stats?${params.toString()}`;
  }, [dateRange.startDate, dateRange.endDate, period]);

  const { data: statsData, isLoading: statsLoading, error: statsError } = useSWR<Stats>(statsQuery, fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    setStats(statsData ?? null);
  }, [statsData]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/admin/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      toast.error("Admin access required");
      router.push("/admin/login");
    }
  };

  useEffect(() => {
    setLoading(statsLoading);
    if (statsError) {
      console.error("Error loading stats:", statsError);
      toast.error((statsError as any).message || "Failed to load statistics");
    }
  }, [statsLoading, statsError]);

  const { data: feedbackData, error: feedbackError, isLoading: feedbackLoading, mutate: reloadFeedback } = useSWR<{ feedback: Feedback[] }>(
    "/api/admin/feedback",
    fetcher,
    { revalidateOnFocus: false }
  );
  useEffect(() => {
    if (feedbackData?.feedback) setFeedback(feedbackData.feedback);
    if (feedbackError) {
      console.error("Error loading feedback:", feedbackError);
      toast.error((feedbackError as any).message || "Failed to load feedback");
    }
  }, [feedbackData, feedbackError]);

  const handleDateRangeChange = (field: "startDate" | "endDate", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setDateRange({ startDate: "", endDate: "" });
    setPeriod("day");
    setActivityFilter("all");
  };

  const filteredActivityData = stats?.activityData.filter((item) => {
    if (activityFilter === "all") return true;
    // You can add more filtering logic here
    return true;
  }) || [];

  const totalPages = Math.max(1, Math.ceil(feedback.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFeedback = feedback.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-600 dark:text-white/60">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">

      {/* Filters */}
      <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-4 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-600 dark:text-white/70 mb-2 block">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange("startDate", e.target.value)}
              className="w-full rounded-lg bg-white border border-black/10 px-3 py-2 text-sm text-slate-900 dark:bg-[#0f1218] dark:border-white/10 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 dark:text-white/70 mb-2 block">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange("endDate", e.target.value)}
              className="w-full rounded-lg bg-white border border-black/10 px-3 py-2 text-sm text-slate-900 dark:bg-[#0f1218] dark:border-white/10 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 dark:text-white/70 mb-2 block">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "day" | "month" | "year")}
              className="w-full rounded-lg bg-white border border-black/10 px-3 py-2 text-sm text-slate-900 dark:bg-[#0f1218] dark:border-white/10 dark:text-white"
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-lg bg-black/5 border border-black/10 text-slate-900 hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 transition-colors text-sm"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-4">
          <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Total Users</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalUsers || 0}</div>
        </div>
        <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-4">
          <div className="text-sm text-slate-600 dark:text-white/60 mb-1">New Users</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.newUsers || 0}</div>
        </div>
        <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-4">
          <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Conversations</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalConversations || 0}</div>
        </div>
        <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-4">
          <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Messages</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalMessages || 0}</div>
        </div>
        <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-4">
          <div className="text-sm text-slate-600 dark:text-white/60 mb-1">Citations</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalCitations || 0}</div>
        </div>
      </div>

      {/* Charts (dynamically loaded) */}
      <AdminCharts data={filteredActivityData} period={period} />

      {/* Feedback Section */}
      <div className="card bg-white dark:bg-[#11161d] border-black/10 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">User Feedback</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600 dark:text-white/60">Total: {feedback.length}</div>
            <button
              onClick={() => reloadFeedback()}
              className="px-3 py-1.5 rounded-lg bg-black/5 border border-black/10 text-slate-900 hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 transition-colors text-sm"
              title="Refresh feedback"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {pagedFeedback.length > 0 ? (
            pagedFeedback.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg bg-black/5 border border-black/10 hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-slate-900 dark:text-white">{item.user || 'Anonymous'}</div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      {"★".repeat(item.rating)}
                      <span className="text-slate-600 dark:text-white/60 ml-1">({item.rating}/5)</span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-white/60">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </div>
                </div>
                {item.message && (
                  <div className="text-slate-800 dark:text-white/80 text-sm mt-2 p-2 bg-black/5 rounded border border-black/10 dark:bg-white/5 dark:border-white/10">
                    {item.message}
                  </div>
                )}
                {!item.message && (
                  <div className="text-slate-500 dark:text-white/40 text-sm mt-2 italic">No feedback message provided</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-slate-600 dark:text-white/60 py-8">No feedback yet</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-slate-900 disabled:opacity-50 dark:bg-[#0f1218] dark:text-white dark:border-white/10"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span className="text-sm text-slate-700 dark:text-white/70">Page {currentPage} / {totalPages}</span>
          <button
            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-slate-900 disabled:opacity-50 dark:bg-[#0f1218] dark:text-white dark:border-white/10"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

