"use client";
import { useMemo, useState } from "react";
import { Brain, Check, Clipboard, Sparkles } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import type { SiteProject } from "@/lib/types";

type Provider = "ChatGPT" | "Claude" | "Gemini" | "Perplexity";

function buildPrompt(project: SiteProject | null, provider: Provider) {
  const base = project ? JSON.stringify({ name: project.name, pages: project.pages, brand: project.brand }, null, 2) : "Kein Projekt geladen";
  return `Du bist ein Senior Product Designer und Next.js Architect. Optimiere dieses SiteTransformer-Projekt fuer ein hochprofessionelles Framer/Shopify-aehnliches Ergebnis. Antworte ausschliesslich als valides JSON mit keys: brand, blocks, mappingNotes, qualityChecklist. Provider: ${provider}. Projekt:\n${base}`;
}

export function ManualAiPanel() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const [provider, setProvider] = useState<Provider>("ChatGPT");
  const [json, setJson] = useState("");
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => buildPrompt(project, provider), [project, provider]);
  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  function importJson() {
    if (!project || !json.trim()) return;
    const parsed = JSON.parse(json);
    const next = { ...project, brand: parsed.brand ? { ...project.brand, ...parsed.brand } : project.brand };
    if (Array.isArray(parsed.blocks)) {
      next.pages = project.pages.map((page, pageIndex) => pageIndex === 0 ? { ...page, blocks: page.blocks.map((block, index) => ({ ...block, content: { ...block.content, ...(parsed.blocks[index]?.content || parsed.blocks[index] || {}) }, style: { ...block.style, ...(parsed.blocks[index]?.style || {}) } })) } : page);
    }
    setProject(next);
    setJson("");
  }
  return <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/30"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-semibold text-indigo-200"><Brain className="h-4 w-4" /> Manual LLM Connector</div><h3 className="mt-2 text-xl font-black tracking-tight">Nutze dein Abo ohne API-Kosten</h3><p className="mt-1 text-sm leading-6 text-slate-300">Kopiere den Prompt in {provider}, fuege die JSON-Antwort hier ein und importiere sie ins Projekt.</p></div><Sparkles className="h-5 w-5 text-indigo-300" /></div><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{(["ChatGPT", "Claude", "Gemini", "Perplexity"] as Provider[]).map((p) => <button key={p} onClick={() => setProvider(p)} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${provider === p ? "bg-white text-slate-950" : "bg-white/10 text-white hover:bg-white/15"}`}>{p}</button>)}</div><button onClick={copyPrompt} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400">{copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}{copied ? "Prompt kopiert" : "Prompt kopieren"}</button><textarea value={json} onChange={(e) => setJson(e.target.value)} placeholder="JSON-Antwort aus deinem LLM hier einfuegen..." className="mt-4 h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400" /><button onClick={importJson} className="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-indigo-50">JSON importieren</button></section>;
}
