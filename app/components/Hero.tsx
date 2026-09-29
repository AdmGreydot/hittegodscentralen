import Image from "next/image";
import Link from "next/link";
import Form from "next/form";
import { ArrowDown } from "lucide-react";
import heroImage from "../../public/hero-image.png";

export default function Hero() {
  return (
    <section className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-4 pt-28 pb-24 text-white sm:px-6">
      <Image
        src={heroImage}
        alt="Hænder der holder jord med en lille plante"
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="-z-20 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-brand-hero-overlay opacity-40" />

      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-gold sm:text-base">
          Lost &amp; Found Danmark
        </p>
        <h1 className="mt-4 font-serif text-5xl font-extrabold leading-none tracking-tight sm:text-6xl lg:text-7xl">
          Hittegodscentralen
        </h1>
        <p className="mt-5 text-lg text-white/90 sm:text-2xl">
          Den hurtigste vej mellem taber og finder
        </p>

        <Form action="/genstande" className="mt-10 w-full">
          <input
            type="search"
            name="q"
            placeholder="Søg efter genstand, sted eller by..."
            aria-label="Søg efter genstand, sted eller by"
            className="h-16 w-full rounded-xl border border-white/25 bg-white/10 px-10 text-lg text-white placeholder:text-white/60 backdrop-blur-md outline-none transition-colors focus:border-brand-gold focus:bg-white/15"
          />
        </Form>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/opret/tabt"
            className="rounded-xl bg-brand-gold px-10 py-4 text-lg font-medium text-brand-black transition-colors hover:bg-brand-gold/90"
          >
            Opret tabt
          </Link>
          <Link
            href="/opret/fundet"
            className="rounded-xl bg-brand-green px-10 py-4 text-lg font-medium text-white transition-colors hover:bg-brand-green/90"
          >
            Opret fundet
          </Link>
        </div>
      </div>

      <a
        href="#indhold"
        aria-label="Scroll ned"
        className="absolute bottom-8 left-1/2 grid size-11 -translate-x-1/2 place-items-center rounded-full border border-white/40 bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:border-white/70 hover:text-white"
      >
        <ArrowDown size={20} className="animate-bounce motion-reduce:animate-none" />
      </a>
    </section>
  );
}
