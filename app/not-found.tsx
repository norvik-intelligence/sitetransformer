import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] p-6 text-center text-white">
      <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8">
        <p className="font-mono text-sm text-white/35">404</p>
        <h1 className="mt-3 text-2xl font-black">Seite nicht gefunden</h1>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-black">Zum Crawler</Link>
      </div>
    </main>
  );
}
