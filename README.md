# SiteTransformer

Open-source crawler studio for turning existing websites into portable files, editable previews, GitHub-ready exports, and future Framer-style Motion/React blueprints.

## What it does today

- Crawls a website into HTML, CSS, JS, images, fonts, and metadata.
- Stores scrape projects locally in the browser.
- Previews captured pages in a redesigned studio viewport.
- Lets you edit text files directly in-browser.
- Imports content from a second website and maps it into the captured design.
- Replaces hero images with drag-and-drop.
- Exports a ZIP or pushes the folder structure to GitHub.
- Includes an optional Scrapling worker for stronger crawls outside Vercel limits.
- Installs GitMCP context for the open-source stack in `.vscode/mcp.json`.
- Exports `framer-blueprint.json` and `.sitetransformer/open-source-stack.json` for downstream automation.

## GitHub-researched open-source stack

| Layer | Repository | Feature to add |
| --- | --- | --- |
| Repo context | [`idosal/git-mcp`](https://github.com/idosal/git-mcp) | Live dependency context for AI agents and contributors. |
| Adaptive crawler | [`D4Vinci/Scrapling`](https://github.com/D4Vinci/Scrapling) | Worker crawl mode, anti-bot fallback, structured scrape reports. |
| Browser rendering | [`microsoft/playwright`](https://github.com/microsoft/playwright) | Hydrated DOM capture, screenshots, responsive visual regression. |
| Crawl queues | [`apify/crawlee`](https://github.com/apify/crawlee) | Production queues, retries, autoscaling, persistent storage. |
| HTML/CSS builder | [`GrapesJS/grapesjs`](https://github.com/GrapesJS/grapesjs) | Visual template editing after crawl normalization. |
| React builder | [`prevwong/craft.js`](https://github.com/prevwong/craft.js) | Editable React section trees and component props. |
| Builder reference | [`webstudio-is/webstudio`](https://github.com/webstudio-is/webstudio) | Webflow-grade inspector, CSS coverage, accessibility patterns. |
| Visual builder reference | [`plasmicapp/plasmic`](https://github.com/plasmicapp/plasmic) | Component registration and marketing-safe page editing. |
| AI visual editor | [`onlook-dev/onlook`](https://github.com/onlook-dev/onlook) | DOM-click editing and AI-first design actions. |
| Motion layer | [`motiondivision/motion`](https://github.com/motiondivision/motion) | Framer-style interactions without closed-source lock-in. |
| Workflow graph | [`xyflow/xyflow`](https://github.com/xyflow/xyflow) | Visual crawl → normalize → export pipeline graph. |
| UI system | [`shadcn-ui/ui`](https://github.com/shadcn-ui/ui) | Accessible premium UI patterns with full code ownership. |
| Protocol | [`modelcontextprotocol/typescript-sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | Future SiteTransformer MCP server. |

## GitMCP setup

VS Code-compatible MCP servers are committed in `.vscode/mcp.json`.

For other MCP clients, use the same endpoint pattern:

```txt
https://gitmcp.io/<owner>/<repo>
```

Examples already installed:

```txt
https://gitmcp.io/docs
https://gitmcp.io/idosal/git-mcp
https://gitmcp.io/D4Vinci/Scrapling
https://gitmcp.io/microsoft/playwright
https://gitmcp.io/apify/crawlee
https://gitmcp.io/GrapesJS/grapesjs
https://gitmcp.io/prevwong/craft.js
https://gitmcp.io/webstudio-is/webstudio
https://gitmcp.io/plasmicapp/plasmic
https://gitmcp.io/onlook-dev/onlook
https://gitmcp.io/motiondivision/motion
https://gitmcp.io/xyflow/xyflow
https://gitmcp.io/shadcn-ui/ui
https://gitmcp.io/modelcontextprotocol/typescript-sdk
```

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run build
```

## Optional Scrapling worker

```bash
cd worker/scrapling-worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Configure the Next.js app:

```env
SCRAPLING_WORKER_URL=http://localhost:8000
SCRAPLING_WORKER_TOKEN=optional-secret
GITHUB_TOKEN=github_pat_for_pushes
```

## Roadmap

See [`docs/architecture.md`](docs/architecture.md) for the full GitHub-researched crawler-to-open-Framer architecture.
