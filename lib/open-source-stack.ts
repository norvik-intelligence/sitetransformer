export type StackLayer = "context" | "crawl" | "render" | "editor" | "builder" | "ui" | "workflow" | "protocol";
export type AdoptionPriority = "now" | "next" | "later";

export interface OpenSourceRepository {
  owner: string;
  repo: string;
  name: string;
  layer: StackLayer;
  priority: AdoptionPriority;
  role: string;
  why: string;
  featureIdeas: string[];
  license: string;
}

export const openSourceRepositories: OpenSourceRepository[] = [
  {
    owner: "idosal",
    repo: "git-mcp",
    name: "GitMCP",
    layer: "context",
    priority: "now",
    role: "Repo-to-MCP knowledge layer",
    why: "Turns selected GitHub repositories into remote MCP context sources so agents can read current docs and code before changing crawler, editor, or exporter logic.",
    featureIdeas: ["One-click repo research", "Architecture-aware AI prompts", "Dependency upgrade context"],
    license: "Apache-2.0"
  },
  {
    owner: "D4Vinci",
    repo: "Scrapling",
    name: "Scrapling",
    layer: "crawl",
    priority: "now",
    role: "Adaptive Python crawling worker",
    why: "Keeps the existing worker strategy but makes it the primary path for large, stealthier, resumable crawls outside Vercel request limits.",
    featureIdeas: ["Worker crawl mode", "Anti-bot fallback", "Structured scrape reports"],
    license: "BSD-3-Clause"
  },
  {
    owner: "microsoft",
    repo: "playwright",
    name: "Playwright",
    layer: "render",
    priority: "now",
    role: "Browser rendering and visual verification",
    why: "Adds browser-grade capture for JavaScript-heavy sites, screenshots, DOM snapshots, responsive states, and regression checks.",
    featureIdeas: ["Rendered DOM capture", "Responsive screenshots", "Visual diff before export"],
    license: "Apache-2.0"
  },
  {
    owner: "apify",
    repo: "crawlee",
    name: "Crawlee",
    layer: "crawl",
    priority: "next",
    role: "Production crawl queues",
    why: "Provides request queues, autoscaled pools, retries, and storage adapters when SiteTransformer grows from single-site demos to production crawl jobs.",
    featureIdeas: ["Queue dashboard", "Retry policies", "Long-running crawl jobs"],
    license: "Apache-2.0"
  },
  {
    owner: "GrapesJS",
    repo: "grapesjs",
    name: "GrapesJS",
    layer: "builder",
    priority: "next",
    role: "Embeddable web-builder framework",
    why: "Gives SiteTransformer a proven visual HTML/CSS builder path for template editing after a site has been crawled and normalized.",
    featureIdeas: ["Visual template mode", "Block library", "HTML/CSS round-trip editing"],
    license: "BSD-3-Clause"
  },
  {
    owner: "prevwong",
    repo: "craft.js",
    name: "Craft.js",
    layer: "builder",
    priority: "next",
    role: "React page-builder engine",
    why: "Useful for turning inferred sections into editable React component trees with drag-and-drop, props, and design constraints.",
    featureIdeas: ["React section tree", "Drag/drop components", "Editable component props"],
    license: "MIT"
  },
  {
    owner: "webstudio-is",
    repo: "webstudio",
    name: "Webstudio",
    layer: "builder",
    priority: "later",
    role: "Open visual development reference",
    why: "A mature Webflow-style open-source reference for CSS property coverage, accessibility, builder UX, and self-hosting patterns.",
    featureIdeas: ["CSS property inspector", "Design-token model", "Accessible builder UX"],
    license: "AGPL-3.0"
  },
  {
    owner: "plasmicapp",
    repo: "plasmic",
    name: "Plasmic",
    layer: "builder",
    priority: "later",
    role: "React visual-builder reference",
    why: "Strong reference for integrating visual editing with real React components, content workflows, and codebase ownership.",
    featureIdeas: ["Component registration", "Marketing-safe editing", "Reusable section libraries"],
    license: "MIT"
  },
  {
    owner: "onlook-dev",
    repo: "onlook",
    name: "Onlook",
    layer: "editor",
    priority: "next",
    role: "Visual-first React editor reference",
    why: "Shows how AI-first visual editing can modify a real Next.js/Tailwind app while preserving developer control.",
    featureIdeas: ["DOM-click editing", "AI design actions", "Figma-like inspect panel"],
    license: "Apache-2.0"
  },
  {
    owner: "motiondivision",
    repo: "motion",
    name: "Motion",
    layer: "editor",
    priority: "now",
    role: "Framer-style animation primitives",
    why: "Gives exported React components and the editor a Framer-like interaction model without depending on closed-source Framer infrastructure.",
    featureIdeas: ["Motion presets", "Scroll reveals", "Hover/tap interactions"],
    license: "MIT"
  },
  {
    owner: "xyflow",
    repo: "xyflow",
    name: "React Flow / xyflow",
    layer: "workflow",
    priority: "next",
    role: "Node-based crawl and transform graphs",
    why: "A visual node graph can make crawl → normalize → map content → export pipelines understandable and editable.",
    featureIdeas: ["Pipeline graph", "Crawler job nodes", "Export automation flows"],
    license: "MIT"
  },
  {
    owner: "shadcn-ui",
    repo: "ui",
    name: "shadcn/ui",
    layer: "ui",
    priority: "now",
    role: "Premium open UI component source",
    why: "Provides accessible, copy-owned component patterns for the studio UI while keeping the project fully customizable.",
    featureIdeas: ["Command palette", "Inspector controls", "Accessible dialogs"],
    license: "MIT"
  },
  {
    owner: "modelcontextprotocol",
    repo: "typescript-sdk",
    name: "Model Context Protocol TypeScript SDK",
    layer: "protocol",
    priority: "later",
    role: "Future local MCP server",
    why: "Keeps the roadmap open for exposing SiteTransformer projects, scrape reports, and exports as first-class MCP tools.",
    featureIdeas: ["Project MCP server", "Read/write scrape files", "AI export tools"],
    license: "MIT"
  }
];

export function gitMcpUrl(repository: Pick<OpenSourceRepository, "owner" | "repo">) {
  return `https://gitmcp.io/${repository.owner}/${repository.repo}`;
}

export function githubUrl(repository: Pick<OpenSourceRepository, "owner" | "repo">) {
  return `https://github.com/${repository.owner}/${repository.repo}`;
}

export const stackPrinciples = [
  "Research first: every fast-moving dependency gets GitMCP context before code changes.",
  "Capture fidelity first: static fetch, Scrapling, and Playwright are separate crawl modes.",
  "Visual editor second: convert crawled DOM into editable sections before generating React.",
  "Framer-like, never Framer-locked: Motion presets and portable blueprints stay open.",
  "Self-hostable by default: every strategic layer has an open-source replacement path."
];

export const integrationRoadmap = [
  {
    phase: "Now",
    outcome: "Premium crawler studio",
    items: ["GitMCP repo context", "Scrapling worker mode", "Playwright capture plan", "Motion blueprint export", "shadcn-inspired interface polish"]
  },
  {
    phase: "Next",
    outcome: "Visual builder core",
    items: ["GrapesJS HTML/CSS editing", "Craft.js React section tree", "Onlook-style DOM selection", "xyflow crawl pipeline graph"]
  },
  {
    phase: "Later",
    outcome: "Open Framer alternative",
    items: ["Webstudio-grade inspector", "Plasmic-style component registration", "SiteTransformer MCP server", "Team-safe publishing workflows"]
  }
];
