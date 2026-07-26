# SiteTransformer Architecture

SiteTransformer 2.0 is a focused crawler studio: submit one public website, capture a bounded portable file set, inspect it in an isolated browser workspace, and export it as a ZIP.

## Production flow

1. `app/page.tsx` submits a single `POST /api/scrape` request.
2. `lib/safe-fetch.ts` validates the public URL, DNS answers, ports, redirects, timeouts, and response size.
3. `lib/crawler-worker.ts` uses the configured external worker when available; otherwise `lib/scraper.ts` runs the Vercel-native crawler.
4. The API returns one complete `ScrapeProject`. No in-memory polling jobs are used because serverless invocations do not share process memory.
5. `lib/scrape-storage.ts` stores the result in IndexedDB in the current browser.
6. `app/scrape/[id]/page.tsx` opens the responsive crawl viewer.
7. `lib/scrape-export.ts` creates a portable ZIP with source files, reports, and manifests.

## Current architecture

```txt
Next.js App Router
├─ app/page.tsx                    Landing + synchronous crawl start
├─ app/scrape/[id]/page.tsx       IndexedDB-backed result route
├─ app/api/health/route.ts        Runtime and capability health
├─ app/api/scrape/route.ts        Validated crawler entrypoint
├─ app/api/worker/status/route.ts Optional worker health
├─ components/scraper/            Isolated responsive result viewer
├─ lib/safe-fetch.ts              SSRF, DNS, redirect, timeout, byte limits
├─ lib/scraper.ts                 Built-in HTML/asset crawler
├─ lib/crawler-worker.ts          External worker bridge
├─ lib/scrape-storage.ts          Browser IndexedDB storage
├─ lib/scrape-export.ts           ZIP + machine-readable manifests
└─ worker/scrapling-worker/       Optional hardened Scrapy worker
```

## Security boundaries

- Only public HTTP/HTTPS targets on ports 80/443 are accepted.
- Loopback, link-local, private, carrier-grade NAT, documentation, multicast, and reserved IP ranges are blocked.
- Every redirect destination is validated again.
- Page, asset, total-project, redirect, crawl-count, and request-time limits are enforced.
- The preview removes scripts, event handlers, embedded frames, refresh redirects, and form destinations.
- Preview content runs in a sandboxed `srcDoc` iframe with a restrictive content security policy and no referrer.
- Crawl results stay in the user's IndexedDB until explicitly exported.

## Default Vercel limits

The built-in path targets reliable serverless captures rather than unlimited mirrors:

- Up to 10 pages
- Up to 80 assets
- 1.5 MB per page
- 1 MB per asset
- 3 MB raw project payload
- 9 seconds per upstream resource request
- 60 seconds per crawl function

The API clamps caller-provided values to these bounds. Large, protected, or JavaScript-rendered sites should use the external worker.

## Open crawler stack

| Layer | Current / candidate | Purpose |
| --- | --- | --- |
| Static crawl | Built-in validated `fetch` crawler | Fast Vercel-native crawl for HTML sites. |
| External crawl | Scrapy worker | Larger crawl budgets and stronger retries outside Vercel. |
| Adaptive crawl | Scrapling | Future anti-bot-aware extraction where legally permitted. |
| Browser render | Playwright | Future hydrated DOM capture and visual regression. |
| Queueing | Crawlee | Future persistent queues, retries, and crawl state. |
| Export | JSZip | Portable source tree and manifests. |

## Export artifacts

Every ZIP export includes:

```txt
scrape-report.json
framer-blueprint.json
.sitetransformer/open-source-stack.json
README.sitetransformer.md
<captured website files>
```

## Worker configuration

```txt
Vercel App
  └─ POST /api/scrape
       ├─ built-in crawler when SCRAPY_WORKER_URL is unset
       └─ external Scrapy worker when SCRAPY_WORKER_URL is set
```

The preferred variables are `SCRAPY_WORKER_URL` and `SCRAPY_WORKER_TOKEN`. Legacy `CRAWLER_WORKER_*` and `SCRAPLING_WORKER_*` aliases remain supported.

## Roadmap

### Phase 1 — Production crawl depth

- Deploy the external worker with mandatory authentication.
- Add persistent crawl jobs and storage outside function memory.
- Add robots-policy controls and retry reports.
- Add browser-render mode for JavaScript-heavy pages.

### Phase 2 — Structured transformation

- Parse captured DOM into a normalized section tree.
- Detect repeated components and editable content slots.
- Preserve file-level diffs and undo/redo history.

### Phase 3 — Delivery

- Generate a clean Next.js project from the normalized tree.
- Create authenticated GitHub branches and pull requests.
- Add Lighthouse, accessibility, and responsive regression reports.
