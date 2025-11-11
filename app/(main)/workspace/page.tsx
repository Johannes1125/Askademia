"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlusIcon, TrashIcon, Pencil1Icon } from "@radix-ui/react-icons";
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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
          <p className="text-sm text-muted">Click a workspace card to open and edit its contents.</p>
        </div>
        <button
          onClick={addWorkspace}
          className="px-3 py-2 rounded-lg bg-[var(--brand-blue)] text-white text-sm font-semibold hover:opacity-90 transition"
        >
          <PlusIcon className="inline h-4 w-4 mr-1" /> New Workspace
        </button>
      </header>

      {loading ? (
        <div className="h-40 grid place-items-center text-muted">Loading workspaces…</div>
      ) : list.length === 0 ? (
        <div className="h-40 grid place-items-center text-muted">No workspaces yet. Create one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((w) => (
            <Link key={w.id || Math.random()} href={w.id ? `/workspace/${encodeURIComponent(w.id)}` : '#'} className="group block" onClick={(e) => { if (!w.id) e.preventDefault(); }}>
              <div className="card p-4 bg-card/80 backdrop-blur border-theme rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {renamingId === w.id ? (
                      <input
                        autoFocus
                        defaultValue={w.name}
                        onBlur={(e) => rename(w.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full rounded-md border border-theme bg-input-bg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/40"
                        onClick={(e) => e.preventDefault()}
                      />
                    ) : (
                      <>
                        <div className="text-base font-semibold text-foreground truncate group-hover:text-white/90">{w.name}</div>
                        <div className="text-[11px] text-muted">Updated {new Date(w.updated_at).toLocaleString()}</div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                    <button
                      onClick={() => setRenamingId(w.id)}
                      className="h-8 w-8 grid place-items-center rounded-md border border-theme text-muted hover:text-foreground transition"
                      title="Rename"
                      aria-label="Rename workspace"
                    >
                      <Pencil1Icon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(w.id)}
                      className="h-8 w-8 grid place-items-center rounded-md border border-theme text-red-400 hover:text-red-300 transition"
                      title="Delete"
                      aria-label="Delete workspace"
                    >
                      <TrashIcon className="h-4 w-4" />
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
                      <div className="mt-4 text-xs italic text-muted">Empty workspace</div>
                    );
                  }
                  return (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {n > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs border border-theme text-foreground/90 bg-subtle-bg">
                          {n} notes
                        </span>
                      )}
                      {d > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs border border-theme text-foreground/90 bg-subtle-bg">
                          {d} drafts
                        </span>
                      )}
                      {r > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs border border-theme text-foreground/90 bg-subtle-bg">
                          {r} refs
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
