"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SunIcon, MoonIcon } from "@radix-ui/react-icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

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

  // Hide auth layout header for admin login (it has its own header)
  const isAdminLogin = pathname?.startsWith('/admin');

  if (isAdminLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-app text-foreground">
      {/* Header */}
      <header className="h-16 border-b border-theme backdrop-blur-sm bg-card/80 flex items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div 
            className="h-10 w-10 grid place-items-center rounded-xl shadow-lg transition-transform group-hover:scale-105" 
            style={{ background: "linear-gradient(135deg, #FBBF24, #F59E0B)" }}
          >
            <span className="text-lg font-bold text-[#1f2937]">A</span>
          </div>
          <span className="font-bold text-foreground">Askademia</span>
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
          {pathname !== "/login" && (
            <Link 
              href="/login" 
              className="px-5 py-2.5 rounded-xl border border-theme bg-card hover:bg-subtle-bg text-sm font-medium text-foreground transition-all"
            >
              Login
            </Link>
          )}
          {pathname !== "/signup" && (
            <Link
              href="/signup"
              className="px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:brightness-110 shadow-lg shadow-[var(--brand-blue)]/25"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
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
