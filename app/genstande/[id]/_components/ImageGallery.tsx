"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { ItemType } from "../../../../lib/item-card";

const BADGE = {
  lost: { label: "Tabt", className: "bg-brand-rust" },
  found: { label: "Fundet", className: "bg-brand-green" },
};

export default function ImageGallery({
  images,
  title,
  type,
}: {
  images: { url: string; name: string | null }[];
  title: string;
  type: ItemType;
}) {
  const [active, setActive] = useState(0);
  const badge = BADGE[type];
  const current = images[active];

  return (
    <div>
      {/* The whole photo is shown (no cropping); the rest of the frame is white. */}
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${
          current ? "border border-zinc-200/70 bg-white" : "bg-zinc-200"
        }`}
      >
        {current ? (
          <Image
            src={current.url}
            alt={title}
            fill
            preload
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-contain"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 text-zinc-400">
            <ImageIcon size={48} strokeWidth={1.25} aria-hidden />
            <span className="text-sm">Intet billede tilgængeligt</span>
          </div>
        )}
        <span
          className={`absolute top-4 left-4 rounded-full px-3.5 py-1 text-sm font-semibold uppercase tracking-wide text-white ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {images.length > 1 && (
        <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <li key={image.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Vis billede ${i + 1}`}
                aria-current={i === active}
                className={`relative block size-20 overflow-hidden rounded-lg border-2 transition-colors ${
                  i === active ? "border-brand-brown" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
