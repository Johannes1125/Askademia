export type Section = "notes" | "drafts" | "references";

export type WorkspaceItem = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

export type WorkspaceData = Record<Section, WorkspaceItem[]>;

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: WorkspaceData;
};

export type WorkspaceState = {
  workspaces: Workspace[];
};

const STORAGE_KEY = "askademia_workspaces_v2";

export const emptyData: WorkspaceData = { notes: [], drafts: [], references: [] };

export function createWorkspace(name: string): Workspace {
  const now = new Date().toISOString();
  const id = typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return { id, name, createdAt: now, updatedAt: now, data: JSON.parse(JSON.stringify(emptyData)) };
}

export function loadState(): WorkspaceState {
  if (typeof window === "undefined") return { workspaces: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workspaces: [] };
    const parsed = JSON.parse(raw) as WorkspaceState;
    return { workspaces: parsed.workspaces ?? [] };
  } catch {
    return { workspaces: [] };
  }
}

export function saveState(state: WorkspaceState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function upsertWorkspace(next: Workspace) {
  const state = loadState();
  const idx = state.workspaces.findIndex((w) => w.id === next.id);
  if (idx >= 0) state.workspaces[idx] = next; else state.workspaces.unshift(next);
  saveState(state);
}

export function deleteWorkspace(id: string) {
  const state = loadState();
  state.workspaces = state.workspaces.filter((w) => w.id !== id);
  saveState(state);
}
