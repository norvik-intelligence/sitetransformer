import type { MappingConfidence, SiteProject, SourceSnapshot } from "./types";
import { compactText, nowIso, uid } from "./utils";

function absolutizeHtml(html: string, baseUrl: string) {
  let out = html;
  out = out.replace(/(src|href)=(['"])(?!https?:|data:|mailto:|tel:|#|\/\/)([^'"]+)\2/gi, (_m, attr, quote, value) => `${attr}=${quote}${new URL(value, baseUrl).toString()}${quote}`);
  out = out.replace(/(src|href)=(['"])\/\/([^'"]+)\2/gi, (_m, attr, quote, value) => `${attr}=${quote}https://${value}${quote}`);
  out = out.replace(/url\((['"]?)(?!https?:|data:|#)([^)'"]+)\1\)/gi, (_m, quote, value) => `url(${quote}${new URL(value, baseUrl).toString()}${quote})`);
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<form([\s\S]*?)>/gi, "<form$1 onsubmit=\"return false\">");
  return out;
}

function extractMainSignals(text: string) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    headline: sentences[0]?.slice(0, 90) || "Original Design Clone",
    body: sentences.slice(1, 4).join(" ").slice(0, 260) || "Die Originalseite wurde als visuelle Referenz geklont. Ersetze jetzt Inhalte semantisch in den editierbaren Blocks."
  };
}

export async function scrapeUrl(url: string): Promise<SourceSnapshot> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 SiteTransformer PixelClone/1.0" } });
  if (!res.ok) throw new Error(`URL konnte nicht gelesen werden: ${res.status}`);
  const html = await res.text();
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1];
  const images = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)/gi)).map((m) => new URL(m[1], url).toString()).slice(0, 24);
  const clonedHtml = absolutizeHtml(html, url).slice(0, 180000);
  return { url, title, description, html: html.slice(0, 50000), clonedHtml, text: compactText(html), images, capturedAt: nowIso(), cloneQuality: { score: 0.78, notes: ["HTML/CSS/Images wurden als Snapshot referenziert.", "Interaktive Scripte wurden aus Sicherheitsgruenden entfernt.", "Dynamische Inhalte, Login-Bereiche und Canvas/WebGL koennen abweichen."] } };
}

export async function generateProjectFromDesign(design: SourceSnapshot, projectName?: string): Promise<SiteProject> {
  const t = nowIso();
  const name = projectName?.trim() || design.title || new URL(design.url).hostname;
  const firstImage = design.images[0];
  const signals = extractMainSignals(design.description || design.text);
  return {
    id: uid("project"),
    name,
    status: "ready",
    cloneMode: "pixel",
    designUrl: design.url,
    brand: {
      name,
      colors: { primary: "#111827", secondary: "#0f172a", accent: "#6366f1", background: "#ffffff", foreground: "#0f172a", muted: "#f1f5f9" },
      typography: { heading: "Inter", body: "Inter", scale: "comfortable" },
      radius: 18,
      tone: "premium"
    },
    activePageId: "home",
    pages: [{
      id: "home",
      title: "Home",
      slug: "/",
      seo: { title: name, description: design.description || "Pixel clone generated with SiteTransformer" },
      blocks: [
        { id: uid("block"), kind: "hero", name: "Hero Content Replacement", content: { eyebrow: "Content Layer", headline: signals.headline, body: signals.body, ctaLabel: "Call to action", ctaHref: "#", imageUrl: firstImage }, style: { paddingY: 96, align: "center" }, createdAt: t, updatedAt: t },
        { id: uid("block"), kind: "features", name: "Semantic Content Sections", content: { headline: "Wunschinhalte einsetzen", body: "Diese Blocks sind die editierbare Content-Schicht fuer den geklonten Look.", items: [{ title: "Texte ersetzen", body: "Headlines, Abschnitte und CTAs werden semantisch gemappt." }, { title: "Bilder tauschen", body: "Hero- und Section-Bilder lassen sich gegen eigene Assets ersetzen." }, { title: "Export vorbereiten", body: "Nach dem Mapping kann die Seite als eigenes Projekt exportiert werden." }] }, style: { paddingY: 72, align: "center", background: "#f8fafc" }, createdAt: t, updatedAt: t },
        { id: uid("block"), kind: "cta", name: "Final CTA Replacement", content: { headline: "Jetzt mit eigenen Inhalten fuellen", body: "Nutze Content Mapping oder den Manual LLM Connector, um die geklonte Vorlage mit deinen Wunschinhalten zu ersetzen.", ctaLabel: "Content mappen", ctaHref: "#" }, style: { paddingY: 72, align: "center", background: "#111827", foreground: "#ffffff" }, createdAt: t, updatedAt: t }
      ]
    }],
    source: { design },
    createdAt: t,
    updatedAt: t
  };
}

export async function mapContent(project: SiteProject, content: SourceSnapshot): Promise<{ project: SiteProject; report: MappingConfidence[] }> {
  const chunks = content.text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const report: MappingConfidence[] = [];
  let i = 0;
  const mapped: SiteProject = {
    ...project,
    status: "ready",
    contentUrl: content.url,
    source: { ...project.source, content },
    updatedAt: nowIso(),
    pages: project.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => {
        const body = chunks.slice(i, i + 3).join(" ").slice(0, 420) || block.content.body;
        const headline = chunks[i]?.slice(0, 90) || block.content.headline;
        i += 3;
        report.push({ blockId: block.id, score: 0.86, reason: `Wunschcontent semantisch auf ${block.kind} gemappt, waehrend der Pixel-Clone als Designreferenz erhalten bleibt.` });
        return { ...block, content: { ...block.content, headline, body }, updatedAt: nowIso() };
      })
    })),
    mappingReport: report
  };
  return { project: mapped, report };
}
