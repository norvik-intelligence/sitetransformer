import { ArrowRight, ExternalLink, GitBranch, ServerCog, Sparkles } from "lucide-react";
import { githubUrl, gitMcpUrl, integrationRoadmap, openSourceRepositories, stackPrinciples } from "@/lib/open-source-stack";

const layerLabels = {
  context: "AI context",
  crawl: "Crawler",
  render: "Browser",
  editor: "Editor",
  builder: "Builder",
  ui: "Design system",
  workflow: "Workflow",
  protocol: "MCP"
};

const priorityStyles = {
  now: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  next: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  later: "border-white/15 bg-white/[0.06] text-white/60"
};

export function OpenSourceStackPanel() {
  const nowRepos = openSourceRepositories.filter((repository) => repository.priority === "now");
  const futureRepos = openSourceRepositories.filter((repository) => repository.priority !== "now");

  return (
    <section id="open-stack" className="relative mt-16 overflow-hidden rounded-[2rem] border border-white/10 bg-[#070711]/80 p-5 shadow-[0_40px_120px_rgba(0,0,0,.45)] backdrop-blur-2xl md:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,.28),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(34,211,238,.18),transparent_32%)]" />
      <div className="relative">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">
              <ServerCog className="h-3.5 w-3.5" /> GitHub research → GitMCP installed
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">Open-source stack für ein besseres Framer.</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55 md:text-base">
              Aus der GitHub-Recherche entsteht eine klare Produkt-Roadmap: Crawl-Fidelity wie Playwright/Scrapling, Visual Editing wie GrapesJS/Craft/Webstudio, AI-Kontext über GitMCP und Motion-Blueprints statt Vendor-Lock-in.
            </p>
          </div>
          <a href="https://gitmcp.io/docs" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-black shadow-2xl shadow-white/10 transition hover:-translate-y-0.5 hover:bg-violet-100">
            GitMCP Docs <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>

        <div className="mt-7 grid gap-3 lg:grid-cols-[.85fr_1.15fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200/80">Jetzt einbauen</p>
            <div className="mt-4 space-y-3">
              {nowRepos.map((repository) => (
                <a key={`${repository.owner}/${repository.repo}`} href={gitMcpUrl(repository)} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 transition hover:border-violet-200/40 hover:bg-violet-400/10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-white">{repository.name}</h3>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/45">{layerLabels[repository.layer]}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/45">{repository.role}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-violet-100" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {futureRepos.map((repository) => (
              <article key={`${repository.owner}/${repository.repo}`} className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.07]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">{layerLabels[repository.layer]}</p>
                    <h3 className="mt-1 text-base font-black text-white">{repository.name}</h3>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${priorityStyles[repository.priority]}`}>{repository.priority}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white/75">{repository.role}</p>
                <p className="mt-2 text-sm leading-6 text-white/45">{repository.why}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {repository.featureIdeas.slice(0, 2).map((idea) => <span key={idea} className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-bold text-white/45">{idea}</span>)}
                </div>
                <div className="mt-4 grid gap-2 text-xs font-bold sm:grid-cols-2">
                  <a href={githubUrl(repository)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white/65 hover:text-white">
                    GitHub <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                  <a href={gitMcpUrl(repository)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/10 px-3 py-2 text-violet-100 hover:bg-violet-400/15">
                    GitMCP <GitBranch className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {integrationRoadmap.map((phase) => (
            <div key={phase.phase} className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{phase.phase}</p>
              <h3 className="mt-2 font-black text-white">{phase.outcome}</h3>
              <div className="mt-3 space-y-2">
                {phase.items.map((item) => <p key={item} className="text-xs leading-5 text-white/50"><Sparkles className="mr-2 inline h-3.5 w-3.5 text-cyan-200" />{item}</p>)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-5">
          {stackPrinciples.map((principle) => (
            <div key={principle} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-white/50">
              {principle}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
