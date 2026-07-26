import type { ScrapeProject, ScrapeRequest } from "./scrape-types";
import { readResponseBuffer } from "./safe-fetch";

const MAX_WORKER_RESPONSE_BYTES = 4_200_000;

export function getCrawlerWorkerUrl() {
  return process.env.SCRAPY_WORKER_URL || process.env.CRAWLER_WORKER_URL || process.env.SCRAPLING_WORKER_URL || "";
}

export function getCrawlerWorkerToken() {
  return process.env.SCRAPY_WORKER_TOKEN || process.env.CRAWLER_WORKER_TOKEN || process.env.SCRAPLING_WORKER_TOKEN || "";
}

export async function scrapeWithCrawlerWorker(body: ScrapeRequest): Promise<{ project: ScrapeProject; mode: string } | null> {
  const workerUrl = getCrawlerWorkerUrl();
  if (body.mode === "static-fetch") return null;
  if (!workerUrl) {
    if (body.mode === "worker") throw new Error("Der Crawler-Worker ist nicht konfiguriert.");
    return null;
  }
  const token = getCrawlerWorkerToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 52_000);
  let res: Response;
  try {
    res = await fetch(`${workerUrl.replace(/\/$/, "")}/scrape`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Der Crawler-Worker hat das Zeitlimit ueberschritten.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const text = (await readResponseBuffer(res, MAX_WORKER_RESPONSE_BYTES)).toString("utf-8");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Crawler Worker returned non-JSON response: ${text.slice(0, 240)}`);
  }
  if (!res.ok) {
    const detail = typeof data === "object" && data && "detail" in data ? String(data.detail) : "";
    throw new Error(`Crawler-Worker fehlgeschlagen (${res.status})${detail ? `: ${detail}` : ""}.`);
  }
  const result = data as Partial<{ project: ScrapeProject; mode: string }>;
  if (!result.project?.id || !Array.isArray(result.project.files) || !result.project.stats) {
    throw new Error("Der Crawler-Worker hat ein ungueltiges Ergebnis geliefert.");
  }
  return { project: result.project, mode: result.mode || "worker" };
}
