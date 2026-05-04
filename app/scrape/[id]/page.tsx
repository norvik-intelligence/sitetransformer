"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ScrapeProject } from "@/lib/scrape-types";
import { loadScrapeProject } from "@/lib/scrape-storage";
import { ScrapeEditor } from "@/components/scraper/ScrapeEditor";

export default function ScrapeEditPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ScrapeProject | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    loadScrapeProject(params.id).then(setProject).catch((e) => setError(e instanceof Error ? e.message : "Projekt konnte nicht geladen werden."));
  }, [params.id]);
  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#0d1117] p-6 text-center text-red-300">{error}</main>;
  if (!project) return <main className="flex min-h-screen items-center justify-center bg-[#0d1117] text-[#8b949e]">Scrape-Projekt wird geladen...</main>;
  return <ScrapeEditor initialProject={project} />;
}
