import { NextResponse } from "next/server";
import type { ScrapeProject } from "@/lib/scrape-types";
import { fetchContentSource, importContentIntoScrape } from "@/lib/content-import";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { project: ScrapeProject; contentUrl: string };
    const source = await fetchContentSource(body.contentUrl);
    const result = importContentIntoScrape(body.project, source);
    return NextResponse.json({ ...result, source });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Content Import fehlgeschlagen." }, { status: 400 });
  }
}
