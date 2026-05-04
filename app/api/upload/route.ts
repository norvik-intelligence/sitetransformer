import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Keine Datei empfangen." }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Nur Bilddateien sind erlaubt." }, { status: 415 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Maximale Dateigroesse: 8 MB." }, { status: 413 });
    const blob = await put(`uploads/${crypto.randomUUID()}-${file.name}`, file, { access: "public", addRandomSuffix: false });
    return NextResponse.json(blob);
  } catch {
    return NextResponse.json({ error: "Upload zu Vercel Blob fehlgeschlagen." }, { status: 500 });
  }
}
