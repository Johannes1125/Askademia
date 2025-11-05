"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Check if user is admin
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        toast.error("Access denied. Admin privileges required.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      toast.success("Logged in as admin!");
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-[#0b1220]">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Admin Login</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Restricted access - Enter your admin credentials</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-black dark:text-white mb-2 block">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-black dark:text-white">Password</label>
                <Link href="#" className="text-sm text-[var(--brand-blue)] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--brand-blue)" }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <div className="text-sm text-center text-gray-600 dark:text-gray-400">
            Go back to{" "}
            <Link href="/login" className="text-[var(--brand-blue)] hover:underline font-medium">
              User Login
            </Link>
          </div>
        </div>
      </div>
      {/* Right: Graphic */}
      <div className="hidden lg:flex items-center justify-center p-8 bg-[var(--brand-white)] dark:bg-[#11161d]">
        <div className="w-full max-w-md">
          <div className="aspect-square rounded-lg bg-gradient-to-br from-[var(--brand-yellow)]/20 to-[var(--brand-blue)]/20 dark:from-[var(--brand-yellow)]/10 dark:to-[var(--brand-blue)]/10 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-24 w-24 mx-auto rounded-full bg-[var(--brand-blue)]/20 dark:bg-[var(--brand-blue)]/10 flex items-center justify-center">
                <div className="h-16 w-16 rounded-lg bg-[var(--brand-yellow)] dark:bg-[var(--brand-yellow)]/80 flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#1f2937]">A</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-1 w-32 mx-auto bg-[var(--brand-yellow)]/30 dark:bg-[var(--brand-yellow)]/20 rounded-full"></div>
                <div className="h-1 w-24 mx-auto bg-[var(--brand-blue)]/30 dark:bg-[var(--brand-blue)]/20 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


