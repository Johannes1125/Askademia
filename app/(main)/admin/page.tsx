"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import {
  PersonIcon,
  PlusCircledIcon,
  ChatBubbleIcon,
  PaperPlaneIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
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

const buildDateISOParam = (date: string, endOfDay = false) => {
  if (!date) return "";
  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  return `${date}${suffix}`;
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
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const statsQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.startDate) params.append("startDate", buildDateISOParam(dateRange.startDate));
    if (dateRange.endDate) params.append("endDate", buildDateISOParam(dateRange.endDate, true));
    params.append("period", period);
    const queryString = params.toString();
    return `/api/admin/stats${queryString ? `?${queryString}` : ""}`;
  }, [dateRange.startDate, dateRange.endDate, period]);

  const feedbackQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.startDate) params.append("startDate", buildDateISOParam(dateRange.startDate));
    if (dateRange.endDate) params.append("endDate", buildDateISOParam(dateRange.endDate, true));
    const queryString = params.toString();
    return `/api/admin/feedback${queryString ? `?${queryString}` : ""}`;
  }, [dateRange.startDate, dateRange.endDate]);

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

  const { data: feedbackData, error: feedbackError, isLoading: feedbackLoading } = useSWR<{ feedback: Feedback[] }>(
    feedbackQuery,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 15000,
    }
  );
  useEffect(() => {
    if (feedbackData?.feedback) setFeedback(feedbackData.feedback);
    if (feedbackError) {
      console.error("Error loading feedback:", feedbackError);
      toast.error((feedbackError as any).message || "Failed to load feedback");
    }
  }, [feedbackData, feedbackError]);

  const handleDateRangeChange = (field: "startDate" | "endDate", value: string) => {
    setDateRange((prev) => {
      if (!value) return { ...prev, [field]: "" };
      const sanitized = value > today ? today : value;
      const next = { ...prev, [field]: sanitized };
      if (next.startDate && next.endDate && next.startDate > next.endDate) {
        if (field === "startDate") {
          next.endDate = sanitized;
        } else {
          next.startDate = sanitized;
        }
      }
      return next;
    });
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
    <div className="space-y-6 p-6 bg-app text-foreground min-h-full">

      {/* Filters */}
      <div className="bg-card rounded-xl p-6 shadow-sm border border-theme">
        <h2 className="text-xl font-bold text-foreground mb-5">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-muted mb-2 block">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              max={today}
              onChange={(e) => handleDateRangeChange("startDate", e.target.value)}
              className="w-full rounded-lg bg-input-bg border border-theme px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted mb-2 block">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              max={today}
              onChange={(e) => handleDateRangeChange("endDate", e.target.value)}
              className="w-full rounded-lg bg-input-bg border border-theme px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted mb-2 block">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "day" | "month" | "year")}
              className="w-full rounded-lg bg-input-bg border border-theme px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>
        <button
          onClick={resetFilters}
          className="px-5 py-2.5 rounded-lg bg-card border border-theme text-sm font-medium text-muted hover:bg-input-bg transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users Card */}
        <div className="bg-blue-500/20 dark:bg-blue-800/60 backdrop-blur-md rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative border border-blue-300/30 dark:border-blue-700/50">
          <div className="absolute top-4 left-4 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <PersonIcon className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-medium text-gray-800 dark:text-white mb-2 mt-1 pl-14">Total Users</div>
          <div className="text-3xl font-bold text-blue-700 dark:text-white">{stats?.totalUsers || 0}</div>
        </div>

        {/* New Users Card */}
        <div className="bg-green-500/20 dark:bg-green-800/60 backdrop-blur-md rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative border border-green-300/30 dark:border-green-700/50">
          <div className="absolute top-4 left-4 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <PlusCircledIcon className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-medium text-gray-800 dark:text-white mb-2 mt-1 pl-14">New Users</div>
          <div className="text-3xl font-bold text-green-700 dark:text-white">{stats?.newUsers || 0}</div>
        </div>

        {/* Conversations Card */}
        <div className="bg-purple-500/20 dark:bg-purple-800/60 backdrop-blur-md rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative border border-purple-300/30 dark:border-purple-700/50">
          <div className="absolute top-4 left-4 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <ChatBubbleIcon className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-medium text-gray-800 dark:text-white mb-2 mt-1 pl-14">Conversations</div>
          <div className="text-3xl font-bold text-purple-700 dark:text-white">{stats?.totalConversations || 0}</div>
        </div>

        {/* Messages Card */}
        <div className="bg-orange-500/20 dark:bg-orange-800/60 backdrop-blur-md rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative border border-orange-300/30 dark:border-orange-700/50">
          <div className="absolute top-4 left-4 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <PaperPlaneIcon className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-medium text-gray-800 dark:text-white mb-2 mt-1 pl-14">Messages</div>
          <div className="text-3xl font-bold text-orange-700 dark:text-white">{stats?.totalMessages || 0}</div>
        </div>

        {/* Citations Card */}
        <div className="bg-red-500/20 dark:bg-red-800/60 backdrop-blur-md rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative border border-red-300/30 dark:border-red-700/50">
          <div className="absolute top-4 left-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
            <ReaderIcon className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-medium text-gray-800 dark:text-white mb-2 mt-1 pl-14">Citations</div>
          <div className="text-3xl font-bold text-red-700 dark:text-white">{stats?.totalCitations || 0}</div>
        </div>
      </div>

      {/* Charts (dynamically loaded) */}
      <AdminCharts data={filteredActivityData} period={period} />

      {/* Feedback Section */}
      <div className="card bg-card border-theme p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">User Feedback</h2>
          <div className="text-sm text-muted">Total: {feedback.length}</div>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {pagedFeedback.length > 0 ? (
            pagedFeedback.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg bg-input-bg border border-theme hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{item.user || 'Anonymous'}</div>
                    <div className="text-sm text-yellow-600">
                      {"★".repeat(item.rating)}
                      <span className="text-muted ml-1">({item.rating}/5)</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </div>
                </div>
                {item.message ? (
                  <div className="text-sm mt-2 p-2 bg-card rounded border border-theme/60">
                    {item.message}
                  </div>
                ) : (
                  <div className="text-muted text-sm mt-2 italic">No feedback message provided</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-muted py-8">No feedback yet</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            className="px-3 py-1.5 rounded-md border border-theme bg-card text-foreground disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
          <span className="text-sm text-muted">Page {currentPage} / {totalPages}</span>
          <button
            className="px-3 py-1.5 rounded-md border border-theme bg-card text-foreground disabled:opacity-50"
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

