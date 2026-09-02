"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const [mediaOptions, setMediaOptions] = useState(availableMedia);
  const [, start] = useTransition();
  const router = useRouter();
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
      const created = await addItemToPlaylist(playlistId, mediaId);
      if (!created) {
        toast.error("Erro ao adicionar conteúdo.");
        return;
      }

      setItems((prev) => [...prev, { id: created.id, media: created.media }]);
      setMediaOptions((prev) => prev.filter((media) => media.id !== mediaId));
      toast.success("Conteúdo adicionado.");
      router.refresh();
    });
  }

  async function handleRemove(itemId: string) {
    const removed = items.find((item) => item.id === itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    if (removed) {
      setMediaOptions((prev) =>
        [...prev, { id: removed.media.id, name: removed.media.name, type: removed.media.type }].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR"),
        ),
      );
    }
    start(async () => {
      await removeItemFromPlaylist(itemId, playlistId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <select
        defaultValue=""
        onChange={(e) => {
          handleAdd(e.target.value);
          e.target.value = "";
        }}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100"
      >
        <option value="">+ Adicionar conteúdo...</option>
        {mediaOptions.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.type === "image" ? "imagem" : "vídeo"})
          </option>
        ))}
      </select>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
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
      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-zinc-500">
        <GripVertical size={16} />
      </button>
      <span className="w-5 text-sm text-zinc-500">{index + 1}.</span>
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">{item.media.name}</span>
      <span className="hidden text-xs text-zinc-500 sm:inline-block">
        {item.media.type === "image" ? `${item.media.duration}s` : "vídeo"}
      </span>
      <button onClick={onRemove} className="text-zinc-500 transition-colors hover:text-red-400" aria-label="Remover item da playlist">
        <X size={16} />
      </button>
    </div>
  );
}
