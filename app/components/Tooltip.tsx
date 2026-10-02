import type { ReactNode } from "react";

// Small dark label shown on hover and keyboard focus. Purely visual — the wrapped control keeps
// its own aria-label for screen readers. `side` is where the label appears relative to it.
export default function Tooltip({
  label,
  side = "left",
  children,
}: {
  label: string;
  side?: "left" | "top";
  children: ReactNode;
}) {
  const position =
    side === "left"
      ? "top-1/2 right-full mr-2 -translate-y-1/2"
      : "bottom-full left-1/2 mb-2 -translate-x-1/2";

  return (
    <span className="group/tip relative flex">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-md bg-brand-black/90 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover/tip:opacity-100 group-has-focus-visible/tip:opacity-100 ${position}`}
      >
        {label}
      </span>
    </span>
  );
}
