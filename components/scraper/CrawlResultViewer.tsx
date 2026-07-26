"use client";
/* eslint-disable @next/next/no-img-element -- Crawl assets are isolated data URLs with unknown dimensions. */

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Code2, Download, Eye, FileCode2, Folder, Globe2, ImageIcon, Loader2, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { ScrapeProject, ScrapedFile } from "@/lib/scrape-types";
import type { ContentSourceBundle } from "@/lib/content-source";
import { downloadEditedSiteZip, downloadScrapeZip } from "@/lib/scrape-export";
import { buildPreviewHtml } from "@/lib/preview-html";

const GrapesJSEditor = dynamic(
  () => import("./GrapesJSEditor").then((module) => module.GrapesJSEditor),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-white/40"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Editor wird geladen …</div> }
);

type ViewMode = "preview" | "code" | "report" | "editor";

function dataUrlFor(file: ScrapedFile, content = file.content) {
  if (file.encoding === "base64") return `data:${file.mimeType};base64,${content}`;
  return `data:${file.mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function fileLabel(file: ScrapedFile) {
  const size = file.bytes < 1024 ? `${file.bytes} B` : `${Math.max(1, Math.round(file.bytes / 1024))} KB`;
  return `${file.kind.toUpperCase()} · ${size}`;
}

export function CrawlResultViewer({ project }: { project: ScrapeProject }) {
  const [selectedPath, setSelectedPath] = useState(
    project.files.find((file) => file.kind === "html" && file.url === project.rootUrl)?.path
      || project.files.find((file) => file.kind === "html" && file.path === "index.html")?.path
      || project.files.find((file) => file.kind === "html")?.path
      || project.files[0]?.path
      || ""
  );
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [query, setQuery] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceStatus, setSourceStatus] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [mapping, setMapping] = useState(false);
  const [editorHtml, setEditorHtml] = useState("");
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
  const targetHtml = useMemo(() => {
    const root = project.files.find((file) => file.kind === "html" && file.url === project.rootUrl)
      || project.files.find((file) => file.kind === "html" && file.path === "index.html")
      || project.files.find((file) => file.kind === "html");
    return root?.encoding === "utf-8" ? root.content : "";
  }, [project]);

  function selectFile(file: ScrapedFile) {
    setSelectedPath(file.path);
    setViewMode(file.kind === "html" || file.kind === "image" ? "preview" : file.encoding === "utf-8" ? "code" : "preview");
  }

  async function extractAndMapContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sourceUrl.trim() || mapping || !targetHtml) return;
    setMapping(true);
    setSourceError("");
    setSourceStatus("Inhalte werden extrahiert …");
    try {
      const crawlResponse = await fetch("/api/content-source/crawl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: sourceUrl.trim() })
      });
      const crawlResult = await crawlResponse.json() as { content?: ContentSourceBundle; error?: string };
      if (!crawlResponse.ok || !crawlResult.content) throw new Error(crawlResult.error || "Inhaltsextraktion fehlgeschlagen.");
      setSourceStatus(`${crawlResult.content.items.length} Inhalte erkannt · KI ordnet sie zu …`);
      const mappingResponse = await fetch("/api/transform/apply-content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ html: targetHtml, source: crawlResult.content })
      });
      const mappingResult = await mappingResponse.json() as { html?: string; error?: string; provider?: string; model?: string; fallbackUsed?: boolean };
      if (!mappingResponse.ok || !mappingResult.html) throw new Error(mappingResult.error || "Content-Mapping fehlgeschlagen.");
      setEditorHtml(mappingResult.html);
      const provider = mappingResult.provider === "openrouter" ? `OpenRouter · ${mappingResult.model || "Auto"}` : "Gemini";
      setSourceStatus(`Content erfolgreich zugeordnet · ${provider}${mappingResult.fallbackUsed ? " (Fallback)" : ""}.`);
      setViewMode("editor");
    } catch (error) {
      setSourceStatus("");
      setSourceError(error instanceof Error ? error.message : "Source-Workflow fehlgeschlagen.");
    } finally {
      setMapping(false);
    }
  }

  const previewContent = selectedFile?.kind === "image"
    ? <div className="flex h-full items-center justify-center overflow-auto bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-6"><img src={dataUrlFor(selectedFile)} alt={selectedFile.path} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" /></div>
    : selectedFile?.kind === "html" || !selectedFile
      ? <iframe title={`Vorschau ${selectedFile?.path || project.title}`} sandbox="" referrerPolicy="no-referrer" srcDoc={previewHtml} className="h-full w-full bg-white" />
      : <div className="flex h-full items-center justify-center p-8 text-center text-white/45"><div><ImageIcon className="mx-auto mb-3 h-8 w-8" /><p className="font-black text-white">Keine visuelle Vorschau</p><p className="mt-1 text-sm">{fileLabel(selectedFile)} · Im ZIP vollständig enthalten.</p></div></div>;

  return (
    <main className="min-h-screen bg-[#090909] text-[#f7f7f5] lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen grid-rows-[auto_1fr] lg:h-full lg:min-h-0">
        <header className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0b0b0b]/95 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="Zurück zum Crawler" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.05] text-white/60 transition hover:bg-white hover:text-black"><ArrowLeft className="h-4 w-4" /></Link>
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-[-.02em]">{project.title}</h1>
              <p className="truncate text-[11px] text-white/32">{project.rootUrl}</p>
            </div>
          </div>
          <button onClick={() => downloadScrapeZip(project)} className="inline-flex h-9 items-center rounded-[11px] bg-white px-4 text-xs font-semibold text-black transition hover:bg-[#dfe3ff]"><Download className="mr-2 h-3.5 w-3.5" />ZIP exportieren</button>
        </header>

        <section className="grid min-h-0 bg-[#111] lg:grid-cols-[264px_minmax(0,1fr)_304px]">
          <aside className="min-h-0 border-b border-white/[0.08] bg-[#0b0b0b] lg:border-b-0 lg:border-r">
            <div className="border-b border-white/[0.08] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/28">Projektdateien</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-white/45">
                <Stat value={project.stats.pages} label="Pages" />
                <Stat value={project.stats.files} label="Files" />
                <Stat value={project.stats.assets} label="Assets" />
              </div>
              <label className="mt-4 flex h-9 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.04] px-3 text-sm text-white/35 focus-within:border-[#7c8cff]/60">
                <Search className="h-4 w-4 shrink-0" />
                <span className="sr-only">Dateien durchsuchen</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dateien suchen" className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/30" />
              </label>
            </div>
            <div className="max-h-80 overflow-auto p-3 lg:h-[calc(100vh-210px)] lg:max-h-none">
              {htmlFiles.length ? <><PanelTitle label="Pages" count={htmlFiles.length} /><div className="mb-5 mt-2 space-y-1">{htmlFiles.map((file) => <FileButton key={`page-${file.path}`} file={file} active={file.path === selectedPath} onClick={() => selectFile(file)} page />)}</div></> : null}
              <PanelTitle label="Files" count={filteredFiles.length} />
              <div className="mt-2 space-y-1">
                {filteredFiles.map((file) => <FileButton key={file.path} file={file} active={file.path === selectedPath} onClick={() => selectFile(file)} />)}
                {!filteredFiles.length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/35">Keine Dateien gefunden.</p> : null}
              </div>
              <section className="mt-5 border-t border-white/[0.08] pt-4">
                <div className="flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[.14em] text-white/32">
                  <Sparkles className="h-3.5 w-3.5 text-[#9ca8ff]" /> Inhaltsquelle
                </div>
                <form onSubmit={extractAndMapContent} className="mt-3 space-y-2">
                  <input
                    aria-label="URL der Inhaltsquelle"
                    inputMode="url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="https://source-website.de"
                    className="h-9 w-full rounded-[9px] border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#7c8cff]/60"
                  />
                  <button type="submit" disabled={!sourceUrl.trim() || mapping || !targetHtml} className="flex h-9 w-full items-center justify-center rounded-[9px] bg-[#7c8cff] text-xs font-semibold text-white transition hover:bg-[#8d9aff] disabled:cursor-not-allowed disabled:opacity-40">
                    {mapping ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                    {mapping ? "Wird verarbeitet …" : "Inhalt extrahieren"}
                  </button>
                </form>
                {sourceStatus ? <p role="status" className="mt-2 text-[11px] leading-4 text-emerald-300/75">{sourceStatus}</p> : null}
                {sourceError ? <p role="alert" className="mt-2 text-[11px] leading-4 text-red-300/80">{sourceError}</p> : null}
              </section>
            </div>
          </aside>

          <section className="relative min-h-[64vh] min-w-0 bg-[#141414] lg:min-h-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,140,255,.1),transparent_34%),linear-gradient(to_right,rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]" />
            <div className="relative flex h-full min-h-[64vh] flex-col p-3 sm:p-5 lg:min-h-0">
              <div className="mx-auto mb-3 flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-white/38">
                <span className="max-w-full truncate font-mono">{selectedFile?.path || "Preview"}</span>
                <div className="flex rounded-[10px] border border-white/[0.07] bg-black/35 p-1">
                  <ModeButton active={viewMode === "preview"} onClick={() => setViewMode("preview")} icon={<Eye className="h-3.5 w-3.5" />} label="Preview" />
                  <ModeButton active={viewMode === "code"} onClick={() => setViewMode("code")} icon={<Code2 className="h-3.5 w-3.5" />} label="Code" />
                  <ModeButton active={viewMode === "report"} onClick={() => setViewMode("report")} icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Report" />
                  <ModeButton active={viewMode === "editor"} onClick={() => setViewMode("editor")} icon={<Sparkles className="h-3.5 w-3.5" />} label="Editor" disabled={!editorHtml} />
                </div>
              </div>
              <div className="mx-auto min-h-0 w-full max-w-[1180px] flex-1 overflow-hidden rounded-[18px] border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,.42)]">
                {viewMode === "preview" ? previewContent : viewMode === "editor" && editorHtml ? <GrapesJSEditor html={editorHtml} onChange={setEditorHtml} /> : viewMode === "report" ? <pre className="h-full min-h-[55vh] overflow-auto bg-[#090909] p-5 font-mono text-xs leading-6 text-white/75 lg:min-h-0">{report}</pre> : selectedFile?.encoding === "utf-8" ? <pre className="h-full min-h-[55vh] overflow-auto whitespace-pre-wrap break-words bg-[#090909] p-5 font-mono text-xs leading-6 text-white/75 lg:min-h-0">{selectedFile.content}</pre> : <div className="flex h-full min-h-[55vh] items-center justify-center text-center text-white/45 lg:min-h-0"><div><ImageIcon className="mx-auto mb-3 h-8 w-8" /><p className="font-black text-white">Binary asset</p><p className="mt-1 text-sm">Im ZIP vollständig enthalten.</p></div></div>}
              </div>
            </div>
          </section>

          <aside className="min-h-0 overflow-auto border-t border-white/[0.08] bg-[#0b0b0b] p-4 lg:border-l lg:border-t-0">
            <InfoCard icon={<Globe2 className="h-4 w-4 text-[#9ca8ff]" />} title="Crawl Summary">
              <div className="mt-4 space-y-3 text-xs text-white/55">
                <Row label="Root" value={project.rootUrl} />
                <Row label="Created" value={new Date(project.createdAt).toLocaleString("de-DE")} />
                <Row label="Total" value={`${Math.max(1, Math.round(project.stats.totalBytes / 1024))} KB`} />
                <Row label="Images" value={String(imageFiles.length)} />
              </div>
            </InfoCard>
            <InfoCard icon={<Download className="h-4 w-4" />} title="Portable Export" className="mt-4">
              <p className="mt-3 text-xs leading-5 text-white/45">Enthält Quelldateien, Crawl-Report und maschinenlesbare Manifeste für GitHub.</p>
              <button onClick={() => downloadScrapeZip(project)} className="mt-4 flex h-10 w-full items-center justify-center rounded-[10px] bg-white text-xs font-semibold text-black transition hover:bg-[#dfe3ff]"><Download className="mr-2 h-3.5 w-3.5" />ZIP herunterladen</button>
              {editorHtml ? <button onClick={() => downloadEditedSiteZip(project, editorHtml)} className="mt-2 flex h-10 w-full items-center justify-center rounded-[10px] bg-[#7c8cff] text-xs font-semibold text-white transition hover:bg-[#8d9aff]"><Sparkles className="mr-2 h-3.5 w-3.5" />Editor-Export</button> : null}
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
  return <button type="button" onClick={onClick} title={fileLabel(file)} className={`flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left transition ${page ? "text-[13px]" : "text-xs"} ${active ? "bg-white text-black" : "text-white/48 hover:bg-white/[0.06] hover:text-white"}`}><Icon className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.path}</span>{page ? null : <span className="text-[9px] uppercase tracking-wide opacity-50">{file.kind}</span>}</button>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="rounded-[10px] border border-white/[0.07] bg-white/[0.035] p-2"><b className="block font-mono text-white/85">{value}</b><span className="text-white/30">{label}</span></div>;
}

function PanelTitle({ label, count }: { label: string; count: number }) {
  return <div className="flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[.14em] text-white/32"><span>{label}</span><span className="font-mono">{count}</span></div>;
}

function ModeButton({ active, onClick, icon, label, disabled = false }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-25 ${active ? "bg-white text-black" : "text-white/40 hover:text-white"}`}>{icon}{label}</button>;
}

function InfoCard({ children, className = "", icon, title }: { children: React.ReactNode; className?: string; icon: React.ReactNode; title: string }) {
  return <section className={`rounded-[14px] border border-white/[0.07] bg-white/[0.035] p-4 ${className}`}><h2 className="flex items-center gap-2 text-sm font-semibold tracking-[-.02em]">{icon}{title}</h2>{children}</section>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><div className="text-white/30">{label}</div><div className="break-all font-semibold text-white/75">{value}</div></div>;
}
