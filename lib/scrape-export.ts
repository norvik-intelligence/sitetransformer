"use client";
import JSZip from "jszip";
import type { ScrapeProject } from "./scrape-types";
import { githubUrl, gitMcpUrl, integrationRoadmap, openSourceRepositories, stackPrinciples } from "./open-source-stack";

function decodeFile(content: string, encoding: "utf-8" | "base64") {
  if (encoding === "utf-8") return content;
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function createFramerBlueprint(project: ScrapeProject) {
  const htmlFiles = project.files.filter((file) => file.kind === "html");
  return {
    schema: "sitetransformer.framer-blueprint.v1",
    project: {
      id: project.id,
      title: project.title,
      rootUrl: project.rootUrl,
      createdAt: project.createdAt
    },
    pages: htmlFiles.map((file) => ({
      path: file.path,
      sourceUrl: file.url,
      route: file.path.endsWith("index.html") ? `/${file.path.replace(/index\.html$/, "")}` : `/${file.path}`,
      bytes: file.bytes
    })),
    assets: project.files
      .filter((file) => !["html", "css", "js", "json", "text"].includes(file.kind))
      .map((file) => ({ path: file.path, kind: file.kind, mimeType: file.mimeType, sourceUrl: file.url, bytes: file.bytes })),
    motion: {
      library: "motion",
      gitMcp: gitMcpUrl({ owner: "motiondivision", repo: "motion" }),
      presets: ["fade-in", "slide-up", "hover-scale", "scroll-reveal"]
    },
    nextSteps: [
      "Convert repeated DOM sections into React components.",
      "Map editable text and image slots from imported content.",
      "Use Motion presets for Framer-style entrance and hover animations."
    ]
  };
}

function createOpenSourceStackManifest() {
  return {
    schema: "sitetransformer.open-source-stack.v1",
    principles: stackPrinciples,
    roadmap: integrationRoadmap,
    repositories: openSourceRepositories.map((repository) => ({
      ...repository,
      github: githubUrl(repository),
      gitMcp: gitMcpUrl(repository),
      featureIdeas: repository.featureIdeas
    }))
  };
}

export async function downloadScrapeZip(project: ScrapeProject) {
  const zip = new JSZip();
  zip.file("scrape-report.json", JSON.stringify({ rootUrl: project.rootUrl, createdAt: project.createdAt, stats: project.stats }, null, 2));
  zip.file("framer-blueprint.json", JSON.stringify(createFramerBlueprint(project), null, 2));
  zip.file(".sitetransformer/open-source-stack.json", JSON.stringify(createOpenSourceStackManifest(), null, 2));
  zip.file("README.sitetransformer.md", `# ${project.title}\n\nExported from SiteTransformer.\n\n- Source: ${project.rootUrl}\n- Files: ${project.files.length}\n- Framer blueprint: \`framer-blueprint.json\`\n- Open-source stack manifest: \`.sitetransformer/open-source-stack.json\`\n`);
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

export async function downloadEditedSiteZip(project: ScrapeProject, html: string) {
  const zip = new JSZip();
  zip.file("index.html", html);
  zip.file("source-project.json", JSON.stringify({
    id: project.id,
    title: project.title,
    rootUrl: project.rootUrl,
    editedAt: new Date().toISOString()
  }, null, 2));
  for (const file of project.files) {
    if (file.kind === "html") continue;
    zip.file(file.path, decodeFile(file.content, file.encoding));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "edited-site"}-edited.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
