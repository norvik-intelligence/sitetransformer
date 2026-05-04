"use client";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEditorStore } from "@/lib/store";
import { EditableBlock } from "./EditableBlock";

export function EditorCanvas() {
  const project = useEditorStore((s) => s.project);
  const device = useEditorStore((s) => s.device);
  const reorder = useEditorStore((s) => s.reorderBlocks);
  const page = project?.pages.find((p) => p.id === project.activePageId);
  if (!page) return <main className="flex-1 p-8">Loading editor...</main>;
  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id || !page) return;
    const oldIndex = page.blocks.findIndex((b) => b.id === event.active.id);
    const newIndex = page.blocks.findIndex((b) => b.id === event.over!.id);
    reorder(arrayMove(page.blocks, oldIndex, newIndex).map((b) => b.id));
  }
  return <main className="editor-grid flex-1 overflow-auto bg-slate-100 p-6"><div className={`mx-auto min-h-[82vh] rounded-3xl bg-white p-4 shadow-xl transition-all ${device === "mobile" ? "max-w-[420px]" : "max-w-6xl"}`}><DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>{page.blocks.map((block) => <EditableBlock key={block.id} block={block} />)}</SortableContext></DndContext></div></main>;
}
