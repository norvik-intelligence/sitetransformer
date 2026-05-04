import { NextResponse } from "next/server";
import type { ScrapeRequest } from "@/lib/scrape-types";
import { scrapeSite } from "@/lib/scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

async function scrapeWithWorker(body: ScrapeRequest) {
  const workerUrl = process.env.SCRAPLING_WORKER_URL;
  if (!workerUrl) return null;
  const res = await fetch(`${workerUrl.replace(/\/$/, "")}/scrape`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(process.env.SCRAPLING_WORKER_TOKEN ? { authorization: `Bearer ${process.env.SCRAPLING_WORKER_TOKEN}` } : {}) },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Scrapling Worker fehlgeschlagen: ${res.status}`);
  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScrapeRequest;
    const workerResult = await scrapeWithWorker(body);
    if (workerResult) return NextResponse.json(workerResult);
    const project = await scrapeSite(body.url, body.maxPages ?? 8, body.maxAssets ?? 80);
    return NextResponse.json({ project, mode: "static-fetch" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scraping fehlgeschlagen." }, { status: 400 });
  }
}
