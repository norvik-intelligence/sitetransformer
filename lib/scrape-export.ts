"use client";
import JSZip from "jszip";
import type { ScrapeProject } from "./scrape-types";

function decodeFile(content: string, encoding: "utf-8" | "base64") {
  if (encoding === "utf-8") return content;
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function downloadScrapeZip(project: ScrapeProject) {
  const zip = new JSZip();
  zip.file("scrape-report.json", JSON.stringify({ rootUrl: project.rootUrl, createdAt: project.createdAt, stats: project.stats }, null, 2));
  for (const file of project.files) {
    zip.file(file.path, decodeFile(file.content, file.encoding));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "scraped-site"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
