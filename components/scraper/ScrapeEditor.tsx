"use client";
import { useMemo, useRef, useState } from "react";
import { Code2, Download, Eye, FileCode2, Folder, GitBranch, ImageIcon, Layers3, Loader2, MousePointer2, Save, Sparkles, UploadCloud, Wand2 } from "lucide-react";
import type { ScrapeProject, ScrapedFile } from "@/lib/scrape-types";
import type { ContentSource } from "@/lib/content-import";
import { importContentIntoScrape } from "@/lib/content-import";
import { downloadScrapeZip } from "@/lib/scrape-export";
import { saveScrapeProject } from "@/lib/scrape-storage";

type ViewMode = "code" | "preview";

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

export function ScrapeEditor({ initialProject }: { initialProject: ScrapeProject }) {
  const [project, setProject] = useState(initialProject);
  const [selectedPath, setSelectedPath] = useState(initialProject.files.find((file) => file.kind === "html")?.path || initialProject.files[0]?.path || "");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
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

  return (
    <main className="min-h-screen overflow-hidden bg-[#03030a] text-[#f8fbff]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(139,92,246,.25),transparent_34%),radial-gradient(circle_at_100%_20%,rgba(34,211,238,.18),transparent_32%),linear-gradient(180deg,#03030a,#070711_45%,#03030a)]" />
      <div className="relative flex min-h-screen flex-col p-3 md:p-5">
        <header className="mb-4 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/35 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black shadow-xl shadow-white/10"><Folder className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black md:text-base">{project.title}</h1>
              <p className="truncate text-xs text-white/42">{project.rootUrl}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/45 md:flex md:items-center">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2"><b className="block text-white">{project.stats.pages}</b>Pages</div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2"><b className="block text-white">{project.stats.files}</b>Files</div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2"><b className="block text-white">{assetFiles.length}</b>Assets</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={saveLocal} className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm font-bold hover:bg-white/[0.12]"><Save className="mr-2 h-4 w-4" />Speichern</button>
            <button onClick={() => downloadScrapeZip(project)} className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-black shadow-xl shadow-white/10 hover:bg-violet-100"><Download className="mr-2 h-4 w-4" />ZIP + Blueprint</button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[310px_minmax(0,1fr)_390px]">
          <aside className="min-h-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/45 shadow-2xl shadow-black/25 backdrop-blur-2xl">
            <div className="border-b border-white/10 p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/35"><Layers3 className="h-4 w-4" /> File layers</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/45">
                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3"><b className="block text-white">{htmlFiles.length}</b>HTML Screens</div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3"><b className="block text-white">{Math.round(project.stats.totalBytes / 1024)}</b>KB Total</div>
              </div>
            </div>
            <div className="max-h-[38vh] space-y-1 overflow-auto p-3 text-sm xl:max-h-[calc(100vh-13rem)]">
              {project.files.map((file) => (
                <button key={file.path} onClick={() => { setSelectedPath(file.path); if (file.kind === "html") setViewMode("preview"); }} className={`group flex w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-left transition ${file.path === selectedPath ? "border-white/20 bg-white text-black shadow-lg shadow-white/10" : "border-transparent text-white/62 hover:border-white/10 hover:bg-white/[0.08] hover:text-white"}`}>
                  <FileCode2 className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{file.path}</span>
                  <span className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase md:inline-flex ${file.path === selectedPath ? "border-black/10 bg-black/5 text-black/55" : kindStyles[file.kind]}`}>{file.kind}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#070812] shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.035] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{selectedFile?.path || "Keine Datei"}</p>
                <p className="text-xs text-white/40">{selectedFile ? fileLabel(selectedFile) : "Preview der gecrawlten Seite"}</p>
              </div>
              <div className="inline-flex w-fit rounded-2xl border border-white/10 bg-black/30 p-1">
                <button onClick={() => setViewMode("preview")} className={`inline-flex items-center rounded-xl px-3 py-2 text-xs font-black ${viewMode === "preview" ? "bg-white text-black" : "text-white/45 hover:text-white"}`}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</button>
                <button onClick={() => setViewMode("code")} className={`inline-flex items-center rounded-xl px-3 py-2 text-xs font-black ${viewMode === "code" ? "bg-white text-black" : "text-white/45 hover:text-white"}`}><Code2 className="mr-1.5 h-3.5 w-3.5" />Code</button>
              </div>
            </div>
            <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={async (event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) await replaceHeroImage(file); }} className="relative">
              {dragging ? <div className="absolute inset-0 z-20 flex items-center justify-center bg-violet-500/20 backdrop-blur-sm"><div className="rounded-3xl border border-white/20 bg-black/80 px-6 py-5 text-center shadow-2xl"><ImageIcon className="mx-auto mb-3 h-8 w-8 text-violet-200" /><p className="font-black">Bild fallen lassen</p><p className="text-sm text-white/55">Ersetzt das erste Bild in der aktuellen HTML-Preview.</p></div></div> : null}
              {viewMode === "preview" ? (
                <div className="h-[58vh] bg-white xl:h-[calc(100vh-10.5rem)]"><iframe title="Gecrawlte Seiten-Preview" sandbox="allow-same-origin allow-forms" srcDoc={previewHtml} className="h-full w-full bg-white" /></div>
              ) : selectedFile ? editable ? (
                <textarea value={selectedFile.content} onChange={(e) => updateSelected(e.target.value)} spellCheck={false} className="h-[58vh] w-full resize-none bg-[#070812] p-5 font-mono text-sm leading-6 text-white/78 outline-none xl:h-[calc(100vh-10.5rem)]" />
              ) : (
                <div className="flex h-[58vh] items-center justify-center p-8 text-center text-white/45 xl:h-[calc(100vh-10.5rem)]"><div><p className="font-semibold text-white">Binaerdatei</p><p className="mt-2 text-sm">Diese Datei wird im ZIP und GitHub Push gespeichert, aber nicht im Browser editiert.</p></div></div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-4 overflow-auto rounded-[1.5rem] border border-white/10 bg-black/50 p-4 shadow-2xl shadow-black/25 backdrop-blur-2xl">
            <section className="rounded-[1.4rem] border border-violet-300/20 bg-gradient-to-br from-violet-500/18 to-cyan-400/10 p-4">
              <h2 className="flex items-center gap-2 text-sm font-black"><Sparkles className="h-4 w-4 text-violet-200" /> Content-Webseite importieren</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">Fuege eine zweite Webseite ein. Texte, Meta-Daten, Logos und Bilder werden extrahiert und lokal in das gecrawlte Design gemappt.</p>
              <input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://content-webseite.de" className="mt-4 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm outline-none placeholder:text-white/25 focus:border-cyan-200/40" />
              <button onClick={importContentWebsite} disabled={!contentUrl || importing} className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-white px-3 py-3 text-sm font-black text-black hover:bg-violet-100 disabled:opacity-50">{importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}{importing ? "Importiere..." : "Content uebernehmen"}</button>
            </section>

            <section className="rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-4">
              <h2 className="flex items-center gap-2 text-sm font-black"><MousePointer2 className="h-4 w-4" /> Schnell bearbeiten</h2>
              <p className="mt-2 text-sm leading-6 text-white/45">Ziehe ein Bild direkt auf die Preview oder waehle eines aus. Es ersetzt das erste Bild der aktuellen HTML-Seite.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (file) await replaceHeroImage(file); }} />
              <button onClick={() => fileInputRef.current?.click()} className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm font-bold hover:bg-white/[0.12]"><UploadCloud className="mr-2 h-4 w-4" />Bild ersetzen</button>
            </section>

            <section className="rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-4">
              <h2 className="flex items-center gap-2 text-sm font-black"><GitBranch className="h-4 w-4" /> GitHub Push</h2>
              <p className="mt-2 text-sm leading-6 text-white/45">Push die aktuelle, bearbeitete Ordnerstruktur in ein Repository. In Vercel muss `GITHUB_TOKEN` gesetzt sein.</p>
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" className="mt-4 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm outline-none focus:border-cyan-200/40" />
              <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm outline-none focus:border-cyan-200/40" />
              <button onClick={pushToGitHub} disabled={!repo || pushing} className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-[#238636] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#2ea043] disabled:opacity-50"><UploadCloud className="mr-2 h-4 w-4" />{pushing ? "Pushe..." : "Auf GitHub pushen"}</button>
            </section>

            <section className="rounded-[1.4rem] border border-cyan-300/15 bg-cyan-400/5 p-4">
              <h2 className="text-sm font-black">Blueprint Export</h2>
              <p className="mt-2 text-sm leading-6 text-white/45">Der ZIP Export enthaelt rohe Dateien, Scrape-Report, Open-Source-Stack und `framer-blueprint.json` fuer Motion/React-Weiterverarbeitung.</p>
            </section>

            {status ? <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm text-white/70">{status}</p> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
