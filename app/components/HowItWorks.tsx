import { HandHeart, Handshake, PackageSearch } from "lucide-react";

const STEPS = [
  {
    icon: PackageSearch,
    title: "Mistet noget?",
    text: "Opret en efterlysning og søg blandt opslag fra hele landet.",
  },
  {
    icon: HandHeart,
    title: "Fundet noget?",
    text: "Registrér genstanden, så ejeren har en chance for at finde den.",
  },
  {
    icon: Handshake,
    title: "Genforenet",
    text: "Finder og ejer kommer i kontakt og aftaler selv tilbageleveringen.",
  },
];

// The three steps from lost to reunited, on the brown brand surface.
export default function HowItWorks() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-surface p-8 text-white sm:p-10">
      {/* Soft gold glow in the corner for depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-gold/20 blur-3xl"
      />
      <ol className="relative space-y-8">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="relative flex gap-5">
            {/* Dotted line connecting the steps. */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute top-14 bottom-[-2rem] left-6 border-l-2 border-dashed border-brand-gold/30"
              />
            )}
            <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-brand-gold text-brand-brown">
              <Icon size={22} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="pt-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-gold">
                Trin {i + 1}
              </p>
              <h3 className="mt-1 font-serif text-2xl font-bold">{title}</h3>
              <p className="mt-1 font-light text-white/70">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
