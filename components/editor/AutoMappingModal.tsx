"use client";
import { useState } from "react";
import { useEditorStore } from "@/lib/store";

export function AutoMappingModal() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  async function map() {
    if (!project || !url) return;
    setLoading(true);
    try {
      const res = await fetch("/api/content-mapping", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, contentUrl: url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mapping failed");
      setProject(data.project);
    } finally { setLoading(false); }
  }
  return <div className="flex gap-2"><input className="w-72 rounded-xl border px-3 py-2 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Content URL" /><button className="rounded-xl border px-3 py-2 text-sm" onClick={map} disabled={loading || !url}>{loading ? "Mapping..." : "Map Content"}</button></div>;
}
