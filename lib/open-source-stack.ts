export interface OpenSourceRepository {
  owner: string;
  repo: string;
  category: "scraping" | "animation" | "editor" | "automation" | "export" | "ai";
  description: string;
  featureIdeas: string[];
}

export function githubUrl(repository: Pick<OpenSourceRepository, "owner" | "repo">) {
  return `https://github.com/${repository.owner}/${repository.repo}`;
}

export function gitMcpUrl(repository: Pick<OpenSourceRepository, "owner" | "repo">) {
  return `gitmcp://github.com/${repository.owner}/${repository.repo}`;
}

export const stackPrinciples = [
  "Preserve the crawled design structure before applying content changes.",
  "Keep exports transparent: include raw files, metadata, and transformation manifests.",
  "Prefer open-source building blocks for scraping, editing, animation, and export workflows.",
  "Separate heavy crawling from Vercel by using optional worker services.",
  "Make every generated project portable to ZIP, GitHub, and future Next.js exports."
] as const;

export const integrationRoadmap = [
  {
    phase: "Crawler quality",
    goals: ["Attach Scrapling worker for dynamic pages", "Add crawl depth controls", "Track failed assets and retries"]
  },
  {
    phase: "Visual editing",
    goals: ["Click-to-select DOM nodes", "Editable text/image slots", "Undo/redo for visual changes"]
  },
  {
    phase: "Framer-style polish",
    goals: ["Motion presets", "Responsive preview controls", "Reusable section extraction"]
  },
  {
    phase: "Delivery",
    goals: ["Full ZIP export", "GitHub push", "Next.js project export", "Deployment handoff"]
  }
] as const;

export const openSourceRepositories: OpenSourceRepository[] = [
  {
    owner: "D4Vinci",
    repo: "Scrapling",
    category: "scraping",
    description: "Adaptive Python scraping framework suitable for stronger crawl workers.",
    featureIdeas: ["Dynamic fetcher worker", "Pause/resume spider jobs", "Failed asset retry queue"]
  },
  {
    owner: "motiondivision",
    repo: "motion",
    category: "animation",
    description: "Animation library for Framer-style motion presets in exported projects.",
    featureIdeas: ["Scroll reveal preset", "Hover scale preset", "Page transition preset"]
  },
  {
    owner: "microsoft",
    repo: "monaco-editor",
    category: "editor",
    description: "Production-grade in-browser code editor for file editing mode.",
    featureIdeas: ["Syntax highlighting", "Multi-file tabs", "Search and replace"]
  },
  {
    owner: "vercel",
    repo: "next.js",
    category: "export",
    description: "Target framework for future generated project exports.",
    featureIdeas: ["App Router export", "Image optimization handoff", "Static route generation"]
  },
  {
    owner: "Durafen",
    repo: "AI-Cli",
    category: "ai",
    description: "Optional local AI orchestration pattern for CLI-based editing assistants.",
    featureIdeas: ["Local file refactor assistant", "Content rewrite helper", "No direct model API dependency"]
  }
];
