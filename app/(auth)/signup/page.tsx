"use client";

import Link from "next/link";

export default function UserSignupPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-[#0b1220]">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Create your account</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Enter your information below to create your account</p>
          </div>
          <form className="space-y-5">
            <div>
              <label className="text-sm font-medium text-black dark:text-white mb-2 block">Full Name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-black dark:text-white mb-2 block">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                placeholder="m@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-black dark:text-white mb-2 block">Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--brand-blue)" }}
            >
              Sign Up
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
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Sign up with GitHub
          </button>
          <div className="text-sm text-center text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--brand-blue)] hover:underline font-medium">
              Login
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


