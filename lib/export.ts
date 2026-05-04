import type { SiteProject } from "./types";

function blockHtml(block: SiteProject["pages"][number]["blocks"][number]) {
  const c = block.content;
  const s = block.style;
  const bg = s.background || "transparent";
  const fg = s.foreground || "inherit";
  return `<section style="padding:${s.paddingY || 64}px ${s.paddingX || 24}px;background:${bg};color:${fg};text-align:${s.align || "left"}"><div style="max-width:1100px;margin:0 auto"><p>${c.eyebrow || ""}</p><h2>${c.headline || ""}</h2><p>${c.body || ""}</p>${c.imageUrl ? `<img src="${c.imageUrl}" style="max-width:100%;border-radius:24px"/>` : ""}${c.items ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">${c.items.map((i) => `<article><h3>${i.title}</h3><p>${i.body || ""}</p></article>`).join("")}</div>` : ""}${c.ctaLabel ? `<a href="${c.ctaHref || "#"}">${c.ctaLabel}</a>` : ""}</div></section>`;
}

export function renderProjectHtml(project: SiteProject) {
  const page = project.pages.find((p) => p.id === project.activePageId) || project.pages[0];
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.seo.title}</title><meta name="description" content="${page.seo.description}"><style>body{margin:0;font-family:Inter,system-ui,sans-serif;color:#0f172a}h2{font-size:clamp(2rem,5vw,4rem);line-height:1}a{display:inline-block;margin-top:20px;padding:12px 18px;border-radius:999px;background:#4f46e5;color:white;text-decoration:none}p{font-size:18px;line-height:1.7;color:inherit}</style></head><body>${page.blocks.map(blockHtml).join("")}</body></html>`;
}

export async function exportHtml(project: SiteProject) {
  const blob = new Blob([renderProjectHtml(project)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
