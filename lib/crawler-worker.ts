import type { ScrapeProject, ScrapeRequest } from "./scrape-types";

export function getCrawlerWorkerUrl() {
  return process.env.SCRAPY_WORKER_URL || process.env.CRAWLER_WORKER_URL || process.env.SCRAPLING_WORKER_URL || "";
}

export function getCrawlerWorkerToken() {
  return process.env.SCRAPY_WORKER_TOKEN || process.env.CRAWLER_WORKER_TOKEN || process.env.SCRAPLING_WORKER_TOKEN || "";
}

export async function scrapeWithCrawlerWorker(body: ScrapeRequest): Promise<{ project: ScrapeProject; mode: string } | null> {
  const workerUrl = getCrawlerWorkerUrl();
  if (!workerUrl || body.mode === "static-fetch") return null;
  const token = getCrawlerWorkerToken();
  const res = await fetch(`${workerUrl.replace(/\/$/, "")}/scrape`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Crawler Worker returned non-JSON response: ${text.slice(0, 240)}`);
  }
  if (!res.ok) throw new Error(`Crawler Worker fehlgeschlagen: ${res.status}`);
  return data as { project: ScrapeProject; mode: string };
}
