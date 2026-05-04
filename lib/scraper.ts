import type { ScrapedFile, ScrapeProject } from "./scrape-types";
import { assertUrl, compactText, nowIso, uid } from "./utils";

const TEXT_TYPES = ["text/", "application/json", "application/javascript", "application/xml", "image/svg+xml"];
const ASSET_RE = /(?:src|href)=['"]([^'"]+)['"]|url\((['"]?)([^)'\"]+)\2\)/gi;

function isText(mime: string) {
  return TEXT_TYPES.some((type) => mime.includes(type));
}

function kindFromUrl(url: string, mime: string): ScrapedFile["kind"] {
  const u = url.toLowerCase();
  if (mime.includes("html") || u.endsWith(".html")) return "html";
  if (mime.includes("css") || u.endsWith(".css")) return "css";
  if (mime.includes("javascript") || u.endsWith(".js") || u.endsWith(".mjs")) return "js";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("font") || /\.(woff2?|ttf|otf|eot)$/.test(u)) return "font";
  if (mime.includes("json") || u.endsWith(".json")) return "json";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

function pathFromUrl(url: string, root: string, kind: ScrapedFile["kind"]) {
  const u = new URL(url);
  const rootHost = new URL(root).hostname;
  let pathname = decodeURIComponent(u.pathname || "/").replace(/^\/+/, "");
  if (!pathname || pathname.endsWith("/")) pathname += "index.html";
  if (!pathname.includes(".")) pathname += kind === "html" ? "/index.html" : ".txt";
  return u.hostname === rootHost ? pathname : `external/${u.hostname}/${pathname}`;
}

function extractAssetUrls(html: string, base: string) {
  const urls = new Set<string>();
  for (const match of html.matchAll(ASSET_RE)) {
    const raw = match[1] || match[3];
    if (!raw || raw.startsWith("data:") || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
    try { urls.add(new URL(raw, base).toString()); } catch {}
  }
  return [...urls];
}

function extractPageLinks(html: string, base: string, origin: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a[^>]+href=['"]([^'"]+)['"]/gi)) {
    const raw = match[1];
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
    try {
      const url = new URL(raw, base);
      url.hash = "";
      if (url.origin === origin) links.add(url.toString());
    } catch {}
  }
  return [...links];
}

async function fetchAsFile(url: string, rootUrl: string): Promise<ScrapedFile | null> {
  const res = await fetch(url, { headers: { "User-Agent": "SiteTransformerScraper/1.0" }, redirect: "follow" });
  if (!res.ok) return null;
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const kind = kindFromUrl(url, mimeType);
  const buffer = Buffer.from(await res.arrayBuffer());
  const textLike = isText(mimeType) || kind === "html" || kind === "css" || kind === "js";
  return {
    path: pathFromUrl(url, rootUrl, kind),
    url,
    kind,
    mimeType,
    encoding: textLike ? "utf-8" : "base64",
    content: textLike ? buffer.toString("utf-8") : buffer.toString("base64"),
    bytes: buffer.length
  };
}

function rewriteHtml(html: string, root: string) {
  return html.replace(ASSET_RE, (full, direct, quote, cssUrl) => {
    const raw = direct || cssUrl;
    if (!raw || raw.startsWith("data:") || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return full;
    try {
      const absolute = new URL(raw, root).toString();
      const local = "/" + pathFromUrl(absolute, root, kindFromUrl(absolute, ""));
      return direct ? full.replace(raw, local) : `url(${local})`;
    } catch { return full; }
  });
}

export async function scrapeSite(rootUrlInput: string, maxPages = 8, maxAssets = 80): Promise<ScrapeProject> {
  const rootUrl = assertUrl(rootUrlInput);
  const origin = new URL(rootUrl).origin;
  const queue = [rootUrl];
  const visited = new Set<string>();
  const files = new Map<string, ScrapedFile>();
  const warnings: string[] = [];
  const assetUrls = new Set<string>();
  const pageUrls: string[] = [];

  while (queue.length && visited.size < maxPages) {
    const pageUrl = queue.shift()!;
    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);
    try {
      const file = await fetchAsFile(pageUrl, rootUrl);
      if (!file) continue;
      if (file.kind === "html") {
        pageUrls.push(pageUrl);
        const html = file.content;
        extractAssetUrls(html, pageUrl).forEach((u) => assetUrls.add(u));
        extractPageLinks(html, pageUrl, origin).forEach((u) => { if (!visited.has(u) && queue.length < maxPages) queue.push(u); });
        file.content = rewriteHtml(html, rootUrl);
      }
      files.set(file.path, file);
    } catch (error) {
      warnings.push(`Page failed: ${pageUrl}`);
    }
  }

  for (const assetUrl of [...assetUrls].slice(0, maxAssets)) {
    try {
      const file = await fetchAsFile(assetUrl, rootUrl);
      if (file) files.set(file.path, file);
    } catch {
      warnings.push(`Asset failed: ${assetUrl}`);
    }
  }

  const html = [...files.values()].find((f) => f.kind === "html")?.content || "";
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || new URL(rootUrl).hostname;
  const allFiles = [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
  return {
    id: uid("scrape"),
    rootUrl,
    title: compactText(title, 120),
    createdAt: nowIso(),
    files: allFiles,
    pages: pageUrls,
    assets: [...assetUrls],
    stats: {
      pages: pageUrls.length,
      assets: assetUrls.size,
      files: allFiles.length,
      totalBytes: allFiles.reduce((sum, f) => sum + f.bytes, 0),
      warnings
    }
  };
}
