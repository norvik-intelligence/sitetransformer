"use client";
import { useState } from "react";
import { ArrowRight, FileDown, RefreshCw } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { exportHtml } from "@/lib/export";

export function SimpleContentImport() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const [contentUrl, setContentUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function importContent() {
    if (!project || !contentUrl) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/content-mapping", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, contentUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import fehlgeschlagen");
      setProject(data.project);
      setMessage("Inhalte wurden importiert. Die Kopie bleibt als Design-Referenz erhalten.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }
  return <aside className="w-full shrink-0 border-l border-slate-200 bg-white p-5 shadow-2xl lg:w-[380px]"><div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Schritt 2</p><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Inhalte importieren</h2><p className="mt-2 text-sm leading-6 text-slate-600">Optional: Gib eine Referenz-Webseite ein. Die App crawlt deren Texte und setzt sie in deine kopierte Seite ein.</p><input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://referenz-inhalte.de" className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900" /><button onClick={importContent} disabled={!contentUrl || loading || !project} className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50">{loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{loading ? "Importiere..." : "Inhalte importieren"}</button>{message ? <p className="mt-3 rounded-2xl bg-white p-3 text-sm text-slate-600">{message}</p> : null}</div><button onClick={() => project && exportHtml(project)} disabled={!project} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-50 disabled:opacity-50"><FileDown className="mr-2 h-4 w-4" />Kopie exportieren</button><div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><b>Hinweis:</b> Nutze das Klonen nur fuer Seiten, die dir gehoeren oder fuer die du eine Erlaubnis hast. Login-Bereiche und stark dynamische Elemente koennen abweichen.</div></aside>;
}
