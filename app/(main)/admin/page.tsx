"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
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
} from "recharts";

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
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  useEffect(() => {
    checkAdminAccess();
    loadStats();
    loadFeedback();
  }, []);

  useEffect(() => {
    loadStats();
  }, [dateRange, period]);

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

  const loadStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);
      params.append("period", period);

      const response = await fetch(`/api/admin/stats?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load stats");
      }

      setStats(data);
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast.error(error.message || "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const loadFeedback = async () => {
    try {
      const response = await fetch("/api/admin/feedback");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load feedback");
      }

      setFeedback(data.feedback || []);
    } catch (error: any) {
      console.error("Error loading feedback:", error);
      toast.error(error.message || "Failed to load feedback");
    }
  };

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

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/60">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">

      {/* Filters */}
      <div className="card bg-[#11161d] border-white/10 p-4 space-y-4">
        <h2 className="text-lg font-semibold text-white mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange("startDate", e.target.value)}
              className="w-full rounded-lg bg-[#0f1218] border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-2 block">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange("endDate", e.target.value)}
              className="w-full rounded-lg bg-[#0f1218] border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-2 block">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "day" | "month" | "year")}
              className="w-full rounded-lg bg-[#0f1218] border border-white/10 px-3 py-2 text-sm text-white"
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
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card bg-[#11161d] border-white/10 p-4">
          <div className="text-sm text-white/60 mb-1">Total Users</div>
          <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
        </div>
        <div className="card bg-[#11161d] border-white/10 p-4">
          <div className="text-sm text-white/60 mb-1">New Users</div>
          <div className="text-2xl font-bold text-white">{stats?.newUsers || 0}</div>
        </div>
        <div className="card bg-[#11161d] border-white/10 p-4">
          <div className="text-sm text-white/60 mb-1">Conversations</div>
          <div className="text-2xl font-bold text-white">{stats?.totalConversations || 0}</div>
        </div>
        <div className="card bg-[#11161d] border-white/10 p-4">
          <div className="text-sm text-white/60 mb-1">Messages</div>
          <div className="text-2xl font-bold text-white">{stats?.totalMessages || 0}</div>
        </div>
        <div className="card bg-[#11161d] border-white/10 p-4">
          <div className="text-sm text-white/60 mb-1">Citations</div>
          <div className="text-2xl font-bold text-white">{stats?.totalCitations || 0}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="card bg-[#11161d] border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Activity ({period === "day" ? "Daily" : period === "month" ? "Monthly" : "Yearly"})
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="date" stroke="#ffffff60" />
              <YAxis stroke="#ffffff60" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#11161d",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="conversations"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Conversations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth Chart */}
        <div className="card bg-[#11161d] border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">User Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="date" stroke="#ffffff60" />
              <YAxis stroke="#ffffff60" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#11161d",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="conversations" fill="#10b981" name="Conversations" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="card bg-[#11161d] border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">User Feedback</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-white/60">Total: {feedback.length}</div>
            <button
              onClick={loadFeedback}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm"
              title="Refresh feedback"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {feedback.length > 0 ? (
            feedback.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-white">{item.user || 'Anonymous'}</div>
                    <div className="text-sm text-yellow-400">
                      {"★".repeat(item.rating)}
                      <span className="text-white/60 ml-1">({item.rating}/5)</span>
                    </div>
                  </div>
                  <div className="text-sm text-white/60">
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
                  <div className="text-white/80 text-sm mt-2 p-2 bg-white/5 rounded border border-white/10">
                    {item.message}
                  </div>
                )}
                {!item.message && (
                  <div className="text-white/40 text-sm mt-2 italic">No feedback message provided</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-white/60 py-8">No feedback yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

