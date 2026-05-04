# SiteTransformer Architecture

SiteTransformer is evolving into an open-source crawler studio that preserves existing website design, captures portable project files, and enables Framer-style editing and export workflows.

## Product flow

1. **Crawl** a source website into HTML, CSS, JS, images, fonts, metadata, and route information.
2. **Preview** the captured website inside a studio viewport.
3. **Edit** text-based files in the browser and replace key images visually.
4. **Import content** from a second website while preserving the original design structure.
5. **Export** the result as a ZIP with manifests, or push the folder structure to GitHub.
6. **Blueprint** future React/Motion/Framer-like transformations using `framer-blueprint.json`.

## Current architecture

```txt
Next.js App Router
├─ app/page.tsx                  Landing + scrape start
├─ app/scrape/[id]/page.tsx       Browser editor workspace
├─ app/api/scrape/route.ts        Static fetch scraper or external worker bridge
├─ app/api/content-import/route.ts Content-source extraction
├─ app/api/github-push/route.ts   GitHub folder push
├─ lib/scraper.ts                 Built-in static crawler
├─ lib/content-import.ts          Semantic content mapping
├─ lib/scrape-storage.ts          IndexedDB storage
├─ lib/scrape-export.ts           ZIP + manifests
└─ worker/scrapling-worker/       Optional Python crawl worker
```

## Open crawler stack

| Layer | Candidate | Purpose |
| --- | --- | --- |
| Static crawl | Built-in `fetch` crawler | Fast Vercel-native crawl for simple sites. |
| Dynamic crawl | Scrapling worker | Stronger crawl for dynamic or protected pages. |
| Browser render | Playwright | Hydrated DOM capture, screenshots, responsive checks. |
| Queueing | Crawlee | Persistent queues, retries, crawl state, scaling. |
| Export | JSZip + GitHub Contents API | Portable ZIP and repository push. |

## Open Framer-style stack

| Layer | Candidate | Purpose |
| --- | --- | --- |
| Visual editing | GrapesJS / Craft.js / custom DOM inspector | Click-to-edit and structured section editing. |
| React blueprint | Next.js + extracted section tree | Convert captured pages into reusable React sections. |
| Motion | `motion` | Framer-style hover, entrance, and scroll effects. |
| UI | shadcn/ui + Tailwind | Premium, owned UI system. |
| Workflow graph | xyflow | Visual crawl → normalize → edit → export pipeline. |
| Agent context | GitMCP + MCP TypeScript SDK | AI-assisted project understanding and future MCP server. |

## Content import rules

The imported content website must never destroy the source design. Mapping should be conservative:

- Replace document title and meta description.
- Replace logo candidates in header/favicons.
- Replace navigation labels and links only inside header/nav.
- Replace primary hero headline/subline.
- Replace primary non-logo images.
- Avoid mass replacement of arbitrary text nodes.
- Preserve CSS, layout, class names, and DOM structure whenever possible.

## Export artifacts

Every ZIP export includes:

```txt
scrape-report.json
framer-blueprint.json
.sitetransformer/open-source-stack.json
README.sitetransformer.md
<captured website files>
```

## Worker plan

The Scrapling worker is intentionally separate from Vercel because heavy crawling can require longer timeouts, browser sessions, retries, and proxy-aware execution.

```txt
Vercel App
  └─ /api/scrape
       ├─ built-in fetch crawler if SCRAPLING_WORKER_URL is unset
       └─ external Scrapling worker if SCRAPLING_WORKER_URL is set
```

## Roadmap

### Phase 1 — Reliable crawl

- Better asset URL rewriting.
- Crawl-depth controls in UI.
- Failed asset report and retry button.
- Worker mode with Scrapling/Playwright.

### Phase 2 — Real visual editing

- Click an element in preview to select its DOM node.
- Edit selected text, link, image, alt, visibility, and spacing.
- Add undo/redo snapshots.
- Preserve file diffs safely.

### Phase 3 — Component extraction

- Detect repeated sections.
- Generate editable section schema.
- Produce React/Next.js components from captured DOM.
- Attach Motion presets from blueprint.

### Phase 4 — Production delivery

- Full Next.js project export.
- GitHub branch/PR creation.
- Vercel deploy handoff.
- Lighthouse and responsive QA reports.
