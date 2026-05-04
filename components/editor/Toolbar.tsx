"use client";
import { Monitor, Smartphone, Plus, Save, Undo2, Redo2, Download, Sparkles } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { exportHtml } from "@/lib/export";

export function Toolbar() {
  const project = useEditorStore((s) => s.project);
  const device = useEditorStore((s) => s.device);
  const dirty = useEditorStore((s) => s.dirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const setDevice = useEditorStore((s) => s.setDevice);
  const addBlock = useEditorStore((s) => s.addBlock);
  const save = useEditorStore((s) => s.save);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const iconButton = "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-200 shadow-sm transition hover:bg-white/[0.12] hover:text-white";
  return <header className="flex h-18 items-center justify-between border-b border-white/10 bg-[#070812]/95 px-4 text-white backdrop-blur-xl"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30"><Sparkles className="h-5 w-5" /></div><div><div className="text-sm font-black tracking-tight">SiteTransformer</div><div className="text-xs text-slate-400">{project?.name || "Editor"} · {isSaving ? "saving" : dirty ? "unsaved" : "saved"}</div></div></div><div className="flex items-center gap-2"><button className={iconButton} onClick={undo} title="Undo"><Undo2 className="h-4 w-4" /></button><button className={iconButton} onClick={redo} title="Redo"><Redo2 className="h-4 w-4" /></button><button className={iconButton} onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")} title="Device preview">{device === "desktop" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}</button><button className={iconButton} onClick={() => addBlock("section")} title="Add section"><Plus className="h-4 w-4" /></button><button className={iconButton} onClick={save} title="Save"><Save className="h-4 w-4" /></button><button className="inline-flex h-10 items-center rounded-2xl bg-white px-4 text-sm font-black text-slate-950 shadow-xl shadow-white/10 transition hover:bg-indigo-50" onClick={() => project && exportHtml(project)}><Download className="mr-2 h-4 w-4" />Export</button></div></header>;
}
