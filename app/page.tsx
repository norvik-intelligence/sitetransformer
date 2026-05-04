"use client";
import { useMemo, useState } from "react";
import { Download, FileCode2, FolderTree, Github, Globe2, Loader2, Search, UploadCloud } from "lucide-react";
import type { ScrapeProject, ScrapedFile } from "@/lib/scrape-types";
import { downloadScrapeZip } from "@/lib/scrape-export";

function preview(file?: ScrapedFile) {
  if (!file) return "Datei auswaehlen";
  if (file.encoding === "base64") return `[${file.kind}] ${file.bytes} bytes base64 asset`;
  return file.content.slice(0, 12000);
}

export default function ScraperHome() {
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [project, setProject] = useState<ScrapeProject | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedFile = useMemo(() => project?.files.find((f) => f.path === selected), [project, selected]);

  async function scrape() {
    setLoading(true); setError(""); setNotice(""); setProject(null); setSelected("");
    try {
      const res = await fetch("/api/scrape", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, maxPages: 8, maxAssets: 100 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scraping fehlgeschlagen");
      setProject(data.project);
      setSelected(data.project.files[0]?.path || "");
      localStorage.setItem(`scrape:${data.project.id}`, JSON.stringify(data.project));
    } catch (e) { setError(e instanceof Error ? e.message : "Fehler"); } finally { setLoading(false); }
  }

  async function pushToGitHub() {
    if (!project || !repo) return;
    setPushing(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/github-push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repository: repo, branch, project }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "GitHub Push fehlgeschlagen");
      setNotice(`${data.pushed?.length || 0} Dateien wurden nach ${repo} gepusht.`);
    } catch (e) { setError(e instanceof Error ? e.message : "GitHub Push fehlgeschlagen"); } finally { setPushing(false); }
  }

  return <main className="min-h-screen bg-[#080b12] text-white"><div className="mx-auto max-w-7xl px-6 py-7"><header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950"><Search className="h-5 w-5" /></div><div><div className="font-black tracking-tight">SiteTransformer Scraper</div><div className="text-xs text-slate-400">Crawl files · edit next · download or push</div></div></div><div className="hidden items-center gap-2 text-xs text-slate-400 md:flex"><Github className="h-4 w-4" /> GitHub Push via GITHUB_TOKEN</div></header><section className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30"><div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://website-zum-scrapen.de" className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-base outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-white" /><button onClick={scrape} disabled={!url || loading} className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:opacity-50">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe2 className="mr-2 h-4 w-4" />}{loading ? "Scrape laeuft..." : "Website scrapen"}</button><button onClick={() => project && downloadScrapeZip(project)} disabled={!project} className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-40"><Download className="mr-2 h-4 w-4" />ZIP Download</button></div>{project ? <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_140px_auto]"><input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo fuer GitHub Push" className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-white" /><input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-white" /><button onClick={pushToGitHub} disabled={!project || !repo || pushing} className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-40">{pushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}{pushing ? "Pushe..." : "Auf GitHub pushen"}</button></div> : null}{error ? <p className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}{notice ? <p className="mt-3 rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p> : null}</section>{project ? <section className="mt-6 grid gap-5 lg:grid-cols-[360px_1fr]"><aside className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4"><div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-2xl bg-white/10 p-3"><b className="block text-lg">{project.stats.pages}</b>Pages</div><div className="rounded-2xl bg-white/10 p-3"><b className="block text-lg">{project.stats.assets}</b>Assets</div><div className="rounded-2xl bg-white/10 p-3"><b className="block text-lg">{project.stats.files}</b>Files</div></div><h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-400"><FolderTree className="h-4 w-4" /> Dateien</h2><div className="max-h-[62vh] space-y-1 overflow-auto pr-1">{project.files.map((file) => <button key={file.path} onClick={() => setSelected(file.path)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${selected === file.path ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10"}`}><FileCode2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{file.path}</span></button>)}</div></aside><section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06]"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h2 className="text-sm font-black">{selectedFile?.path || project.title}</h2><p className="text-xs text-slate-400">{selectedFile ? `${selectedFile.kind} · ${selectedFile.mimeType} · ${selectedFile.bytes} bytes` : project.rootUrl}</p></div></div><pre className="h-[68vh] overflow-auto bg-black/40 p-5 text-xs leading-6 text-slate-200">{preview(selectedFile)}</pre></section></section> : <section className="mt-10 grid gap-4 text-sm text-slate-400 md:grid-cols-3"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">1. URL eingeben und komplette Website-Struktur crawlen.</div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">2. Dateien, Ordner, HTML, CSS, JS, Bilder und Assets ansehen.</div><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">3. ZIP downloaden oder mit GitHub Token in ein Repo pushen.</div></section>}</div></main>;
}
