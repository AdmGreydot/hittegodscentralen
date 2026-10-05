import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Konto slettet · Hittegodscentralen",
  robots: { index: false },
};

// Where deleteAccount sends the user afterwards.
export default function AccountDeletedPage() {
  return (
    <main className="flex-1 bg-zinc-100 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-200/70 bg-white p-8 text-center">
        <CircleCheck size={36} className="mx-auto text-brand-green" aria-hidden />
        <h1 className="mt-4 font-serif text-3xl font-bold text-brand-brown">Din konto er slettet</h1>
        <p className="mt-2 text-zinc-500">
          Dine opslag, billeder og beskeder er slettet sammen med kontoen. Vi har sendt dig en
          bekræftelse på e-mail.
        </p>
        <Link
          href="/"
          className="mt-6 flex h-12 items-center justify-center rounded-xl bg-brand-rust font-medium text-white transition-colors hover:bg-brand-rust/90"
        >
          Til forsiden
        </Link>
      </div>
    </main>
  );
}
