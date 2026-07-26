import { NextResponse } from "next/server";
import { crawlContentSource } from "@/lib/content-source";
import { PublicUrlError } from "@/lib/safe-fetch";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "Bitte eine gültige Source-URL eingeben." }, { status: 400 });
    }
    const content = await crawlContentSource(body.url);
    return NextResponse.json({ content }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
  } catch (error) {
    const status = error instanceof PublicUrlError || error instanceof SyntaxError ? 400 : 422;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inhaltsextraktion fehlgeschlagen." },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
