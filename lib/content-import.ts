import type { ScrapeProject, ScrapedFile } from "./scrape-types";
import { assertUrl, compactText } from "./utils";

export interface ContentSource {
  url: string;
  title: string;
  description: string;
  logo?: string;
  images: string[];
  headings: string[];
  paragraphs: string[];
  navItems: Array<{ label: string; href: string }>;
}

function absolute(raw: string | undefined, base: string) {
  if (!raw || raw.startsWith("data:") || raw.startsWith("#")) return undefined;
  try { return new URL(raw, base).toString(); } catch { return undefined; }
}

function unique(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function safeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function byteSize(value: string) {
  if (typeof Blob !== "undefined") return new Blob([value]).size;
  return Buffer.byteLength(value, "utf-8");
}

function extractNavItems(html: string, baseUrl: string) {
  const navHtml = html.match(/<nav[\s\S]*?<\/nav>/i)?.[0] || html.match(/<header[\s\S]*?<\/header>/i)?.[0] || html.slice(0, 35000);
  return Array.from(navHtml.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({ href: absolute(match[1], baseUrl) || "#", label: compactText(match[2], 44) }))
    .filter((item) => item.label.length > 1 && !/cookie|privacy|login|account|facebook|instagram|youtube/i.test(item.label))
    .slice(0, 12);
}

function extractMeta(html: string, baseUrl: string): ContentSource {
  const title = compactText(html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || new URL(baseUrl).hostname, 140);
  const description = compactText(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] || "", 280);
  const ogImage = absolute(html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1], baseUrl);
  const logoCandidates = [
    html.match(/<img[^>]+(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)/i)?.[1],
    html.match(/<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id|alt)=["'][^"']*logo[^"']*/i)?.[1],
    html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)/i)?.[1]
  ].map((v) => absolute(v, baseUrl)).filter((v): v is string => Boolean(v));
  const images = unique([
    ogImage,
    ...Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)/gi)).map((m) => absolute(m[1], baseUrl))
  ].filter((v): v is string => Boolean(v))).filter((img) => !/logo|icon|sprite|favicon/i.test(img)).slice(0, 24);
  const headings = unique(Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)).map((m) => compactText(m[1], 120))).filter((h) => h.length > 2).slice(0, 24);
  const paragraphs = unique(Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => compactText(m[1], 300)).filter((v) => v.length > 24)).slice(0, 48);
  const navItems = extractNavItems(html, baseUrl);
  return { url: baseUrl, title, description, logo: logoCandidates[0], images, headings, paragraphs, navItems };
}

function replaceTitleAndMeta(html: string, source: ContentSource) {
  let out = html.replace(/<title[^>]*>.*?<\/title>/i, `<title>${safeText(source.title)}</title>`);
  if (source.description) {
    if (/<meta[^>]+name=["']description["'][^>]*>/i.test(out)) {
      out = out.replace(/<meta[^>]+name=["']description["'][^>]*>/i, `<meta name="description" content="${safeAttr(source.description)}">`);
    } else {
      out = out.replace(/<head([^>]*)>/i, `<head$1><meta name="description" content="${safeAttr(source.description)}">`);
    }
  }
  return out;
}

function replaceLogoOnly(html: string, source: ContentSource) {
  if (!source.logo) return html;
  let replaced = false;
  let out = html.replace(/(<img[^>]*(?:class|id|alt)=["'][^"']*(?:logo|brand)[^"']*["'][^>]*src=["'])([^"']+)(["'][^>]*>)/i, (_m, before, _old, after) => {
    replaced = true;
    return `${before}${safeAttr(source.logo!)}${after}`;
  });
  if (!replaced) {
    out = out.replace(/(<header[\s\S]*?<img[^>]+src=["'])([^"']+)(["'][^>]*>)/i, (_m, before, _old, after) => `${before}${safeAttr(source.logo!)}${after}`);
  }
  out = out.replace(/(<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["'])([^"']+)(["'][^>]*>)/gi, `$1${safeAttr(source.logo)}$3`);
  return out;
}

function replaceNavigationOnly(html: string, source: ContentSource) {
  if (!source.navItems.length) return html;
  let i = 0;
  const replaceAnchor = (anchor: string) => anchor.replace(/(<a\b[^>]*href=["'])([^"']+)(["'][^>]*>)([\s\S]*?)(<\/a>)/i, (_m, before, _href, mid, label, close) => {
    const next = source.navItems[i++];
    if (!next) return anchor;
    const cleanLabel = compactText(label, 60);
    if (!cleanLabel || /ticket|shop|member|login|account|search|menu|language|privacy|cookie/i.test(cleanLabel)) return anchor;
    return `${before}${safeAttr(next.href)}${mid}${safeText(next.label)}${close}`;
  });
  let out = html.replace(/<nav[\s\S]*?<\/nav>/i, (nav) => nav.replace(/<a\b[\s\S]*?<\/a>/gi, replaceAnchor));
  if (i === 0) {
    out = out.replace(/<header[\s\S]*?<\/header>/i, (header) => header.replace(/<a\b[\s\S]*?<\/a>/gi, replaceAnchor));
  }
  return out;
}

function replaceHeroCopyOnly(html: string, source: ContentSource) {
  const headline = source.headings[0] || source.title;
  const subline = source.paragraphs[0] || source.description;
  let replacedH1 = false;
  let replacedP = false;
  let out = html.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/i, (_m, attrs) => {
    replacedH1 = true;
    return `<h1${attrs}>${safeText(headline)}</h1>`;
  });
  if (!replacedH1) {
    out = out.replace(/<h2([^>]*)>[\s\S]*?<\/h2>/i, (_m, attrs) => `<h2${attrs}>${safeText(headline)}</h2>`);
  }
  if (subline) {
    out = out.replace(/<p([^>]*)>([^<>]{24,360})<\/p>/i, (_m, attrs) => {
      replacedP = true;
      return `<p${attrs}>${safeText(subline)}</p>`;
    });
    if (!replacedP) {
      out = out.replace(/(<h1[^>]*>[\s\S]*?<\/h1>)/i, `$1<p>${safeText(subline)}</p>`);
    }
  }
  return out;
}

function replacePrimaryImagesOnly(html: string, source: ContentSource) {
  const imagePool = source.images.slice(0, 6);
  if (!imagePool.length) return html;
  let index = 0;
  return html.replace(/<img\b[^>]+src=["'][^"']+["'][^>]*>/gi, (img) => {
    if (/logo|icon|sprite|avatar|flag|language/i.test(img)) return img;
    if (index >= imagePool.length) return img;
    const next = imagePool[index++];
    return img.replace(/src=["'][^"']+["']/i, `src="${safeAttr(next)}"`);
  });
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
    content = replaceTitleAndMeta(content, source);
    content = replaceLogoOnly(content, source);
    content = replaceNavigationOnly(content, source);
    content = replaceHeroCopyOnly(content, source);
    content = replacePrimaryImagesOnly(content, source);
    report.push(`${file.path}: Header, Logo, Navigation, Hero und Hauptbilder semantisch gemappt.`);
    return { ...file, content, bytes: byteSize(content) };
  });
  const next: ScrapeProject = {
    ...project,
    title: source.title || project.title,
    files,
    stats: { ...project.stats, warnings: [...project.stats.warnings, `Content importiert von ${source.url} ohne Designstruktur zu veraendern.`] }
  };
  return { project: next, report };
}
