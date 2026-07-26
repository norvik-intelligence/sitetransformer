import type { ScrapeProject, ScrapedFile } from "./scrape-types";

function dataUrlFor(file: ScrapedFile, content = file.content) {
  if (file.encoding === "base64") return `data:${file.mimeType};base64,${content}`;
  return `data:${file.mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function replaceResourceReferences(value: string, resources: Map<string, string>, baseUrl?: string) {
  const resolve = (raw: string) => {
    const direct = resources.get(raw) || resources.get(raw.replace(/^\/+/, ""));
    if (direct) return direct;
    if (baseUrl) {
      try {
        const absolute = new URL(raw, baseUrl).toString();
        return resources.get(absolute) || absolute;
      } catch {}
    }
    return raw;
  };

  let output = value.replace(/\b(src|href|poster|data)=(["'])(.*?)\2/gi, (_match, attribute, quote, raw) => `${attribute}=${quote}${resolve(raw)}${quote}`);
  output = output.replace(/\bsrcset=(["'])(.*?)\1/gi, (_match, quote, srcset) => {
    const next = srcset.split(",").map((candidate: string) => {
      const [raw, ...descriptor] = candidate.trim().split(/\s+/);
      return [resolve(raw), ...descriptor].join(" ");
    }).join(", ");
    return `srcset=${quote}${next}${quote}`;
  });
  return output.replace(/url\((['"]?)(.*?)\1\)/gi, (_match, quote, raw) => `url(${quote}${resolve(raw)}${quote})`);
}

export function buildPreviewHtml(project: ScrapeProject, selectedFile?: ScrapedFile) {
  const htmlFile = selectedFile?.kind === "html"
    ? selectedFile
    : project.files.find((file) => file.path.endsWith("index.html") && file.kind === "html") || project.files.find((file) => file.kind === "html");
  if (!htmlFile || htmlFile.encoding !== "utf-8") {
    return "<!doctype html><html><body style='font-family:system-ui;padding:32px'>Keine HTML-Datei für die Vorschau gefunden.</body></html>";
  }

  const resources = new Map<string, string>();
  for (const file of project.files) {
    if (file.kind === "html" || file.kind === "css" || file.kind === "js") continue;
    const dataUrl = dataUrlFor(file);
    resources.set(file.url, dataUrl);
    resources.set(file.path, dataUrl);
    resources.set(`/${file.path.replace(/^\/+/, "")}`, dataUrl);
  }
  for (const file of project.files) {
    if (file.kind !== "css" || file.encoding !== "utf-8") continue;
    const dataUrl = dataUrlFor(file, replaceResourceReferences(file.content, resources, file.url));
    resources.set(file.url, dataUrl);
    resources.set(file.path, dataUrl);
    resources.set(`/${file.path.replace(/^\/+/, "")}`, dataUrl);
  }

  let html = replaceResourceReferences(htmlFile.content, resources, htmlFile.url);
  html = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<(?:iframe|object|embed)\b[\s\S]*?<\/(?:iframe|object|embed)>/gi, "")
    .replace(/<(?:iframe|object|embed)\b[^>]*\/?>/gi, "")
    .replace(/<meta\b[^>]*http-equiv=["']?refresh["']?[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/<form\b[^>]*>/gi, "<form action=\"#\" method=\"dialog\">");

  const policy = "default-src 'none'; img-src data: https:; media-src data: https:; font-src data: https:; style-src 'unsafe-inline' data: https:; form-action 'none'; frame-src 'none';";
  const previewHead = `<meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">`;
  return /<head[\s>]/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${previewHead}`) : `<!doctype html><html><head>${previewHead}</head><body>${html}</body></html>`;
}
