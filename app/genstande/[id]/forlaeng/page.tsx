import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { ITEM_LIFETIME_MONTHS, newExpiryDate, validExtendToken } from "../../../../lib/item-expiry";
import { extendItem } from "./actions";
import { extendableItem } from "./item";

export const metadata: Metadata = {
  title: "Forlæng opslag · Hittegodscentralen",
  robots: { index: false },
};

const longDate = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

// Opened from the "udløber snart" mail. Asks before extending, since some mail programs open
// links by themselves to scan them.
export default async function ExtendPage({ params, searchParams }: PageProps<"/genstande/[id]/forlaeng">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const token = typeof query.token === "string" ? query.token : "";
  const item = await extendableItem(id);
  const valid = item !== null && validExtendToken(item.id, item.expires_at, token);
  const expired = valid && new Date(item.expires_at) <= new Date();

  return (
    <main className="flex-1 bg-zinc-100 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-4xl font-bold text-brand-brown">Forlæng opslag</h1>
        <div className="mt-8 rounded-2xl border border-zinc-200/70 bg-white p-6 sm:p-8">
          {valid ? (
            <>
              <span className="grid size-12 place-items-center rounded-full bg-brand-gold/20 text-brand-brown">
                <CalendarClock size={22} aria-hidden />
              </span>
              <p className="mt-4 font-medium text-brand-black">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {expired
                  ? `Opslaget udløb den ${longDate.format(new Date(item.expires_at))}.`
                  : `Opslaget udløber den ${longDate.format(new Date(item.expires_at))}.`}{" "}
                Forlænger du det, er det synligt til og med den{" "}
                {longDate.format(new Date(newExpiryDate()))}.
              </p>
              {query.fejl === "1" && (
                <p role="alert" className="mt-4 rounded-xl bg-brand-rust/10 px-4 py-3 text-sm text-brand-rust">
                  Opslaget kunne ikke forlænges. Prøv igen om lidt.
                </p>
              )}
              <form action={extendItem.bind(null, item.id, token)} className="mt-6">
                <button
                  type="submit"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-rust font-medium text-white transition-colors hover:bg-brand-rust/90"
                >
                  Forlæng i {ITEM_LIFETIME_MONTHS} måneder
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="font-medium text-brand-black">Linket virker ikke længere</p>
              <p className="mt-1 text-sm text-zinc-500">
                Opslaget er måske allerede forlænget, markeret som løst eller slettet.
              </p>
              <Link
                href={`/genstande/${id}`}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl border-2 border-brand-brown font-medium text-brand-brown transition-colors hover:bg-brand-brown hover:text-white"
              >
                Gå til opslaget
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
