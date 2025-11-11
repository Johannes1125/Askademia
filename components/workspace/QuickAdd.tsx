"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type Section = 'notes' | 'drafts' | 'references';

export function WorkspaceQuickAddButton({ derive, className, label = 'Save to Workspace', children }: {
  derive: () => { title: string; content: string; section?: Section; tags?: string[] };
  className?: string;
  label?: string;
  children?: ReactNode;
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
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-theme bg-card p-4 shadow-xl">
            <div className="text-lg font-semibold mb-3 text-foreground">Save to Workspace</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted">Workspace</label>
                <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="w-full rounded-md border border-theme bg-input-bg px-3 py-2 text-foreground">
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted">Section</label>
                <select value={section} onChange={(e) => setSection(e.target.value as Section)} className="w-full rounded-md border border-theme bg-input-bg px-3 py-2 text-foreground">
                  <option value="notes">Notes</option>
                  <option value="drafts">Drafts</option>
                  <option value="references">References</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button className="px-3 py-2 rounded-md border border-theme text-foreground" onClick={() => setOpen(false)} disabled={loading}>Cancel</button>
                <button className="px-3 py-2 rounded-md bg-[var(--brand-blue)] text-white disabled:opacity-50" disabled={!workspaceId || loading} onClick={onSave}>{loading ? 'Saving…' : 'Save & Edit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
