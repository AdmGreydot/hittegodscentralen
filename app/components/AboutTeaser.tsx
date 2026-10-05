import Link from "next/link";
import { ArrowRight } from "lucide-react";
import HowItWorks from "./HowItWorks";

// "Hvem er vi?" on the frontpage. Short version of /om-os.
export default function AboutTeaser() {
  return (
    <section className="bg-white px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-rust">
            Hvem er vi?
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-[1.05] font-extrabold text-brand-brown sm:text-6xl">
            Vi hjælper ting med at finde hjem.
          </h2>
          <p className="mt-6 text-lg leading-relaxed font-light text-zinc-600">
            Hvert år bliver tusindvis af genstande glemt, tabt eller efterladt.
            En telefon på en café, en jakke i skolen eller en taske i toget.
            Ofte har nogen fundet dem, men det kan være svært at finde frem til
            den rette ejer.
          </p>
          <p className="mt-4 text-lg leading-relaxed font-light text-zinc-600">
            Hittegodscentralen samler tabte og fundne genstande ét sted, så det
            bliver lettere at søge, registrere og skabe kontakt mellem finder og
            ejer.
          </p>

          <Link
            href="/om-os"
            className="mt-10 inline-flex items-center gap-3 rounded-xl bg-brand-brown px-7 py-3.5 text-lg font-medium text-white transition-colors hover:bg-brand-brown/90"
          >
            Læs mere om os
            <ArrowRight size={20} aria-hidden />
          </Link>
        </div>

        <HowItWorks />
      </div>
    </section>
  );
}
