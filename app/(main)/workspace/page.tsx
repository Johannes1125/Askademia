"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlusIcon, TrashIcon, Pencil1Icon, FileTextIcon, ReaderIcon, BookmarkIcon, LayersIcon } from "@radix-ui/react-icons";
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

  const list = useMemo(() => workspaces, [workspaces]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <LayersIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
            <p className="text-sm text-muted">Organize your research notes, drafts, and references</p>
          </div>
        </div>
        <button
          onClick={addWorkspace}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-500/25 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
        >
          <PlusIcon className="h-4 w-4" /> New Workspace
        </button>
      </div>

      {loading ? (
        <div className="h-60 grid place-items-center">
          <div className="text-center">
            <div className="h-10 w-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted">Loading workspaces…</p>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="h-60 grid place-items-center">
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-dashed border-violet-500/30 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <LayersIcon className="h-8 w-8 text-violet-400" />
            </div>
            <p className="text-foreground font-semibold mb-2">No workspaces yet</p>
            <p className="text-sm text-muted">Create your first workspace to start organizing your research.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((w, index) => (
            <Link 
              key={w.id || Math.random()} 
              href={w.id ? `/workspace/${encodeURIComponent(w.id)}` : '#'} 
              className="group block" 
              onClick={(e) => { if (!w.id) e.preventDefault(); }}
            >
              <div className="relative p-5 bg-card border border-theme rounded-2xl hover:shadow-xl hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                {/* Gradient accent bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1 opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ 
                    background: index % 3 === 0 
                      ? 'linear-gradient(90deg, #8B5CF6, #EC4899)' 
                      : index % 3 === 1 
                        ? 'linear-gradient(90deg, #3B82F6, #06B6D4)' 
                        : 'linear-gradient(90deg, #10B981, #34D399)' 
                  }}
                />
                
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
                        className="w-full rounded-lg border border-violet-500/50 bg-input-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                        onClick={(e) => e.preventDefault()}
                      />
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-foreground truncate group-hover:text-violet-400 transition-colors">{w.name}</div>
                        <div className="text-xs text-muted mt-1 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(w.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
                    <button
                      onClick={() => setRenamingId(w.id)}
                      className="h-8 w-8 grid place-items-center rounded-lg bg-subtle-bg border border-theme text-muted hover:text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all"
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-500 border border-amber-500/20">
                          <FileTextIcon className="h-3 w-3" />
                          {n} {n === 1 ? 'note' : 'notes'}
                        </span>
                      )}
                      {d > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-400 border border-blue-500/20">
                          <ReaderIcon className="h-3 w-3" />
                          {d} {d === 1 ? 'draft' : 'drafts'}
                        </span>
                      )}
                      {r > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-400 border border-emerald-500/20">
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
