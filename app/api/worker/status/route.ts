import { NextResponse } from "next/server";
import { getCrawlerWorkerToken, getCrawlerWorkerUrl } from "@/lib/crawler-worker";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

export async function GET() {
  const workerUrl = getCrawlerWorkerUrl();
  if (!workerUrl) return NextResponse.json({ configured: false, healthy: false, message: "Kein Crawler-Worker konfiguriert." });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const res = await fetch(`${workerUrl.replace(/\/$/, "")}/health`, {
      headers: getCrawlerWorkerToken() ? { authorization: `Bearer ${getCrawlerWorkerToken()}` } : {},
      cache: "no-store",
      signal: controller.signal
    });
    const text = await res.text();
    return NextResponse.json({ configured: true, healthy: res.ok, status: res.status, response: text.slice(0, 500) });
  } catch (error) {
    return NextResponse.json({ configured: true, healthy: false, message: error instanceof Error ? error.message : "Worker nicht erreichbar." });
  } finally {
    clearTimeout(timeout);
  }
}
