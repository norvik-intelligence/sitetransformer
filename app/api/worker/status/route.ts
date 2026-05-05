import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET() {
  const workerUrl = process.env.SCRAPLING_WORKER_URL;
  if (!workerUrl) return NextResponse.json({ configured: false, healthy: false, message: "SCRAPLING_WORKER_URL ist nicht gesetzt." });
  try {
    const res = await fetch(`${workerUrl.replace(/\/$/, "")}/health`, {
      headers: process.env.SCRAPLING_WORKER_TOKEN ? { authorization: `Bearer ${process.env.SCRAPLING_WORKER_TOKEN}` } : {},
      cache: "no-store"
    });
    const text = await res.text();
    return NextResponse.json({ configured: true, healthy: res.ok, status: res.status, response: text.slice(0, 500) });
  } catch (error) {
    return NextResponse.json({ configured: true, healthy: false, message: error instanceof Error ? error.message : "Worker nicht erreichbar." });
  }
}
