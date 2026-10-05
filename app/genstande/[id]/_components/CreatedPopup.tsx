"use client";

import { useEffect, useState } from "react";
import { CircleCheck, X } from "lucide-react";
import EjendelsregisteretNudge from "../../../components/EjendelsregisteretNudge";

const DURATION_MS = 8000;

// Shown once after creating an item (?oprettet=1). Closes by itself after a few seconds; the timer
// pauses while the pointer or keyboard focus is on it, so the link can be used.
// `persistent` (development preview) keeps it open: no auto-close, and the URL is left alone.
export default function CreatedPopup({ persistent = false }: { persistent?: boolean }) {
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  // Drop ?oprettet=1 so a reload doesn't show the popup again. history.replaceState changes the
  // URL without re-rendering the page (router.replace would, and remove this popup at once).
  useEffect(() => {
    if (persistent) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [persistent]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 motion-safe:animate-[fade-in_200ms_ease-out]"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        role="status"
        aria-live="polite"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl motion-safe:animate-[pop-in_250ms_ease-out]"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-brand-black"
          aria-label="Luk"
        >
          <X size={20} aria-hidden />
        </button>

        <div className="px-6 pt-8 pb-6 text-center sm:px-8">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-green/15 text-brand-green">
            <CircleCheck size={28} aria-hidden />
          </span>
          <h2 className="mt-4 font-serif text-2xl font-bold text-brand-black">
            Dit opslag er oprettet
          </h2>
          <p className="mt-1 font-light text-zinc-500">Det kan nu ses af alle på Hittegodscentralen.</p>
        </div>

        <EjendelsregisteretNudge className="mx-6 mb-6 sm:mx-8" />

        {/* Countdown bar; closes the popup when the animation ends. With reduced motion there's
            no bar and no auto-close: the popup stays until closed. */}
        <div className="h-1 bg-zinc-100">
          <div
            onAnimationEnd={() => !persistent && setOpen(false)}
            className="h-full origin-left bg-brand-green motion-reduce:hidden"
            style={{
              animation: `shrink-x ${DURATION_MS}ms linear forwards`,
              animationPlayState: paused ? "paused" : "running",
            }}
          />
        </div>
      </div>
    </div>
  );
}
