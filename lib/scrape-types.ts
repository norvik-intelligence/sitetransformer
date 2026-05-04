export type ScrapedFileKind = "html" | "css" | "js" | "image" | "font" | "json" | "text" | "other";

export interface ScrapedFile {
  path: string;
  url: string;
  kind: ScrapedFileKind;
  mimeType: string;
  encoding: "utf-8" | "base64";
  content: string;
  bytes: number;
}

export interface ScrapeProject {
  id: string;
  rootUrl: string;
  title: string;
  createdAt: string;
  files: ScrapedFile[];
  pages: string[];
  assets: string[];
  stats: {
    pages: number;
    assets: number;
    files: number;
    totalBytes: number;
    warnings: string[];
  };
}

export interface ScrapeRequest {
  url: string;
  maxPages?: number;
  maxAssets?: number;
}
