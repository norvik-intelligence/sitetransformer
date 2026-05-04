"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ScrapeProject } from "@/lib/scrape-types";
import { ScrapeEditor } from "@/components/scraper/ScrapeEditor";

export default function ScrapeEditPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ScrapeProject | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(`scrape:${params.id}`);
    if (raw) setProject(JSON.parse(raw));
  }, [params.id]);
  if (!project) return <main className="flex min-h-screen items-center justify-center bg-[#0d1117] text-[#8b949e]">Scrape-Projekt wird geladen...</main>;
  return <ScrapeEditor initialProject={project} />;
}
