"use client";
import { useMemo, useState } from "react";
import { Code2, Download, Eye, FileCode2, Folder, GitBranch, Save, UploadCloud } from "lucide-react";
import type { ScrapeProject, ScrapedFile } from "@/lib/scrape-types";
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
  const byPath = new Map(project.files.map((file) => [file.path.replace(/^\/+/, ""), file]));
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

export function ScrapeEditor({ initialProject }: { initialProject: ScrapeProject }) {
  const [project, setProject] = useState(initialProject);
  const [selectedPath, setSelectedPath] = useState(initialProject.files[0]?.path || "");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [status, setStatus] = useState("");
  const [pushing, setPushing] = useState(false);
  const selectedFile = useMemo(() => project.files.find((f) => f.path === selectedPath), [project.files, selectedPath]);
  const editable = selectedFile?.encoding === "utf-8";
  const previewHtml = useMemo(() => buildPreviewHtml(project, selectedFile), [project, selectedFile]);

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

  return <main className="min-h-screen bg-[#0d1117] text-[#f0f6fc]"><header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#30363d] bg-[#010409]/95 px-5 backdrop-blur"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#30363d] bg-[#161b22]"><Folder className="h-4 w-4" /></div><div><h1 className="text-sm font-semibold">{project.title}</h1><p className="text-xs text-[#8b949e]">{project.rootUrl}</p></div></div><div className="flex items-center gap-2"><button onClick={saveLocal} className="inline-flex items-center rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm font-semibold hover:bg-[#30363d]"><Save className="mr-2 h-4 w-4" />Speichern</button><button onClick={() => downloadScrapeZip(project)} className="inline-flex items-center rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm font-semibold hover:bg-[#30363d]"><Download className="mr-2 h-4 w-4" />ZIP</button></div></header><section className="grid min-h-[calc(100vh-4rem)] grid-cols-[320px_1fr_360px]"><aside className="border-r border-[#30363d] bg-[#010409] p-3"><div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs text-[#8b949e]"><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-2"><b className="block text-[#f0f6fc]">{project.stats.pages}</b>Pages</div><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-2"><b className="block text-[#f0f6fc]">{project.stats.assets}</b>Assets</div><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-2"><b className="block text-[#f0f6fc]">{project.stats.files}</b>Files</div></div><div className="space-y-1 overflow-auto pr-1 text-sm">{project.files.map((file) => <button key={file.path} onClick={() => { setSelectedPath(file.path); if (file.kind === "html") setViewMode("preview"); }} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${file.path === selectedPath ? "bg-[#1f6feb] text-white" : "text-[#c9d1d9] hover:bg-[#161b22]"}`}><FileCode2 className="h-4 w-4 shrink-0" /><span className="truncate">{file.path}</span></button>)}</div></aside><section className="min-w-0 bg-[#0d1117]"><div className="flex h-12 items-center justify-between border-b border-[#30363d] px-4"><div><p className="text-sm font-semibold">{selectedFile?.path || "Keine Datei"}</p><p className="text-xs text-[#8b949e]">{selectedFile ? fileLabel(selectedFile) : "Preview der gecrawlten Seite"}</p></div><div className="inline-flex rounded-lg border border-[#30363d] bg-[#161b22] p-1"><button onClick={() => setViewMode("preview")} className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold ${viewMode === "preview" ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</button><button onClick={() => setViewMode("code")} className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold ${viewMode === "code" ? "bg-[#1f6feb] text-white" : "text-[#8b949e] hover:text-white"}`}><Code2 className="mr-1.5 h-3.5 w-3.5" />Code</button></div></div>{viewMode === "preview" ? <div className="h-[calc(100vh-7rem)] bg-white"><iframe title="Gecrawlte Seiten-Preview" sandbox="allow-same-origin allow-forms" srcDoc={previewHtml} className="h-full w-full bg-white" /></div> : selectedFile ? editable ? <textarea value={selectedFile.content} onChange={(e) => updateSelected(e.target.value)} spellCheck={false} className="h-[calc(100vh-7rem)] w-full resize-none bg-[#0d1117] p-5 font-mono text-sm leading-6 text-[#c9d1d9] outline-none" /> : <div className="flex h-[calc(100vh-7rem)] items-center justify-center p-8 text-center text-[#8b949e]"><div><p className="font-semibold text-[#f0f6fc]">Binaerdatei</p><p className="mt-2 text-sm">Diese Datei wird im ZIP und GitHub Push gespeichert, aber nicht im Browser editiert.</p></div></div> : null}</section><aside className="border-l border-[#30363d] bg-[#010409] p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><GitBranch className="h-4 w-4" /> GitHub Push</h2><p className="mt-2 text-sm leading-6 text-[#8b949e]">Push die aktuelle, bearbeitete Ordnerstruktur in ein Repository. In Vercel muss `GITHUB_TOKEN` gesetzt sein.</p><input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" className="mt-4 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#1f6feb]" /><input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="mt-2 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#1f6feb]" /><button onClick={pushToGitHub} disabled={!repo || pushing} className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-[#238636] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50"><UploadCloud className="mr-2 h-4 w-4" />{pushing ? "Pushe..." : "Auf GitHub pushen"}</button>{status ? <p className="mt-4 rounded-md border border-[#30363d] bg-[#161b22] p-3 text-sm text-[#c9d1d9]">{status}</p> : null}<div className="mt-6 rounded-md border border-[#30363d] bg-[#161b22] p-3 text-xs leading-5 text-[#8b949e]"><b className="text-[#f0f6fc]">Preview:</b><br />HTML wird mit den gecrawlten lokalen Assets als iframe gerendert. Scripts bleiben aus Sicherheitsgruenden deaktiviert.</div></aside></section></main>;
}
