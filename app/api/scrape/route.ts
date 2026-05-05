import { NextResponse } from "next/server";
import type { ScrapeRequest } from "@/lib/scrape-types";
import { scrapeSite } from "@/lib/scraper";
import { scrapeWithCrawlerWorker } from "@/lib/crawler-worker";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScrapeRequest;
    const workerResult = await scrapeWithCrawlerWorker(body);
    if (workerResult) return NextResponse.json(workerResult);
    const project = await scrapeSite(body.url, body.maxPages ?? 8, body.maxAssets ?? 80);
    return NextResponse.json({ project, mode: "static-fetch" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scraping fehlgeschlagen." }, { status: 400 });
  }
}
