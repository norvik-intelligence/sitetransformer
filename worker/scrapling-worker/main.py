from __future__ import annotations

import base64
import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, HttpUrl

try:
    from scrapling.fetchers import Fetcher
except Exception:  # pragma: no cover
    Fetcher = None

app = FastAPI(title="SiteTransformer Scrapling Worker")


class ScrapeRequest(BaseModel):
    url: HttpUrl
    maxPages: int = 20
    maxAssets: int = 200


def token_guard(authorization: str | None) -> None:
    expected = os.getenv("SCRAPLING_WORKER_TOKEN")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def kind_from_url(url: str, mime: str) -> str:
    lower = url.lower()
    if "html" in mime or lower.endswith(".html"):
        return "html"
    if "css" in mime or lower.endswith(".css"):
        return "css"
    if "javascript" in mime or lower.endswith(".js"):
        return "js"
    if mime.startswith("image/"):
        return "image"
    if "font" in mime or lower.endswith((".woff", ".woff2", ".ttf", ".otf")):
        return "font"
    if "json" in mime or lower.endswith(".json"):
        return "json"
    if mime.startswith("text/"):
        return "text"
    return "other"


def path_from_url(url: str, root: str, kind: str) -> str:
    parsed = urlparse(url)
    root_host = urlparse(root).hostname
    path = parsed.path.strip("/") or "index.html"
    if path.endswith("/"):
        path += "index.html"
    if "." not in path.split("/")[-1]:
        path += "/index.html" if kind == "html" else ".txt"
    if parsed.hostname != root_host:
        return f"external/{parsed.hostname}/{path}"
    return path


async def fetch_bytes(client: httpx.AsyncClient, url: str) -> tuple[bytes, str]:
    response = await client.get(url, follow_redirects=True, timeout=20)
    response.raise_for_status()
    return response.content, response.headers.get("content-type", "application/octet-stream").split(";")[0]


async def fetch_page(url: str) -> str:
    if Fetcher is not None:
        page = Fetcher.get(url)
        return str(page.body)
    async with httpx.AsyncClient(headers={"user-agent": "SiteTransformerScraplingWorker/1.0"}) as client:
        content, _ = await fetch_bytes(client, url)
        return content.decode("utf-8", errors="ignore")


def extract_links(html: str, base: str) -> tuple[list[str], list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    origin = f"{urlparse(base).scheme}://{urlparse(base).netloc}"
    pages: set[str] = set()
    assets: set[str] = set()
    for tag in soup.find_all(["a", "link", "script", "img", "source"]):
        attr = "href" if tag.name in ["a", "link"] else "src"
        raw = tag.get(attr)
        if not raw or str(raw).startswith(("#", "mailto:", "tel:", "data:")):
            continue
        absolute = urljoin(base, raw)
        if tag.name == "a" and absolute.startswith(origin):
            pages.add(absolute.split("#")[0])
        else:
            assets.add(absolute)
    return list(pages), list(assets)


@app.post("/scrape")
async def scrape(body: ScrapeRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token_guard(authorization)
    root = str(body.url)
    queue = [root]
    visited: set[str] = set()
    files: dict[str, dict[str, Any]] = {}
    asset_urls: set[str] = set()
    page_urls: list[str] = []
    warnings: list[str] = []

    while queue and len(visited) < body.maxPages:
        page_url = queue.pop(0)
        if page_url in visited:
            continue
        visited.add(page_url)
        try:
            html = await fetch_page(page_url)
            page_urls.append(page_url)
            kind = "html"
            path = path_from_url(page_url, root, kind)
            files[path] = {
                "path": path,
                "url": page_url,
                "kind": kind,
                "mimeType": "text/html",
                "encoding": "utf-8",
                "content": html,
                "bytes": len(html.encode("utf-8")),
            }
            pages, assets = extract_links(html, page_url)
            asset_urls.update(assets)
            for link in pages:
                if link not in visited and link not in queue and len(queue) < body.maxPages:
                    queue.append(link)
        except Exception as exc:
            warnings.append(f"Page failed: {page_url} ({exc})")

    async with httpx.AsyncClient(headers={"user-agent": "SiteTransformerScraplingWorker/1.0"}) as client:
        for asset_url in list(asset_urls)[: body.maxAssets]:
            try:
                content, mime = await fetch_bytes(client, asset_url)
                kind = kind_from_url(asset_url, mime)
                path = path_from_url(asset_url, root, kind)
                is_text = mime.startswith("text/") or "javascript" in mime or "json" in mime or "xml" in mime or kind in ["css", "js"]
                files[path] = {
                    "path": path,
                    "url": asset_url,
                    "kind": kind,
                    "mimeType": mime,
                    "encoding": "utf-8" if is_text else "base64",
                    "content": content.decode("utf-8", errors="ignore") if is_text else base64.b64encode(content).decode("ascii"),
                    "bytes": len(content),
                }
            except Exception as exc:
                warnings.append(f"Asset failed: {asset_url} ({exc})")

    file_list = sorted(files.values(), key=lambda file: file["path"])
    title = urlparse(root).hostname or "scraped-site"
    return {
        "project": {
            "id": "scrape_worker_" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
            "rootUrl": root,
            "title": title,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "files": file_list,
            "pages": page_urls,
            "assets": list(asset_urls),
            "stats": {
                "pages": len(page_urls),
                "assets": len(asset_urls),
                "files": len(file_list),
                "totalBytes": sum(file["bytes"] for file in file_list),
                "warnings": warnings,
            },
        },
        "mode": "scrapling-worker",
    }
