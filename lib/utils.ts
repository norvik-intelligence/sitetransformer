export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function assertUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Nur http/https URLs sind erlaubt.");
  const host = url.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(host) || host.endsWith(".local")) {
    throw new Error("Lokale oder private URLs sind blockiert.");
  }
  return url.toString();
}

export function compactText(value: string, max = 18000) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export const button = "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
export const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-indigo-500 transition focus:ring-2";
