// Main App Layout
"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  DashboardIcon,
  ChatBubbleIcon,
  BookmarkIcon,
  CheckCircledIcon,
  BarChartIcon,
  GearIcon,
  ExitIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  HamburgerMenuIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";

type NavItem = { href: string; label: string; icon: ReactNode };

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/chat", label: "Chat", icon: <ChatBubbleIcon /> },
  { href: "/citations", label: "Citations", icon: <BookmarkIcon /> },
  { href: "/tools/grammar", label: "Grammar Checker", icon: <CheckCircledIcon /> },
  { href: "/analytics", label: "Analytics", icon: <BarChartIcon /> },
  { href: "/admin", label: "Admin Panel", icon: <LockClosedIcon /> },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      // Use window.location for a hard redirect to ensure logout happens
      window.location.href = "/login";
    }
  };

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
    <div className="h-screen bg-[var(--brand-white)] text-[var(--foreground)] flex dark:bg-[#0b1220] dark:text-[#e5e7eb] overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-black/5 dark:border-white/10 bg-[#0f1218] text-white transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <div className="h-9 w-9 grid place-items-center rounded-lg" style={{ background: "var(--brand-yellow)" }}>
                <span className="text-[#1f2937] font-bold">A</span>
              </div>
              <div>
                <div className="font-semibold">Askademia</div>
                <div className="text-xs text-white/60">Research AI</div>
              </div>
            </Link>
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-white/80 hover:text-white"
              aria-label="Close sidebar"
            >
              <Cross2Icon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md bg-white/5 px-3 py-2">
            <MagnifyingGlassIcon className="h-4 w-4 text-white/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent outline-none text-sm w-full placeholder:text-white/50"
            />
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-1">
          {primaryNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                }`}
              >
                <span className="h-4 w-4">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="grid gap-2">
            <Link href="/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <GearIcon /> Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-left text-sm text-white/80 hover:text-white"
            >
              <ExitIcon /> Logout
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-[#0f1218] backdrop-blur flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Burger menu button for mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-md p-2"
              aria-label="Toggle sidebar"
            >
              <HamburgerMenuIcon className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="h-7 w-7 grid place-items-center rounded-md" style={{ background: "var(--brand-yellow)" }}>
                <span className="text-[#1f2937] text-sm font-bold">A</span>
              </div>
              <span className="font-semibold">Askademia</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="h-9 w-9 grid place-items-center rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
            {!user ? (
              <>
                <Link href="/login" className="text-sm px-3 py-1.5 rounded-md border border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                  Login
                </Link>
                <Link href="/signup" className="text-sm px-3 py-1.5 rounded-md text-white" style={{ background: "var(--brand-blue)" }}>
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="text-sm text-black dark:text-white">{user.email}</div>
            )}
          </div>
        </header>
        <main className="flex-1 h-[calc(100vh-3.5rem)] overflow-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}


