import { NextResponse } from "next/server";
import type { ContentMappingRequest } from "@/lib/types";
import { mapContent, scrapeUrl } from "@/lib/ai";
import { assertUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ContentMappingRequest;
    const contentUrl = assertUrl(body.contentUrl);
    const content = await scrapeUrl(contentUrl);
    const result = await mapContent(body.project, content);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Content Mapping fehlgeschlagen.", code: "MAPPING_FAILED" }, { status: 400 });
  }
}
