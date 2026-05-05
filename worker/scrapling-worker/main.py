from __future__ import annotations

import asyncio
import base64
import os
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
import scrapy
from bs4 import BeautifulSoup
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, HttpUrl
from scrapy.crawler import CrawlerRunner
from scrapy.http import Response
from twisted.internet import asyncioreactor

try:
    asyncioreactor.install()
except Exception:
    pass

from twisted.internet import defer  # noqa: E402

app = FastAPI(title="SiteTransformer Scrapy Worker")


class ScrapeRequest(BaseModel):
    url: HttpUrl
    maxPages: int = 20
    maxAssets: int = 200


def token_guard(authorization: str | None) -> None:
    expected = os.getenv("SCRAPY_WORKER_TOKEN") or os.getenv("CRAWLER_WORKER_TOKEN") or os.getenv("SCRAPLING_WORKER_TOKEN")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
async def health(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token_guard(authorization)
    return {
        "ok": True,
        "worker": "SiteTransformer Scrapy Worker",
        "engine": "scrapy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def kind_from_url(url: str, mime: str) -> str:
    lower = url.lower()
    if "html" in mime or lower.endswith(".html"):
        return "html"
    if "css" in mime or lower.endswith(".css"):
        return "css"
    if "javascript" in mime or lower.endswith((".js", ".mjs")):
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


def html_title(html: str, fallback: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.I | re.S)
    if not match:
        return fallback
    return re.sub(r"\s+", " ", BeautifulSoup(match.group(1), "html.parser").get_text(" ")).strip() or fallback


def extract_links(html: str, base: str) -> tuple[list[str], list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    parsed_base = urlparse(base)
    origin = f"{parsed_base.scheme}://{parsed_base.netloc}"
    pages: set[str] = set()
    assets: set[str] = set()
    for tag in soup.find_all(["a", "link", "script", "img", "source"]):
        attr = "href" if tag.name in ["a", "link"] else "src"
        raw = tag.get(attr)
        if not raw or str(raw).startswith(("#", "mailto:", "tel:", "data:")):
            continue
        absolute = urljoin(base, str(raw))
        if tag.name == "a" and absolute.startswith(origin):
            pages.add(absolute.split("#")[0])
        else:
            assets.add(absolute)
    for match in re.finditer(r"url\((['\"]?)(.*?)\1\)", html, flags=re.I):
        raw = match.group(2)
        if raw and not raw.startswith(("data:", "#")):
            assets.add(urljoin(base, raw))
    return list(pages), list(assets)


class SiteTransformerSpider(scrapy.Spider):
    name = "sitetransformer"
    custom_settings = {
        "LOG_ENABLED": False,
        "ROBOTSTXT_OBEY": False,
        "DOWNLOAD_TIMEOUT": 25,
        "RETRY_TIMES": 2,
        "CONCURRENT_REQUESTS": 8,
        "USER_AGENT": "Mozilla/5.0 SiteTransformerScrapyWorker/1.0",
    }

    def __init__(self, start_url: str, max_pages: int, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.start_urls = [start_url]
        self.root = start_url
        self.origin = f"{urlparse(start_url).scheme}://{urlparse(start_url).netloc}"
        self.max_pages = max_pages
        self.pages: dict[str, str] = {}
        self.page_urls: list[str] = []
        self.asset_urls: set[str] = set()
        self.warnings: list[str] = []

    def parse(self, response: Response):
        if len(self.page_urls) >= self.max_pages:
            return
        url = response.url.split("#")[0]
        if url in self.pages:
            return
        html = response.text
        self.pages[url] = html
        self.page_urls.append(url)
        pages, assets = extract_links(html, url)
        self.asset_urls.update(assets)
        for link in pages:
            if len(self.page_urls) >= self.max_pages:
                break
            if link not in self.pages and link.startswith(self.origin):
                yield scrapy.Request(link, callback=self.parse, dont_filter=False)


async def run_spider(root: str, max_pages: int) -> SiteTransformerSpider:
    runner = CrawlerRunner()
    crawler = runner.create_crawler(SiteTransformerSpider)
    d = runner.crawl(crawler, start_url=root, max_pages=max_pages)
    await defer.ensureDeferred(d).asFuture(asyncio.get_running_loop())
    return crawler.spider


async def fetch_asset(client: httpx.AsyncClient, url: str, root: str) -> dict[str, Any]:
    response = await client.get(url, follow_redirects=True, timeout=25)
    response.raise_for_status()
    content = response.content
    mime = response.headers.get("content-type", "application/octet-stream").split(";")[0]
    kind = kind_from_url(url, mime)
    is_text = mime.startswith("text/") or "javascript" in mime or "json" in mime or "xml" in mime or kind in ["css", "js"]
    return {
        "path": path_from_url(url, root, kind),
        "url": url,
        "kind": kind,
        "mimeType": mime,
        "encoding": "utf-8" if is_text else "base64",
        "content": content.decode("utf-8", errors="ignore") if is_text else base64.b64encode(content).decode("ascii"),
        "bytes": len(content),
    }


@app.post("/scrape")
async def scrape(body: ScrapeRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token_guard(authorization)
    root = str(body.url)
    spider = await run_spider(root, body.maxPages)
    files: dict[str, dict[str, Any]] = {}
    warnings = list(spider.warnings)

    for page_url, html in spider.pages.items():
        path = path_from_url(page_url, root, "html")
        files[path] = {
            "path": path,
            "url": page_url,
            "kind": "html",
            "mimeType": "text/html",
            "encoding": "utf-8",
            "content": html,
            "bytes": len(html.encode("utf-8")),
        }

    async with httpx.AsyncClient(headers={"user-agent": "Mozilla/5.0 SiteTransformerScrapyWorker/1.0"}) as client:
        tasks = [fetch_asset(client, asset_url, root) for asset_url in list(spider.asset_urls)[: body.maxAssets]]
        for result in await asyncio.gather(*tasks, return_exceptions=True):
            if isinstance(result, Exception):
                warnings.append(f"Asset failed: {result}")
                continue
            files[result["path"]] = result

    file_list = sorted(files.values(), key=lambda file: file["path"])
    first_html = next((file["content"] for file in file_list if file["kind"] == "html"), "")
    title = html_title(first_html, urlparse(root).hostname or "scraped-site")
    return {
        "project": {
            "id": "scrape_scrapy_" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
            "rootUrl": root,
            "title": title,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "files": file_list,
            "pages": spider.page_urls,
            "assets": list(spider.asset_urls),
            "stats": {
                "pages": len(spider.page_urls),
                "assets": len(spider.asset_urls),
                "files": len(file_list),
                "totalBytes": sum(file["bytes"] for file in file_list),
                "warnings": warnings,
            },
        },
        "mode": "scrapy-worker",
    }
