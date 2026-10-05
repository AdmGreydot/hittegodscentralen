import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { newExpiryDate } from "../../../../lib/item-expiry";
import { guestItem } from "./guest-item";
import ManageItem from "./ManageItem";

export const metadata: Metadata = {
  title: "Administrer opslag · Hittegodscentralen",
  robots: { index: false },
};

const longDate = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

// For items posted without an account: opened from the link in the poster's mails.
export default async function ManagePage({ params, searchParams }: PageProps<"/genstande/[id]/administrer">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const token = typeof query.token === "string" ? query.token : "";
  const item = query.slettet === "1" ? null : await guestItem(id, token);

  return (
    <main className="flex-1 bg-zinc-100 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-4xl font-bold text-brand-brown">Administrer opslag</h1>
        <div className="mt-8 rounded-2xl border border-zinc-200/70 bg-white p-6 sm:p-8">
          {query.slettet === "1" ? (
            <div className="text-center">
              <CircleCheck size={32} className="mx-auto text-brand-green" aria-hidden />
              <p className="mt-3 font-medium text-brand-black">Opslaget er slettet</p>
              <p className="mt-1 text-sm text-zinc-500">Vi har sendt dig en bekræftelse på e-mail.</p>
              <Link href="/" className="mt-6 inline-block font-medium text-brand-rust underline underline-offset-4">
                Til forsiden
              </Link>
            </div>
          ) : item ? (
            <ManageItem
              itemId={item.id}
              token={token}
              title={item.title}
              type={item.type}
              status={item.status}
              expiresOn={longDate.format(new Date(item.expires_at))}
              expired={new Date(item.expires_at) <= new Date()}
              extendedOn={longDate.format(new Date(newExpiryDate()))}
            />
          ) : (
            <>
              <p className="font-medium text-brand-black">Linket virker ikke</p>
              <p className="mt-1 text-sm text-zinc-500">
                Opslaget er måske slettet, eller linket er ikke kopieret helt. Brug linket i den
                seneste e-mail fra os, eller skriv til os, hvis du har brug for hjælp.
              </p>
              <Link href="/kontakt" className="mt-6 inline-block font-medium text-brand-rust underline underline-offset-4">
                Kontakt os
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
