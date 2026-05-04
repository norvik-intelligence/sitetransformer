"use client";
import { Monitor, Smartphone, Plus, Save, Undo2, Redo2, Download } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { exportHtml } from "@/lib/export";

export function Toolbar() {
  const project = useEditorStore((s) => s.project);
  const device = useEditorStore((s) => s.device);
  const setDevice = useEditorStore((s) => s.setDevice);
  const addBlock = useEditorStore((s) => s.addBlock);
  const save = useEditorStore((s) => s.save);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  return <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4"><div><strong>SiteTransformer</strong><span className="ml-3 text-sm text-slate-500">{project?.name || "Editor"}</span></div><div className="flex items-center gap-2"><button className="rounded-xl border px-3 py-2" onClick={undo}><Undo2 className="h-4 w-4" /></button><button className="rounded-xl border px-3 py-2" onClick={redo}><Redo2 className="h-4 w-4" /></button><button className="rounded-xl border px-3 py-2" onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}>{device === "desktop" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}</button><button className="rounded-xl border px-3 py-2" onClick={() => addBlock("section")}><Plus className="h-4 w-4" /></button><button className="rounded-xl border px-3 py-2" onClick={save}><Save className="h-4 w-4" /></button><button className="rounded-xl bg-slate-950 px-4 py-2 text-white" onClick={() => project && exportHtml(project)}><Download className="mr-2 inline h-4 w-4" />Export</button></div></header>;
}
