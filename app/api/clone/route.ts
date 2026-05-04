import { NextResponse } from "next/server";
import type { CloneRequest } from "@/lib/types";
import { generateProjectFromDesign, scrapeUrl } from "@/lib/ai";
import { assertUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CloneRequest;
    const designUrl = assertUrl(body.designUrl);
    const design = await scrapeUrl(designUrl);
    const project = await generateProjectFromDesign(design, body.projectName);
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Design konnte nicht transformiert werden.", code: "CLONE_FAILED" }, { status: 400 });
  }
}
