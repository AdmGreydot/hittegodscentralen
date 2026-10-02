import { ArrowUpRight } from "lucide-react";

const EJENDELSREGISTERET_URL = "https://www.ejendelsregisteret.dk";

// "Mist aldrig dine ting igen" box, shown after creating or finishing an item.
export default function EjendelsregisteretNudge({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-brand-gold/15 p-4 ${className}`}>
      <div className="flex gap-3">
        <p className="text-left text-sm text-brand-brown">
          <span className="block font-semibold">
            Mist aldrig dine ting igen
          </span>
          Registrér dig på ejendelsregisteret.dk
        </p>
      </div>
      <a
        href={EJENDELSREGISTERET_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand-brown px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-brown/90"
      >
        Gå til Ejendelsregisteret
        <ArrowUpRight size={16} aria-hidden />
      </a>
    </div>
  );
}
