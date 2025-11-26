"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import {
  DashboardIcon,
  GearIcon,
  ExitIcon,
  MagnifyingGlassIcon,
  HamburgerMenuIcon,
  Cross2Icon,
  SunIcon,
  MoonIcon,
  ClockIcon,
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("theme");
      const a = localStorage.getItem("ask_theme");
      return t === "dark" || (!t && a === "dark");
    }
    return false;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
      localStorage.setItem("ask_theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);

  useEffect(() => {
    if (pathname?.includes('/login')) {
      setLoading(false);
      return;
    }
    checkAdminAccess();
  }, [pathname]);

  // Prevent back navigation after login - replace history state
  useEffect(() => {
    if (!loading && user) {
      // Replace current state so user can't go back to login
      window.history.replaceState(null, '', pathname);
      
      // Push a new state and listen for popstate
      const handlePopState = () => {
        // If trying to go back, push forward again
        window.history.pushState(null, '', pathname);
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [loading, user, pathname]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
      toast.error("Admin access required");
      router.replace("/admin/login");
      return;
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success("Logged out successfully");
      // Use replace to clear history
      window.location.replace("/admin/login");
    } else {
      toast.error(error.message || "Failed to log out");
      setLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  if (pathname?.includes('/login')) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-app">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Checking admin access...</p>
        </div>
      </div>
    );
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="h-screen bg-app text-foreground flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Admin Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300
        border-r border-theme bg-gradient-to-b from-card via-card to-card/90 text-foreground ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo Section */}
        <div className="px-5 py-5 border-b border-theme bg-gradient-to-r from-red-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
              <div 
                className="h-10 w-10 grid place-items-center rounded-xl shadow-lg transition-transform group-hover:scale-105" 
                style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
              >
                <span className="text-lg font-bold text-white">A</span>
              </div>
              <div>
                <div className="font-bold text-foreground">Admin Panel</div>
                <div className="text-xs text-muted">Askademia</div>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-subtle-bg text-muted hover:text-foreground transition-all"
              aria-label="Close sidebar"
            >
              <Cross2Icon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-theme bg-input-bg px-4 py-2.5 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/30 transition-all">
            <MagnifyingGlassIcon className="h-4 w-4 text-muted flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent border-0 outline-0 text-sm text-foreground placeholder:text-muted"
            />
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <Link
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
              pathname === "/admin"
                ? "bg-red-500/15 text-foreground"
                : "text-muted hover:text-foreground hover:bg-subtle-bg"
            }`}
          >
            <span className={`transition-colors ${pathname === "/admin" ? 'text-red-500' : ''}`}>
              <DashboardIcon className="h-4 w-4" />
            </span>
            Dashboard
          </Link>
        </nav>

        {/* Footer */}
        <div className="border-t border-theme p-3 space-y-1">
          <Link 
            href="/settings" 
            onClick={() => setSidebarOpen(false)} 
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-subtle-bg transition-all"
          >
            <GearIcon className="h-4 w-4" />
            Settings
          </Link>
          
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
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <ExitIcon className="h-5 w-5 text-red-500" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      Confirm Logout
                    </Dialog.Title>
                  </div>
                  <Dialog.Description className="text-sm text-muted mb-6">
                    Are you sure you want to log out? You will need to sign in again to access the admin panel.
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
                      className="px-5 py-2.5 text-sm font-medium rounded-xl text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/25"
                      style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-theme backdrop-blur-sm bg-card/80 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2.5 rounded-xl bg-subtle-bg hover:bg-white/10 text-foreground transition-all"
              aria-label="Toggle sidebar"
            >
              <HamburgerMenuIcon className="h-5 w-5" />
            </button>
            <Link href="/admin" className="flex items-center gap-3 md:hidden">
              <div 
                className="h-8 w-8 grid place-items-center rounded-lg shadow-md" 
                style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
              >
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span className="font-semibold text-foreground">Admin</span>
            </Link>
            
            {/* Time Display */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-subtle-bg border border-theme">
              <ClockIcon className="h-4 w-4 text-red-500" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{formatTime(currentTime)}</span>
                <span className="text-xs text-muted">{formatDate(currentTime)}</span>
              </div>
            </div>
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
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-sm text-muted">{user.email}</div>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 grid place-items-center text-white text-sm font-semibold shadow-lg">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-app">{children}</main>
      </div>
    </div>
  );
}
