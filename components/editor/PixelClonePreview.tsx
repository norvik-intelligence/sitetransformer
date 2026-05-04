"use client";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useEditorStore } from "@/lib/store";

export function PixelClonePreview() {
  const project = useEditorStore((s) => s.project);
  const clone = project?.source?.design;
  if (!clone?.clonedHtml) return null;
  const notes = clone.cloneQuality?.notes || [];
  return <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 text-white shadow-2xl shadow-black/30"><div className="mb-3 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200"><ShieldCheck className="h-4 w-4" /> Pixel Clone Reference</div><h3 className="mt-1 text-lg font-black tracking-tight">Original-Design als Snapshot</h3></div><a href={clone.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/10 p-2 text-slate-200 hover:bg-white/15"><ExternalLink className="h-4 w-4" /></a></div><div className="overflow-hidden rounded-3xl border border-white/10 bg-white"><iframe title="Pixel clone preview" sandbox="allow-same-origin" srcDoc={clone.clonedHtml} className="h-[520px] w-full origin-top bg-white" /></div><div className="mt-3 space-y-1 text-xs leading-5 text-slate-400">{notes.map((note) => <p key={note}>• {note}</p>)}</div></section>;
}
