"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Globe2, Loader2 } from "lucide-react";
import type { SiteProject } from "@/lib/types";
import { listStoredProjects } from "@/lib/store";

export default function Dashboard() {
  const [projects, setProjects] = useState<SiteProject[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setProjects(listStoredProjects()), []);
  async function copyWebsite() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/clone", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ designUrl: url, cloneMode: "pixel" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Website konnte nicht kopiert werden");
      localStorage.setItem(`sitetransformer:${data.project.id}`, JSON.stringify(data.project));
      location.href = `/editor/${data.project.id}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Fehler"); } finally { setLoading(false); }
  }
  return <main className="min-h-screen bg-slate-950 text-white"><div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8"><nav className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-950"><Copy className="h-5 w-5" /></div><div className="font-black">SiteTransformer</div></div><div className="text-sm text-slate-400">Website kopieren · Inhalte importieren · exportieren</div></nav><section className="flex flex-1 items-center py-16"><div className="w-full"><div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300"><Globe2 className="mr-2 h-4 w-4" /> Einfach URL einfuegen und kopieren</div><h1 className="mt-8 max-w-4xl text-5xl font-black leading-none tracking-[-0.06em] md:text-7xl">Kopiere eine Website. Ersetze danach nur die Inhalte.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Kein Baukasten. Keine Prompts. Keine komplizierten Blocks. Du gibst eine Design-URL ein, wartest bis die Seite gecrawlt ist und bekommst eine Kopie. Danach kannst du optional eine Referenz-Webseite fuer Wunschinhalte importieren.</p><div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/30"><div className="grid gap-3 md:grid-cols-[1fr_auto]"><input className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-base text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-white" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://website-die-du-kopieren-willst.de" /><button className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:opacity-50" onClick={copyWebsite} disabled={loading || !url}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{loading ? "Crawle Website..." : "Website kopieren"}</button></div>{error ? <p className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}</div><div className="mt-6 grid gap-3 text-sm text-slate-400 md:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-4">1. URL einfuegen</div><div className="rounded-2xl border border-white/10 bg-white/5 p-4">2. Kopie anzeigen</div><div className="rounded-2xl border border-white/10 bg-white/5 p-4">3. Inhalte importieren</div></div></div></section><section className="pb-10"><h2 className="mb-4 text-xl font-black">Letzte Kopien</h2><div className="grid gap-4 md:grid-cols-3">{projects.map((p) => <Link href={`/editor/${p.id}`} key={p.id} className="group rounded-3xl border border-white/10 bg-white/[0.06] p-5 transition hover:bg-white/[0.1]"><div className="flex items-center justify-between"><h3 className="truncate font-bold">{p.name}</h3><ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" /></div><p className="mt-2 truncate text-sm text-slate-400">{p.designUrl}</p></Link>)}</div></section></div></main>;
}
