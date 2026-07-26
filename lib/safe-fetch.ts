import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { assertUrl } from "./utils";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 4;

export class PublicUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicUrlError";
  }
}

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) return isPrivateIpv4(normalized.slice(7));
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("ff")
  );
}

function isPrivateAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

export async function assertPublicUrl(value: string | URL) {
  let url: URL;
  try {
    url = new URL(assertUrl(value.toString()));
  } catch (error) {
    throw new PublicUrlError(error instanceof Error ? error.message : "Ungueltige URL.");
  }

  if (url.username || url.password) throw new PublicUrlError("URLs mit Zugangsdaten sind nicht erlaubt.");
  const allowedPort = !url.port || (url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443");
  if (!allowedPort) throw new PublicUrlError("Nur die Standard-Ports 80 und 443 sind erlaubt.");

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isPrivateAddress(hostname)) throw new PublicUrlError("Lokale, private oder reservierte Netzwerkziele sind blockiert.");
    return url;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new PublicUrlError("Der Hostname konnte nicht aufgeloest werden.");
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new PublicUrlError("Lokale, private oder reservierte Netzwerkziele sind blockiert.");
  }
  return url;
}

interface PublicFetchOptions extends RequestInit {
  maxRedirects?: number;
  timeoutMs?: number;
}

export async function fetchPublicResource(input: string | URL, options: PublicFetchOptions = {}) {
  const { maxRedirects = DEFAULT_MAX_REDIRECTS, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  let current = await assertPublicUrl(input);

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current, {
        ...init,
        redirect: "manual",
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error(`Zeitlimit fuer ${current.hostname} ueberschritten.`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect ohne Ziel-URL.");
    if (redirect === maxRedirects) throw new Error("Zu viele Redirects.");
    current = await assertPublicUrl(new URL(location, current));
  }

  throw new Error("Zu viele Redirects.");
}

export async function readResponseBuffer(response: Response, maxBytes: number) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maxBytes) throw new Error(`Datei ist groesser als ${Math.ceil(maxBytes / 1024 / 1024)} MB.`);
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error(`Datei ist groesser als ${Math.ceil(maxBytes / 1024 / 1024)} MB.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), received);
}
