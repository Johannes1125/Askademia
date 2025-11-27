// Main App Layout
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "react-toastify";
import * as Dialog from "@radix-ui/react-dialog";
import {
  DashboardIcon,
  ChatBubbleIcon,
  BookmarkIcon,
  CheckCircledIcon,
  ExitIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  HamburgerMenuIcon,
  Cross2Icon,
  QuestionMarkIcon,
  Pencil2Icon,
} from "@radix-ui/react-icons";

type NavItem = { href: string; label: string; icon: ReactNode; gradient: string };

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon className="h-4 w-4" />, gradient: "from-blue-500 to-indigo-600" },
  { href: "/chat", label: "Chat", icon: <ChatBubbleIcon className="h-4 w-4" />, gradient: "from-violet-500 to-purple-600" },
  { href: "/citations", label: "Citations", icon: <BookmarkIcon className="h-4 w-4" />, gradient: "from-emerald-500 to-teal-600" },
  { href: "/tools/grammar", label: "Grammar Checker", icon: <CheckCircledIcon className="h-4 w-4" />, gradient: "from-pink-500 to-rose-600" },
  { href: "/tools/questions", label: "Question Generator", icon: <QuestionMarkIcon className="h-4 w-4" />, gradient: "from-amber-500 to-orange-600" },
  { href: "/workspace", label: "Workspace", icon: <Pencil2Icon className="h-4 w-4" />, gradient: "from-cyan-500 to-blue-600" },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();

  // Don't show main layout for admin pages (they have their own layout)
  const isAdminPage = pathname?.startsWith('/admin') && !pathname?.includes('/login');

  // Ensure Dialog only renders on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success("Logged out successfully");
      window.location.href = "/login";
    } else {
      toast.error(error.message || "Failed to log out");
      setLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith('/admin')) return;
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
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname?.startsWith('/admin')) return;
    document.documentElement.classList.toggle("dark", dark);
    const next = dark ? "dark" : "light";
    localStorage.setItem("ask_theme", next);
    localStorage.setItem("theme", next);
  }, [dark, pathname]);

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-app text-foreground flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300
        border-r border-theme
        bg-gradient-to-b from-card via-card to-card/90 text-foreground
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo Section */}
        <div className="px-5 py-5 border-b border-theme bg-gradient-to-r from-[var(--brand-yellow)]/5 to-transparent">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
              <div 
                className="h-10 w-10 grid place-items-center rounded-xl shadow-lg transition-transform group-hover:scale-105" 
                style={{ background: "linear-gradient(135deg, var(--brand-yellow), #F59E0B)" }}
              >
                <span className="text-lg font-bold" style={{ color: "#1f2937" }}>A</span>
              </div>
              <div>
                <div className="font-bold text-foreground">Askademia</div>
                <div className="text-xs text-muted">Research AI</div>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-subtle-bg text-muted hover:text-foreground transition-all"
              aria-label="Close sidebar"
            >
              <Cross2Icon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-theme bg-input-bg px-4 py-2.5 focus-within:border-[var(--brand-blue)] focus-within:ring-1 focus-within:ring-[var(--brand-blue)]/30 transition-all">
            <MagnifyingGlassIcon className="h-4 w-4 text-muted flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {primaryNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                  active
                    ? "bg-[var(--brand-blue)]/15 text-foreground"
                    : "text-muted hover:text-foreground hover:bg-subtle-bg"
                }`}
              >
                <span className={`transition-colors ${active ? 'text-[var(--brand-blue)]' : ''}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-theme p-3 space-y-1">
          {mounted && (
            <Dialog.Root open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
              <Dialog.Trigger asChild>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-subtle-bg transition-all">
                  <ExitIcon className="h-4 w-4" />
                  Logout
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-2xl bg-card p-6 shadow-2xl z-50 border border-theme animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)]/20 flex items-center justify-center">
                      <ExitIcon className="h-5 w-5 text-[var(--brand-blue)]" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      Confirm Logout
                    </Dialog.Title>
                  </div>
                  <Dialog.Description className="text-sm text-muted mb-6">
                    Are you sure you want to log out? You will need to sign in again to access your account.
                  </Dialog.Description>
                  <div className="flex gap-3 justify-end">
                    <Dialog.Close asChild>
                      <button
                        disabled={loggingOut}
                        className="px-5 py-2.5 text-sm font-medium rounded-xl border border-theme bg-card text-foreground hover:bg-subtle-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="px-5 py-2.5 text-sm font-medium rounded-xl text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--brand-blue)]/25"
                      style={{ background: "linear-gradient(135deg, var(--brand-blue), #4F46E5)" }}
                    >
                      {loggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
          {!mounted && (
            <button
              onClick={() => setLogoutModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-subtle-bg transition-all"
            >
              <ExitIcon className="h-4 w-4" />
              Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-theme backdrop-blur-sm bg-card/80 text-foreground flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2.5 rounded-xl bg-subtle-bg hover:bg-white/10 text-foreground transition-all"
              aria-label="Toggle sidebar"
            >
              <HamburgerMenuIcon className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-3 lg:hidden">
              <div 
                className="h-8 w-8 grid place-items-center rounded-lg shadow-md" 
                style={{ background: "linear-gradient(135deg, var(--brand-yellow), #F59E0B)" }}
              >
                <span className="text-sm font-bold" style={{ color: "#1f2937" }}>A</span>
              </div>
              <span className="font-semibold text-foreground">Askademia</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark((d) => !d)}
              className="h-10 w-10 grid place-items-center rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground transition-all hover:scale-105"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
            {!user ? (
              <div className="flex items-center gap-2">
                <Link 
                  href="/login" 
                  className="text-sm px-4 py-2 rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground transition-all"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="text-sm px-4 py-2 rounded-xl text-white shadow-lg shadow-[var(--brand-blue)]/25 transition-all hover:brightness-110" 
                  style={{ background: "linear-gradient(135deg, var(--brand-blue), #4F46E5)" }}
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-sm text-muted">{user.email}</div>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-indigo-600 grid place-items-center text-white text-sm font-semibold shadow-lg">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto p-4 sm:p-6 md:p-8 bg-app">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
