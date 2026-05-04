"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { startAutoSave, useEditorStore } from "@/lib/store";
import { Toolbar } from "@/components/editor/Toolbar";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { AutoMappingModal } from "@/components/editor/AutoMappingModal";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const load = useEditorStore((s) => s.load);
  useEffect(() => {
    const raw = localStorage.getItem(`sitetransformer:${params.id}`);
    if (raw) load(JSON.parse(raw));
    return startAutoSave();
  }, [params.id, load]);
  return <div className="flex h-screen flex-col overflow-hidden"><Toolbar /><div className="border-b bg-white p-3"><AutoMappingModal /></div><div className="flex min-h-0 flex-1"><LayersPanel /><EditorCanvas /><PropertiesPanel /></div></div>;
}
