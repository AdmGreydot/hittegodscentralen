import { Fragment } from "react";
import { Check } from "lucide-react";
import { STEPS } from "./draft";

// Numbered steps along the top. Steps up to `reached` can be clicked to jump back.
// `steps` are the indexes into STEPS that are shown; `current` and `reached` are such indexes too.
export default function Stepper({
  steps,
  current,
  reached,
  onSelect,
}: {
  steps: number[];
  current: number;
  reached: number;
  onSelect: (step: number) => void;
}) {
  return (
    <nav aria-label="Trin" className="rounded-2xl border border-zinc-200/70 bg-white px-4 py-4 sm:px-5">
      <ol className="flex items-start">
        {steps.map((i, position) => {
          const label = STEPS[i];
          const active = i === current;
          // Completed = passed with "Næste" (everything before the furthest step reached).
          const done = !active && i < Math.max(current, reached);
          const clickable = i <= reached && !active;

          return (
            <Fragment key={label}>
              <li className="flex shrink-0 flex-col items-center gap-1.5">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onSelect(i)}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Trin ${position + 1}: ${label}${done ? " (udfyldt)" : ""}`}
                  className={`grid size-8 place-items-center rounded-full text-xs font-bold transition-colors ${
                    active
                      ? "bg-brand-brown text-white"
                      : done
                        ? "bg-brand-green text-white"
                        : "bg-zinc-200 text-zinc-400"
                  } ${clickable ? "cursor-pointer hover:ring-4 hover:ring-brand-green/20" : ""}`}
                >
                  {done ? <Check size={14} strokeWidth={3} aria-hidden /> : position + 1}
                </button>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    active || done ? "text-brand-black" : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </li>
              {position < steps.length - 1 && (
                <li
                  aria-hidden
                  className={`mx-1.5 mt-4 h-px flex-1 ${i < current ? "bg-zinc-500" : "bg-zinc-200"}`}
                />
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
