"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Code2, Download, Eye, FileCode2, Folder, GitBranch, Globe2, ImageIcon, Search, ShieldCheck, UploadCloud } from "lucide-react";
import type { ScrapeProject, ScrapedFile } from "@/lib/scrape-types";
import { downloadScrapeZip } from "@/lib/scrape-export";

type ViewMode = "preview" | "code" | "report";

function dataUrlFor(file: ScrapedFile) {
  if (file.encoding === "base64") return `data:${file.mimeType};base64,${file.content}`;
  return `data:${file.mimeType};charset=utf-8,${encodeURIComponent(file.content)}`;
}

function buildPreviewHtml(project: ScrapeProject, selectedFile?: ScrapedFile) {
  const htmlFile = selectedFile?.kind === "html" ? selectedFile : project.files.find((file) => file.path.endsWith("index.html") && file.kind === "html") || project.files.find((file) => file.kind === "html");
  if (!htmlFile || htmlFile.encoding !== "utf-8") return "<html><body style='font-family:system-ui;padding:32px'>Keine HTML-Datei fuer Preview gefunden.</body></html>";
  let html = htmlFile.content;
  for (const file of project.files) {
    const path = file.path.replace(/^\/+/, "");
    const url = dataUrlFor(file);
    html = html.split(`/${path}`).join(url);
    html = html.split(path).join(url);
    html = html.split(file.url).join(url);
  }
  html = html.replace(/<base[^>]*>/gi, "");
  html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${project.rootUrl}">`);
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  return html;
}

function fileLabel(file: ScrapedFile) {
  return `${file.kind.toUpperCase()} · ${Math.round(file.bytes / 1024)} KB`;
}

export function CrawlResultViewer({ project }: { project: ScrapeProject }) {
  const [selectedPath, setSelectedPath] = useState(project.files.find((file) => file.kind === "html")?.path || project.files[0]?.path || "");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [status, setStatus] = useState("");
  const [pushing, setPushing] = useState(false);
  const selectedFile = useMemo(() => project.files.find((file) => file.path === selectedPath), [project.files, selectedPath]);
  const htmlFiles = useMemo(() => project.files.filter((file) => file.kind === "html"), [project.files]);
  const imageFiles = useMemo(() => project.files.filter((file) => file.kind === "image"), [project.files]);
  const previewHtml = useMemo(() => buildPreviewHtml(project, selectedFile), [project, selectedFile]);
  const report = useMemo(() => JSON.stringify({ rootUrl: project.rootUrl, createdAt: project.createdAt, pages: project.pages, assets: project.assets, stats: project.stats }, null, 2), [project]);

  async function pushToGitHub() {
    setPushing(true); setStatus("");
    try {
      const res = await fetch("/api/github-push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repository: repo, branch, project }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "GitHub Push fehlgeschlagen");
      setStatus(`${data.pushed?.length || 0} Dateien wurden nach ${repo} gepusht.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "GitHub Push fehlgeschlagen");
    } finally {
      setPushing(false);
    }
  }

  return <main className="h-screen overflow-hidden bg-[#050505] text-[#f5f5f7]"><div className="grid h-full grid-rows-[64px_1fr]"><header className="flex items-center justify-between border-b border-white/[0.075] bg-[#070707]/95 px-4 backdrop-blur-2xl"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black"><Search className="h-5 w-5" /></div><div className="min-w-0"><h1 className="truncate text-sm font-black">{project.title}</h1><p className="truncate text-xs text-white/40">{project.rootUrl}</p></div></div><div className="flex items-center gap-2"><button onClick={() => downloadScrapeZip(project)} className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-black text-black hover:bg-sky-100"><Download className="mr-2 h-4 w-4" />ZIP Export</button></div></header><section className="grid min-h-0 grid-cols-[300px_1fr_340px] bg-[#111]"><aside className="min-h-0 border-r border-white/[0.075] bg-[#080808]"><div className="border-b border-white/[0.075] p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Crawler Result</p><div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-white/45"><Stat value={project.stats.pages} label="Pages" /><Stat value={project.stats.files} label="Files" /><Stat value={project.stats.assets} label="Assets" /></div><label className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-white/[0.08] px-3 text-sm text-white/35"><Search className="h-4 w-4" />Search files</label></div><div className="h-[calc(100vh-64px-150px)] overflow-auto p-3"><PanelTitle label="Pages" count={htmlFiles.length} /> <div className="mb-5 mt-2 space-y-1">{htmlFiles.map((file) => <button key={file.path} onClick={() => { setSelectedPath(file.path); setViewMode("preview"); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${file.path === selectedPath ? "bg-white text-black" : "text-white/60 hover:bg-white/[0.08] hover:text-white"}`}><Folder className="h-4 w-4" /><span className="truncate">{file.path}</span></button>)}</div><PanelTitle label="Files" count={project.files.length} /><div className="mt-2 space-y-1">{project.files.map((file) => <button key={file.path} onClick={() => { setSelectedPath(file.path); setViewMode(file.encoding === "utf-8" ? "code" : "preview"); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs ${file.path === selectedPath ? "bg-white text-black" : "text-white/50 hover:bg-white/[0.08] hover:text-white"}`}><FileCode2 className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.path}</span><span className="text-[10px] opacity-60">{file.kind}</span></button>)}</div></div></aside><main className="relative min-w-0 bg-[#171717]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,156,255,.12),transparent_32%),linear-gradient(to_right,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:auto,40px_40px,40px_40px]" /><div className="relative flex h-full flex-col p-6"><div className="mx-auto mb-3 flex w-full max-w-[1120px] items-center justify-between rounded-2xl bg-[#149cff]/15 px-3 py-2 text-xs font-black text-[#19a7ff] ring-1 ring-[#149cff]/20"><span>{selectedFile?.path || "Preview"}</span><div className="flex rounded-xl bg-black/30 p-1"><ModeButton active={viewMode === "preview"} onClick={() => setViewMode("preview")} icon={<Eye className="h-3.5 w-3.5" />} label="Preview" /><ModeButton active={viewMode === "code"} onClick={() => setViewMode("code")} icon={<Code2 className="h-3.5 w-3.5" />} label="Code" /><ModeButton active={viewMode === "report"} onClick={() => setViewMode("report")} icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Report" /></div></div><div className="mx-auto min-h-0 w-full max-w-[1120px] flex-1 overflow-hidden rounded-[1.15rem] border border-white/10 bg-black shadow-2xl shadow-black/45">{viewMode === "preview" ? <iframe title="Crawler Preview" sandbox="allow-same-origin allow-forms" srcDoc={previewHtml} className="h-full w-full bg-white" /> : viewMode === "report" ? <pre className="h-full overflow-auto bg-[#090909] p-5 font-mono text-xs leading-6 text-white/75">{report}</pre> : selectedFile?.encoding === "utf-8" ? <pre className="h-full overflow-auto bg-[#090909] p-5 font-mono text-xs leading-6 text-white/75">{selectedFile.content}</pre> : <div className="flex h-full items-center justify-center text-center text-white/45"><div><ImageIcon className="mx-auto mb-3 h-8 w-8" /><p className="font-black text-white">Binary asset</p><p className="mt-1 text-sm">Diese Datei ist im ZIP enthalten.</p></div></div>}</div></div></main><aside className="min-h-0 overflow-auto border-l border-white/[0.075] bg-[#080808] p-4"><section className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4"><h2 className="flex items-center gap-2 text-sm font-black"><Globe2 className="h-4 w-4 text-sky-300" /> Crawl Summary</h2><div className="mt-4 space-y-2 text-xs text-white/55"><Row label="Root" value={project.rootUrl} /><Row label="Created" value={new Date(project.createdAt).toLocaleString()} /><Row label="Total" value={`${Math.round(project.stats.totalBytes / 1024)} KB`} /><Row label="Images" value={String(imageFiles.length)} /></div></section><section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4"><h2 className="flex items-center gap-2 text-sm font-black"><Download className="h-4 w-4" /> Export</h2><button onClick={() => downloadScrapeZip(project)} className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-black text-black hover:bg-sky-100"><Download className="mr-2 h-4 w-4" />Download ZIP</button></section><section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4"><h2 className="flex items-center gap-2 text-sm font-black"><GitBranch className="h-4 w-4" /> GitHub Push</h2><input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm outline-none placeholder:text-white/25 focus:border-[#149cff]/60" /><input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm outline-none placeholder:text-white/25 focus:border-[#149cff]/60" /><button onClick={pushToGitHub} disabled={!repo || pushing} className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-[#238636] text-xs font-black text-white hover:bg-[#2ea043] disabled:opacity-50"><UploadCloud className="mr-2 h-4 w-4" />{pushing ? "Pushe..." : "Push"}</button></section>{project.stats.warnings.length ? <section className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4"><h2 className="flex items-center gap-2 text-sm font-black text-amber-100"><AlertTriangle className="h-4 w-4" /> Warnings</h2><div className="mt-3 max-h-44 space-y-2 overflow-auto text-xs leading-5 text-amber-50/70">{project.stats.warnings.slice(0, 20).map((warning) => <p key={warning}>{warning}</p>)}</div></section> : null}{status ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-xs leading-5 text-white/70">{status}</p> : null}</aside></section></div></main>;
}

function Stat({ value, label }: { value: number; label: string }) { return <div className="rounded-xl border border-white/[0.08] bg-white/[0.045] p-2"><b className="block text-white">{value}</b>{label}</div>; }
function PanelTitle({ label, count }: { label: string; count?: number }) { return <div className="flex items-center justify-between px-1 text-xs font-black text-white/50"><span>{label}</span>{typeof count === "number" ? <span className="text-white/28">{count}</span> : null}</div>; }
function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${active ? "bg-white text-black" : "text-white/50 hover:text-white"}`}>{icon}{label}</button>; }
function Row({ label, value }: { label: string; value: string }) { return <div><div className="text-white/30">{label}</div><div className="truncate font-semibold text-white/75">{value}</div></div>; }
