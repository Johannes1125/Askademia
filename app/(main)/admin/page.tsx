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
  MixerHorizontalIcon,
  StarFilledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
} from "@radix-ui/react-icons";
const AdminCharts = dynamic(() => import("@/components/admin/AdminCharts"), {
  ssr: false,
  loading: () => (
    <div className="bg-card rounded-2xl p-8 border border-theme">
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  ),
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
      router.replace("/admin/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      toast.error("Admin access required");
      router.replace("/admin/login");
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
    return true;
  }) || [];

  const totalPages = Math.max(1, Math.ceil(feedback.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFeedback = feedback.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full bg-app">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      label: "Total Users", 
      value: stats?.totalUsers || 0, 
      icon: PersonIcon, 
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    { 
      label: "New Users", 
      value: stats?.newUsers || 0, 
      icon: PlusCircledIcon, 
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    { 
      label: "Conversations", 
      value: stats?.totalConversations || 0, 
      icon: ChatBubbleIcon, 
      gradient: "from-violet-500 to-violet-600",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20"
    },
    { 
      label: "Messages", 
      value: stats?.totalMessages || 0, 
      icon: PaperPlaneIcon, 
      gradient: "from-amber-500 to-orange-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    },
    { 
      label: "Citations", 
      value: stats?.totalCitations || 0, 
      icon: ReaderIcon, 
      gradient: "from-red-500 to-red-600",
      bg: "bg-red-500/10",
      border: "border-red-500/20"
    },
  ];

  return (
    <div className="space-y-6 p-6 bg-app text-foreground min-h-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-red-500 to-red-600 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative">
          <h1 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard</h1>
          <p className="text-white/80 text-sm">Monitor and manage your Askademia platform</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-theme">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <MixerHorizontalIcon className="h-5 w-5 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-muted mb-2 block flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              max={today}
              onChange={(e) => handleDateRangeChange("startDate", e.target.value)}
              className="w-full rounded-xl bg-input-bg border border-theme px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted mb-2 block flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              max={today}
              onChange={(e) => handleDateRangeChange("endDate", e.target.value)}
              className="w-full rounded-xl bg-input-bg border border-theme px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted mb-2 block">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "day" | "month" | "year")}
              className="w-full rounded-xl bg-input-bg border border-theme px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all cursor-pointer"
            >
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>
        <button
          onClick={resetFilters}
          className="px-5 py-2.5 rounded-xl bg-subtle-bg border border-theme text-sm font-medium text-muted hover:text-foreground hover:bg-input-bg transition-all"
        >
          Reset Filters
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl p-5 ${card.bg} border ${card.border} hover:shadow-lg transition-all duration-300 group`}
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className="relative">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-sm font-medium text-muted mb-1">{card.label}</div>
              <div className="text-3xl font-bold text-foreground">{card.value.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <AdminCharts data={filteredActivityData} period={period} />

      {/* Feedback Section */}
      <div className="bg-card rounded-2xl border border-theme overflow-hidden">
        <div className="p-6 border-b border-theme bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <StarFilledIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">User Feedback</h2>
                <p className="text-sm text-muted">Recent reviews from users</p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-subtle-bg border border-theme text-sm font-medium text-foreground">
              {feedback.length} total
            </div>
          </div>
        </div>
        
        <div className="space-y-2 p-4 max-h-[600px] overflow-y-auto">
          {pagedFeedback.length > 0 ? (
            pagedFeedback.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-subtle-bg/50 hover:bg-subtle-bg transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                      {(item.user || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{item.user || 'Anonymous'}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <StarFilledIcon 
                            key={i} 
                            className={`w-3.5 h-3.5 ${i < item.rating ? 'text-amber-500' : 'text-muted/30'}`} 
                          />
                        ))}
                        <span className="text-xs text-muted ml-1">({item.rating}/5)</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted flex items-center gap-1.5">
                    <CalendarIcon className="h-3 w-3" />
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </div>
                </div>
                {item.message ? (
                  <div className="mt-3 p-3 rounded-xl bg-input-bg border border-theme text-sm text-foreground">
                    {item.message}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-muted italic">No feedback message provided</div>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <StarFilledIcon className="h-8 w-8 text-amber-500/50" />
              </div>
              <p className="text-muted">No feedback yet</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-theme bg-subtle-bg/50 flex items-center justify-between">
          <div className="text-sm text-muted">
            Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, feedback.length)} of {feedback.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg border border-theme bg-card text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subtle-bg transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="px-4 py-2 rounded-lg bg-card border border-theme text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              className="p-2 rounded-lg border border-theme bg-card text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subtle-bg transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
