import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Hotel,
  Info,
  School,
  Store,
  Ticket,
  TrainFront,
} from "lucide-react";
import heroImage from "../../public/hero-image.png";
import HowItWorks from "../components/HowItWorks";

export const metadata: Metadata = {
  title: "Hvem er vi? · Hittegodscentralen",
  description:
    "Hittegodscentralen forbinder mennesker, der har mistet noget, med dem, der har fundet det.",
};

const ORGANISATIONS: { icon: LucideIcon; label: string }[] = [
  { icon: School, label: "Skoler" },
  { icon: Store, label: "Butikker" },
  { icon: Hotel, label: "Hoteller" },
  { icon: TrainFront, label: "Transport" },
];

export default function AboutPage() {
  return (
    <main className="flex-1 bg-white">
      {/* Header */}
      <section className="relative isolate flex min-h-[70svh] items-end overflow-hidden px-4 pt-40 pb-20 text-white sm:px-6">
        <Image
          src={heroImage}
          alt=""
          fill
          preload
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-brand-hero-overlay opacity-40"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-brand-brown via-brand-brown/40 to-transparent"
        />
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-gold">
            Hvem er vi?
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] font-extrabold sm:text-7xl">
            Vi hjælper ting med at finde hjem.
          </h1>
        </div>
      </section>

      {/* Intro */}
      <section className="px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <p className="font-serif text-3xl leading-snug font-bold text-brand-brown sm:text-4xl">
            Hvert år bliver tusindvis af genstande glemt, tabt eller efterladt.
          </p>
          <div className="space-y-5 text-lg leading-relaxed font-light text-zinc-600">
            <p>
              En telefon på en café, en jakke i skolen eller en taske i toget.
              Ofte er der nogen, der har fundet tingene, men det kan være svært
              at finde frem til den rette ejer.
            </p>
            <p className="font-medium text-brand-black">
              Det vil vi gerne gøre noget ved.
            </p>
            <p>
              Hittegodscentralen er en digital platform, der gør det nemmere at
              forbinde mennesker, som har mistet noget, med dem, der har fundet
              det. Vi samler tabte og fundne genstande ét sted, så det bliver
              lettere at søge, registrere og skabe kontakt mellem finder og
              ejer.
            </p>
          </div>
        </div>

        <blockquote className="mx-auto mt-16 max-w-5xl rounded-3xl bg-brand-gold/15 px-8 py-10 sm:px-12">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-rust">
            Vores mål er enkelt
          </p>
          <p className="mt-3 font-serif text-2xl leading-snug font-bold text-brand-brown sm:text-3xl">
            At flere ejendele finder tilbage til deres rette ejere, og at færre
            ting går tabt for altid.
          </p>
        </blockquote>
      </section>

      {/* How it works */}
      <section className="bg-zinc-100 px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionTitle eyebrow="Sådan virker det">
              En enklere vej fra fundet til genforenet
            </SectionTitle>
            <div className="mt-6 space-y-5 text-lg leading-relaxed font-light text-zinc-600">
              <p>
                Vi mener, at det skal være nemt at gøre det rigtige, når man
                finder noget, og enkelt at lede efter det, man har mistet.
              </p>
              <p>
                Derfor har vi skabt en platform, hvor du kan oprette en
                efterlysning, registrere en fundet genstand og søge blandt
                opslag fra hele landet. Når der er et muligt match, kan finder
                og ejer komme i kontakt og selv aftale, hvordan genstanden skal
                tilbageleveres.
              </p>
            </div>
            <p className="mt-6 flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-600">
              <Info
                size={20}
                className="mt-0.5 shrink-0 text-brand-gold"
                aria-hidden
              />
              <span>
                Hittegodscentralen opbevarer ikke fysiske genstande. Vi skaber
                forbindelsen mellem de mennesker, der kan hjælpe hinanden med at
                få tingene hjem igen.
              </span>
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* Businesses */}
      <section className="px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Business">
            For både privatpersoner og virksomheder
          </SectionTitle>
          <div className="mt-6 grid gap-5 text-lg leading-relaxed font-light text-zinc-600 lg:grid-cols-2 lg:gap-12">
            <p>
              Hittegods er ikke kun en udfordring for den enkelte. Skoler,
              butikker, hoteller og transportvirksomheder håndterer hver dag
              genstande, som andre har glemt eller mistet.
            </p>
            <p>
              Med Hittegodscentralen kan virksomheder og institutioner samle
              deres hittegods digitalt og gøre det lettere for deres brugere,
              gæster, kunder og medarbejdere at finde frem til deres ejendele.
            </p>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {ORGANISATIONS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-6 text-center"
              >
                <span className="grid size-12 place-items-center rounded-full bg-brand-gold/20 text-brand-brown">
                  <Icon size={22} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="font-medium text-brand-black">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-lg leading-relaxed font-light text-zinc-600">
              Vi ønsker at gøre håndteringen af hittegods mere overskuelig for
              organisationerne og samtidig give flere mennesker mulighed for at
              finde det, de troede var væk.
            </p>
            <Link
              href="/business"
              className="inline-flex shrink-0 items-center gap-2 font-medium text-brand-brown underline-offset-4 hover:underline"
            >
              Læs om Business
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Belief + mission */}
      <section className="bg-brand-surface px-4 py-20 text-white sm:px-6 lg:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionTitle eyebrow="Det tror vi på" light>
              Vi tror på, at vi kan hjælpe hinanden
            </SectionTitle>
            <div className="mt-6 space-y-5 text-lg leading-relaxed font-light text-white/75">
              <p>
                Bag Hittegodscentralen ligger en simpel tanke: Små handlinger
                kan gøre en stor forskel for andre.
              </p>
              <p>
                Det kan være en person, der registrerer en glemt telefon, en
                medarbejder, der opretter et fund fra arbejdspladsen, eller en
                ejer, der endelig finder sin forsvundne ejendel.
              </p>
              <p>
                Ved at samle disse muligheder ét sted ønsker vi at skabe en mere
                sammenhængende og tilgængelig måde at håndtere hittegods på.
              </p>
              <p>
                Hittegodscentralen er en del af{" "}
                <a
                  href="https://greydot.dk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-gold underline-offset-4 hover:underline"
                >
                  Greydot
                </a>
                , hvis mission er at skabe relationer mellem mennesker og gøre
                det lettere for os at hjælpe hinanden gennem digitale løsninger.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-3xl border border-brand-gold/30 bg-white/5 p-8 sm:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-gold">
              Vores mission
            </p>
            <p className="mt-4 font-serif text-3xl leading-snug font-bold">
              At forbinde mennesker og gøre det nemmere at få tabte og fundne
              ejendele tilbage til deres rette ejere – gennem en enkel,
              tilgængelig og digital platform.
            </p>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="px-4 py-20 text-center sm:px-6 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-4xl font-extrabold text-brand-brown sm:text-5xl">
            Har du mistet eller fundet noget?
          </h2>
          <p className="mt-5 text-lg leading-relaxed font-light text-zinc-600">
            Uanset om du leder efter noget, du har mistet, eller ønsker at
            hjælpe andre med at finde deres ejendele, er du med til at gøre en
            forskel. Sammen kan vi give flere ting en chance for at finde hjem
            igen.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/opret/tabt"
              className="rounded-xl bg-brand-gold px-8 py-3.5 text-lg font-medium text-brand-black transition-colors hover:bg-brand-gold/90"
            >
              Opret tabt
            </Link>
            <Link
              href="/opret/fundet"
              className="rounded-xl bg-brand-green px-8 py-3.5 text-lg font-medium text-white transition-colors hover:bg-brand-green/90"
            >
              Opret fundet
            </Link>
            <Link
              href="/genstande"
              className="rounded-xl border-2 border-brand-brown px-8 py-3 text-lg font-medium text-brand-brown transition-colors hover:bg-brand-brown hover:text-white"
            >
              Søg genstande
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({
  eyebrow,
  light = false,
  children,
}: {
  eyebrow: string;
  light?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <p
        className={`text-sm font-medium uppercase tracking-[0.18em] ${
          light ? "text-brand-gold" : "text-brand-rust"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 font-serif text-4xl leading-tight font-extrabold ${
          light ? "text-white" : "text-brand-brown"
        }`}
      >
        {children}
      </h2>
    </>
  );
}
