import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  Hotel,
  Mail,
  School,
  Store,
  TrainFront,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Business · Hittegodscentralen",
  description:
    "Hittegodscentralen for virksomheder og organisationer. Kommer snart.",
};

const CONTACT_EMAIL = "info@hittegodscentralen.dk";

const ORGANISATIONS: { icon: LucideIcon; label: string }[] = [
  { icon: School, label: "Skoler" },
  { icon: Store, label: "Butikker" },
  { icon: Hotel, label: "Hoteller" },
  { icon: TrainFront, label: "Transport" },
];

// Placeholder until the business product is ready.
export default function BusinessPage() {
  return (
    <main className="grid flex-1 place-items-center bg-zinc-100 px-4 py-20 sm:px-6 sm:py-28">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200/70 bg-white px-6 py-12 text-center sm:px-12 sm:py-16">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-gold/25 text-brand-brown">
          <Building2 size={30} aria-hidden />
        </span>
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-brand-rust">
          Business
        </p>
        <h1 className="mt-2 font-serif text-4xl font-extrabold text-brand-brown sm:text-5xl">
          Kommer snart
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed font-light text-zinc-600">
          Vi bygger en løsning til virksomheder og organisationer, der håndterer
          mange glemte ting, så de nemt kan registrere hittegods og få det sendt
          hjem til ejeren.
        </p>

        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {ORGANISATIONS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-brand-brown"
            >
              <Icon size={16} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
