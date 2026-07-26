import { NextResponse } from "next/server";
import type { ContentSourceBundle } from "@/lib/content-source";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash";
const MAX_HTML_LENGTH = 600_000;

function extractGeminiText(payload: unknown) {
  const result = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

function cleanHtmlResponse(value: string) {
  return value.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { html?: unknown; source?: unknown };
    if (typeof body.html !== "string" || !body.html.trim()) {
      return NextResponse.json({ error: "Target-HTML fehlt." }, { status: 400 });
    }
    if (body.html.length > MAX_HTML_LENGTH) {
      return NextResponse.json({ error: "Target-HTML ist für das Content-Mapping zu groß." }, { status: 413 });
    }
    const source = body.source as Partial<ContentSourceBundle> | undefined;
    if (!source || !Array.isArray(source.items) || !source.items.length) {
      return NextResponse.json({ error: "Extrahierte Source-Inhalte fehlen." }, { status: 400 });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini ist noch nicht konfiguriert. Hinterlege GEMINI_API_KEY in Vercel." },
        { status: 503 }
      );
    }

    const prompt = [
      "Du bist ein präziser HTML-Content-Migrationsdienst.",
      "Ersetze ausschließlich sichtbare Dummy-, Demo- und Platzhaltertexte im HTML (Eingabe A) durch semantisch passende Inhalte aus dem JSON (Eingabe B).",
      "Behalte alle CSS-Klassen, IDs, HTML-Tags, Attribute, Styles, Links, Bilder und die DOM-Struktur exakt bei.",
      "Füge keine Scripts, Erklärungen, Markdown-Fences oder neuen Elemente hinzu.",
      "Gib ausschließlich das vollständige transformierte HTML zurück.",
      "",
      "EINGABE A — TARGET HTML:",
      body.html,
      "",
      "EINGABE B — SOURCE CONTENT:",
      JSON.stringify(source)
    ].join("\n");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "text/plain", maxOutputTokens: 65_536 }
      }),
      signal: AbortSignal.timeout(55_000)
    });
    const payload = await response.json();
    if (!response.ok) {
      const message = (payload as { error?: { message?: string } }).error?.message || `Gemini HTTP ${response.status}`;
      throw new Error(message);
    }
    const html = cleanHtmlResponse(extractGeminiText(payload));
    if (!/<html[\s>]|<!doctype/i.test(html)) throw new Error("Gemini hat kein vollständiges HTML zurückgegeben.");
    return NextResponse.json({ html, model: MODEL }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Content-Mapping fehlgeschlagen." },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }
}
