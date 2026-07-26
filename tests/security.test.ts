import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicUrl, PublicUrlError, readResponseBuffer } from "../lib/safe-fetch";
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
