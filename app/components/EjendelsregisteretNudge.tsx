import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import {
  ejendelsregisteretUrl,
  NUDGE_COPY,
  NUDGE_POINTS,
  NUDGE_PRICE,
  type NudgeContext,
} from "../../lib/ejendelsregisteret";

// Points people to Ejendelsregisteret, with a message that fits the moment (see NUDGE_COPY).
// `compact` drops the bullet points, for dialogs and popups.
export default function EjendelsregisteretNudge({
  context,
  compact = false,
  className = "",
}: {
  context: NudgeContext;
  compact?: boolean;
  className?: string;
}) {
  const copy = NUDGE_COPY[context];

  return (
    <aside
      aria-label="Ejendelsregisteret"
      className={`rounded-2xl border border-brand-gold/40 bg-brand-gold/15 p-5 text-left ${className}`}
    >
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-brown text-brand-gold">
          <ShieldCheck size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-rust">
            Ejendelsregisteret
          </p>
          <p className="mt-0.5 font-serif text-lg leading-snug font-bold text-brand-brown">{copy.title}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-brand-brown/80">{copy.text}</p>

      {!compact && (
        <ul className="mt-3 space-y-1.5 text-sm text-brand-brown">
          {NUDGE_POINTS.map((point) => (
            <li key={point} className="flex gap-2">
              <Check size={16} className="mt-0.5 shrink-0 text-brand-green" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      )}

      <a
        href={ejendelsregisteretUrl(context, "web")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-brand-brown px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-brown/90"
      >
        Registrér dine ting
        <ArrowUpRight size={16} aria-hidden />
      </a>
      <p className="mt-2 text-center text-xs text-brand-brown/60">
        {NUDGE_PRICE} ·{" "}
        <a
          href={ejendelsregisteretUrl(context, "web", "/")}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-brand-brown"
        >
          Læs mere
        </a>
      </p>
    </aside>
  );
}
