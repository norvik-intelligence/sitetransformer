"use client";
import { useState } from "react";
import { ArrowRight, Boxes, Code2, Download, GitBranch, Globe2, Layers3, Loader2, MousePointer2, Search, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { OpenSourceStackPanel } from "@/components/OpenSourceStackPanel";
import { saveScrapeProject } from "@/lib/scrape-storage";

const proofPoints = [
  { label: "Capture", value: "HTML · CSS · JS · Assets", icon: Globe2 },
  { label: "Studio", value: "Preview · Code · Content map", icon: MousePointer2 },
  { label: "Ship", value: "ZIP · GitHub · Blueprint", icon: GitBranch }
];

const pipeline = ["Research", "Crawl", "Normalize", "Edit", "Blueprint", "Ship"];

export default function ScraperHome() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function scrape() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scrape", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, maxPages: 8, maxAssets: 100 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scraping fehlgeschlagen");
      await saveScrapeProject(data.project);
      window.location.href = `/scrape/${data.project.id}`;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Fehler";
      setError(message.includes("quota") || message.includes("Quota") ? "Die Website ist sehr gross. Der Scrape wurde verarbeitet, konnte aber nicht lokal gespeichert werden. Bitte nach dem Deployment erneut versuchen." : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#03030a] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-22rem] h-[50rem] w-[50rem] -translate-x-1/2 rounded-full bg-violet-500/35 blur-[130px]" />
        <div className="absolute right-[-16rem] top-24 h-[38rem] w-[38rem] rounded-full bg-cyan-400/25 blur-[125px]" />
        <div className="absolute bottom-[-20rem] left-[-14rem] h-[44rem] w-[44rem] rounded-full bg-fuchsia-500/25 blur-[125px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.055)_1px,transparent_1px)] bg-[size:70px_70px] [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 md:px-8">
        <header className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-white/[0.06] px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black shadow-xl shadow-white/10">
              <Search className="h-5 w-5" />
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-[#03030a]" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight">SiteTransformer</div>
              <div className="text-xs text-white/45">Crawler Studio · Open Framer Blueprint</div>
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 text-xs font-bold text-white/55 md:flex">
            {pipeline.slice(1, 5).map((step, index) => <span key={step} className={`rounded-full px-3 py-1.5 ${index === 0 ? "bg-white text-black" : "text-white/55"}`}>{step}</span>)}
          </div>
          <a href="#open-stack" className="hidden rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/70 backdrop-blur transition hover:bg-white/[0.1] md:block">OSS stack</a>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.04fr_.96fr]">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.075] px-4 py-2 text-sm font-bold text-white/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-violet-300" /> GitMCP-powered crawler-to-Framer studio
            </div>
            <h1 className="mt-7 text-[clamp(4.4rem,10vw,9.7rem)] font-black leading-[0.8] tracking-[-0.09em]">
              <span className="block bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">Crawl.</span>
              <span className="block bg-gradient-to-r from-violet-200 via-white to-cyan-200 bg-clip-text text-transparent">Remix.</span>
              <span className="block bg-gradient-to-b from-white to-white/45 bg-clip-text text-transparent">Ship.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-9 text-white/58">Ein Open-Source Studio, das Websites crawlt, als echte Dateien speichert, visuell editierbar macht und als Framer-artigen Motion Blueprint exportiert — ohne Lock-in.</p>

            <div className="mt-9 max-w-3xl rounded-[2.1rem] border border-white/12 bg-white/[0.08] p-2.5 shadow-[0_30px_110px_rgba(0,0,0,.55)] backdrop-blur-2xl">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://website-to-transform.com" className="h-16 rounded-[1.5rem] border border-white/10 bg-black/35 px-5 text-base font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/40 focus:ring-4 focus:ring-cyan-200/10" />
                <button onClick={scrape} disabled={!url || loading} className="inline-flex h-16 items-center justify-center rounded-[1.5rem] bg-white px-6 text-sm font-black text-black shadow-2xl shadow-white/10 transition hover:scale-[1.015] hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{loading ? "Crawling..." : "Start crawler"}
                </button>
              </div>
              {error ? <p className="mt-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">{error}</p> : null}
            </div>

            <div className="mt-8 grid max-w-3xl gap-3 text-sm md:grid-cols-3">
              {proofPoints.map((point) => {
                const Icon = point.icon;
                return <div key={point.label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-white/55 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.07]"><Icon className="mb-4 h-5 w-5 text-cyan-300" /><b className="block text-white">{point.label}</b><span>{point.value}</span></div>;
              })}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-tr from-violet-500/25 via-white/5 to-cyan-400/20 blur-3xl" />
            <div className="relative rotate-1 rounded-[2.4rem] border border-white/12 bg-white/[0.08] p-3 shadow-[0_50px_140px_rgba(0,0,0,.65)] backdrop-blur-2xl">
              <div className="rounded-[1.8rem] border border-white/10 bg-[#080a12] p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-yellow-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" /></div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/55">crawler studio</div>
                </div>
                <div className="grid gap-4 pt-4 md:grid-cols-[.74fr_1.26fr]">
                  <div className="space-y-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                      <div className="mb-3 flex items-center gap-2 text-xs font-bold text-white/45"><Layers3 className="h-4 w-4" /> Pipeline</div>
                      {pipeline.map((step, index) => <div key={step} className={`mb-1 rounded-lg px-2 py-1.5 text-xs ${index === 1 ? "bg-cyan-400 text-black" : "text-white/45"}`}>{index + 1}. {step}</div>)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-white/45">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3"><Boxes className="mb-2 h-4 w-4 text-violet-300" /> 128 assets</div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-300" /> OSS only</div>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                    <div className="h-52 bg-[radial-gradient(circle_at_30%_20%,#a78bfa,transparent_26%),radial-gradient(circle_at_80%_25%,#22d3ee,transparent_22%),linear-gradient(135deg,#070712,#111827_45%,#f8fafc_46%,#ffffff)] p-5 text-black">
                      <div className="mb-12 flex items-center justify-between"><div className="h-5 w-28 rounded-full bg-black/10" /><Wand2 className="h-5 w-5 text-black/30" /></div>
                      <div className="h-8 w-60 rounded-full bg-black" />
                      <div className="mt-3 h-3 w-44 rounded-full bg-black/20" />
                      <div className="mt-2 h-3 w-32 rounded-full bg-black/20" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-white p-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100 shadow-inner" />)}</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-7 rounded-3xl border border-white/10 bg-black/65 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 text-black"><Download className="h-5 w-5" /></div><div><div className="text-sm font-black">Export ready</div><div className="text-xs text-white/45">ZIP · GitHub · Motion Blueprint</div></div></div>
              </div>
            </div>
          </div>
        </section>

        <OpenSourceStackPanel />
      </div>
    </main>
  );
}
