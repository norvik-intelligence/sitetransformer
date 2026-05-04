"use client";
import { Trash2 } from "lucide-react";
import { useEditorStore } from "@/lib/store";

export function LayersPanel() {
  const project = useEditorStore((s) => s.project);
  const selected = useEditorStore((s) => s.selectedBlockId);
  const select = useEditorStore((s) => s.select);
  const remove = useEditorStore((s) => s.removeBlock);
  const page = project?.pages.find((p) => p.id === project.activePageId);
  return <aside className="hidden w-72 border-r border-slate-200 bg-white p-4 lg:block"><h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Layers</h2><div className="space-y-2">{page?.blocks.map((block) => <div key={block.id} className={`flex items-center justify-between rounded-xl border p-3 text-sm ${selected === block.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}><button className="text-left font-medium" onClick={() => select(block.id)}>{block.name}</button><button onClick={() => remove(block.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div></aside>;
}
