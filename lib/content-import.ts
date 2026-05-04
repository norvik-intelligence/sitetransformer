import type { ScrapeProject, ScrapedFile } from "./scrape-types";
import { assertUrl, compactText } from "./utils";

interface ContentSource {
  url: string;
  title: string;
  description: string;
  logo?: string;
  images: string[];
  headings: string[];
  paragraphs: string[];
}

function absolute(raw: string | undefined, base: string) {
  if (!raw || raw.startsWith("data:") || raw.startsWith("#")) return undefined;
  try { return new URL(raw, base).toString(); } catch { return undefined; }
}

function unique(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function extractMeta(html: string, baseUrl: string): ContentSource {
  const title = compactText(html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || new URL(baseUrl).hostname, 140);
  const description = compactText(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] || "", 280);
  const logoCandidates = [
    html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)/i)?.[1],
    html.match(/<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)/i)?.[1],
    html.match(/<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id|alt)=["'][^"']*logo[^"']*/i)?.[1]
  ].map((v) => absolute(v, baseUrl)).filter((v): v is string => Boolean(v));
  const images = unique(Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)/gi)).map((m) => absolute(m[1], baseUrl)).filter((v): v is string => Boolean(v))).slice(0, 24);
  const headings = unique(Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)).map((m) => compactText(m[1], 120))).slice(0, 18);
  const paragraphs = unique(Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => compactText(m[1], 280)).filter((v) => v.length > 24)).slice(0, 36);
  return { url: baseUrl, title, description, logo: logoCandidates[0], images, headings, paragraphs };
}

function replaceTextNodes(html: string, source: ContentSource) {
  const replacements = [source.title, source.description, ...source.headings, ...source.paragraphs].filter(Boolean);
  let index = 0;
  return html.replace(/>([^<>]{28,220})</g, (match, text) => {
    const clean = compactText(text, 260);
    if (!clean || clean.length < 28 || /cookie|privacy|javascript|newsletter|subscribe/i.test(clean)) return match;
    const next = replacements[index++ % Math.max(replacements.length, 1)];
    if (!next) return match;
    return `>${next}<`;
  });
}

function replaceImages(html: string, source: ContentSource) {
  const imagePool = unique([source.logo, ...source.images].filter((v): v is string => Boolean(v)));
  if (!imagePool.length) return html;
  let imageIndex = 0;
  return html.replace(/(<img[^>]+src=["'])([^"']+)(["'][^>]*>)/gi, (match, before, _old, after) => {
    const next = imagePool[imageIndex++ % imagePool.length];
    return `${before}${next}${after}`;
  });
}

function replaceLogoLinks(html: string, source: ContentSource) {
  if (!source.logo) return html;
  let out = html.replace(/(<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["'])([^"']+)(["'][^>]*>)/gi, `$1${source.logo}$3`);
  out = out.replace(/(<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]+src=["'])([^"']+)(["'][^>]*>)/gi, `$1${source.logo}$3`);
  return out;
}

export async function fetchContentSource(contentUrlInput: string): Promise<ContentSource> {
  const url = assertUrl(contentUrlInput);
  const res = await fetch(url, { headers: { "User-Agent": "SiteTransformerContentImporter/1.0" } });
  if (!res.ok) throw new Error(`Content-Webseite konnte nicht gelesen werden: ${res.status}`);
  const html = await res.text();
  return extractMeta(html, url);
}

export function importContentIntoScrape(project: ScrapeProject, source: ContentSource): { project: ScrapeProject; report: string[] } {
  const report: string[] = [];
  const files = project.files.map((file): ScrapedFile => {
    if (file.kind !== "html" || file.encoding !== "utf-8") return file;
    let content = file.content;
    content = replaceLogoLinks(content, source);
    content = replaceImages(content, source);
    content = replaceTextNodes(content, source);
    content = content.replace(/<title[^>]*>.*?<\/title>/i, `<title>${source.title}</title>`);
    if (source.description) {
      content = content.replace(/<meta[^>]+name=["']description["'][^>]*>/i, `<meta name="description" content="${source.description}">`);
    }
    report.push(`${file.path}: Texte, Bilder und Meta-Daten importiert.`);
    return { ...file, content, bytes: new Blob([content]).size };
  });
  const next: ScrapeProject = {
    ...project,
    title: source.title || project.title,
    files,
    stats: { ...project.stats, warnings: [...project.stats.warnings, `Content importiert von ${source.url}`] }
  };
  return { project: next, report };
}
