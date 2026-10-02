import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Info,
  Mailbox,
  MapPin,
  Navigation,
  Tag,
} from "lucide-react";
import { getCurrentUserId } from "../../../lib/auth";
import { getItem, getSimilarItems, type ItemDetail } from "../../../lib/items";
import { formatDate, PLACEHOLDER_IMAGE, type ItemCard } from "../../../lib/item-card";
import { getConversations } from "../../../lib/messages";
import ItemStatusControl from "../../components/item-status/ItemStatusControl";
import ContactCard, { type ContactMode } from "./_components/ContactCard";
import CreatedPopup from "./_components/CreatedPopup";
import ImageGallery from "./_components/ImageGallery";

export async function generateMetadata({ params }: PageProps<"/genstande/[id]">): Promise<Metadata> {
  const item = await getItem((await params).id);
  if (!item) return { title: "Genstand ikke fundet · Hittegodscentralen" };
  return {
    title: `${item.title} · Hittegodscentralen`,
    description: item.description ?? undefined,
  };
}

const STATUS_NOTE = {
  resolved: "Denne genstand er markeret som løst og vises ikke længere for andre.",
  archived: "Denne annonce er arkiveret og vises ikke længere for andre.",
};

const PREVIEW_MODES: ContactMode[] = ["chat", "login", "mail", "own"];

function contactMode(item: ItemDetail, viewerId: string | null): ContactMode {
  if (!item.ownerId) return "mail";
  if (!viewerId) return "login";
  return viewerId === item.ownerId ? "own" : "chat";
}

export default async function ItemPage({
  params,
  searchParams,
}: PageProps<"/genstande/[id]">) {
  const [item, viewerId] = await Promise.all([getItem((await params).id), getCurrentUserId()]);
  if (!item) notFound();

  // Development only: ?preview=mail|login|chat|own shows that version of the contact card.
  const query = await searchParams;
  const preview = query.preview;
  const justCreated = query.oprettet === "1";
  const mode =
    process.env.NODE_ENV === "development" &&
    PREVIEW_MODES.includes(preview as ContactMode)
      ? (preview as ContactMode)
      : contactMode(item, viewerId);

  // The poster can mark the item as handed over, picking which conversation it went through.
  const isOwner = viewerId !== null && viewerId === item.ownerId;
  const itemConversations = isOwner
    ? (await getConversations(viewerId))
        .filter((c) => c.itemId === item.id)
        .map((c) => ({ id: c.id, otherName: c.otherName }))
    : [];

  const similar = item.category ? await getSimilarItems(item.category.id, item.id) : [];
  const place = [item.address, item.city].filter(Boolean).join(", ");
  const mapQuery =
    item.latitude != null && item.longitude != null
      ? `${item.latitude},${item.longitude}`
      : place || [item.postalCode, item.city].filter(Boolean).join(" ");

  const details: { icon: LucideIcon; label: string; value: string | null }[] = [
    { icon: Tag, label: "Kategori", value: item.category?.name ?? null },
    { icon: MapPin, label: "Region", value: item.region?.replace(/^Region /, "") ?? null },
    { icon: Building2, label: "By", value: item.city },
    { icon: Mailbox, label: "Postnummer", value: item.postalCode },
    { icon: CalendarDays, label: item.type === "lost" ? "Tabt" : "Fundet", value: formatDate(item.occurredAt) },
    { icon: Navigation, label: "Sted", value: item.address },
  ];

  return (
    <main className="flex-1 bg-zinc-100">
      <nav aria-label="Brødkrummer" className="border-b border-zinc-200 bg-white">
        <ol className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-4 text-sm text-zinc-400 sm:px-6">
          <li>
            <Link href="/" className="hover:text-brand-black">
              Hjem
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/genstande" className="hover:text-brand-black">
              Genstande
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="truncate font-medium text-brand-black">
            {item.title}
          </li>
        </ol>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {justCreated && <CreatedPopup />}

        {item.status !== "active" && (
          <p className="mb-6 flex items-center gap-2 rounded-xl bg-brand-gold/20 px-4 py-3 text-sm text-brand-brown">
            <Info size={16} aria-hidden />
            {STATUS_NOTE[item.status]}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-6">
            <ImageGallery images={item.images} title={item.title} type={item.type} />
            {/* On small screens the description comes right after the image. */}
            <Description item={item} className="lg:hidden" />
            <ContactCard mode={mode} type={item.type} owner={item.owner} itemId={item.id}>
              {isOwner && (
                <ItemStatusControl
                  item={{ id: item.id, title: item.title, type: item.type, status: item.status }}
                  conversations={itemConversations}
                  variant="button"
                />
              )}
            </ContactCard>
          </div>

          <aside className="space-y-6">
            <Description item={item} className="hidden lg:block" />

            <section className="rounded-2xl border border-zinc-200/70 bg-white p-6">
              <h2 className="font-serif text-sm font-bold uppercase tracking-[0.15em] text-zinc-500">
                Detaljer
              </h2>
              <dl className="mt-5 space-y-5">
                {details
                  .filter((d) => d.value)
                  .map(({ icon: Icon, label, value }) => (
                    <div key={label}>
                      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                        <Icon size={14} strokeWidth={1.75} aria-hidden />
                        {label}
                      </dt>
                      <dd className="mt-1 font-medium text-brand-black">{value}</dd>
                    </div>
                  ))}
              </dl>
            </section>

            {/* Map placeholder — the real map comes later. */}
            <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white">
              <h2 className="flex items-center gap-2 px-6 py-4 font-medium text-brand-black">
                <MapPin size={18} aria-hidden />
                Lokation
                {item.city && <span className="text-sm font-light text-zinc-400">— {item.city}</span>}
              </h2>
              <div className="relative h-64 bg-zinc-200/60">
                {mapQuery && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-brand-black shadow-sm transition-colors hover:border-brand-brown/40"
                  >
                    Åbn i kort
                    <ExternalLink size={14} aria-hidden />
                  </a>
                )}
              </div>
            </section>
          </aside>
        </div>

        {similar.length > 0 && item.category && (
          <section className="mt-16">
            <h2 className="font-serif text-2xl font-bold text-brand-black">
              Lignende genstande i {item.category.name}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <SimilarItemCard key={s.id} item={s} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Description({
  item,
  className,
}: {
  item: { title: string; brand: string | null; description: string | null };
  className: string;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-200/70 bg-white p-6 ${className}`}>
      <h1 className="font-serif text-2xl font-bold text-brand-black sm:text-3xl">{item.title}</h1>
      {item.brand && <p className="mt-1 text-sm text-zinc-500">Mærke: {item.brand}</p>}
      {item.description && (
        <p className="mt-3 leading-relaxed font-light whitespace-pre-line text-zinc-600">
          {item.description}
        </p>
      )}
    </section>
  );
}

const BADGE = {
  lost: { label: "Tabt", className: "bg-brand-rust" },
  found: { label: "Fundet", className: "bg-brand-green" },
};

function SimilarItemCard({ item }: { item: ItemCard }) {
  const badge = BADGE[item.type];
  return (
    <Link
      href={`/genstande/${item.id}`}
      className="group overflow-hidden rounded-2xl border border-zinc-200/70 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-zinc-200">
        <Image
          src={item.imageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          unoptimized={item.imageUrl === PLACEHOLDER_IMAGE}
          className="object-cover"
        />
        <span
          className={`absolute top-3 left-3 rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-serif text-lg font-bold text-brand-black group-hover:underline">
          {item.title}
        </h3>
        <p className="mt-1 truncate text-sm font-light text-zinc-500">
          {[item.location, formatDate(item.occurredAt)].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
