import type { ScrapeJob, ScrapeRequest } from "./scrape-types";
import { scrapeSite } from "./scraper";
import { scrapeWithCrawlerWorker } from "./crawler-worker";
import { nowIso, uid } from "./utils";

const g = globalThis as unknown as { __sitetransformerJobs?: Map<string, ScrapeJob> };
const jobs = g.__sitetransformerJobs || new Map<string, ScrapeJob>();
g.__sitetransformerJobs = jobs;

const MAX_JOBS = 25;

function trimJobs() {
  const entries = [...jobs.entries()].sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt));
  while (entries.length > MAX_JOBS) {
    const [id] = entries.shift()!;
    jobs.delete(id);
  }
}

function setJob(id: string, patch: Partial<ScrapeJob>) {
  const current = jobs.get(id);
  if (!current) return;
  jobs.set(id, { ...current, ...patch, updatedAt: nowIso() });
}

async function runJob(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  try {
    setJob(id, { status: "fetching", progress: 18, message: "Crawler wird gestartet..." });
    const workerResult = await scrapeWithCrawlerWorker(job.request);
    if (workerResult) {
      setJob(id, { status: "saving", progress: 90, message: "Scrapy-Ergebnis wird vorbereitet...", mode: "worker" });
      setJob(id, { status: "ready", progress: 100, message: "Scrape bereit.", project: workerResult.project, warnings: workerResult.project.stats.warnings, mode: "worker" });
      return;
    }
    setJob(id, { status: "fetching", progress: 25, message: "Fallback Static-Fetch crawlt Website..." });
    const project = await scrapeSite(job.request.url, job.request.maxPages ?? 8, job.request.maxAssets ?? 80);
    setJob(id, { status: "saving", progress: 90, message: "Projekt wird vorbereitet..." });
    setJob(id, { status: "ready", progress: 100, message: "Scrape bereit.", project, warnings: project.stats.warnings });
  } catch (error) {
    setJob(id, { status: "failed", progress: 100, message: "Scrape fehlgeschlagen.", error: error instanceof Error ? error.message : "Unbekannter Fehler" });
  }
}

export function createScrapeJob(request: ScrapeRequest) {
  const id = uid("job");
  const now = nowIso();
  const job: ScrapeJob = {
    id,
    status: "queued",
    progress: 5,
    message: "Job wurde erstellt.",
    mode: "static-fetch",
    createdAt: now,
    updatedAt: now,
    request,
    warnings: []
  };
  jobs.set(id, job);
  trimJobs();
  void runJob(id);
  return job;
}

export function getScrapeJob(id: string) {
  return jobs.get(id) || null;
}

export function listScrapeJobs() {
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
