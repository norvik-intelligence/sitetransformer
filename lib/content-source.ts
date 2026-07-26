import { assertPublicUrl, fetchPublicResource, readResponseBuffer } from "./safe-fetch";

export interface ContentSourceItem {
  tag: "h1" | "h2" | "h3" | "h4" | "p" | "li" | "blockquote";
  text: string;
}

export interface ContentSourceBundle {
  sourceUrl: string;
  title: string;
  description: string;
  items: ContentSourceItem[];
}

const MAX_SOURCE_BYTES = 1_000_000;
const MAX_ITEMS = 250;
const MAX_TEXT_LENGTH = 2_000;

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\""
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function plainText(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

export function extractContentBundle(html: string, sourceUrl: string): ContentSourceBundle {
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, "");
  const title = plainText(clean.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || new URL(sourceUrl).hostname);
  const descriptionMatch = clean.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || clean.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const items: ContentSourceItem[] = [];

  for (const match of clean.matchAll(/<(h1|h2|h3|h4|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = plainText(match[2]);
    if (text.length < 2) continue;
    items.push({ tag: match[1].toLowerCase() as ContentSourceItem["tag"], text });
    if (items.length >= MAX_ITEMS) break;
  }

  return {
    sourceUrl,
    title,
    description: plainText(descriptionMatch?.[1] || ""),
    items
  };
}

export async function crawlContentSource(input: string) {
  const safeUrl = await assertPublicUrl(input);
  const response = await fetchPublicResource(safeUrl.toString(), {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (compatible; SiteTransformer-Content/1.0; +https://sitetransformer.vercel.app)"
    },
    timeoutMs: 12_000
  });
  if (!response.ok) throw new Error(`Die Inhaltsquelle antwortet mit HTTP ${response.status}.`);
  const mime = response.headers.get("content-type") || "";
  if (!mime.includes("text/html") && !mime.includes("application/xhtml+xml")) {
    throw new Error("Die Inhaltsquelle liefert keine HTML-Seite.");
  }
  const html = (await readResponseBuffer(response, MAX_SOURCE_BYTES)).toString("utf-8");
  const bundle = extractContentBundle(html, response.url || safeUrl.toString());
  if (!bundle.items.length) throw new Error("Auf der Inhaltsquelle wurden keine verwertbaren Texte gefunden.");
  return bundle;
}
