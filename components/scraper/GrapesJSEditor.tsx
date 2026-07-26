"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Layers3,
  Monitor,
  Plus,
  Redo2,
  Smartphone,
  Tablet,
  Trash2,
  Undo2
} from "lucide-react";
import grapesjs, { type Component, type Editor } from "grapesjs";

type Device = "Desktop" | "Tablet" | "Mobile";
type SectionItem = { cid: string; label: string; component: Component };

function editorDocument(html: string) {
  const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const body = withoutScripts.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || withoutScripts;
  const styles = [...withoutScripts.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  const styleUrls = [...withoutScripts.matchAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  return { body, styles, styleUrls };
}

function sectionLabel(component: Component, index: number) {
  const attributes = component.getAttributes();
  const id = attributes.id?.replace(/[-_]+/g, " ").trim();
  const tag = component.get("tagName") || "section";
  const heading = component.find("h1,h2,h3")[0]?.get("content")?.replace(/<[^>]+>/g, "").trim();
  return heading?.slice(0, 34) || id?.slice(0, 34) || `${String(tag).toUpperCase()} ${index + 1}`;
}

export function GrapesJSEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const initialHtmlRef = useRef(html);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedCid, setSelectedCid] = useState("");
  const [device, setDevice] = useState<Device>("Desktop");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const document = editorDocument(initialHtmlRef.current);
    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      blockManager: { blocks: [] },
      components: document.body,
      style: document.styles,
      canvas: { styles: document.styleUrls, scripts: [] },
      selectorManager: { componentFirst: true },
      deviceManager: {
        devices: [
          { id: "Desktop", name: "Desktop", width: "" },
          { id: "Tablet", name: "Tablet", width: "768px", widthMedia: "992px" },
          { id: "Mobile", name: "Mobile", width: "390px", widthMedia: "575px" }
        ]
      },
      panels: { defaults: [] }
    });
    editorRef.current = editor;

    const refreshSections = () => {
      const wrapper = editor.getWrapper();
      if (!wrapper) return;
      const components = wrapper.components().models;
      setSections(components.map((component, index) => ({
        cid: component.cid,
        label: sectionLabel(component, index),
        component
      })));
    };
    const emit = () => {
      const urls = document.styleUrls.map((url) => `<link rel="stylesheet" href="${url}">`).join("");
      onChangeRef.current(`<!doctype html><html><head>${urls}<style>${editor.getCss()}</style></head><body>${editor.getHtml()}</body></html>`);
    };
    const onSelect = (component: Component) => setSelectedCid(component?.cid || "");
    editor.on("load", refreshSections);
    editor.on("component:add component:remove component:update", refreshSections);
    editor.on("component:selected", onSelect);
    editor.on("update", emit);
    refreshSections();

    return () => {
      editor.off("load", refreshSections);
      editor.off("component:add component:remove component:update", refreshSections);
      editor.off("component:selected", onSelect);
      editor.off("update", emit);
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  function selectSection(item: SectionItem) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.select(item.component);
    setSelectedCid(item.cid);
    const element = item.component.getEl();
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function moveSection(item: SectionItem, direction: -1 | 1) {
    const parent = item.component.parent();
    if (!parent) return;
    const index = parent.components().indexOf(item.component);
    const target = Math.max(0, Math.min(parent.components().length - 1, index + direction));
    item.component.move(parent, { at: target });
  }

  function duplicateSelected() {
    const editor = editorRef.current;
    const selected = editor?.getSelected();
    const parent = selected?.parent();
    if (!selected || !parent) return;
    const index = parent.components().indexOf(selected);
    parent.append(selected.clone(), { at: index + 1 });
  }

  function removeSelected() {
    const editor = editorRef.current;
    const selected = editor?.getSelected();
    if (!selected || selected.get("type") === "wrapper") return;
    selected.remove();
    setSelectedCid("");
  }

  function addSection() {
    const editor = editorRef.current;
    if (!editor) return;
    const added = editor.addComponents(`
      <section style="padding:80px 24px;background:#fff;color:#111">
        <div style="max-width:1120px;margin:0 auto">
          <p style="margin:0 0 12px;opacity:.55">Neue Sektion</p>
          <h2 style="font-size:48px;line-height:1;margin:0 0 18px">Hier klicken und Text bearbeiten</h2>
          <p style="max-width:620px;font-size:18px;line-height:1.6">Wähle jedes Element direkt in der Seite aus und passe Inhalt sowie Design an.</p>
        </div>
      </section>
    `);
    if (added[0]) editor.select(added[0]);
  }

  function setEditorDevice(next: Device) {
    editorRef.current?.setDevice(next);
    setDevice(next);
  }

  return (
    <div className="grid h-full min-h-[620px] grid-rows-[48px_1fr] bg-[#111]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#0d0d0d] px-2 sm:px-3">
        <div className="flex items-center gap-1">
          <EditorAction label="Rückgängig" onClick={() => editorRef.current?.UndoManager.undo()}><Undo2 className="h-4 w-4" /></EditorAction>
          <EditorAction label="Wiederholen" onClick={() => editorRef.current?.UndoManager.redo()}><Redo2 className="h-4 w-4" /></EditorAction>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <EditorAction label="Duplizieren" onClick={duplicateSelected}><Copy className="h-4 w-4" /></EditorAction>
          <EditorAction label="Löschen" onClick={removeSelected}><Trash2 className="h-4 w-4" /></EditorAction>
        </div>
        <div className="flex rounded-[9px] border border-white/10 bg-black/30 p-1">
          <DeviceButton active={device === "Desktop"} label="Desktop" onClick={() => setEditorDevice("Desktop")}><Monitor className="h-3.5 w-3.5" /></DeviceButton>
          <DeviceButton active={device === "Tablet"} label="Tablet" onClick={() => setEditorDevice("Tablet")}><Tablet className="h-3.5 w-3.5" /></DeviceButton>
          <DeviceButton active={device === "Mobile"} label="Mobil" onClick={() => setEditorDevice("Mobile")}><Smartphone className="h-3.5 w-3.5" /></DeviceButton>
        </div>
      </div>

      <div className="grid min-h-0 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 overflow-auto border-r border-white/10 bg-[#0d0d0d] p-3 md:block">
          <div className="flex items-center justify-between px-1">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-white/35"><Layers3 className="h-3.5 w-3.5" />Sektionen</p>
            <span className="font-mono text-[10px] text-white/25">{sections.length}</span>
          </div>
          <div className="mt-3 space-y-1">
            {sections.map((item, index) => (
              <div key={item.cid} className={`group flex items-center rounded-[9px] border ${selectedCid === item.cid ? "border-[#7c8cff]/45 bg-[#7c8cff]/15" : "border-transparent hover:bg-white/[0.05]"}`}>
                <button type="button" onClick={() => selectSection(item)} className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-xs text-white/65">
                  <span className="mr-2 font-mono text-[9px] text-white/25">{String(index + 1).padStart(2, "0")}</span>{item.label}
                </button>
                <div className="hidden pr-1 group-hover:flex">
                  <button type="button" disabled={index === 0} aria-label="Sektion nach oben" onClick={() => moveSection(item, -1)} className="rounded p-1 text-white/35 hover:text-white disabled:opacity-20"><ChevronUp className="h-3 w-3" /></button>
                  <button type="button" disabled={index === sections.length - 1} aria-label="Sektion nach unten" onClick={() => moveSection(item, 1)} className="rounded p-1 text-white/35 hover:text-white disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSection} className="mt-3 flex h-9 w-full items-center justify-center rounded-[9px] border border-dashed border-white/15 text-xs text-white/45 transition hover:border-[#7c8cff]/55 hover:text-white">
            <Plus className="mr-2 h-3.5 w-3.5" />Sektion hinzufügen
          </button>
          <p className="mt-4 px-1 text-[10px] leading-4 text-white/25">Element anklicken, Text doppelklicken und direkt bearbeiten.</p>
        </aside>
        <div className="relative min-h-0 overflow-hidden bg-[#1a1a1a] p-2 sm:p-3">
          <div ref={containerRef} className="h-full min-h-[560px] overflow-hidden rounded-[10px] bg-white shadow-2xl" />
        </div>
      </div>
    </div>
  );
}

function EditorAction({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white/45 transition hover:bg-white/10 hover:text-white">{children}</button>;
}

function DeviceButton({ active, children, label, onClick }: { active: boolean; children: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`flex h-7 w-8 items-center justify-center rounded-[6px] transition ${active ? "bg-white text-black" : "text-white/35 hover:text-white"}`}>{children}</button>;
}
