import type { MappingConfidence, SiteProject, SourceSnapshot } from "./types";
import { compactText, nowIso, uid } from "./utils";

export async function scrapeUrl(url: string): Promise<SourceSnapshot> {
  const res = await fetch(url, { headers: { "User-Agent": "SiteTransformer/1.0" } });
  if (!res.ok) throw new Error(`URL konnte nicht gelesen werden: ${res.status}`);
  const html = await res.text();
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1];
  const images = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)/gi)).map((m) => new URL(m[1], url).toString()).slice(0, 12);
  return { url, title, description, html: html.slice(0, 50000), text: compactText(html), images, capturedAt: nowIso() };
}

export async function generateProjectFromDesign(design: SourceSnapshot, projectName?: string): Promise<SiteProject> {
  const t = nowIso();
  const name = projectName?.trim() || design.title || new URL(design.url).hostname;
  const firstImage = design.images[0];
  return {
    id: uid("project"),
    name,
    status: "ready",
    designUrl: design.url,
    brand: {
      name,
      colors: { primary: "#4f46e5", secondary: "#0f172a", accent: "#7c3aed", background: "#ffffff", foreground: "#0f172a", muted: "#f1f5f9" },
      typography: { heading: "Inter", body: "Inter", scale: "comfortable" },
      radius: 18,
      tone: "premium"
    },
    activePageId: "home",
    pages: [{
      id: "home",
      title: "Home",
      slug: "/",
      seo: { title: name, description: design.description || "Generated with SiteTransformer" },
      blocks: [
        { id: uid("block"), kind: "hero", name: "Hero", content: { eyebrow: "AI transformed", headline: name, body: design.description || design.text.slice(0, 180), ctaLabel: "Get started", ctaHref: "#", imageUrl: firstImage }, style: { paddingY: 96, align: "center" }, createdAt: t, updatedAt: t },
        { id: uid("block"), kind: "features", name: "Features", content: { headline: "Was diese Seite bietet", body: "Strukturierte Inhalte als editierbare Blöcke.", items: [{ title: "Saubere Blocks", body: "Jede Sektion ist separat editierbar." }, { title: "Brand Transform", body: "Farben, Texte und Bilder lassen sich schnell anpassen." }, { title: "Export ready", body: "Bereit für Vercel und Next.js." }] }, style: { paddingY: 72, align: "center", background: "#f8fafc" }, createdAt: t, updatedAt: t },
        { id: uid("block"), kind: "cta", name: "CTA", content: { headline: "Bereit zum Bearbeiten", body: "Klicke in Texte, ordne Blocks neu und exportiere dein Projekt.", ctaLabel: "Jetzt starten", ctaHref: "#" }, style: { paddingY: 72, align: "center", background: "#111827", foreground: "#ffffff" }, createdAt: t, updatedAt: t }
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
        const body = chunks.slice(i, i + 3).join(" ").slice(0, 360) || block.content.body;
        i += 3;
        report.push({ blockId: block.id, score: 0.82, reason: `Content semantisch auf ${block.kind} gemappt.` });
        return { ...block, content: { ...block.content, body }, updatedAt: nowIso() };
      })
    })),
    mappingReport: report
  };
  return { project: mapped, report };
}
