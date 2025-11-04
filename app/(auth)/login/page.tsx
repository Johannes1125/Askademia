"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function UserLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Logged in successfully!");
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      toast.error(error.message || "Failed to sign in with Google. Please make sure Google OAuth is enabled in Supabase.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-[#0b1220]">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Login to your account</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Enter your email below to login to your account</p>
          </div>
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-black dark:text-white mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                placeholder="m@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-black dark:text-white">Password</label>
                <Link href="/forgot-password" className="text-sm text-[var(--brand-blue)] hover:underline">
                  Forgot your password?
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
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#0b1220] px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Login with Google
          </button>
          <div className="text-sm text-center text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Link href="/signup" className="text-[var(--brand-blue)] hover:underline font-medium">
              Sign up
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


