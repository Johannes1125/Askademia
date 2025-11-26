"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { BookmarkIcon, Cross2Icon, CheckIcon } from "@radix-ui/react-icons";

type Section = 'notes' | 'drafts' | 'references';
type ModalVariant = 'centered' | 'fullpage';

export function WorkspaceQuickAddButton({ derive, className, label = 'Save to Workspace', children, variant = 'centered' }: {
  derive: () => { title: string; content: string; section?: Section; tags?: string[] };
  className?: string;
  label?: string;
  children?: ReactNode;
  variant?: ModalVariant;
}) {
  const initial = derive();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [section, setSection] = useState<Section>(initial.section || 'notes');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/workspace');
        const data = await res.json();
        const list = (data.workspaces || []).map((w: any) => ({ id: w.id, name: w.name }));
        setWorkspaces(list);
        if (list[0]) setWorkspaceId(list[0].id);
      } catch (err) {
        console.error(err);
        toast.error('Unable to load workspaces');
      }
    }
    load();
  }, []);

  const onSave = async () => {
    try {
      if (!workspaceId) return;
      setLoading(true);
      const payload = derive();
      const res = await fetch(`/api/workspace/${workspaceId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, title: payload.title, content: payload.content, tags: payload.tags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Saved to workspace');
      setOpen(false);
      if (data?.item?.id) {
        if (section === 'references') {
          router.push(`/workspace/${workspaceId}?section=references`);
        } else {
          router.push(`/workspace/${workspaceId}?section=${encodeURIComponent(section)}&edit=${encodeURIComponent(data.item.id)}`);
        }
      } else {
        router.push(`/workspace/${workspaceId}?section=${encodeURIComponent(section)}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save to workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className={className} title={typeof label === 'string' ? label : undefined}>
        {children ?? label}
      </button>
      {open && variant === 'centered' && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div 
            className="bg-card border border-theme rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-blue)]/15 flex items-center justify-center">
                  <BookmarkIcon className="h-4 w-4 text-[var(--brand-blue)]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Save to Workspace</h3>
                  <p className="text-[11px] text-muted">Choose where to save this item</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-subtle-bg text-muted hover:text-foreground transition-all"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                  <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Workspace
                </label>
                {workspaces.length === 0 ? (
                  <div className="w-full px-3 py-2.5 rounded-lg bg-subtle-bg border border-theme text-muted text-xs flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    No workspaces found. Create one first.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-lg bg-input-bg border border-theme text-foreground focus:outline-none focus:border-[var(--brand-blue)] cursor-pointer appearance-none transition-colors"
                    >
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                  <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Section
                </label>
                <div className="relative">
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value as Section)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-input-bg border border-theme text-foreground focus:outline-none focus:border-[var(--brand-blue)] cursor-pointer appearance-none transition-colors"
                  >
                    <option value="notes">📝 Notes</option>
                    <option value="drafts">📄 Drafts</option>
                    <option value="references">📚 References</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-5 py-3 border-t border-theme bg-subtle-bg/50 rounded-b-2xl">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-theme bg-card text-foreground hover:bg-input-bg transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={!workspaceId || loading || workspaces.length === 0}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[var(--brand-blue)] text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-3 w-3" />
                    Save & Edit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && variant === 'fullpage' && (
        <div className="fixed inset-0 bg-card z-[60] flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-theme">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)]/15 flex items-center justify-center">
                <BookmarkIcon className="h-4 w-4 text-[var(--brand-blue)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Save to Workspace</h3>
                <p className="text-[10px] text-muted">Choose where to save this message</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md hover:bg-subtle-bg text-muted hover:text-foreground transition-all"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                  <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Workspace
                </label>
                {workspaces.length === 0 ? (
                  <div className="w-full px-3 py-2 rounded-lg bg-subtle-bg border border-theme text-muted text-xs flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    No workspaces found. Create one first.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-input-bg border border-theme text-foreground focus:outline-none focus:border-[var(--brand-blue)] cursor-pointer appearance-none transition-colors"
                    >
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                  <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Section
                </label>
                <div className="relative">
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value as Section)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-input-bg border border-theme text-foreground focus:outline-none focus:border-[var(--brand-blue)] cursor-pointer appearance-none transition-colors"
                  >
                    <option value="notes">📝 Notes</option>
                    <option value="drafts">📄 Drafts</option>
                    <option value="references">📚 References</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end px-5 py-3 border-t border-theme bg-subtle-bg/50">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-theme bg-card text-foreground hover:bg-input-bg transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!workspaceId || loading || workspaces.length === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--brand-blue)] text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-3 w-3" />
                  Save & Edit
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
