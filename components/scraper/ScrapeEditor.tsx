"use client";
import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Code2, Download, Eye, FileCode2, Folder, Globe2, Grid2X2, Hand, ImageIcon, Layers3, LayoutPanelLeft, Loader2, MousePointer2, PanelRight, Play, Plus, Search, Send, Settings2, Sparkles, Square, TextCursorInput, UploadCloud, Wand2 } from "lucide-react";
import type { ScrapeProject, ScrapedFile } from "@/lib/scrape-types";
import type { ContentSource } from "@/lib/content-import";
import { importContentIntoScrape } from "@/lib/content-import";
import { downloadScrapeZip } from "@/lib/scrape-export";
import { saveScrapeProject } from "@/lib/scrape-storage";

type ViewMode = "code" | "preview";
type LeftTab = "pages" | "layers" | "assets";

function fileLabel(file: ScrapedFile) {
  return `${file.kind} · ${Math.round(file.bytes / 1024)} KB`;
}

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

function replaceFirstImageInHtml(html: string, imageDataUrl: string) {
  return html.replace(/(<img[^>]+src=["'])([^"']+)(["'][^>]*>)/i, `$1${imageDataUrl}$3`);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Bild konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

const kindStyles: Record<ScrapedFile["kind"], string> = {
  html: "bg-orange-400/10 text-orange-100 border-orange-300/20",
  css: "bg-sky-400/10 text-sky-100 border-sky-300/20",
  js: "bg-yellow-400/10 text-yellow-100 border-yellow-300/20",
  image: "bg-emerald-400/10 text-emerald-100 border-emerald-300/20",
  font: "bg-purple-400/10 text-purple-100 border-purple-300/20",
  json: "bg-cyan-400/10 text-cyan-100 border-cyan-300/20",
  text: "bg-white/[0.06] text-white/65 border-white/10",
  other: "bg-white/[0.06] text-white/50 border-white/10"
};

function shortRoute(path: string) {
  return `/${path.replace(/index\.html$/, "").replace(/\.html$/, "").replace(/^\/+/, "")}`.replace(/\/$/, "") || "/";
}

export function ScrapeEditor({ initialProject }: { initialProject: ScrapeProject }) {
  const [project, setProject] = useState(initialProject);
  const [selectedPath, setSelectedPath] = useState(initialProject.files.find((file) => file.kind === "html")?.path || initialProject.files[0]?.path || "");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [leftTab, setLeftTab] = useState<LeftTab>("pages");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [contentUrl, setContentUrl] = useState("");
  const [status, setStatus] = useState("");
  const [pushing, setPushing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedFile = useMemo(() => project.files.find((f) => f.path === selectedPath), [project.files, selectedPath]);
  const editable = selectedFile?.encoding === "utf-8";
  const previewHtml = useMemo(() => buildPreviewHtml(project, selectedFile), [project, selectedFile]);
  const htmlFiles = useMemo(() => project.files.filter((file) => file.kind === "html"), [project.files]);
  const assetFiles = useMemo(() => project.files.filter((file) => !["html", "css", "js", "json", "text"].includes(file.kind)), [project.files]);
  const imageFiles = useMemo(() => project.files.filter((file) => file.kind === "image"), [project.files]);

  function updateSelected(content: string) {
    if (!selectedFile) return;
    setProject((current) => ({
      ...current,
      files: current.files.map((file) => file.path === selectedFile.path ? { ...file, content, bytes: new Blob([content]).size } : file)
    }));
  }

  async function saveLocal() {
    try {
      await saveScrapeProject(project);
      setStatus("Gespeichert im Browser.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    }
  }

  async function importContentWebsite() {
    if (!contentUrl) return;
    setImporting(true);
    setStatus("");
    try {
      const res = await fetch("/api/content-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contentUrl }) });
      const text = await res.text();
      const data = JSON.parse(text) as { source?: ContentSource; error?: string };
      if (!res.ok || !data.source) throw new Error(data.error || "Content Import fehlgeschlagen");
      const result = importContentIntoScrape(project, data.source);
      setProject(result.project);
      await saveScrapeProject(result.project);
      const firstHtml = result.project.files.find((file) => file.kind === "html")?.path;
      if (firstHtml) setSelectedPath(firstHtml);
      setViewMode("preview");
      setStatus(`Content importiert: ${data.source.title || contentUrl}. ${result.report.length} HTML-Dateien aktualisiert.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Content Import fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  }

  async function replaceHeroImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setStatus("Bitte eine Bilddatei verwenden.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const htmlTarget = selectedFile?.kind === "html" ? selectedFile.path : project.files.find((candidate) => candidate.kind === "html")?.path;
    if (!htmlTarget) {
      setStatus("Keine HTML-Datei fuer Bildersetzung gefunden.");
      return;
    }
    const next: ScrapeProject = {
      ...project,
      files: project.files.map((candidate) => {
        if (candidate.path !== htmlTarget || candidate.encoding !== "utf-8") return candidate;
        const content = replaceFirstImageInHtml(candidate.content, dataUrl);
        return { ...candidate, content, bytes: new Blob([content]).size };
      })
    };
    setProject(next);
    await saveScrapeProject(next);
    setSelectedPath(htmlTarget);
    setViewMode("preview");
    setStatus("Bild per Drag-and-drop ersetzt und gespeichert.");
  }

  async function pushToGitHub() {
    setPushing(true);
    setStatus("");
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

  const topIcon = "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/65 transition hover:bg-white/[0.11] hover:text-white";
  const toolIcon = "inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white/55 transition hover:bg-white/[0.08] hover:text-white";
  const inspectorSection = "rounded-[1.25rem] border border-white/[0.08] bg-white/[0.045] p-4";

  return (
    <main className="h-screen overflow-hidden bg-[#050505] text-[#f5f5f7]">
      <div className="grid h-full grid-rows-[64px_1fr]">
        <header className="flex items-center justify-between border-b border-white/[0.075] bg-[#070707]/95 px-3 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/[0.1] px-3 text-sm font-black text-white shadow-inner shadow-white/5">
              <MousePointer2 className="h-4 w-4" /><ChevronDown className="h-3.5 w-3.5 text-white/45" />
            </button>
            <button className={topIcon}><Plus className="h-4 w-4" /></button>
            <button className={topIcon}><LayoutPanelLeft className="h-4 w-4" /></button>
            <button className={topIcon}><TextCursorInput className="h-4 w-4" /></button>
            <button className={topIcon}><Wand2 className="h-4 w-4" /></button>
            <button className={topIcon}><Grid2X2 className="h-4 w-4" /></button>
          </div>
          <div className="min-w-0 text-center">
            <div className="truncate text-sm font-black tracking-tight">{project.title}</div>
            <div className="truncate text-xs text-white/35">{project.rootUrl}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className={topIcon}><Globe2 className="h-4 w-4" /></button>
            <button className={topIcon}><Settings2 className="h-4 w-4" /></button>
            <button className={topIcon}><PanelRight className="h-4 w-4" /></button>
            <button className={topIcon}><Play className="h-4 w-4" /></button>
            <button className="h-10 rounded-xl bg-white/[0.1] px-4 text-sm font-black text-white hover:bg-white/[0.15]">Invite</button>
            <button onClick={() => downloadScrapeZip(project)} className="h-10 rounded-xl bg-[#149cff] px-4 text-sm font-black text-white shadow-lg shadow-sky-500/25 transition hover:bg-[#3aaeff]">Publish</button>
          </div>
        </header>

        <section className="grid min-h-0 grid-cols-[264px_1fr_304px] bg-[#111111]">
          <aside className="min-h-0 border-r border-white/[0.075] bg-[#080808]">
            <div className="border-b border-white/[0.075] p-3">
              <div className="grid grid-cols-3 rounded-xl bg-white/[0.08] p-1 text-xs font-black text-white/45">
                {(["pages", "layers", "assets"] as LeftTab[]).map((tab) => <button key={tab} onClick={() => setLeftTab(tab)} className={`rounded-lg px-2 py-2 capitalize transition ${leftTab === tab ? "bg-white/18 text-white shadow-inner shadow-white/5" : "hover:text-white"}`}>{tab}</button>)}
              </div>
              <label className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-white/[0.08] px-3 text-sm text-white/35">
                <Search className="h-4 w-4" /><span>Search...</span>
              </label>
            </div>
            <div className="h-[calc(100vh-64px-88px)] overflow-auto p-3">
              {leftTab === "pages" ? <div className="space-y-5">
                <PanelTitle label="Design" count={htmlFiles.length} />
                <div className="space-y-1.5">
                  {htmlFiles.map((file, index) => <button key={file.path} onClick={() => { setSelectedPath(file.path); setViewMode("preview"); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${selectedPath === file.path ? "bg-white text-black" : "text-white/62 hover:bg-white/[0.08] hover:text-white"}`}><Folder className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{index === 0 ? "Home" : shortRoute(file.path)}</span></button>)}
                </div>
                <PanelTitle label="Project" count={project.files.length} />
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-white/42">
                  <Stat value={project.stats.pages} label="Pages" />
                  <Stat value={project.stats.files} label="Files" />
                  <Stat value={assetFiles.length} label="Assets" />
                </div>
              </div> : null}

              {leftTab === "layers" ? <div className="space-y-1.5">
                {project.files.map((file) => <button key={file.path} onClick={() => { setSelectedPath(file.path); if (file.kind === "html") setViewMode("preview"); }} className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${file.path === selectedPath ? "bg-white text-black" : "text-white/55 hover:bg-white/[0.08] hover:text-white"}`}><FileCode2 className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.path}</span><span className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${file.path === selectedPath ? "border-black/10 bg-black/5 text-black/55" : kindStyles[file.kind]}`}>{file.kind}</span></button>)}
              </div> : null}

              {leftTab === "assets" ? <div className="grid grid-cols-2 gap-2">
                {imageFiles.slice(0, 60).map((file) => <button key={file.path} onClick={() => setSelectedPath(file.path)} className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.045] text-left transition hover:border-white/20"><div className="aspect-video bg-white/5">{file.encoding === "base64" ? <img src={dataUrlFor(file)} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" /> : null}</div><p className="truncate p-2 text-[10px] text-white/45">{file.path}</p></button>)}
              </div> : null}
            </div>
          </aside>

          <main className="relative min-w-0 overflow-hidden bg-[#171717]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,156,255,.12),transparent_32%),linear-gradient(to_right,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:auto,40px_40px,40px_40px]" />
            <div className="relative flex h-full flex-col p-6">
              <div className="mx-auto mb-3 flex w-full max-w-[1040px] items-center justify-between rounded-2xl bg-[#149cff]/15 px-3 py-2 text-xs font-black text-[#19a7ff] ring-1 ring-[#149cff]/20">
                <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#149cff] text-white"><Play className="h-3 w-3 fill-current" /></span>{selectedFile?.kind === "html" ? shortRoute(selectedFile.path) : selectedFile?.path || "Canvas"}</div>
                <div className="flex items-center gap-2"><span>Desktop · 1200</span><button className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#149cff] text-white"><Plus className="h-4 w-4" /></button></div>
              </div>
              <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={async (event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) await replaceHeroImage(file); }} className="relative mx-auto min-h-0 w-full max-w-[1040px] flex-1 overflow-hidden rounded-[1.15rem] border border-white/10 bg-black shadow-2xl shadow-black/45">
                {dragging ? <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#149cff]/20 backdrop-blur-sm"><div className="rounded-3xl border border-white/20 bg-black/80 px-6 py-5 text-center shadow-2xl"><ImageIcon className="mx-auto mb-3 h-8 w-8 text-sky-200" /><p className="font-black">Bild fallen lassen</p><p className="text-sm text-white/55">Ersetzt das erste Bild in der aktuellen HTML-Preview.</p></div></div> : null}
                {viewMode === "preview" ? <iframe title="Gecrawlte Seiten-Preview" sandbox="allow-same-origin allow-forms" srcDoc={previewHtml} className="h-full w-full bg-white" /> : selectedFile ? editable ? <textarea value={selectedFile.content} onChange={(e) => updateSelected(e.target.value)} spellCheck={false} className="h-full w-full resize-none bg-[#090909] p-5 font-mono text-sm leading-6 text-white/78 outline-none" /> : <div className="flex h-full items-center justify-center p-8 text-center text-white/45"><div><p className="font-semibold text-white">Binaerdatei</p><p className="mt-2 text-sm">Diese Datei wird im ZIP und GitHub Push gespeichert, aber nicht im Browser editiert.</p></div></div> : null}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center">
                <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-[#101010]/92 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
                  <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black"><MousePointer2 className="h-4 w-4" /></button>
                  <button className={toolIcon}><Hand className="h-4 w-4" /></button>
                  <button className={toolIcon}><Square className="h-4 w-4" /></button>
                  <button className={toolIcon}><Sparkles className="h-4 w-4" /></button>
                  <button className={toolIcon}><Grid2X2 className="h-4 w-4" /></button>
                  <button onClick={() => setViewMode(viewMode === "preview" ? "code" : "preview")} className="ml-2 rounded-xl bg-white/[0.08] px-3 py-2 text-sm font-black text-white/70 hover:bg-white/[0.12]">{viewMode === "preview" ? "Preview" : "Code"} <ChevronDown className="ml-1 inline h-3 w-3" /></button>
                </div>
              </div>
            </div>
          </main>

          <aside className="min-h-0 overflow-auto border-l border-white/[0.075] bg-[#080808] p-4">
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.075] pb-4">
              <div><p className="text-sm font-black">Inspector</p><p className="text-xs text-white/35">{selectedFile ? fileLabel(selectedFile) : "No selection"}</p></div>
              <button className={topIcon}><Settings2 className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4">
              <section className={inspectorSection}>
                <SectionHead title="Content Import" icon={<Sparkles className="h-4 w-4 text-sky-300" />} />
                <p className="mt-2 text-xs leading-5 text-white/42">Importiert Navigation, Logo, Hero-Texte und Hauptbilder in das gecrawlte Design.</p>
                <input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://content-webseite.de" className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#149cff]/60" />
                <button onClick={importContentWebsite} disabled={!contentUrl || importing} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-black text-black transition hover:bg-sky-100 disabled:opacity-50">{importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}{importing ? "Importiere..." : "Content übernehmen"}</button>
              </section>

              <section className={inspectorSection}>
                <SectionHead title="Position" />
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/45"><Control label="X" value="400" /><Control label="Y" value="600" /><Control label="Type" value="Absolute" wide /></div>
              </section>

              <section className={inspectorSection}>
                <SectionHead title="Size" />
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/45"><Control label="Width" value="1200" /><Control label="Height" value="Auto" /></div>
              </section>

              <section className={inspectorSection}>
                <SectionHead title="Quick Edit" icon={<MousePointer2 className="h-4 w-4" />} />
                <p className="mt-2 text-xs leading-5 text-white/42">Ziehe ein Bild auf die Canvas oder wähle eines aus.</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (file) await replaceHeroImage(file); }} />
                <button onClick={() => fileInputRef.current?.click()} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-sm font-black text-white/80 hover:bg-white/[0.11]"><UploadCloud className="mr-2 h-4 w-4" />Bild ersetzen</button>
              </section>

              <section className={inspectorSection}>
                <SectionHead title="Export" icon={<Send className="h-4 w-4" />} />
                <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm outline-none placeholder:text-white/25 focus:border-[#149cff]/60" />
                <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm outline-none placeholder:text-white/25 focus:border-[#149cff]/60" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={pushToGitHub} disabled={!repo || pushing} className="h-10 rounded-xl bg-[#238636] text-xs font-black text-white hover:bg-[#2ea043] disabled:opacity-50">{pushing ? "Pushe..." : "GitHub"}</button>
                  <button onClick={saveLocal} className="h-10 rounded-xl border border-white/10 bg-white/[0.07] text-xs font-black text-white/80 hover:bg-white/[0.11]">Save</button>
                </div>
              </section>

              {status ? <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-xs leading-5 text-white/70">{status}</p> : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function PanelTitle({ label, count }: { label: string; count?: number }) {
  return <div className="flex items-center justify-between px-1 text-xs font-black text-white/50"><span>{label}</span>{typeof count === "number" ? <span className="text-white/28">{count}</span> : null}</div>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.045] p-2"><b className="block text-white">{value}</b>{label}</div>;
}

function SectionHead({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-black text-white">{icon}{title}</h2><Plus className="h-4 w-4 text-white/35" /></div>;
}

function Control({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "col-span-2" : ""}><div className="mb-1 text-white/35">{label}</div><div className="rounded-xl bg-white/[0.08] px-3 py-2 text-right font-black text-white/70">{value}</div></div>;
}
