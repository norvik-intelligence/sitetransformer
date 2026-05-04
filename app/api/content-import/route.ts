import { NextResponse } from "next/server";
import { fetchContentSource } from "@/lib/content-import";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { contentUrl: string };
    const source = await fetchContentSource(body.contentUrl);
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Content Import fehlgeschlagen." }, { status: 400 });
  }
}
