"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { SunIcon, MoonIcon, EyeOpenIcon, EyeClosedIcon, LockClosedIcon } from "@radix-ui/react-icons";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [dark, setDark] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Check if already logged in as admin
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          // Already logged in as admin, redirect to dashboard
          router.replace("/admin");
          return;
        }
      }
      setCheckingAuth(false);
    };

    checkExistingSession();
  }, [router, supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("ask_theme") ?? localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
      return;
    }
    if (stored === "light") {
      setDark(false);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefersDark);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ask_theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

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
      // Use replace to prevent going back to login
      router.replace("/admin");
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-foreground">
      {/* Header */}
      <header className="h-16 border-b border-theme backdrop-blur-sm bg-card/80 flex items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div 
            className="h-10 w-10 grid place-items-center rounded-xl shadow-lg transition-transform group-hover:scale-105" 
            style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
          >
            <span className="text-lg font-bold text-white">A</span>
          </div>
          <div>
            <span className="font-bold text-foreground">Admin Portal</span>
            <span className="text-xs text-muted block">Askademia</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDark((prev) => !prev)}
            className="h-10 w-10 grid place-items-center rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground transition-all hover:scale-105"
            aria-label="Toggle color theme"
            title="Toggle color theme"
          >
            {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
          <Link 
            href="/login" 
            className="px-5 py-2.5 rounded-xl border border-theme bg-card hover:bg-subtle-bg text-sm font-medium text-foreground transition-all"
          >
            User Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="flex items-center justify-center p-8 bg-app">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <LockClosedIcon className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Admin Login</h1>
              <p className="text-sm text-muted">Restricted access - Enter your admin credentials</p>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-theme bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-theme bg-input-bg px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground focus:outline-none transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOpenIcon className="h-5 w-5" />
                    ) : (
                      <EyeClosedIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/25"
                style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
              >
                {loading ? "Logging in..." : "Login to Admin Panel"}
              </button>
            </form>
            <div className="text-sm text-center text-muted">
              Go back to{" "}
              <Link href="/login" className="text-red-500 hover:underline font-medium">
                User Login
              </Link>
            </div>
          </div>
        </div>
        {/* Right: Graphic */}
        <div className="hidden lg:flex items-center justify-center p-8 bg-card">
          <div className="w-full max-w-md">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="h-24 w-24 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                  <div 
                    className="h-16 w-16 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
                  >
                    <LockClosedIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-1 w-32 mx-auto bg-red-500/30 rounded-full"></div>
                  <div className="h-1 w-24 mx-auto bg-red-600/20 rounded-full"></div>
                </div>
                <p className="text-sm text-muted mt-4">Admin Access Only</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
