import { ArrowUpRight, Code2, GitBranch, Layers3 } from "lucide-react";

const steps = [
  { number: "01", title: "Capture", copy: "Die Website wird mit ihren relevanten Dateien und Abhängigkeiten erfasst.", icon: Layers3 },
  { number: "02", title: "Inspect", copy: "Preview, Quellcode und Crawl-Report liegen direkt nebeneinander.", icon: Code2 },
  { number: "03", title: "Ship", copy: "Das Ergebnis ist als ZIP und saubere GitHub-Struktur portabel.", icon: GitBranch }
];

export function OpenSourceStackPanel() {
  return (
    <section id="technology" className="pb-28">
      <div className="grid gap-12 border-t border-white/10 pt-20 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/30">Ein klarer Workflow</p>
          <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl">
            Vom Link zum Projekt. Ohne Blackbox.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/42">
            Jede erfasste Datei bleibt sichtbar, prüfbar und exportierbar. Die Anwendung läuft vollständig über GitHub und Vercel.
          </p>
          <a
            href="https://github.com/norvik-intelligence/sitetransformer"
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-white/65 transition hover:text-white"
          >
            Repository ansehen <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="group grid grid-cols-[42px_1fr_auto] items-start gap-4 py-6 sm:grid-cols-[52px_1fr_auto] sm:py-8">
                <span className="font-mono text-xs text-white/25">{step.number}</span>
                <div>
                  <h3 className="text-lg font-medium tracking-[-.025em]">{step.title}</h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-white/38">{step.copy}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/35 transition group-hover:border-white/25 group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
