import { NextResponse } from "next/server";
import type { ScrapeProject } from "@/lib/scrape-types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PushBody {
  repository: string;
  branch?: string;
  project: ScrapeProject;
}

function decode(content: string, encoding: "utf-8" | "base64") {
  return encoding === "utf-8" ? Buffer.from(content, "utf-8").toString("base64") : content;
}

export async function POST(req: Request) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return NextResponse.json({ error: "GITHUB_TOKEN fehlt in Vercel Environment Variables." }, { status: 400 });
    const body = (await req.json()) as PushBody;
    if (!body.repository || !body.repository.includes("/")) return NextResponse.json({ error: "Repository im Format owner/repo angeben." }, { status: 400 });
    const branch = body.branch || "main";
    const pushed: string[] = [];
    for (const file of body.project.files) {
      const path = file.path.replace(/^\/+/, "");
      const getRes = await fetch(`https://api.github.com/repos/${body.repository}/contents/${encodeURIComponent(path)}?ref=${branch}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
      const existing = getRes.ok ? await getRes.json() : null;
      const res = await fetch(`https://api.github.com/repos/${body.repository}/contents/${encodeURIComponent(path)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Add scraped file ${path}`, branch, content: decode(file.content, file.encoding), sha: existing?.sha })
      });
      if (!res.ok) {
        const error = await res.text();
        return NextResponse.json({ error: `GitHub Push fehlgeschlagen bei ${path}`, details: error }, { status: 400 });
      }
      pushed.push(path);
    }
    return NextResponse.json({ ok: true, pushed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub Push fehlgeschlagen." }, { status: 500 });
  }
}
