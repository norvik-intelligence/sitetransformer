import { NextResponse } from "next/server";
import type { ContentSourceBundle } from "@/lib/content-source";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_OPENROUTER_MODEL = "openrouter/auto";
const MAX_HTML_LENGTH = 600_000;

function extractGeminiText(payload: unknown) {
  const result = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

function cleanHtmlResponse(value: string) {
  return value.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function mappingPrompt(html: string, source: Partial<ContentSourceBundle>) {
  return [
    "Du bist ein präziser HTML-Content-Migrationsdienst.",
    "Ersetze ausschließlich sichtbare Dummy-, Demo- und Platzhaltertexte im HTML (Eingabe A) durch semantisch passende Inhalte aus dem JSON (Eingabe B).",
    "Behalte alle CSS-Klassen, IDs, HTML-Tags, Attribute, Styles, Links, Bilder und die DOM-Struktur exakt bei.",
    "Füge keine Scripts, Erklärungen, Markdown-Fences oder neuen Elemente hinzu.",
    "Gib ausschließlich das vollständige transformierte HTML zurück.",
    "",
    "EINGABE A — TARGET HTML:",
    html,
    "",
    "EINGABE B — SOURCE CONTENT:",
    JSON.stringify(source)
  ].join("\n");
}

function validateMappedHtml(value: string) {
  const html = cleanHtmlResponse(value);
  if (!/<html[\s>]|<!doctype/i.test(html)) throw new Error("Der KI-Provider hat kein vollständiges HTML zurückgegeben.");
  return html;
}

async function mapWithGemini(prompt: string, apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
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
  return {
    html: validateMappedHtml(extractGeminiText(payload)),
    provider: "gemini",
    model: GEMINI_MODEL
  };
}

async function mapWithOpenRouter(prompt: string, apiKey: string) {
  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sitetransformer.vercel.app",
      "X-Title": "SiteTransformer"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 65_536
    }),
    signal: AbortSignal.timeout(55_000)
  });
  const payload = await response.json() as {
    error?: { message?: string };
    model?: string;
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `OpenRouter HTTP ${response.status}`);
  }
  const content = payload.choices?.[0]?.message?.content;
  const text = typeof content === "string"
    ? content
    : Array.isArray(content) ? content.map((part) => part.text || "").join("") : "";
  return {
    html: validateMappedHtml(text),
    provider: "openrouter",
    model: payload.model || model
  };
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
    const geminiKey = process.env.GEMINI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!geminiKey && !openRouterKey) {
      return NextResponse.json(
        { error: "Kein KI-Provider konfiguriert. Hinterlege GEMINI_API_KEY oder OPENROUTER_API_KEY in Vercel." },
        { status: 503 }
      );
    }
    const prompt = mappingPrompt(body.html, source);
    let result: { html: string; provider: string; model: string } | undefined;
    let geminiError = "";
    if (geminiKey) {
      try {
        result = await mapWithGemini(prompt, geminiKey);
      } catch (error) {
        geminiError = error instanceof Error ? error.message : "Gemini fehlgeschlagen.";
      }
    }
    if (!result && openRouterKey) result = await mapWithOpenRouter(prompt, openRouterKey);
    if (!result) throw new Error(geminiError || "Kein KI-Provider konnte das Mapping abschließen.");

    return NextResponse.json({ ...result, fallbackUsed: result.provider === "openrouter" && Boolean(geminiKey) }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Content-Mapping fehlgeschlagen." },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }
}
