"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SiteBlock } from "@/lib/types";
import { useEditorStore } from "@/lib/store";

export function EditableBlock({ block }: { block: SiteBlock }) {
  const sortable = useSortable({ id: block.id });
  const selected = useEditorStore((s) => s.selectedBlockId === block.id);
  const select = useEditorStore((s) => s.select);
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  return (
    <section ref={sortable.setNodeRef} style={{ ...style, background: block.style.background || "transparent", color: block.style.foreground || "inherit", paddingTop: block.style.paddingY || 64, paddingBottom: block.style.paddingY || 64 }} className={`relative rounded-3xl border ${selected ? "border-indigo-500 ring-4 ring-indigo-100" : "border-transparent"}`} onClick={() => select(block.id)}>
      <button {...sortable.attributes} {...sortable.listeners} className="absolute left-3 top-3 rounded-lg bg-slate-900 px-2 py-1 text-xs text-white">drag</button>
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">{block.content.eyebrow}</p>
        <h2 className="text-4xl font-black tracking-tight md:text-6xl">{block.content.headline || block.name}</h2>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">{block.content.body}</p>
        {block.content.imageUrl ? <img src={block.content.imageUrl} alt="" className="mx-auto mt-8 max-h-[420px] rounded-3xl object-cover shadow-xl" /> : null}
        {block.content.items ? <div className="mt-8 grid gap-4 md:grid-cols-3">{block.content.items.map((item, i) => <article key={i} className="rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200"><h3 className="font-bold">{item.title}</h3><p className="mt-2 text-sm text-slate-600">{item.body}</p></article>)}</div> : null}
        {block.content.ctaLabel ? <a href={block.content.ctaHref || "#"} className="mt-8 inline-flex rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg">{block.content.ctaLabel}</a> : null}
      </div>
    </section>
  );
}
