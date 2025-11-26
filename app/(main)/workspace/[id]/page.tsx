"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { PlusIcon, Pencil1Icon, TrashIcon, CopyIcon, FileTextIcon, ReaderIcon, BookmarkIcon, ArrowLeftIcon, Cross2Icon } from "@radix-ui/react-icons";

export type Section = "notes" | "drafts" | "references";

type Workspace = {
  id: string;
  name: string;
  data: Record<Section, { id: string; title: string; content: string; updatedAt: string; tags?: string[] }[]>;
  created_at: string;
  updated_at: string;
};

type Item = { id: string; title: string; content: string; updatedAt: string; tags?: string[] };

const sectionConfig: Record<Section, { label: string; desc: string; placeholder: string; icon: React.ReactNode; color: string }> = {
  notes: { 
    label: "Notes", 
    desc: "Your notes for this workspace.", 
    placeholder: "Write your note...",
    icon: <FileTextIcon className="h-4 w-4" />,
    color: "from-amber-500 to-orange-500"
  },
  drafts: { 
    label: "Drafts", 
    desc: "Draft content for this workspace.", 
    placeholder: "Draft your content...",
    icon: <ReaderIcon className="h-4 w-4" />,
    color: "from-blue-500 to-indigo-500"
  },
  references: { 
    label: "References", 
    desc: "References and links.", 
    placeholder: "Add reference details...",
    icon: <BookmarkIcon className="h-4 w-4" />,
    color: "from-emerald-500 to-teal-500"
  },
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
  const config = sectionConfig[activeSection];

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

  const removeItem = (itemId: string) => {
    if (!workspace) return;
    const now = new Date().toISOString();
    const next = items.filter((it) => it.id !== itemId);
    const nextData = { ...workspace.data, [activeSection]: next } as Workspace["data"];
    setWorkspace({ ...workspace, data: nextData, updated_at: now });
    queueSave(nextData);
  };

  if (loading) return (
    <div className="h-60 grid place-items-center">
      <div className="text-center">
        <div className="h-10 w-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted">Loading workspace…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <Cross2Icon className="h-8 w-8 text-red-400" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Unable to open workspace</h1>
      <p className="text-sm text-muted mb-6">{error}</p>
      <a href="/workspace" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-theme hover:bg-subtle-bg text-foreground transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back to Workspaces
      </a>
    </div>
  );

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
            <span className="text-white scale-125">{config.icon}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{workspace.name}</h1>
            <div className="text-sm text-muted">
              {saving === 'saving' ? (
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : saving === 'saved' ? (
                <span className="text-emerald-400">✓ All changes saved</span>
              ) : (
                `${items.length} ${label.toLowerCase()}`
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href="/workspace" 
            className="px-4 py-2 text-sm font-medium rounded-xl border border-theme bg-card hover:bg-subtle-bg text-foreground transition-all flex items-center gap-2"
          >
            Back
          </a>
          {activeSection !== 'references' && (
            <button 
              onClick={() => { setEditingId(null); setNewTitle(""); setNewContent(""); setNewOpen(true); }} 
              className="px-4 py-2 text-sm font-medium rounded-xl text-white flex items-center gap-2 shadow-lg transition-all hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${activeSection === 'notes' ? '#F59E0B, #EA580C' : '#3B82F6, #4F46E5'})` }}
            >
              <PlusIcon className="h-4 w-4" /> New {label}
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <nav className="flex gap-2 p-1 bg-subtle-bg/50 rounded-xl w-fit">
        {(Object.keys(sectionConfig) as Section[]).map((s) => {
          const cfg = sectionConfig[s];
          const isActive = activeSection === s;
          const count = workspace.data[s]?.length || 0;
          return (
            <button 
              key={s} 
              onClick={() => setActiveSection(s)} 
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isActive 
                  ? `bg-gradient-to-r ${cfg.color} text-white shadow-lg` 
                  : 'text-muted hover:text-foreground hover:bg-card'
              }`}
            >
              {cfg.icon}
              {cfg.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-xs ${isActive ? 'bg-white/20' : 'bg-subtle-bg'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Cards Grid */}
      {items.length === 0 ? (
        <div className="h-60 grid place-items-center">
          <div className="text-center max-w-xs">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.color} opacity-20 flex items-center justify-center mx-auto mb-4`}>
              <span className="scale-150 opacity-60">{config.icon}</span>
            </div>
            <h3 className="font-medium text-foreground mb-1">No {label.toLowerCase()} yet</h3>
            <p className="text-sm text-muted">
              {activeSection === 'references' 
                ? 'Save citations from the chat or citations tool.' 
                : `Create your first ${label.toLowerCase().slice(0, -1)} to get started.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((it) => {
            const copyText = async (text: string, labelText: string) => {
              try {
                await navigator.clipboard.writeText(text);
                toast.success(`${labelText} copied`);
              } catch (err) {
                console.error('Copy failed', err);
                toast.error('Failed to copy');
              }
            };

            if (activeSection === 'references') {
              const full = it.content || '';
              const inTextMatch = full.match(/In-Text\s*:\s*(.+)/i);
              const inText = inTextMatch ? inTextMatch[1].trim() : '';
              const title = it.title || 'Citation';
              
              return (
                <article 
                  key={it.id} 
                  className="group relative border border-theme rounded-2xl bg-card p-5 hover:border-emerald-500/30 hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors truncate">{title}</div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => copyText(full, 'Citation')} 
                        className="h-8 w-8 grid place-items-center rounded-lg bg-subtle-bg border border-theme text-muted hover:text-emerald-400 hover:border-emerald-500/30 transition-all" 
                        title="Copy citation"
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => removeItem(it.id)} 
                        className="h-8 w-8 grid place-items-center rounded-lg bg-subtle-bg border border-theme text-muted hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all" 
                        title="Delete"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap break-words line-clamp-4">{full}</p>
                  <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between">
                    <span className="text-[11px] text-muted">
                      {new Date(it.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {inText && (
                      <button 
                        onClick={() => copyText(inText, 'In-text')} 
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        Copy in-text
                      </button>
                    )}
                  </div>
                </article>
              );
            }

            const colorClass = activeSection === 'notes' ? 'amber' : 'blue';
            
            return (
              <article 
                key={it.id} 
                className={`group relative border border-theme rounded-2xl bg-card p-5 hover:border-${colorClass}-500/30 hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={`font-semibold text-foreground group-hover:text-${colorClass}-400 transition-colors truncate`}>
                    {it.title || 'Untitled'}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingId(it.id); setNewTitle(it.title); setNewContent(it.content); setNewOpen(true); }} 
                      className={`h-8 w-8 grid place-items-center rounded-lg bg-subtle-bg border border-theme text-muted hover:text-${colorClass}-400 hover:border-${colorClass}-500/30 transition-all`}
                      title="Edit"
                    >
                      <Pencil1Icon className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => removeItem(it.id)} 
                      className="h-8 w-8 grid place-items-center rounded-lg bg-subtle-bg border border-theme text-muted hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all" 
                      title="Delete"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap break-words line-clamp-4">{it.content}</p>
                <div className="mt-3 pt-3 border-t border-theme">
                  <span className="text-[11px] text-muted">
                    {new Date(it.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {newOpen && activeSection !== 'references' && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { setNewOpen(false); setEditingId(null); }}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border border-theme bg-card shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                  <span className="text-white">{config.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{editingId ? `Edit ${label}` : `New ${label}`}</h3>
                  <p className="text-xs text-muted">{config.desc}</p>
                </div>
              </div>
              <button
                onClick={() => { setNewOpen(false); setEditingId(null); }}
                className="p-2 rounded-lg hover:bg-subtle-bg text-muted hover:text-foreground transition-all"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                <input 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  className="w-full rounded-xl border border-theme bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-[var(--brand-blue)] transition-colors" 
                  placeholder={`Add a title for this ${label.toLowerCase()}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Content</label>
                <textarea 
                  rows={8} 
                  value={newContent} 
                  onChange={(e) => setNewContent(e.target.value)} 
                  className="w-full rounded-xl border border-theme bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-[var(--brand-blue)] transition-colors resize-none" 
                  placeholder={config.placeholder}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-theme bg-subtle-bg/50 rounded-b-2xl">
              <button 
                onClick={() => { setNewOpen(false); setEditingId(null); }} 
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-theme bg-card text-foreground hover:bg-input-bg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={editingId ? saveEdit : addItem} 
                className="px-5 py-2.5 text-sm font-medium rounded-xl text-white shadow-lg transition-all hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${activeSection === 'notes' ? '#F59E0B, #EA580C' : '#3B82F6, #4F46E5'})` }}
              >
                {editingId ? 'Save Changes' : `Create ${label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
