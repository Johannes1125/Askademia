"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import {
  DashboardIcon,
  BarChartIcon,
  GearIcon,
  ExitIcon,
  MagnifyingGlassIcon,
  HamburgerMenuIcon,
  Cross2Icon,
  SunIcon,
  MoonIcon,
} from "@radix-ui/react-icons";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "@/lib/hooks/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("theme");
      const a = localStorage.getItem("ask_theme");
      return t === "dark" || (!t && a === "dark");
    }
    return false;
  });

  // Ensure Dialog only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync dark mode class with document
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
      localStorage.setItem("ask_theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);

  useEffect(() => {
    // Don't check admin access on login page (it's in auth layout, not this one)
    if (pathname?.includes('/login')) {
      setLoading(false);
      return;
    }
    checkAdminAccess();
  }, [pathname]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/admin/login");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
      toast.error("Admin access required");
      router.push("/admin/login");
      return;
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success("Logged out successfully");
      window.location.href = "/admin/login";
    } else {
      toast.error(error.message || "Failed to log out");
      setLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  // Don't show loading on login page
  if (pathname?.includes('/login')) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0f1219] text-slate-900">
        <div className="text-black/60 dark:text-white/60">Checking admin access...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-app text-foreground flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Admin Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300
        border-r border-gray-200 dark:border-white/10 bg-card text-foreground ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <div className="h-9 w-9 grid place-items-center rounded-lg" style={{ background: "var(--brand-yellow)" }}>
                <span className="text-[#1f2937] font-bold">A</span>
              </div>
              <div>
                <div className="font-semibold text-foreground">Askademia</div>
                <div className="text-xs text-muted">Research AI</div>
              </div>
            </Link>
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-600 dark:text-white/80 hover:text-gray-900 dark:hover:text-white"
              aria-label="Close sidebar"
            >
              <Cross2Icon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md px-3 py-2 bg-gray-50 dark:bg-white/5 text-foreground border border-gray-200 dark:border-white/10">
            <MagnifyingGlassIcon className="h-4 w-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent border-0 outline-0 text-sm text-foreground placeholder:text-muted"
            />
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <Link
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg transition-colors ${
              pathname === "/admin"
                ? "bg-[var(--brand-blue)]/15 text-[var(--brand-blue)]"
                : "text-muted hover:text-foreground hover:bg-input-bg"
            }`}
          >
            <DashboardIcon /> Dashboard
          </Link>
        </nav>

        <div className="mt-auto border-t border-gray-200 dark:border-white/10 p-4">
          <div className="grid gap-2">
            <Link 
              href="/settings" 
              onClick={() => setSidebarOpen(false)} 
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
            >
              <GearIcon /> Settings
            </Link>
            {mounted && (
              <Dialog.Root open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
                <Dialog.Trigger asChild>
                  <button className="flex items-center gap-2 text-left text-sm text-muted hover:text-foreground">
                    <ExitIcon /> Logout
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-xl bg-card p-6 shadow-xl z-50 border border-theme">
                      <Dialog.Title className="text-lg font-semibold text-foreground mb-2">
                      Confirm Logout
                    </Dialog.Title>
                      <Dialog.Description className="text-sm text-muted mb-6">
                      Are you sure you want to log out? You will need to sign in again to access the admin panel.
                    </Dialog.Description>
                    <div className="flex gap-3 justify-end">
                      <Dialog.Close asChild>
                        <button
                          disabled={loggingOut}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-theme bg-card text-foreground hover:bg-input-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex items-center gap-2 text-left text-sm text-muted hover:text-foreground"
                  >
                <ExitIcon /> Logout
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-theme bg-card backdrop-blur flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Burger menu button for mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-md p-2"
              aria-label="Toggle sidebar"
            >
              <HamburgerMenuIcon className="h-5 w-5" />
            </button>
            <Link href="/admin" className="flex items-center gap-3">
              <div className="h-8 w-8 grid place-items-center rounded-lg" style={{ background: "var(--brand-yellow)" }}>
                <span className="text-[#1f2937] font-bold text-sm">A</span>
              </div>
              <span className="font-semibold text-foreground">Askademia</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="h-9 w-9 grid place-items-center rounded-md border border-theme hover:bg-input-bg text-foreground"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
            {user && (
              <div className="text-sm text-foreground/80">{user.email}</div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-app">{children}</main>
      </div>
    </div>
  );
}

