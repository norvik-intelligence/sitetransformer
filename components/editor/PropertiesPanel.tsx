"use client";
import { useEditorStore } from "@/lib/store";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selected = useEditorStore((s) => s.selectedBlockId);
  const update = useEditorStore((s) => s.updateBlock);
  const block = project?.pages.find((p) => p.id === project.activePageId)?.blocks.find((b) => b.id === selected);
  if (!block) return <aside className="hidden w-80 border-l border-slate-200 bg-white p-4 xl:block"><p className="text-sm text-slate-500">Block auswaehlen.</p></aside>;
  return <aside className="hidden w-80 space-y-4 border-l border-slate-200 bg-white p-4 xl:block"><h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Properties</h2><label className="block text-sm font-medium">Name<input className="mt-1 w-full rounded-xl border p-2" value={block.name} onChange={(e) => update(block.id, { name: e.target.value })} /></label><label className="block text-sm font-medium">Headline<textarea className="mt-1 w-full rounded-xl border p-2" value={block.content.headline || ""} onChange={(e) => update(block.id, { content: { headline: e.target.value } })} /></label><label className="block text-sm font-medium">Body<textarea className="mt-1 h-28 w-full rounded-xl border p-2" value={block.content.body || ""} onChange={(e) => update(block.id, { content: { body: e.target.value } })} /></label><label className="block text-sm font-medium">Background<input className="mt-1 w-full rounded-xl border p-2" value={block.style.background || ""} onChange={(e) => update(block.id, { style: { background: e.target.value } })} /></label><label className="block text-sm font-medium">Padding Y<input className="mt-1 w-full rounded-xl border p-2" type="number" value={block.style.paddingY || 64} onChange={(e) => update(block.id, { style: { paddingY: Number(e.target.value) } })} /></label></aside>;
}
