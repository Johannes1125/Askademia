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
  BarChartIcon,
  GearIcon,
  ExitIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  HamburgerMenuIcon,
  Cross2Icon,
  QuestionMarkIcon,
  Pencil2Icon,
} from "@radix-ui/react-icons";

type NavItem = { href: string; label: string; icon: ReactNode };

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/chat", label: "Chat", icon: <ChatBubbleIcon /> },
  { href: "/citations", label: "Citations", icon: <BookmarkIcon /> },
  { href: "/tools/grammar", label: "Grammar Checker", icon: <CheckCircledIcon /> },
  { href: "/tools/questions", label: "Question Generator", icon: <QuestionMarkIcon /> },
  { href: "/workspace", label: "Workspace", icon: <Pencil2Icon /> },
  { href: "/analytics", label: "Analytics", icon: <BarChartIcon /> },
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
      // Use window.location for a hard redirect to ensure logout happens
      window.location.href = "/login";
    } else {
      toast.error(error.message || "Failed to log out");
      setLoggingOut(false);
      setLogoutModalOpen(false);
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

  // If admin page, just render children without main layout
  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen bg-app text-foreground flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-72 flex flex-col transition-transform duration-300
        border-r border-theme
        bg-card text-foreground
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="px-4 py-4 border-b border-theme">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <div className="h-9 w-9 grid place-items-center rounded-lg" style={{ background: "var(--brand-yellow)" }}>
                <span style={{ color: "var(--app-bg)" }} className="font-bold">A</span>
              </div>
              <div>
                <div className="font-semibold text-foreground">Askademia</div>
                <div className="text-xs text-muted">Research AI</div>
              </div>
            </Link>
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted hover:text-foreground"
              aria-label="Close sidebar"
            >
              <Cross2Icon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-theme bg-card px-3 py-2 focus-within:border-theme focus-within:ring-1 focus-within:ring-theme transition-colors">
            <MagnifyingGlassIcon className="h-4 w-4 text-muted flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted"
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
                  active
                    ? "subtle-bg text-foreground"
                    : "text-muted hover:subtle-bg"
                }`}
              >
                <span className="h-4 w-4">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-theme p-4">
          <div className="grid gap-2">
            <Link href="/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 text-sm text-foreground hover:text-foreground/80 transition-colors">
              <GearIcon /> Settings
            </Link>
            {mounted && (
              <Dialog.Root open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
                <Dialog.Trigger asChild>
                  <button
                    className="flex items-center gap-2 text-left text-sm"
                  >
                    <ExitIcon /> Logout
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-xl bg-card p-6 shadow-xl z-50 border border-theme">
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    Confirm Logout
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted mb-6">
                    Are you sure you want to log out? You will need to sign in again to access your account.
                  </Dialog.Description>
                  <div className="flex gap-3 justify-end">
                    <Dialog.Close asChild>
                      <button
                        disabled={loggingOut}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-theme bg-card text-foreground hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "var(--brand-blue)" }}
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
              className="flex items-center gap-2 text-left text-sm text-muted hover:text-foreground transition-colors"
            >
              <ExitIcon /> Logout
            </button>
          )}
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-theme backdrop-blur bg-card text-foreground flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3">
            {/* Burger menu button for mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-foreground hover:opacity-80 rounded-md p-2 transition-colors"
              aria-label="Toggle sidebar"
            >
              <HamburgerMenuIcon className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="h-7 w-7 grid place-items-center rounded-md" style={{ background: "var(--brand-yellow)" }}>
                <span style={{ color: "var(--app-bg)" }} className="text-sm font-bold">A</span>
              </div>
              <span className="font-semibold text-foreground">Askademia</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="h-9 w-9 grid place-items-center rounded-md border border-theme hover:opacity-80 text-foreground transition-colors"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
            {!user ? (
              <>
                <Link href="/login" className="text-sm px-3 py-1.5 rounded-md border border-theme hover:opacity-80 text-foreground transition-colors">
                  Login
                </Link>
                <Link href="/signup" className="text-sm px-3 py-1.5 rounded-md text-white" style={{ background: "var(--brand-blue)" }}>
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="text-sm text-foreground font-medium">{user.email}</div>
            )}
          </div>
        </header>
        <main className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto p-4 sm:p-6 md:p-8 bg-app">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


