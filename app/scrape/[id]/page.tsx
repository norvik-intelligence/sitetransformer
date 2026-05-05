"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ScrapeProject } from "@/lib/scrape-types";
import { loadScrapeProject } from "@/lib/scrape-storage";
import { CrawlResultViewer } from "@/components/scraper/CrawlResultViewer";

export default function ScrapeResultPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ScrapeProject | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    loadScrapeProject(params.id).then(setProject).catch((e) => setError(e instanceof Error ? e.message : "Projekt konnte nicht geladen werden."));
  }, [params.id]);
  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#080808] p-6 text-center text-red-300">{error}</main>;
  if (!project) return <main className="flex min-h-screen items-center justify-center bg-[#080808] text-white/45">Crawler-Ergebnis wird geladen...</main>;
  return <CrawlResultViewer project={project} />;
}
