"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlusIcon, TrashIcon, Pencil1Icon, FileTextIcon, ReaderIcon, BookmarkIcon } from "@radix-ui/react-icons";
import { toast } from "react-toastify";

export type Workspace = {
  id: string;
  name: string;
  data: { notes: any[]; drafts: any[]; references: any[] };
  created_at: string;
  updated_at: string;
};

export default function WorkspaceIndexPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/workspace', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setWorkspaces(data.workspaces || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const addWorkspace = async () => {
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Workspace ${workspaces.length + 1}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setWorkspaces((prev) => [data.workspace, ...prev]);
      toast.success('Workspace created');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create workspace');
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/workspace/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      toast.info('Workspace removed');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete workspace');
    }
  };

  const rename = async (id: string, name: string) => {
    const trimmed = (name || '').trim() || 'Untitled Workspace';
    try {
      const res = await fetch(`/api/workspace/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename');
      setWorkspaces((prev) => prev.map((w) => (w.id === id ? data.workspace : w)));
      setRenamingId(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to rename');
    }
  };

  const totalItems = (w: Workspace) =>
    (w.data?.notes?.length || 0) + (w.data?.drafts?.length || 0) + (w.data?.references?.length || 0);

  const list = useMemo(() => workspaces, [workspaces]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
          <p className="text-sm text-muted mt-1">Organize your research notes, drafts, and references</p>
        </div>
        <button
          onClick={addWorkspace}
          className="px-4 py-2.5 rounded-xl bg-[var(--brand-blue)] text-white text-sm font-medium hover:brightness-110 transition-all shadow-lg shadow-[var(--brand-blue)]/20 flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" /> New Workspace
        </button>
      </header>

      {loading ? (
        <div className="h-60 grid place-items-center">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-[var(--brand-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Loading workspaces…</p>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="h-60 grid place-items-center">
          <div className="text-center p-8 rounded-2xl bg-subtle-bg/50 border border-dashed border-theme max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-blue)]/10 flex items-center justify-center mx-auto mb-4">
              <FileTextIcon className="h-6 w-6 text-[var(--brand-blue)]" />
            </div>
            <p className="text-foreground font-medium mb-1">No workspaces yet</p>
            <p className="text-sm text-muted">Create your first workspace to start organizing your research.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((w) => (
            <Link key={w.id || Math.random()} href={w.id ? `/workspace/${encodeURIComponent(w.id)}` : '#'} className="group block" onClick={(e) => { if (!w.id) e.preventDefault(); }}>
              <div className="relative p-5 bg-card border border-theme rounded-2xl hover:shadow-xl hover:border-[var(--brand-blue)]/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                {/* Subtle gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--brand-blue)] via-blue-400 to-[var(--brand-blue)] opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {renamingId === w.id ? (
                      <input
                        autoFocus
                        defaultValue={w.name}
                        onBlur={(e) => rename(w.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full rounded-lg border border-theme bg-input-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/40"
                        onClick={(e) => e.preventDefault()}
                      />
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-foreground truncate group-hover:text-[var(--brand-blue)] transition-colors">{w.name}</div>
                        <div className="text-xs text-muted mt-0.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(w.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
                    <button
                      onClick={() => setRenamingId(w.id)}
                      className="h-8 w-8 grid place-items-center rounded-lg bg-subtle-bg border border-theme text-muted hover:text-[var(--brand-blue)] hover:border-[var(--brand-blue)]/30 transition-all"
                      title="Rename"
                      aria-label="Rename workspace"
                    >
                      <Pencil1Icon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(w.id)}
                      className="h-8 w-8 grid place-items-center rounded-lg bg-subtle-bg border border-theme text-muted hover:text-red-400 hover:border-red-400/30 hover:bg-red-500/10 transition-all"
                      title="Delete"
                      aria-label="Delete workspace"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {(() => {
                  const n = (w.data?.notes?.length || 0);
                  const d = (w.data?.drafts?.length || 0);
                  const r = (w.data?.references?.length || 0);
                  const total = n + d + r;
                  if (total === 0) {
                    return (
                      <div className="mt-4 py-3 px-4 rounded-xl bg-subtle-bg/50 border border-dashed border-theme">
                        <p className="text-xs text-muted text-center">No items yet</p>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {n > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <FileTextIcon className="h-3 w-3" />
                          {n} {n === 1 ? 'note' : 'notes'}
                        </span>
                      )}
                      {d > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <ReaderIcon className="h-3 w-3" />
                          {d} {d === 1 ? 'draft' : 'drafts'}
                        </span>
                      )}
                      {r > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <BookmarkIcon className="h-3 w-3" />
                          {r} {r === 1 ? 'ref' : 'refs'}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
