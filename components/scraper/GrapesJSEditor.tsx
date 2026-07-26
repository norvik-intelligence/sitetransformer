"use client";

import { useEffect, useRef } from "react";
import grapesjs, { type Editor } from "grapesjs";

function editorDocument(html: string) {
  const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const body = withoutScripts.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || withoutScripts;
  const styles = [...withoutScripts.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  return { body, styles };
}

export function GrapesJSEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const initialHtmlRef = useRef(html);

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
      canvas: { styles: [], scripts: [] },
      selectorManager: { componentFirst: true }
    });
    editorRef.current = editor;
    const emit = () => onChangeRef.current(`<!doctype html><html><head><style>${editor.getCss()}</style></head><body>${editor.getHtml()}</body></html>`);
    editor.on("update", emit);
    return () => {
      editor.off("update", emit);
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full min-h-[600px] bg-white" />;
}
