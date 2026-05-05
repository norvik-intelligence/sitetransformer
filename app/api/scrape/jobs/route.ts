import { NextResponse } from "next/server";
import type { ScrapeRequest } from "@/lib/scrape-types";
import { createScrapeJob, listScrapeJobs } from "@/lib/scrape-jobs";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET() {
  return NextResponse.json({ jobs: listScrapeJobs().map(({ project, ...job }) => ({ ...job, hasProject: Boolean(project) })) });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScrapeRequest;
    if (!body.url) return NextResponse.json({ error: "URL fehlt." }, { status: 400 });
    const job = createScrapeJob({ ...body, maxPages: Math.min(body.maxPages ?? 8, 20), maxAssets: Math.min(body.maxAssets ?? 100, 250) });
    return NextResponse.json({ job: { ...job, hasProject: false } }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Job konnte nicht erstellt werden." }, { status: 400 });
  }
}
