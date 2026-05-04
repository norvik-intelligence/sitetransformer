# SiteTransformer Open-Source Architecture

SiteTransformer is being shaped into a fully open-source crawling, editing, and Framer-style blueprint studio. The upgraded product idea is not “just scrape a website”; it is a **website capture → editable studio → portable Motion/React blueprint** pipeline.

## Target workflow

1. **Research dependencies with GitMCP** before implementation.
2. **Crawl and render the source website** using the right mode for the site: static fetch, Scrapling worker, or Playwright browser capture.
3. **Normalize files and DOM structure** into a portable project.
4. **Edit visually and in code** with a premium studio UI.
5. **Map content from another website** into the captured layout.
6. **Export or push** raw files, reports, and `framer-blueprint.json`.
7. **Evolve into an open Framer alternative** with React sections, Motion presets, and a visual pipeline graph.

## GitHub research summary

The strongest repositories found for improving SiteTransformer are grouped by product capability:

| Capability | Repository | Why it matters |
| --- | --- | --- |
| Repo context | `idosal/git-mcp` | Gives agents live repository documentation and source context through MCP endpoints. |
| Adaptive crawling | `D4Vinci/Scrapling` | Supports stronger worker-based crawling for harder sites. |
| Browser rendering | `microsoft/playwright` | Captures hydrated DOM, screenshots, responsive states, and visual regressions. |
| Crawl orchestration | `apify/crawlee` | Adds queues, retries, autoscaling, and storage for production crawl jobs. |
| HTML/CSS builder | `GrapesJS/grapesjs` | Proven open-source web-builder framework for template editing. |
| React builder engine | `prevwong/craft.js` | Useful for converting DOM sections into editable React component trees. |
| Builder UX reference | `webstudio-is/webstudio` | Mature open visual-development reference for CSS inspection and accessibility. |
| Component workflow reference | `plasmicapp/plasmic` | Strong reference for editable React components and marketing workflows. |
| AI visual editing | `onlook-dev/onlook` | Reference for DOM-click editing and AI-first design changes in real apps. |
| Motion layer | `motiondivision/motion` | Open Framer-style animation primitives for exported React projects. |
| Workflow graph | `xyflow/xyflow` | Enables a node graph for crawl → normalize → content map → export pipelines. |
| UI foundation | `shadcn-ui/ui` | Premium accessible component patterns while keeping code ownership. |
| MCP server | `modelcontextprotocol/typescript-sdk` | Future SiteTransformer MCP server for reading/writing scrape projects. |

## Installed GitMCP context

The repository includes `.vscode/mcp.json` with remote GitMCP servers for these upstream projects. This lets supported IDEs and agents attach live context for each repo without cloning all upstream code.

## Product architecture

```txt
Landing page
  └─ Start crawler
       ├─ Static Next.js fetch mode
       ├─ Scrapling worker mode
       └─ Future Playwright render mode
            ↓
Scrape project
  ├─ files[]: raw HTML/CSS/JS/assets
  ├─ scrape-report.json
  ├─ open-source-stack.json
  └─ framer-blueprint.json
            ↓
Studio editor
  ├─ file layer explorer
  ├─ preview/code viewport
  ├─ content importer
  ├─ quick asset replacement
  └─ GitHub/ZIP publishing
            ↓
Future builder layer
  ├─ GrapesJS HTML/CSS visual editing
  ├─ Craft.js React section tree
  ├─ Motion animation presets
  └─ xyflow automation graph
```

## Roadmap

### Phase 1: Premium crawler studio

- Keep Next.js as the web UI.
- Keep `worker/scrapling-worker` as the optional deep-crawl worker.
- Improve the visual design across landing and scraper/editor pages.
- Export raw files plus `framer-blueprint.json` and `.sitetransformer/open-source-stack.json`.
- Surface researched GitHub repositories in the product UI.

### Phase 2: Browser-grade capture

Add a Playwright-backed worker mode for:

- Rendered HTML after hydration.
- Full-page screenshots.
- Responsive screenshots.
- Network asset manifests.
- Visual regression checks after editing.

### Phase 3: Visual builder core

Add a visual editing mode powered by lessons from GrapesJS, Craft.js, Onlook, Webstudio, and Plasmic:

- DOM-to-section inference.
- Click-to-select elements in preview.
- Editable text, image, spacing, color, and typography slots.
- React component tree export.
- Motion presets for entrance, hover, tap, and scroll effects.

### Phase 4: Production crawl orchestration

Add Crawlee when projects need:

- URL queues.
- Retry policies.
- Autoscaled concurrency.
- Persistent crawl storage.
- Multi-domain crawls.

### Phase 5: SiteTransformer MCP server

Expose local project context as MCP tools:

- `list_scrape_projects`
- `read_scrape_file`
- `write_scrape_file`
- `create_framer_blueprint`
- `export_project`

This makes SiteTransformer itself usable by AI coding agents while GitMCP covers upstream repository documentation.
