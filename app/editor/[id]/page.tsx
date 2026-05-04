"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { startAutoSave, useEditorStore } from "@/lib/store";
import { PixelClonePreview } from "@/components/editor/PixelClonePreview";
import { SimpleContentImport } from "@/components/editor/SimpleContentImport";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const load = useEditorStore((s) => s.load);
  useEffect(() => {
    const saved = localStorage.getItem(`sitetransformer:${params.id}`);
    if (saved) load(JSON.parse(saved));
    return startAutoSave();
  }, [params.id, load]);
  return <div className="flex h-screen flex-col overflow-hidden bg-slate-100"><header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5"><div><div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">SiteTransformer</div><div className="text-lg font-black text-slate-950">Website-Kopie</div></div><div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Bereit</div></header><div className="flex min-h-0 flex-1"><main className="min-w-0 flex-1 overflow-auto p-5"><PixelClonePreview /></main><SimpleContentImport /></div></div>;
}
