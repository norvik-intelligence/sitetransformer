import { NextResponse } from "next/server";
import { getScrapeJob } from "@/lib/scrape-jobs";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getScrapeJob(id);
  if (!job) return NextResponse.json({ error: "Job nicht gefunden oder Serverless-Instanz wurde recycelt. Bitte erneut starten." }, { status: 404 });
  return NextResponse.json({ job });
}
