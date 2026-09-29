import Image from "next/image";
import Link from "next/link";
import logo from "../../public/logo.png";

// Logo + name + tagline, used in the navbar and footer. `compact` is the smaller footer size.
export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 sm:gap-4">
      <Logo compact={compact} />
      <span className="flex flex-col">
        <span
          className={`font-serif font-bold leading-tight tracking-tight ${
            compact ? "text-xl sm:text-[22px]" : "text-xl sm:text-2xl"
          }`}
        >
          Hittegodscentralen
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-brand-gold sm:text-[11px]">
          Dækker alt - over alt
        </span>
      </span>
    </Link>
  );
}

function Logo({ compact }: { compact: boolean }) {
  return (
    <Image
      src={logo}
      alt="Greydot"
      preload={!compact}
      sizes="76px"
      className={`shrink-0 rounded-full ${compact ? "size-14" : "size-14 sm:size-[76px]"}`}
    />
  );
}
