"use client";
import { useState } from "react";
import { ArrowRight, Globe2, Loader2, Search } from "lucide-react";

export default function ScraperHome() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function scrape() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/scrape", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, maxPages: 8, maxAssets: 100 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scraping fehlgeschlagen");
      localStorage.setItem(`scrape:${data.project.id}`, JSON.stringify(data.project));
      window.location.href = `/scrape/${data.project.id}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Fehler"); } finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-[#0d1117] text-[#f0f6fc]"><div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8"><header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#30363d] bg-[#161b22]"><Search className="h-5 w-5" /></div><div><div className="font-semibold">SiteTransformer Scraper</div><div className="text-xs text-[#8b949e]">Scrape · Edit · Download · Push</div></div></div><div className="rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 text-xs text-[#8b949e]">GitHub-style workspace</div></header><section className="flex flex-1 items-center py-16"><div className="w-full"><div className="inline-flex items-center rounded-full border border-[#30363d] bg-[#161b22] px-4 py-2 text-sm font-semibold text-[#8b949e]"><Globe2 className="mr-2 h-4 w-4" /> Pure website scraper</div><h1 className="mt-8 max-w-4xl text-5xl font-black leading-none tracking-[-0.06em] md:text-7xl">Scrape eine Website in echte Dateien.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[#8b949e]">Die App crawlt HTML, CSS, JS, Bilder, Fonts und Assets, erstellt eine Ordnerstruktur und oeffnet danach einen GitHub-aehnlichen Browser-Editor. Dort kannst du Dateien bearbeiten, speichern, als ZIP herunterladen oder in ein Repo pushen.</p><div className="mt-8 rounded-2xl border border-[#30363d] bg-[#161b22] p-3 shadow-2xl shadow-black/30"><div className="grid gap-3 md:grid-cols-[1fr_auto]"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://website-zum-scrapen.de" className="rounded-xl border border-[#30363d] bg-[#0d1117] px-5 py-4 text-base outline-none placeholder:text-[#6e7681] focus:border-[#1f6feb]" /><button onClick={scrape} disabled={!url || loading} className="inline-flex items-center justify-center rounded-xl bg-[#238636] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#2ea043] disabled:opacity-50">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{loading ? "Scrape laeuft..." : "Website scrapen"}</button></div>{error ? <p className="mt-3 rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}</div><div className="mt-6 grid gap-3 text-sm text-[#8b949e] md:grid-cols-3"><div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">1. URL crawlen</div><div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">2. Dateien bearbeiten</div><div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">3. ZIP oder GitHub Push</div></div></div></section></div></main>;
}
