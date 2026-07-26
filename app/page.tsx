"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Code2,
  Download,
  Eye,
  FileCode2,
  GitBranch,
  Globe2,
  Loader2,
  Search
} from "lucide-react";
import { OpenSourceStackPanel } from "@/components/OpenSourceStackPanel";
import { saveScrapeProject } from "@/lib/scrape-storage";
import type { ScrapeProject } from "@/lib/scrape-types";

const features = [
  { label: "Echte Dateien", detail: "HTML, CSS, JS und Assets", icon: FileCode2 },
  { label: "Visuelle Prüfung", detail: "Preview, Code und Report", icon: Eye },
  { label: "Portabler Export", detail: "ZIP und GitHub-Struktur", icon: Download }
];

async function readJsonOrThrow(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
    throw new Error(clean || `Server returned non-JSON response (${res.status}).`);
  }
}

export default function ScraperHome() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function scrape(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError("");
    setStatus("Website wird geprüft und erfasst …");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 65_000);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), maxPages: 6, maxAssets: 60, mode: "auto" }),
        cache: "no-store",
        signal: controller.signal
      });
      const data = await readJsonOrThrow(res);
      if (!res.ok) throw new Error(data.error || "Die Website konnte nicht gecrawlt werden.");
      const project = data.project as ScrapeProject | undefined;
      if (!project?.id || !Array.isArray(project.files)) throw new Error("Der Server hat kein gültiges Crawl-Projekt geliefert.");
      setStatus(`${project.stats.files} Dateien erfasst. Ergebnis wird geöffnet …`);
      await saveScrapeProject(project);
      router.push(`/scrape/${project.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unbekannter Fehler";
      setStatus("");
      setError(e instanceof Error && e.name === "AbortError" ? "Der Crawl hat das Zeitlimit erreicht. Versuche eine kleinere oder weniger geschützte Website." : message);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0a0a] text-[#f7f7f5]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,.11),transparent_38%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8">
        <header className="flex h-20 items-center justify-between border-b border-white/10">
          <a href="#" className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-black">
              <Search className="h-4 w-4" strokeWidth={2.5} />
            </span>
            SiteTransformer
          </a>
          <nav className="hidden items-center gap-7 text-sm text-white/55 md:flex" aria-label="Hauptnavigation">
            <a className="transition hover:text-white" href="#workflow">Workflow</a>
            <a className="transition hover:text-white" href="#technology">Technologie</a>
          </nav>
          <a
            href="https://github.com/norvik-intelligence/sitetransformer"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm font-medium text-white/75 transition hover:bg-white hover:text-black"
          >
            <GitBranch className="h-4 w-4" /> <span className="hidden sm:inline">GitHub</span>
          </a>
        </header>

        <section className="pb-24 pt-20 text-center sm:pt-28 lg:pb-32 lg:pt-36">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7c8cff] shadow-[0_0_12px_#7c8cff]" />
            Website Capture für GitHub + Vercel
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl text-[clamp(3.4rem,8.6vw,8rem)] font-semibold leading-[0.88] tracking-[-0.075em]">
            Aus Websites werden
            <span className="block text-white/42">portable Projekte.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/48 sm:text-lg">
            Erfasse HTML, Styles, Scripts und Bilder. Prüfe das Ergebnis visuell und exportiere eine saubere, nachvollziehbare Projektstruktur.
          </p>

          <form onSubmit={scrape} className="mx-auto mt-10 max-w-3xl text-left">
            <div className="rounded-[22px] border border-white/12 bg-white/[0.075] p-2 shadow-[0_30px_90px_rgba(0,0,0,.45)] backdrop-blur-xl">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="flex h-14 min-w-0 items-center gap-3 rounded-2xl bg-black/35 px-4 ring-1 ring-inset ring-white/[0.06] focus-within:ring-[#7c8cff]/70">
                  <Globe2 className="h-4 w-4 shrink-0 text-white/35" />
                  <span className="sr-only">Website URL</span>
                  <input
                    aria-label="Website URL"
                    inputMode="url"
                    autoComplete="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://deine-website.de"
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/25"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!url.trim() || loading}
                  className="inline-flex h-14 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-black transition duration-200 hover:bg-[#dfe3ff] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? "Wird erfasst …" : "Start crawler"}
                  {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </button>
              </div>
              {status ? (
                <div role="status" aria-live="polite" className="mt-2 rounded-2xl border border-[#7c8cff]/20 bg-[#7c8cff]/10 px-4 py-3 text-sm text-[#dfe3ff]">
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{status}</span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-2/3 animate-pulse rounded-full bg-[#9ca8ff]" /></span>
                </div>
              ) : null}
              {error ? <p role="alert" className="mt-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
            </div>
            <p className="mt-3 text-center text-xs text-white/28">Öffentliche Websites · keine Anmeldung erforderlich</p>
          </form>
        </section>

        <section id="workflow" className="relative mx-auto max-w-6xl pb-28">
          <div className="absolute inset-x-20 top-0 h-48 bg-[#6677ff]/15 blur-[110px]" />
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#101010] shadow-[0_50px_140px_rgba(0,0,0,.6)]">
            <div className="flex h-12 items-center justify-between border-b border-white/[0.08] px-4">
              <div className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/15" /><i className="h-2.5 w-2.5 rounded-full bg-white/15" /><i className="h-2.5 w-2.5 rounded-full bg-white/15" /></div>
              <span className="text-[11px] font-medium text-white/35">sitetransformer.app / studio</span>
              <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300">Ready</span>
            </div>
            <div className="grid min-h-[430px] md:grid-cols-[220px_1fr]">
              <div className="hidden border-r border-white/[0.08] p-4 md:block">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">Project</p>
                <div className="mt-4 space-y-1 text-xs">
                  {["index.html", "styles/global.css", "scripts/app.js", "images/hero.webp"].map((file, index) => (
                    <div key={file} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${index === 0 ? "bg-white text-black" : "text-white/38"}`}>
                      <Code2 className="h-3.5 w-3.5" />{file}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#151515] p-3 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-white/35">index.html</span>
                  <div className="flex rounded-lg bg-black/40 p-1 text-[11px]"><span className="rounded-md bg-white px-2.5 py-1 text-black">Preview</span><span className="px-2.5 py-1 text-white/35">Code</span></div>
                </div>
                <div className="flex min-h-[335px] flex-col overflow-hidden rounded-2xl bg-[#f5f5f2] text-[#111]">
                  <div className="flex h-11 items-center justify-between border-b border-black/10 px-5 text-[11px] font-medium"><span>Studio / Home</span><span>Menu</span></div>
                  <div className="flex flex-1 flex-col justify-end p-6 sm:p-9">
                    <p className="text-xs text-black/45">Captured faithfully.</p>
                    <p className="mt-3 max-w-lg text-4xl font-semibold leading-[.95] tracking-[-.055em] sm:text-6xl">A real website.<br />Ready to inspect.</p>
                    <div className="mt-6 flex items-center gap-2 text-xs"><span className="rounded-full bg-black px-3 py-2 text-white">Explore preview</span><span className="rounded-full border border-black/15 px-3 py-2">View code</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative mt-5 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return <div key={feature.label} className="bg-[#0d0d0d] p-5 text-left"><Icon className="h-4 w-4 text-white/55" /><p className="mt-6 text-sm font-medium">{feature.label}</p><p className="mt-1 text-xs text-white/35">{feature.detail}</p></div>;
            })}
          </div>
        </section>

        <OpenSourceStackPanel />

        <footer className="flex flex-col gap-4 border-t border-white/10 py-8 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 SiteTransformer</span>
          <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> GitHub verbunden · Vercel bereit</span>
        </footer>
      </div>
    </main>
  );
}
