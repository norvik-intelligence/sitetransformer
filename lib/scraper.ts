import { createHash } from "node:crypto";
import type { ScrapedFile, ScrapeProject } from "./scrape-types";
import { fetchPublicResource, readResponseBuffer } from "./safe-fetch";
import { assertUrl, compactText, nowIso, uid } from "./utils";

const TEXT_TYPES = ["text/", "application/json", "application/javascript", "application/xml", "image/svg+xml"];
const MAX_PAGE_BYTES = 1_500_000;
const MAX_ASSET_BYTES = 1_000_000;
const MAX_PROJECT_BYTES = 3_000_000;
const ASSET_CONCURRENCY = 6;

function isText(mime: string) {
  return TEXT_TYPES.some((type) => mime.includes(type));
}

function kindFromUrl(url: string, mime: string): ScrapedFile["kind"] {
  const pathname = new URL(url).pathname.toLowerCase();
  if (mime.includes("html") || /\.html?$/.test(pathname)) return "html";
  if (mime.includes("css") || pathname.endsWith(".css")) return "css";
  if (mime.includes("javascript") || /\.(?:js|mjs|cjs)$/.test(pathname)) return "js";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("font") || /\.(?:woff2?|ttf|otf|eot)$/.test(pathname)) return "font";
  if (mime.includes("json") || pathname.endsWith(".json")) return "json";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

function safeSegment(segment: string) {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {}
  const safe = decoded.replace(/[<>:"|?*\u0000-\u001f]/g, "-").replace(/^\.+$/, "_").slice(0, 120);
  return safe || "_";
}

function withQueryHash(pathname: string, search: string) {
  if (!search) return pathname;
  const suffix = createHash("sha256").update(search).digest("hex").slice(0, 10);
  const dot = pathname.lastIndexOf(".");
  return dot > pathname.lastIndexOf("/") ? `${pathname.slice(0, dot)}--${suffix}${pathname.slice(dot)}` : `${pathname}--${suffix}`;
}

function pathFromUrl(url: string, root: string, kind: ScrapedFile["kind"]) {
  const parsed = new URL(url);
  const rootHost = new URL(root).hostname;
  let pathname = parsed.pathname.split("/").filter(Boolean).map(safeSegment).join("/");
  if (!pathname || parsed.pathname.endsWith("/")) pathname = `${pathname ? `${pathname}/` : ""}index.html`;
  const filename = pathname.split("/").at(-1) || "";
  if (!filename.includes(".")) pathname += kind === "html" ? "/index.html" : ".txt";
  pathname = withQueryHash(pathname, parsed.search);
  return parsed.hostname === rootHost ? pathname : `external/${safeSegment(parsed.hostname)}/${pathname}`;
}

function addUrl(urls: Set<string>, raw: string | undefined, base: string) {
  if (!raw || /^(?:data:|blob:|#|mailto:|tel:|javascript:)/i.test(raw.trim())) return;
  try {
    const url = new URL(raw.trim(), base);
    url.hash = "";
    if (["http:", "https:"].includes(url.protocol)) urls.add(url.toString());
  } catch {}
}

function extractAssetUrls(html: string, base: string) {
  const urls = new Set<string>();
  for (const match of html.matchAll(/<(?:img|script|source|video|audio|track|embed|object)\b[^>]*?\b(?:src|poster|data)=["']([^"']+)["']/gi)) {
    addUrl(urls, match[1], base);
  }
  for (const match of html.matchAll(/<link\b[^>]*?\bhref=["']([^"']+)["']/gi)) addUrl(urls, match[1], base);
  for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of match[1].split(",")) addUrl(urls, candidate.trim().split(/\s+/)[0], base);
  }
  for (const match of html.matchAll(/url\((['"]?)(.*?)\1\)/gi)) addUrl(urls, match[2], base);
  return [...urls];
}

function extractCssUrls(css: string, base: string) {
  const urls = new Set<string>();
  for (const match of css.matchAll(/url\((['"]?)(.*?)\1\)/gi)) addUrl(urls, match[2], base);
  for (const match of css.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/gi)) addUrl(urls, match[1], base);
  return [...urls];
}

function extractPageLinks(html: string, base: string, origin: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)) {
    const raw = match[1];
    if (!raw || /^(?:#|mailto:|tel:|javascript:)/i.test(raw)) continue;
    try {
      const url = new URL(raw, base);
      url.hash = "";
      if (url.origin === origin && ["http:", "https:"].includes(url.protocol)) links.add(url.toString());
    } catch {}
  }
  return [...links];
}

function localResourceUrl(raw: string, pageUrl: string, rootUrl: string) {
  if (!raw || /^(?:data:|blob:|#|mailto:|tel:|javascript:)/i.test(raw.trim())) return raw;
  try {
    const absolute = new URL(raw.trim(), pageUrl);
    absolute.hash = "";
    return `/${pathFromUrl(absolute.toString(), rootUrl, kindFromUrl(absolute.toString(), ""))}`;
  } catch {
    return raw;
  }
}

function rewriteHtml(html: string, pageUrl: string, rootUrl: string) {
  let rewritten = html.replace(/<(?:img|script|link|source|video|audio|track|embed|object)\b[^>]*>/gi, (tag) =>
    tag.replace(/\b(src|href|poster|data)=(["'])(.*?)\2/gi, (_match, attribute, quote, raw) => `${attribute}=${quote}${localResourceUrl(raw, pageUrl, rootUrl)}${quote}`)
  );
  rewritten = rewritten.replace(/\bsrcset=(["'])(.*?)\1/gi, (_match, quote, srcset) => {
    const value = srcset.split(",").map((candidate: string) => {
      const [raw, ...descriptor] = candidate.trim().split(/\s+/);
      return [localResourceUrl(raw, pageUrl, rootUrl), ...descriptor].join(" ");
    }).join(", ");
    return `srcset=${quote}${value}${quote}`;
  });
  return rewritten.replace(/url\((['"]?)(.*?)\1\)/gi, (_match, quote, raw) => `url(${quote}${localResourceUrl(raw, pageUrl, rootUrl)}${quote})`);
}

function rewriteCss(css: string, cssUrl: string, rootUrl: string) {
  return css.replace(/url\((['"]?)(.*?)\1\)/gi, (_match, quote, raw) => `url(${quote}${localResourceUrl(raw, cssUrl, rootUrl)}${quote})`);
}

async function fetchAsFile(url: string, rootUrl: string, maxBytes: number): Promise<ScrapedFile> {
  const response = await fetchPublicResource(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SiteTransformer/2.0; +https://sitetransformer.vercel.app)",
      Accept: "text/html,application/xhtml+xml,text/css,application/javascript,image/*,font/*,*/*;q=0.5"
    },
    timeoutMs: 9_000
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText || ""}`.trim());
  const finalUrl = response.url || url;
  const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "application/octet-stream";
  const kind = kindFromUrl(finalUrl, mimeType);
  const buffer = await readResponseBuffer(response, maxBytes);
  const textLike = isText(mimeType) || ["html", "css", "js", "json", "text"].includes(kind);
  return {
    path: pathFromUrl(finalUrl, rootUrl, kind),
    url: finalUrl,
    kind,
    mimeType,
    encoding: textLike ? "utf-8" : "base64",
    content: textLike ? buffer.toString("utf-8") : buffer.toString("base64"),
    bytes: buffer.length
  };
}

function warningMessage(kind: "Page" | "Asset", url: string, error: unknown) {
  const message = error instanceof Error ? error.message : "unbekannter Fehler";
  return `${kind} fehlgeschlagen: ${url} (${message})`;
}

export async function scrapeSite(rootUrlInput: string, requestedPages = 6, requestedAssets = 60): Promise<ScrapeProject> {
  const rootUrl = assertUrl(rootUrlInput);
  const maxPages = Math.max(1, Math.min(Math.trunc(requestedPages), 10));
  const maxAssets = Math.max(0, Math.min(Math.trunc(requestedAssets), 80));
  const origin = new URL(rootUrl).origin;
  const pageQueue = [rootUrl];
  const visitedPages = new Set<string>();
  const queuedAssets = new Set<string>();
  const assetQueue: string[] = [];
  const capturedAssets: string[] = [];
  const files = new Map<string, ScrapedFile>();
  const warnings: string[] = [];
  const pageUrls: string[] = [];
  let totalBytes = 0;

  const enqueueAsset = (url: string) => {
    if (queuedAssets.size >= maxAssets * 3 || queuedAssets.has(url)) return;
    queuedAssets.add(url);
    assetQueue.push(url);
  };

  while (pageQueue.length && visitedPages.size < maxPages) {
    const requestedUrl = pageQueue.shift()!;
    if (visitedPages.has(requestedUrl)) continue;
    visitedPages.add(requestedUrl);
    try {
      const file = await fetchAsFile(requestedUrl, rootUrl, MAX_PAGE_BYTES);
      if (file.kind !== "html") {
        warnings.push(`Page uebersprungen: ${requestedUrl} lieferte ${file.mimeType}.`);
        continue;
      }
      if (totalBytes + file.bytes > MAX_PROJECT_BYTES) {
        warnings.push("Projektlimit erreicht; weitere Seiten wurden nicht gespeichert.");
        break;
      }
      const originalHtml = file.content;
      const finalPageUrl = file.url;
      pageUrls.push(finalPageUrl);
      extractAssetUrls(originalHtml, finalPageUrl).forEach(enqueueAsset);
      for (const link of extractPageLinks(originalHtml, finalPageUrl, origin)) {
        if (!visitedPages.has(link) && visitedPages.size + pageQueue.length < maxPages) pageQueue.push(link);
      }
      file.content = rewriteHtml(originalHtml, finalPageUrl, rootUrl);
      files.set(file.path, file);
      totalBytes += file.bytes;
    } catch (error) {
      warnings.push(warningMessage("Page", requestedUrl, error));
    }
  }

  while (assetQueue.length && capturedAssets.length < maxAssets && totalBytes < MAX_PROJECT_BYTES) {
    const batch = assetQueue.splice(0, Math.min(ASSET_CONCURRENCY, maxAssets - capturedAssets.length));
    const results = await Promise.all(batch.map(async (assetUrl) => {
      try {
        return { assetUrl, file: await fetchAsFile(assetUrl, rootUrl, MAX_ASSET_BYTES) };
      } catch (error) {
        return { assetUrl, error };
      }
    }));

    for (const result of results) {
      if ("error" in result) {
        warnings.push(warningMessage("Asset", result.assetUrl, result.error));
        continue;
      }
      const { assetUrl, file } = result;
      if (totalBytes + file.bytes > MAX_PROJECT_BYTES) {
        warnings.push(`Asset uebersprungen: ${assetUrl} (Projektlimit von ${Math.round(MAX_PROJECT_BYTES / 1_000_000)} MB erreicht)`);
        continue;
      }
      if (file.kind === "css" && file.encoding === "utf-8") {
        extractCssUrls(file.content, file.url).forEach(enqueueAsset);
        file.content = rewriteCss(file.content, file.url, rootUrl);
      }
      files.set(file.path, file);
      capturedAssets.push(file.url);
      totalBytes += file.bytes;
    }
  }

  const html = [...files.values()].find((file) => file.kind === "html")?.content || "";
  if (!html) {
    throw new Error(`Keine HTML-Seite konnte gecrawlt werden. Die Website blockiert Server-Fetching oder benoetigt den Browser-Worker. ${warnings.slice(0, 2).join(" | ")}`);
  }
  if (assetQueue.length) warnings.push(`Asset-Limit erreicht: ${assetQueue.length} weitere Ressourcen wurden nicht geladen.`);

  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || new URL(rootUrl).hostname;
  const allFiles = [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
  const compactWarnings = warnings.slice(0, 50);
  return {
    id: uid("scrape"),
    rootUrl,
    title: compactText(title, 120),
    createdAt: nowIso(),
    files: allFiles,
    pages: pageUrls,
    assets: capturedAssets,
    stats: {
      pages: pageUrls.length,
      assets: capturedAssets.length,
      files: allFiles.length,
      totalBytes: allFiles.reduce((sum, file) => sum + file.bytes, 0),
      warnings: compactWarnings
    }
  };
}
