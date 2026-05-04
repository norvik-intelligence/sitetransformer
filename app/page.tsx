"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteProject } from "@/lib/types";
import { listStoredProjects } from "@/lib/store";

export default function Dashboard() {
  const [projects, setProjects] = useState<SiteProject[]>([]);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setProjects(listStoredProjects()), []);
  async function createProject() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/clone", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ designUrl: url, projectName: name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Projekt konnte nicht erstellt werden");
      localStorage.setItem(`sitetransformer:${data.project.id}`, JSON.stringify(data.project));
      location.href = `/editor/${data.project.id}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Fehler"); } finally { setLoading(false); }
  }
  return <main className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-6xl space-y-8"><header className="flex items-center justify-between"><div><h1 className="text-4xl font-black tracking-tight">SiteTransformer</h1><p className="mt-2 text-slate-600">Design URL zu editierbaren AI Blocks. Optimiert fuer Vercel.</p></div><span className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Next.js 15</span></header><section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><h2 className="text-xl font-bold">Neues Projekt transformieren</h2><div className="mt-4 grid gap-3 md:grid-cols-[1fr_240px_auto]"><input className="rounded-xl border px-3 py-2" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Design URL, z. B. https://example.com" /><input className="rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Projektname optional" /><button className="rounded-xl bg-slate-950 px-5 py-2 font-semibold text-white disabled:opacity-50" onClick={createProject} disabled={loading || !url}>{loading ? "Transformiere..." : "Erstellen"}</button></div>{error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}</section><section><h2 className="mb-4 text-xl font-bold">Projekte auf diesem Browser</h2><div className="grid gap-4 md:grid-cols-3">{projects.map((p) => <Link href={`/editor/${p.id}`} key={p.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg"><h3 className="font-bold">{p.name}</h3><p className="mt-2 text-sm text-slate-500">{p.pages[0]?.blocks.length ?? 0} Blocks</p></Link>)}</div></section></div></main>;
}
