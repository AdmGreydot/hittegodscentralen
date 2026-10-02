"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageIcon, Loader2, MapPin, PackageOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDate, PLACEHOLDER_IMAGE, type ItemType } from "../../../lib/item-card";
import type { MyItem } from "../../../lib/items";
import ItemStatusControl, {
  type StatusConversation,
} from "../../components/item-status/ItemStatusControl";
import { deleteItem } from "../../opret/actions";
import Tooltip from "../../components/Tooltip";

const BADGE = {
  lost: { label: "Tabt", className: "bg-brand-rust" },
  found: { label: "Fundet", className: "bg-brand-green" },
};

const STATUS_NOTE = { resolved: "Løst", archived: "Arkiveret" };

const FILTERS: { value: ItemType | null; label: string }[] = [
  { value: null, label: "Alle" },
  { value: "lost", label: "Tabt" },
  { value: "found", label: "Fundet" },
];

export default function MyItems({
  items,
  conversationsByItem,
}: {
  items: MyItem[];
  conversationsByItem: Record<string, StatusConversation[]>; // to pick who an item went to
}) {
  const [filter, setFilter] = useState<ItemType | null>(null);
  const [deleting, setDeleting] = useState<MyItem | null>(null);
  const visible = filter ? items.filter((item) => item.type === filter) : items;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-gold/25 text-brand-brown">
          <PackageOpen size={26} aria-hidden />
        </span>
        <h2 className="mt-5 font-serif text-2xl font-bold text-brand-brown">
          Du har ingen opslag endnu
        </h2>
        <p className="mt-2 max-w-sm font-light text-zinc-500">
          Har du mistet eller fundet noget? Opret et opslag, så andre kan hjælpe.
        </p>
        <Link
          href="/opret"
          className="mt-6 flex items-center gap-2 rounded-xl bg-brand-rust px-6 py-3 font-medium text-white transition-colors hover:bg-brand-rust/90"
        >
          <Plus size={18} aria-hidden />
          Opret opslag
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div role="group" aria-label="Vis" className="flex gap-1 rounded-xl border border-zinc-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-brand-brown text-white"
                  : "text-zinc-500 hover:text-brand-brown"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-400" aria-live="polite">
          {visible.length} opslag
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center font-light text-zinc-500">
          Du har ingen {filter === "lost" ? "tabte" : "fundne"} genstande.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id}>
              <MyItemCard
                item={item}
                conversations={conversationsByItem[item.id] ?? []}
                onDelete={() => setDeleting(item)}
              />
            </li>
          ))}
        </ul>
      )}

      <DeleteDialog item={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function MyItemCard({
  item,
  conversations,
  onDelete,
}: {
  item: MyItem;
  conversations: StatusConversation[];
  onDelete: () => void;
}) {
  const badge = BADGE[item.type];
  const hasImage = item.imageUrl !== PLACEHOLDER_IMAGE;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] bg-zinc-200">
        {hasImage ? (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className={`object-cover ${item.status === "active" ? "" : "grayscale"}`}
          />
        ) : (
          <ImageIcon
            size={40}
            strokeWidth={1.25}
            className="absolute top-1/2 left-1/2 -translate-1/2 text-zinc-400"
            aria-hidden
          />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white ${badge.className}`}
          >
            {badge.label}
          </span>
          {item.status !== "active" && (
            <span className="rounded-full bg-zinc-700 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              {STATUS_NOTE[item.status]}
            </span>
          )}
        </div>
      </div>

      {/* The buttons sit above the card-wide link, so they get their own clicks. */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <Tooltip label="Slet opslag">
          <button
            type="button"
            onClick={onDelete}
            className="grid size-8 place-items-center rounded-lg bg-red-600/90 text-white shadow-sm transition-colors hover:bg-red-600"
            aria-label={`Slet ${item.title}`}
          >
            <Trash2 size={15} aria-hidden />
          </button>
        </Tooltip>
        <Tooltip label="Rediger opslag">
          <Link
            href={`/genstande/${item.id}/rediger`}
            className="grid size-8 place-items-center rounded-lg bg-brand-green text-white shadow-sm transition-colors hover:bg-brand-green/90"
            aria-label={`Rediger ${item.title}`}
          >
            <Pencil size={15} aria-hidden />
          </Link>
        </Tooltip>
        <ItemStatusControl item={item} conversations={conversations} variant="icon" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-serif text-lg font-bold text-brand-black">
          <Link href={`/genstande/${item.id}`} className="after:absolute after:inset-0">
            {item.title}
          </Link>
        </h2>
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-sm font-light leading-relaxed text-zinc-500">
            {item.description}
          </p>
        )}
        <div className="mt-auto border-t border-zinc-200 pt-4 text-sm font-light text-zinc-500">
          {item.location && (
            <p className="flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" aria-hidden />
              <span className="truncate">{item.location}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-zinc-400">
            <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
          </p>
        </div>
      </div>
    </article>
  );
}

function DeleteDialog({ item, onClose }: { item: MyItem | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (item) dialogRef.current?.showModal();
  }, [item]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-title"
      onClose={() => {
        setError(null);
        onClose();
      }}
      // A click on the dialog element itself is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && !pending && close()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/55"
    >
      <div className="p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-full bg-red-100 text-red-600">
          <Trash2 size={22} aria-hidden />
        </span>
        <h2 id="delete-title" className="mt-4 font-serif text-2xl font-bold text-brand-black">
          Slet opslaget?
        </h2>
        <p className="mt-2 font-light text-zinc-500">
          <span className="font-medium text-brand-black">{item?.title}</span> bliver slettet
          sammen med billeder og beskeder. Det kan ikke fortrydes.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-brand-rust">
            {error}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={close}
            className="h-11 rounded-xl border border-zinc-200 font-medium text-brand-black transition-colors hover:border-brand-brown/40"
          >
            Annuller
          </button>
          <button
            type="button"
            disabled={pending || !item}
            onClick={() =>
              item &&
              startTransition(async () => {
                const result = await deleteItem(item.id);
                if (result.error) setError(result.error);
                else close();
              })
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-70"
          >
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
            Slet
          </button>
        </div>
      </div>
    </dialog>
  );
}
