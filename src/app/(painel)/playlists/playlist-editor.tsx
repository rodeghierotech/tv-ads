"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
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
  const mediaOptions = availableMedia;
  const [pending, start] = useTransition();
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (pending || !over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    start(async () => {
      try { await reorderPlaylistItems(playlistId, reordered.map((i) => i.id)); router.refresh(); }
      catch { setItems(items); toast.error("Não foi possível reordenar. Atualize a playlist e tente novamente."); }
    });
  }

  function handleAdd(mediaId: string) {
    if (!mediaId || pending) return;
    start(async () => {
      try { await addItemToPlaylist(playlistId, mediaId); toast.success("Conteúdo adicionado."); router.refresh(); }
      catch { toast.error("Não foi possível adicionar o conteúdo. Tente novamente."); }
    });
  }

  function handleRemove(itemId: string) {
    if (pending) return;
    start(async () => {
      try { await removeItemFromPlaylist(itemId, playlistId); router.refresh(); }
      catch { toast.error("Não foi possível remover o conteúdo. Tente novamente."); }
    });
  }

  return (
    <div className="space-y-4">
      <select
        aria-label="Adicionar conteúdo à playlist"
        disabled={pending}
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
                <SortableRow disabled={pending} key={item.id} item={item} index={i} onRemove={() => handleRemove(item.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableRow({ item, index, onRemove, disabled }: { item: Item; index: number; onRemove: () => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
    >
      <button disabled={disabled} aria-label={`Mover ${item.media.name}`} {...attributes} {...listeners} className="touch-none cursor-grab p-2 text-zinc-400">
        <GripVertical size={16} />
      </button>
      <span className="w-5 text-sm text-zinc-500">{index + 1}.</span>
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">{item.media.name}</span>
      <span className="hidden text-xs text-zinc-500 sm:inline-block">
        {item.media.type === "image" ? `${item.media.duration}s` : "vídeo"}
      </span>
      <button disabled={disabled} onClick={onRemove} className="text-zinc-500 transition-colors hover:text-red-400" aria-label="Remover item da playlist">
        <X size={16} />
      </button>
    </div>
  );
}
