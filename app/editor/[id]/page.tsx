"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { startAutoSave, useEditorStore } from "@/lib/store";
import { Toolbar } from "@/components/editor/Toolbar";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { AutoMappingModal } from "@/components/editor/AutoMappingModal";
import { ManualAiPanel } from "@/components/editor/ManualAiPanel";
import { PixelClonePreview } from "@/components/editor/PixelClonePreview";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const load = useEditorStore((s) => s.load);
  useEffect(() => {
    const raw = localStorage.getItem(`sitetransformer:${params.id}`);
    if (raw) load(JSON.parse(raw));
    return startAutoSave();
  }, [params.id, load]);
  return <div className="flex h-screen flex-col overflow-hidden bg-[#070812] text-slate-950"><Toolbar /><div className="border-b border-white/10 bg-slate-950/95 p-3 backdrop-blur"><div className="mx-auto flex max-w-[1600px] flex-col gap-3 md:flex-row md:items-center md:justify-between"><AutoMappingModal /><div className="text-xs font-medium text-slate-400">Pixel clone first · Wunschinhalte danach · Export ready</div></div></div><div className="flex min-h-0 flex-1"><LayersPanel /><EditorCanvas /><div className="hidden w-[430px] shrink-0 space-y-4 overflow-auto border-l border-white/10 bg-slate-950 p-4 2xl:block"><PixelClonePreview /><ManualAiPanel /><PropertiesPanel /></div></div></div>;
}
