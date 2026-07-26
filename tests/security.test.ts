import assert from "node:assert/strict";
import test from "node:test";
import { buildPreviewHtml } from "../lib/preview-html";
import { assertPublicUrl, PublicUrlError, readResponseBuffer } from "../lib/safe-fetch";
import type { ScrapeProject } from "../lib/scrape-types";
import { assertUrl } from "../lib/utils";

test("normalizes hostnames without a protocol", () => {
  assert.equal(assertUrl("example.com"), "https://example.com/");
});

test("rejects non-http protocols", () => {
  assert.throws(() => assertUrl("file:///etc/passwd"), /Nur http\/https/);
});

test("blocks local IPv4 targets before fetching", async () => {
  await assert.rejects(assertPublicUrl("http://127.0.0.1/admin"), PublicUrlError);
  await assert.rejects(assertPublicUrl("http://10.0.0.1"), PublicUrlError);
  await assert.rejects(assertPublicUrl("http://169.254.169.254/latest/meta-data"), PublicUrlError);
});

test("blocks local IPv6 and authenticated URLs", async () => {
  await assert.rejects(assertPublicUrl("http://[::1]/"), PublicUrlError);
  await assert.rejects(assertPublicUrl("https://user:password@example.com"), /Zugangsdaten/);
});

test("enforces response byte limits while streaming", async () => {
  const response = new Response("123456");
  await assert.rejects(readResponseBuffer(response, 5), /groesser/);
});

test("preview keeps uncaptured HTTPS styles and removes scripts", () => {
  const project: ScrapeProject = {
    id: "scrape_test",
    rootUrl: "https://www.example.com/",
    title: "Example",
    createdAt: new Date(0).toISOString(),
    pages: ["https://www.example.com/"],
    assets: [],
    stats: { pages: 1, assets: 0, files: 1, totalBytes: 100, warnings: [] },
    files: [{
      path: "index.html",
      url: "https://www.example.com/",
      kind: "html",
      mimeType: "text/html",
      encoding: "utf-8",
      content: '<html><head><link rel="stylesheet" href="/styles/site.css"></head><body><script>alert(1)</script></body></html>',
      bytes: 100
    }]
  };

  const preview = buildPreviewHtml(project);
  assert.match(preview, /href="https:\/\/www\.example\.com\/styles\/site\.css"/);
  assert.match(preview, /style-src 'unsafe-inline' data: https:/);
  assert.doesNotMatch(preview, /<script/i);
});
