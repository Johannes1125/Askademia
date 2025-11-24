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

  return (
    <div className="min-h-screen bg-app text-foreground">
      {/* Header */}
      <header className="h-16 border-b border-theme bg-card flex items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-9 w-9 grid place-items-center rounded-lg" style={{ background: "var(--brand-yellow)" }}>
            <span className="text-[#1f2937] dark:text-white font-bold">A</span>
          </div>
          <span className="font-semibold text-foreground">Askademia</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDark((prev) => !prev)}
            className="h-9 w-9 grid place-items-center rounded-md border border-theme hover:bg-subtle-bg text-foreground transition-colors"
            aria-label="Toggle color theme"
            title="Toggle color theme"
          >
            {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
          {pathname !== "/login" && (
            <Link href="/login" className="px-4 py-2 rounded-md border border-theme hover:bg-subtle-bg text-sm text-foreground transition-colors">
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
