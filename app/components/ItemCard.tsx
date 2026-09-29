import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  PLACEHOLDER_IMAGE,
  formatDate,
  type ItemCard as ItemCardData,
} from "../../lib/item-card";

const BADGE = {
  lost: { label: "Tabt", className: "bg-brand-rust" },
  found: { label: "Fundet", className: "bg-brand-green" },
};

export default function ItemCard({
  item,
  showDate = false,
}: {
  item: ItemCardData;
  showDate?: boolean;
}) {
  const badge = BADGE[item.type];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm">
      <div className="relative aspect-[16/9] bg-zinc-200">
        <Image
          src={item.imageUrl}
          alt={item.imageUrl === PLACEHOLDER_IMAGE ? "" : item.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          unoptimized={item.imageUrl === PLACEHOLDER_IMAGE}
          className="object-cover"
        />
        <span
          className={`absolute top-4 left-4 rounded-full px-3.5 py-1 text-sm font-semibold uppercase tracking-wide text-white ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex-1 pb-8">
          <h3 className="font-serif text-xl font-bold text-brand-black">{item.title}</h3>
          {item.description && (
            <p className="mt-2 line-clamp-2 font-light leading-relaxed text-zinc-500">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-5">
          <div className="min-w-0 text-sm font-light text-zinc-500">
            {item.location && (
              <p className="flex items-center gap-1.5">
                <MapPin size={16} strokeWidth={1.5} className="shrink-0" aria-hidden />
                <span className="truncate">{item.location}</span>
              </p>
            )}
            {showDate && (
              <p className="mt-1 text-zinc-400">
                <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
              </p>
            )}
          </div>
          <Link
            href={`/genstande/${item.id}`}
            className="shrink-0 rounded-lg bg-brand-brown px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-brown/90"
          >
            Vis genstand
          </Link>
        </div>
      </div>
    </article>
  );
}
