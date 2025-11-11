"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { PlusIcon, Pencil1Icon, TrashIcon, CopyIcon } from "@radix-ui/react-icons";

export type Section = "notes" | "drafts" | "references";

type Workspace = {
  id: string;
  name: string;
  data: Record<Section, { id: string; title: string; content: string; updatedAt: string; tags?: string[] }[]>;
  created_at: string;
  updated_at: string;
};

type Item = { id: string; title: string; content: string; updatedAt: string; tags?: string[] };

const sectionConfig: Record<Section, { label: string; desc: string; placeholder: string }> = {
  notes: { label: "Notes", desc: "Your notes for this workspace.", placeholder: "Write your note..." },
  drafts: { label: "Drafts", desc: "Draft content for this workspace.", placeholder: "Draft your content..." },
  references: { label: "References", desc: "References and links.", placeholder: "Add reference details..." },
};

export default function WorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("notes");
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/workspace/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Failed to load workspace'); setWorkspace(null); return; }
      setWorkspace(data.workspace);
    } catch (e: any) { setError(e.message || 'Failed to load workspace'); setWorkspace(null); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Handle deep-link editing from query params (?section=notes&edit=<itemId>)
  useEffect(() => {
    if (!workspace) return;
    const sectionParam = searchParams.get('section') as Section | null;
    const editParam = searchParams.get('edit');
    if (sectionParam && ['notes','drafts','references'].includes(sectionParam)) {
      setActiveSection(sectionParam);
    }
    if (editParam) {
      const all = workspace.data[(sectionParam && ['notes','drafts','references'].includes(sectionParam) ? sectionParam : activeSection) as Section];
      const found = all.find(i => i.id === editParam);
      if (found) {
        setEditingId(found.id);
        setNewTitle(found.title);
        setNewContent(found.content);
        setNewOpen(true);
      }
    }
  }, [workspace, searchParams]);

  const items: Item[] = useMemo(() => workspace?.data?.[activeSection] || [], [workspace, activeSection]);
  const label = sectionConfig[activeSection].label;

  const queueSave = (nextData: Workspace["data"]) => {
    if (!workspace) return;
    setSaving("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/workspace/${workspace.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: nextData })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
        setWorkspace(data.workspace);
        setSaving("saved");
      } catch (e: any) {
        setSaving("idle"); toast.error(e.message || 'Failed to save');
      }
    }, 600);
  };

  const addItem = () => {
    if (!workspace) return;
    if (!newTitle.trim() && !newContent.trim()) { toast.error('Add title or content'); return; }
    const now = new Date().toISOString();
    const newItem: Item = { id: crypto.randomUUID(), title: newTitle.trim() || `${label} ${items.length + 1}`, content: newContent.trim(), updatedAt: now };
    const nextData = { ...workspace.data, [activeSection]: [newItem, ...items] } as Workspace["data"];
    setWorkspace({ ...workspace, data: nextData, updated_at: now });
    setNewTitle(""); setNewContent(""); setNewOpen(false); setEditingId(null);
    queueSave(nextData);
  };

  const saveEdit = () => {
    if (!workspace || !editingId) return;
    if (!newTitle.trim() && !newContent.trim()) { toast.error('Add title or content'); return; }
    const now = new Date().toISOString();
    const next = items.map((it) => it.id === editingId ? { ...it, title: newTitle.trim(), content: newContent.trim(), updatedAt: now } : it);
    const nextData = { ...workspace.data, [activeSection]: next } as Workspace["data"];
    setWorkspace({ ...workspace, data: nextData, updated_at: now });
    setNewTitle(""); setNewContent(""); setNewOpen(false); setEditingId(null);
    queueSave(nextData);
  };

  const updateItem = (itemId: string, patch: Partial<Item>) => {
    if (!workspace) return;
    const now = new Date().toISOString();
    const next = items.map((it) => it.id === itemId ? { ...it, ...patch, updatedAt: now } : it);
    const nextData = { ...workspace.data, [activeSection]: next } as Workspace["data"];
    setWorkspace({ ...workspace, data: nextData, updated_at: now });
    queueSave(nextData);
  };

  const removeItem = (itemId: string) => {
    if (!workspace) return;
    const now = new Date().toISOString();
    const next = items.filter((it) => it.id !== itemId);
    const nextData = { ...workspace.data, [activeSection]: next } as Workspace["data"];
    setWorkspace({ ...workspace, data: nextData, updated_at: now });
    queueSave(nextData);
  };

  if (loading) return <div className="h-40 grid place-items-center text-muted">Loading…</div>;
  if (error) return (
    <div className="max-w-xl mx-auto text-center py-16">
      <h1 className="text-xl font-semibold text-foreground mb-2">Unable to open workspace</h1>
      <p className="text-sm text-muted mb-6">{error}</p>
      <a href="/workspace" className="px-3 py-2 rounded-lg border border-theme hover:bg-subtle-bg text-foreground transition-colors">Back to Workspaces</a>
    </div>
  );
  if (!workspace) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{workspace.name}</h1>
          <p className="text-sm text-muted">{saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'All changes saved' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/workspace" className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-subtle-bg text-foreground transition-colors">Back</a>
          {activeSection !== 'references' && (
            <button onClick={()=>{ setEditingId(null); setNewOpen(true); }} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--brand-blue)] text-white flex items-center gap-1"><PlusIcon className="h-4 w-4"/> New {label}</button>
          )}
        </div>
      </div>

      <nav className="flex gap-2">
        {(Object.keys(sectionConfig) as Section[]).map((s) => (
          <button key={s} onClick={() => setActiveSection(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === s ? 'bg-[var(--brand-blue)] text-white' : 'bg-subtle-bg text-foreground hover:bg-white/10'}`}>{sectionConfig[s].label}</button>
        ))}
      </nav>

      {/* Cards grid */}
      {items.length === 0 ? (
        <div className="h-40 grid place-items-center text-muted text-sm">No {label.toLowerCase()} yet</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((it) => {
            if (activeSection === 'references') {
              const full = it.content || '';
              const inTextMatch = full.match(/In-Text\s*:\s*(.+)/i);
              const inText = inTextMatch ? inTextMatch[1].trim() : '';
              const title = it.title || 'Citation';
              const copyText = async (text: string, label: string) => {
                try {
                  await navigator.clipboard.writeText(text);
                  toast.success(`${label} copied`);
                } catch (err) {
                  console.error('Copy failed', err);
                  toast.error('Failed to copy');
                }
              };
              return (
                <article key={it.id} className="border border-theme rounded-xl bg-subtle-bg/40 p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold truncate text-foreground">{title}</div>
                    <div className="flex gap-1">
                      <button onClick={()=>copyText(full, 'Citation')} className="h-8 w-8 grid place-items-center rounded-md border border-theme text-muted hover:text-foreground cursor-pointer" title="Copy citation" aria-label="Copy citation" role="button">
                        <CopyIcon className="h-4 w-4" />
                      </button>
                      {inText && (
                        <button onClick={()=>copyText(inText, 'In-text')} className="h-8 w-8 grid place-items-center rounded-md border border-theme text-muted hover:text-foreground cursor-pointer" title="Copy in-text" aria-label="Copy in-text" role="button">
                          <CopyIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={()=>removeItem(it.id)} className="h-8 w-8 grid place-items-center rounded-md border border-theme text-red-400 cursor-pointer" title="Delete" aria-label="Delete citation" role="button">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-foreground/85 whitespace-pre-wrap break-words">{full}</p>
                  <div className="mt-2 text-[11px] text-muted">Updated {new Date(it.updatedAt).toLocaleString()}</div>
                </article>
              );
            }
            return (
              <article key={it.id} className="border border-theme rounded-xl bg-subtle-bg/40 p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold truncate text-foreground">{it.title || 'Untitled'}</div>
                <div className="flex gap-1">
                  <button onClick={()=>{ setEditingId(it.id); setNewTitle(it.title); setNewContent(it.content); setNewOpen(true); }} className="h-8 w-8 grid place-items-center rounded-md border border-theme"><Pencil1Icon className="h-4 w-4"/></button>
                  <button onClick={()=>removeItem(it.id)} className="h-8 w-8 grid place-items-center rounded-md border border-theme text-red-400"><TrashIcon className="h-4 w-4"/></button>
                </div>
                </div>
                <p className="mt-2 text-sm text-foreground/85 whitespace-pre-wrap break-words">{it.content}</p>
                <div className="mt-2 text-[11px] text-muted">Updated {new Date(it.updatedAt).toLocaleString()}</div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create/Edit item modal */}
      {newOpen && activeSection !== 'references' && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl border border-theme bg-card p-5">
            <div className="text-lg font-semibold text-foreground mb-1">{editingId ? `Edit ${label}` : `New ${label}`}</div>
            <p className="text-xs text-muted mb-4">{sectionConfig[activeSection].desc}</p>
            <label className="text-xs font-medium text-muted mb-1">Title</label>
            <input value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} className="mb-3 w-full rounded-lg border border-theme bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/50" placeholder={`Add a title for this ${label.toLowerCase()}`}/>
            <label className="text-xs font-medium text-muted mb-1">Details</label>
            <textarea rows={8} value={newContent} onChange={(e)=>setNewContent(e.target.value)} className="w-full rounded-lg border border-theme bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/50 resize-none" placeholder={sectionConfig[activeSection].placeholder}/>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>{ setNewOpen(false); setEditingId(null); }} className="px-3 py-2 rounded-md border border-theme text-foreground">Cancel</button>
              <button onClick={editingId ? saveEdit : addItem} className="px-3 py-2 rounded-md bg-[var(--brand-blue)] text-white">{editingId ? 'Save Changes' : `Save ${label}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
