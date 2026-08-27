"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { addItemToPlaylist, removeItemFromPlaylist, reorderPlaylistItems } from "@/actions/playlist";
import { toast } from "sonner";

type Item = {
  id: string;
  media: { id: string; name: string; type: "image" | "video"; duration: number | null };
};

export function PlaylistEditor({
  playlistId,
  initialItems,
  availableMedia,
}: {
  playlistId: string;
  initialItems: Item[];
  availableMedia: { id: string; name: string; type: "image" | "video" }[];
}) {
  const [items, setItems] = useState(initialItems);
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    start(() => reorderPlaylistItems(playlistId, reordered.map((i) => i.id)));
  }

  async function handleAdd(mediaId: string) {
    if (!mediaId) return;
    start(async () => {
      await addItemToPlaylist(playlistId, mediaId);
      toast.success("Conteúdo adicionado.");
    });
  }

  async function handleRemove(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    start(() => removeItemFromPlaylist(itemId, playlistId));
  }

  return (
    <div className="space-y-4">
      <select
        defaultValue=""
        onChange={(e) => {
          handleAdd(e.target.value);
          e.target.value = "";
        }}
        className="bg-zinc-950 border border-zinc-700 rounded-md text-sm px-3 py-2"
      >
        <option value="">+ Adicionar conteúdo...</option>
        {availableMedia.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.type === "image" ? "imagem" : "vídeo"})
          </option>
        ))}
      </select>

      {items.length === 0 ? (
        <div className="text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg p-8 text-center">
          Nenhum conteúdo nesta playlist.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, i) => (
                <SortableRow key={item.id} item={item} index={i} onRemove={() => handleRemove(item.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableRow({ item, index, onRemove }: { item: Item; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-md p-3"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-zinc-500">
        <GripVertical size={16} />
      </button>
      <span className="text-zinc-500 text-sm w-5">{index + 1}.</span>
      <span className="flex-1 text-sm">{item.media.name}</span>
      <span className="text-xs text-zinc-500">{item.media.type === "image" ? `${item.media.duration}s` : "vídeo"}</span>
      <button onClick={onRemove} className="text-zinc-500 hover:text-red-400">
        <X size={16} />
      </button>
    </div>
  );
}
