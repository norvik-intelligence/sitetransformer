"use client";
/* eslint-disable @next/next/no-img-element -- Crawl assets are isolated data URLs with unknown dimensions. */

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Code2, Download, Eye, FileCode2, Folder, Globe2, ImageIcon, Search, ShieldCheck } from "lucide-react";
import type { ScrapeProject, ScrapedFile } from "@/lib/scrape-types";
import { downloadScrapeZip } from "@/lib/scrape-export";

type ViewMode = "preview" | "code" | "report";

function dataUrlFor(file: ScrapedFile, content = file.content) {
  if (file.encoding === "base64") return `data:${file.mimeType};base64,${content}`;
  return `data:${file.mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function replaceResourceReferences(value: string, resources: Map<string, string>, baseUrl?: string) {
  const resolve = (raw: string) => {
    const direct = resources.get(raw) || resources.get(raw.replace(/^\/+/, ""));
    if (direct) return direct;
    if (baseUrl) {
      try {
        return resources.get(new URL(raw, baseUrl).toString()) || raw;
      } catch {}
    }
    return raw;
  };
  let output = value.replace(/\b(src|href|poster|data)=(["'])(.*?)\2/gi, (_match, attribute, quote, raw) => `${attribute}=${quote}${resolve(raw)}${quote}`);
  output = output.replace(/\bsrcset=(["'])(.*?)\1/gi, (_match, quote, srcset) => {
    const next = srcset.split(",").map((candidate: string) => {
      const [raw, ...descriptor] = candidate.trim().split(/\s+/);
      return [resolve(raw), ...descriptor].join(" ");
    }).join(", ");
    return `srcset=${quote}${next}${quote}`;
  });
  return output.replace(/url\((['"]?)(.*?)\1\)/gi, (_match, quote, raw) => `url(${quote}${resolve(raw)}${quote})`);
}

function buildPreviewHtml(project: ScrapeProject, selectedFile?: ScrapedFile) {
  const htmlFile = selectedFile?.kind === "html"
    ? selectedFile
    : project.files.find((file) => file.path.endsWith("index.html") && file.kind === "html") || project.files.find((file) => file.kind === "html");
  if (!htmlFile || htmlFile.encoding !== "utf-8") {
    return "<!doctype html><html><body style='font-family:system-ui;padding:32px'>Keine HTML-Datei für die Vorschau gefunden.</body></html>";
  }

  const resources = new Map<string, string>();
  for (const file of project.files) {
    if (file.kind === "html" || file.kind === "css") continue;
    const dataUrl = dataUrlFor(file);
    resources.set(file.url, dataUrl);
    resources.set(file.path, dataUrl);
    resources.set(`/${file.path.replace(/^\/+/, "")}`, dataUrl);
  }
  for (const file of project.files) {
    if (file.kind !== "css" || file.encoding !== "utf-8") continue;
    const dataUrl = dataUrlFor(file, replaceResourceReferences(file.content, resources, file.url));
    resources.set(file.url, dataUrl);
    resources.set(file.path, dataUrl);
    resources.set(`/${file.path.replace(/^\/+/, "")}`, dataUrl);
  }

  let html = replaceResourceReferences(htmlFile.content, resources, htmlFile.url);
  html = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<(?:iframe|object|embed)\b[\s\S]*?<\/(?:iframe|object|embed)>/gi, "")
    .replace(/<(?:iframe|object|embed)\b[^>]*\/?>/gi, "")
    .replace(/<meta\b[^>]*http-equiv=["']?refresh["']?[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/<form\b[^>]*>/gi, "<form action=\"#\" method=\"dialog\">");

  const policy = "default-src 'none'; img-src data:; media-src data:; font-src data:; style-src 'unsafe-inline' data:; form-action 'none'; frame-src 'none';";
  const previewHead = `<meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">`;
  return /<head[\s>]/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${previewHead}`) : `<!doctype html><html><head>${previewHead}</head><body>${html}</body></html>`;
}

function fileLabel(file: ScrapedFile) {
  const size = file.bytes < 1024 ? `${file.bytes} B` : `${Math.max(1, Math.round(file.bytes / 1024))} KB`;
  return `${file.kind.toUpperCase()} · ${size}`;
}

export function CrawlResultViewer({ project }: { project: ScrapeProject }) {
  const [selectedPath, setSelectedPath] = useState(project.files.find((file) => file.kind === "html")?.path || project.files[0]?.path || "");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [query, setQuery] = useState("");
  const selectedFile = useMemo(() => project.files.find((file) => file.path === selectedPath), [project.files, selectedPath]);
  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? project.files.filter((file) => `${file.path} ${file.kind}`.toLowerCase().includes(normalized)) : project.files;
  }, [project.files, query]);
  const htmlFiles = useMemo(() => filteredFiles.filter((file) => file.kind === "html"), [filteredFiles]);
  const imageFiles = useMemo(() => project.files.filter((file) => file.kind === "image"), [project.files]);
  const previewHtml = useMemo(() => buildPreviewHtml(project, selectedFile), [project, selectedFile]);
  const report = useMemo(() => JSON.stringify({
    rootUrl: project.rootUrl,
    createdAt: project.createdAt,
    pages: project.pages,
    assets: project.assets,
    stats: project.stats
  }, null, 2), [project]);

  function selectFile(file: ScrapedFile) {
    setSelectedPath(file.path);
    setViewMode(file.kind === "html" || file.kind === "image" ? "preview" : file.encoding === "utf-8" ? "code" : "preview");
  }

  const previewContent = selectedFile?.kind === "image"
    ? <div className="flex h-full items-center justify-center overflow-auto bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-6"><img src={dataUrlFor(selectedFile)} alt={selectedFile.path} className="max-h-full max-w-full object-contain shadow-2xl" /></div>
    : selectedFile?.kind === "html" || !selectedFile
      ? <iframe title={`Vorschau ${selectedFile?.path || project.title}`} sandbox="" referrerPolicy="no-referrer" srcDoc={previewHtml} className="h-full w-full bg-white" />
      : <div className="flex h-full items-center justify-center p-8 text-center text-white/45"><div><ImageIcon className="mx-auto mb-3 h-8 w-8" /><p className="font-black text-white">Keine visuelle Vorschau</p><p className="mt-1 text-sm">{fileLabel(selectedFile)} · Im ZIP vollständig enthalten.</p></div></div>;

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f7] lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen grid-rows-[auto_1fr] lg:h-full lg:min-h-0">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/[0.075] bg-[#070707]/95 px-4 py-3 backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="Zurück zum Crawler" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white hover:text-black"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black">{project.title}</h1>
              <p className="truncate text-xs text-white/40">{project.rootUrl}</p>
            </div>
          </div>
          <button onClick={() => downloadScrapeZip(project)} className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-black text-black transition hover:bg-sky-100"><Download className="mr-2 h-4 w-4" />ZIP Export</button>
        </header>

        <section className="grid min-h-0 bg-[#111] lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="min-h-0 border-b border-white/[0.075] bg-[#080808] lg:border-b-0 lg:border-r">
            <div className="border-b border-white/[0.075] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">Crawler Result</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-white/45">
                <Stat value={project.stats.pages} label="Pages" />
                <Stat value={project.stats.files} label="Files" />
                <Stat value={project.stats.assets} label="Assets" />
              </div>
              <label className="mt-4 flex h-10 items-center gap-2 rounded-xl bg-white/[0.08] px-3 text-sm text-white/35 focus-within:ring-2 focus-within:ring-sky-400/50">
                <Search className="h-4 w-4 shrink-0" />
                <span className="sr-only">Dateien durchsuchen</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dateien suchen" className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/30" />
              </label>
            </div>
            <div className="max-h-80 overflow-auto p-3 lg:h-[calc(100vh-214px)] lg:max-h-none">
              {htmlFiles.length ? <><PanelTitle label="Pages" count={htmlFiles.length} /><div className="mb-5 mt-2 space-y-1">{htmlFiles.map((file) => <FileButton key={`page-${file.path}`} file={file} active={file.path === selectedPath} onClick={() => selectFile(file)} page />)}</div></> : null}
              <PanelTitle label="Files" count={filteredFiles.length} />
              <div className="mt-2 space-y-1">
                {filteredFiles.map((file) => <FileButton key={file.path} file={file} active={file.path === selectedPath} onClick={() => selectFile(file)} />)}
                {!filteredFiles.length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/35">Keine Dateien gefunden.</p> : null}
              </div>
            </div>
          </aside>

          <section className="relative min-h-[64vh] min-w-0 bg-[#171717] lg:min-h-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,156,255,.12),transparent_32%),linear-gradient(to_right,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:auto,40px_40px,40px_40px]" />
            <div className="relative flex h-full min-h-[64vh] flex-col p-3 sm:p-5 lg:min-h-0">
              <div className="mx-auto mb-3 flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#149cff]/15 px-3 py-2 text-xs font-black text-[#19a7ff] ring-1 ring-[#149cff]/20">
                <span className="max-w-full truncate">{selectedFile?.path || "Preview"}</span>
                <div className="flex rounded-xl bg-black/30 p-1">
                  <ModeButton active={viewMode === "preview"} onClick={() => setViewMode("preview")} icon={<Eye className="h-3.5 w-3.5" />} label="Preview" />
                  <ModeButton active={viewMode === "code"} onClick={() => setViewMode("code")} icon={<Code2 className="h-3.5 w-3.5" />} label="Code" />
                  <ModeButton active={viewMode === "report"} onClick={() => setViewMode("report")} icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Report" />
                </div>
              </div>
              <div className="mx-auto min-h-0 w-full max-w-[1120px] flex-1 overflow-hidden rounded-[1.15rem] border border-white/10 bg-black shadow-2xl shadow-black/45">
                {viewMode === "preview" ? previewContent : viewMode === "report" ? <pre className="h-full min-h-[55vh] overflow-auto bg-[#090909] p-5 font-mono text-xs leading-6 text-white/75 lg:min-h-0">{report}</pre> : selectedFile?.encoding === "utf-8" ? <pre className="h-full min-h-[55vh] overflow-auto whitespace-pre-wrap break-words bg-[#090909] p-5 font-mono text-xs leading-6 text-white/75 lg:min-h-0">{selectedFile.content}</pre> : <div className="flex h-full min-h-[55vh] items-center justify-center text-center text-white/45 lg:min-h-0"><div><ImageIcon className="mx-auto mb-3 h-8 w-8" /><p className="font-black text-white">Binary asset</p><p className="mt-1 text-sm">Im ZIP vollständig enthalten.</p></div></div>}
              </div>
            </div>
          </section>

          <aside className="min-h-0 overflow-auto border-t border-white/[0.075] bg-[#080808] p-4 lg:border-l lg:border-t-0">
            <InfoCard icon={<Globe2 className="h-4 w-4 text-sky-300" />} title="Crawl Summary">
              <div className="mt-4 space-y-3 text-xs text-white/55">
                <Row label="Root" value={project.rootUrl} />
                <Row label="Created" value={new Date(project.createdAt).toLocaleString("de-DE")} />
                <Row label="Total" value={`${Math.max(1, Math.round(project.stats.totalBytes / 1024))} KB`} />
                <Row label="Images" value={String(imageFiles.length)} />
              </div>
            </InfoCard>
            <InfoCard icon={<Download className="h-4 w-4" />} title="Portable Export" className="mt-4">
              <p className="mt-3 text-xs leading-5 text-white/45">Enthält Quelldateien, Crawl-Report und maschinenlesbare Manifeste für GitHub.</p>
              <button onClick={() => downloadScrapeZip(project)} className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-black text-black transition hover:bg-sky-100"><Download className="mr-2 h-4 w-4" />Download ZIP</button>
            </InfoCard>
            {project.stats.warnings.length ? <section className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4"><h2 className="flex items-center gap-2 text-sm font-black text-amber-100"><AlertTriangle className="h-4 w-4" /> Hinweise ({project.stats.warnings.length})</h2><div className="mt-3 max-h-56 space-y-2 overflow-auto text-xs leading-5 text-amber-50/70">{project.stats.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></section> : <section className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-xs leading-5 text-emerald-100/75"><ShieldCheck className="mb-2 h-4 w-4" />Crawl ohne Warnungen abgeschlossen.</section>}
          </aside>
        </section>
      </div>
    </main>
  );
}

function FileButton({ active, file, onClick, page = false }: { active: boolean; file: ScrapedFile; onClick: () => void; page?: boolean }) {
  const Icon = page ? Folder : FileCode2;
  return <button type="button" onClick={onClick} title={fileLabel(file)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${page ? "text-sm" : "text-xs"} ${active ? "bg-white text-black" : "text-white/55 hover:bg-white/[0.08] hover:text-white"}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.path}</span>{page ? null : <span className="text-[10px] opacity-60">{file.kind}</span>}</button>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.045] p-2"><b className="block font-mono text-white">{value}</b>{label}</div>;
}

function PanelTitle({ label, count }: { label: string; count: number }) {
  return <div className="flex items-center justify-between px-1 text-xs font-black text-white/50"><span>{label}</span><span className="font-mono text-white/30">{count}</span></div>;
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${active ? "bg-white text-black" : "text-white/50 hover:text-white"}`}>{icon}{label}</button>;
}

function InfoCard({ children, className = "", icon, title }: { children: React.ReactNode; className?: string; icon: React.ReactNode; title: string }) {
  return <section className={`rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 ${className}`}><h2 className="flex items-center gap-2 text-sm font-black">{icon}{title}</h2>{children}</section>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><div className="text-white/30">{label}</div><div className="break-all font-semibold text-white/75">{value}</div></div>;
}
