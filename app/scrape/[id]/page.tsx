"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ScrapeProject } from "@/lib/scrape-types";
import { loadScrapeProject } from "@/lib/scrape-storage";
import { CrawlResultViewer } from "@/components/scraper/CrawlResultViewer";

export default function ScrapeResultPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ScrapeProject | null | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    loadScrapeProject(params.id)
      .then((result) => { if (active) setProject(result); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Projekt konnte nicht geladen werden."); });
    return () => { active = false; };
  }, [params.id]);
  if (error || project === null) return <main className="flex min-h-screen items-center justify-center bg-[#080808] p-6 text-center text-white"><div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8"><h1 className="text-xl font-black">Crawl-Ergebnis nicht verfügbar</h1><p className="mt-3 text-sm leading-6 text-white/55">{error || "Das Ergebnis wurde in diesem Browser nicht gefunden. Crawl-Projekte bleiben lokal auf dem Gerät gespeichert, auf dem sie erstellt wurden."}</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-black">Neuen Crawl starten</Link></div></main>;
  if (project === undefined) return <main className="flex min-h-screen items-center justify-center bg-[#080808] text-white/45"><span role="status">Crawler-Ergebnis wird geladen …</span></main>;
  return <CrawlResultViewer project={project} />;
}
