"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] p-6 text-center text-white">
      <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300/70">SiteTransformer</p>
        <h1 className="mt-3 text-2xl font-black">Etwas ist schiefgelaufen</h1>
        <p className="mt-3 text-sm leading-6 text-white/50">Die Sitzung bleibt erhalten. Du kannst die Ansicht sicher neu laden.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-xl bg-white px-4 py-2 text-sm font-black text-black">Erneut versuchen</button>
      </div>
    </main>
  );
}
