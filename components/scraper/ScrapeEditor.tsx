"use client";
import { useMemo, useState } from "react";
import { Download, FileCode2, Folder, Github, Save, UploadCloud } from "lucide-react";
import type { ScrapeProject, ScrapedFile } from "@/lib/scrape-types";
import { downloadScrapeZip } from "@/lib/scrape-export";

function fileLabel(file: ScrapedFile) {
  return `${file.kind} · ${Math.round(file.bytes / 1024)} KB`;
}

export function ScrapeEditor({ initialProject }: { initialProject: ScrapeProject }) {
  const [project, setProject] = useState(initialProject);
  const [selectedPath, setSelectedPath] = useState(initialProject.files[0]?.path || "");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [status, setStatus] = useState("");
  const [pushing, setPushing] = useState(false);
  const selectedFile = useMemo(() => project.files.find((f) => f.path === selectedPath), [project.files, selectedPath]);
  const editable = selectedFile?.encoding === "utf-8";

  function updateSelected(content: string) {
    if (!selectedFile) return;
    setProject((current) => ({
      ...current,
      files: current.files.map((file) => file.path === selectedFile.path ? { ...file, content, bytes: new Blob([content]).size } : file)
    }));
  }

  function saveLocal() {
    localStorage.setItem(`scrape:${project.id}`, JSON.stringify(project));
    setStatus("Gespeichert im Browser.");
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

  return <main className="min-h-screen bg-[#0d1117] text-[#f0f6fc]"><header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#30363d] bg-[#010409]/95 px-5 backdrop-blur"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#30363d] bg-[#161b22]"><Folder className="h-4 w-4" /></div><div><h1 className="text-sm font-semibold">{project.title}</h1><p className="text-xs text-[#8b949e]">{project.rootUrl}</p></div></div><div className="flex items-center gap-2"><button onClick={saveLocal} className="inline-flex items-center rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm font-semibold hover:bg-[#30363d]"><Save className="mr-2 h-4 w-4" />Speichern</button><button onClick={() => downloadScrapeZip(project)} className="inline-flex items-center rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm font-semibold hover:bg-[#30363d]"><Download className="mr-2 h-4 w-4" />ZIP</button></div></header><section className="grid min-h-[calc(100vh-4rem)] grid-cols-[320px_1fr_360px]"><aside className="border-r border-[#30363d] bg-[#010409] p-3"><div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs text-[#8b949e]"><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-2"><b className="block text-[#f0f6fc]">{project.stats.pages}</b>Pages</div><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-2"><b className="block text-[#f0f6fc]">{project.stats.assets}</b>Assets</div><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-2"><b className="block text-[#f0f6fc]">{project.stats.files}</b>Files</div></div><div className="space-y-1 overflow-auto pr-1 text-sm">{project.files.map((file) => <button key={file.path} onClick={() => setSelectedPath(file.path)} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${file.path === selectedPath ? "bg-[#1f6feb] text-white" : "text-[#c9d1d9] hover:bg-[#161b22]"}`}><FileCode2 className="h-4 w-4 shrink-0" /><span className="truncate">{file.path}</span></button>)}</div></aside><section className="min-w-0 bg-[#0d1117]"><div className="flex h-12 items-center justify-between border-b border-[#30363d] px-4"><div><p className="text-sm font-semibold">{selectedFile?.path || "Keine Datei"}</p><p className="text-xs text-[#8b949e]">{selectedFile ? fileLabel(selectedFile) : ""}</p></div></div>{selectedFile ? editable ? <textarea value={selectedFile.content} onChange={(e) => updateSelected(e.target.value)} spellCheck={false} className="h-[calc(100vh-7rem)] w-full resize-none bg-[#0d1117] p-5 font-mono text-sm leading-6 text-[#c9d1d9] outline-none" /> : <div className="flex h-[calc(100vh-7rem)] items-center justify-center p-8 text-center text-[#8b949e]"><div><p className="font-semibold text-[#f0f6fc]">Binaerdatei</p><p className="mt-2 text-sm">Diese Datei wird im ZIP und GitHub Push gespeichert, aber nicht im Browser editiert.</p></div></div> : null}</section><aside className="border-l border-[#30363d] bg-[#010409] p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Github className="h-4 w-4" /> GitHub Push</h2><p className="mt-2 text-sm leading-6 text-[#8b949e]">Push die aktuelle, bearbeitete Ordnerstruktur in ein Repository. In Vercel muss `GITHUB_TOKEN` gesetzt sein.</p><input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" className="mt-4 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#1f6feb]" /><input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="mt-2 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm outline-none focus:border-[#1f6feb]" /><button onClick={pushToGitHub} disabled={!repo || pushing} className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-[#238636] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50"><UploadCloud className="mr-2 h-4 w-4" />{pushing ? "Pushe..." : "Auf GitHub pushen"}</button>{status ? <p className="mt-4 rounded-md border border-[#30363d] bg-[#161b22] p-3 text-sm text-[#c9d1d9]">{status}</p> : null}<div className="mt-6 rounded-md border border-[#30363d] bg-[#161b22] p-3 text-xs leading-5 text-[#8b949e]"><b className="text-[#f0f6fc]">Naechster Worker-Modus:</b><br />Fuer dynamische Seiten wird `/api/scrape` optional an `SCRAPLING_WORKER_URL` weiterleiten.</div></aside></section></main>;
}
