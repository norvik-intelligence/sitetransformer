"use client";
import { create } from "zustand";
import type { DeviceMode, ID, SiteBlock, SiteProject } from "./types";
import { nowIso, uid } from "./utils";

type State = { project: SiteProject | null; selectedBlockId?: ID; device: DeviceMode; dirty: boolean; isSaving: boolean; history: SiteProject[]; future: SiteProject[] };
type Actions = { load: (project: SiteProject) => void; select: (id?: ID) => void; setDevice: (device: DeviceMode) => void; updateBlock: (id: ID, patch: Partial<SiteBlock>) => void; reorderBlocks: (ids: ID[]) => void; addBlock: (kind: SiteBlock["kind"]) => void; removeBlock: (id: ID) => void; undo: () => void; redo: () => void; save: () => void; setProject: (project: SiteProject) => void };

const persist = (p: SiteProject) => localStorage.setItem(`sitetransformer:${p.id}`, JSON.stringify({ ...p, lastSavedAt: nowIso() }));
const snapshot = (s: State) => s.project ? { history: [...s.history.slice(-39), s.project], future: [], dirty: true } : {};

export const useEditorStore = create<State & Actions>((set, get) => ({
  project: null, device: "desktop", dirty: false, isSaving: false, history: [], future: [],
  load: (project) => set({ project, selectedBlockId: project.pages[0]?.blocks[0]?.id, dirty: false, history: [], future: [] }),
  select: (id) => set({ selectedBlockId: id }),
  setDevice: (device) => set({ device }),
  setProject: (project) => set((s) => ({ ...snapshot(s), project: { ...project, updatedAt: nowIso() } })),
  updateBlock: (id, patch) => set((s) => {
    if (!s.project) return s;
    const pageId = s.project.activePageId;
    return { ...snapshot(s), project: { ...s.project, updatedAt: nowIso(), pages: s.project.pages.map((p) => p.id !== pageId ? p : { ...p, blocks: p.blocks.map((b) => b.id === id ? { ...b, ...patch, content: { ...b.content, ...patch.content }, style: { ...b.style, ...patch.style }, updatedAt: nowIso() } : b) }) } };
  }),
  reorderBlocks: (ids) => set((s) => {
    if (!s.project) return s;
    const pageId = s.project.activePageId;
    return { ...snapshot(s), project: { ...s.project, updatedAt: nowIso(), pages: s.project.pages.map((p) => p.id !== pageId ? p : { ...p, blocks: ids.map((id) => p.blocks.find((b) => b.id === id)).filter((b): b is SiteBlock => Boolean(b)) }) } };
  }),
  addBlock: (kind) => set((s) => {
    if (!s.project) return s;
    const t = nowIso();
    const b: SiteBlock = { id: uid("block"), kind, name: kind[0].toUpperCase() + kind.slice(1), content: { headline: "Neue Sektion", body: "Klicke, um Inhalte zu bearbeiten.", ctaLabel: kind === "cta" ? "Call to action" : undefined }, style: { paddingY: 64, align: "center" }, createdAt: t, updatedAt: t };
    return { ...snapshot(s), selectedBlockId: b.id, project: { ...s.project, updatedAt: t, pages: s.project.pages.map((p) => p.id === s.project!.activePageId ? { ...p, blocks: [...p.blocks, b] } : p) } };
  }),
  removeBlock: (id) => set((s) => !s.project ? s : ({ ...snapshot(s), selectedBlockId: undefined, project: { ...s.project, updatedAt: nowIso(), pages: s.project.pages.map((p) => p.id === s.project!.activePageId ? { ...p, blocks: p.blocks.filter((b) => b.id !== id) } : p) } })),
  undo: () => set((s) => s.history.length && s.project ? { ...s, project: s.history.at(-1)!, history: s.history.slice(0, -1), future: [s.project, ...s.future], dirty: true } : s),
  redo: () => set((s) => s.future.length && s.project ? { ...s, project: s.future[0], future: s.future.slice(1), history: [...s.history, s.project], dirty: true } : s),
  save: () => { const p = get().project; if (!p) return; set({ isSaving: true }); persist(p); setTimeout(() => set({ isSaving: false, dirty: false, project: { ...p, lastSavedAt: nowIso() } }), 180); }
}));

export function startAutoSave() {
  if (typeof window === "undefined") return () => {};
  const timer = window.setInterval(() => { const s = useEditorStore.getState(); if (s.project && s.dirty && !s.isSaving) s.save(); }, 3000);
  return () => clearInterval(timer);
}

export function listStoredProjects(): SiteProject[] {
  if (typeof window === "undefined") return [];
  return Object.keys(localStorage).filter((k) => k.startsWith("sitetransformer:")).map((k) => JSON.parse(localStorage.getItem(k)!) as SiteProject).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
