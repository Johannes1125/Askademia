"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SunIcon, MoonIcon } from "@radix-ui/react-icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("ask_theme") : null;
    if (stored === "dark") setDark(true);
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("ask_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("ask_theme", "light");
    }
  }, [dark]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b1220]">
      {/* Header */}
      <header className="h-16 border-b border-black/5 dark:border-white/10 bg-white dark:bg-[#0f1218] flex items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-9 w-9 grid place-items-center rounded-lg" style={{ background: "var(--brand-yellow)" }}>
            <span className="text-[#1f2937] font-bold">A</span>
          </div>
          <span className="font-semibold text-black dark:text-white">Askademia</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDark((d) => !d)}
            className="h-9 w-9 grid place-items-center rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
          {pathname !== "/login" && (
            <Link href="/login" className="px-4 py-2 rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-sm">
              Login
            </Link>
          )}
          {pathname !== "/signup" && (
            <Link
              href="/signup"
              className="px-4 py-2 rounded-md text-white text-sm transition-opacity hover:opacity-90"
              style={{ background: "var(--brand-blue)" }}
            >
              Sign Up
            </Link>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

