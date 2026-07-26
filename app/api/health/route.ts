import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "SiteTransformer",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    capabilities: {
      staticCrawler: true,
      externalWorker: Boolean(process.env.SCRAPY_WORKER_URL || process.env.CRAWLER_WORKER_URL || process.env.SCRAPLING_WORKER_URL)
    }
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
