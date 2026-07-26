import assert from "node:assert/strict";
import test from "node:test";
import { extractContentBundle } from "../lib/content-source";

test("extracts ordered visible content and ignores scripts", () => {
  const html = `<!doctype html><html><head><title>Source &amp; Co</title><meta name="description" content="Beschreibung"></head>
    <body><h1>Willkommen</h1><script><p>Unsichtbar</p></script><p>Ein <strong>klarer</strong> Text.</p><ul><li>Punkt eins</li></ul></body></html>`;
  const result = extractContentBundle(html, "https://example.com/");
  assert.equal(result.title, "Source & Co");
  assert.equal(result.description, "Beschreibung");
  assert.deepEqual(result.items, [
    { tag: "h1", text: "Willkommen" },
    { tag: "p", text: "Ein klarer Text." },
    { tag: "li", text: "Punkt eins" }
  ]);
});

test("limits extracted source items", () => {
  const html = `<html><body>${Array.from({ length: 300 }, (_, index) => `<p>Text ${index}</p>`).join("")}</body></html>`;
  assert.equal(extractContentBundle(html, "https://example.com/").items.length, 250);
});
