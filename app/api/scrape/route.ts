import { NextResponse } from "next/server";
import type { ScrapeRequest } from "@/lib/scrape-types";
import { scrapeSite } from "@/lib/scraper";
import { scrapeWithCrawlerWorker } from "@/lib/crawler-worker";
import { assertPublicUrl, PublicUrlError } from "@/lib/safe-fetch";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = (await req.json()) as Partial<ScrapeRequest>;
    if (typeof raw.url !== "string" || !raw.url.trim()) {
      return NextResponse.json({ error: "Bitte eine Website-URL eingeben." }, { status: 400 });
    }
    const publicUrl = await assertPublicUrl(raw.url);
    const body: ScrapeRequest = {
      url: publicUrl.toString(),
      maxPages: Math.max(1, Math.min(Number(raw.maxPages) || 6, 10)),
      maxAssets: Math.max(0, Math.min(Number(raw.maxAssets) || 60, 80)),
      mode: ["auto", "static-fetch", "worker"].includes(raw.mode || "") ? raw.mode : "auto"
    };
    const workerResult = await scrapeWithCrawlerWorker(body);
    const result = workerResult || { project: await scrapeSite(body.url, body.maxPages, body.maxAssets), mode: "static-fetch" };
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const status = error instanceof PublicUrlError || error instanceof SyntaxError ? 400 : 422;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scraping fehlgeschlagen." },
      { status, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
