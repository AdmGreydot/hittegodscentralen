"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from "lucide-react";
import { createItem, updateItem } from "../../opret/actions";
import {
  EMPTY_DRAFT,
  HONEYPOT_FIELD,
  STEPS,
  todayInDenmark,
  validateStep,
  visibleSteps,
  type DraftErrors,
  type ItemDraft,
} from "./draft";
import Stepper from "./Stepper";
import { ContactStep, DetailsStep, LocationStep, ReviewStep, TypeStep } from "./steps";

type Category = { id: number; name: string };

// Which step each field lives on, so a server-side error can send the user back to it.
const FIELD_STEP: Partial<Record<keyof ItemDraft, number>> = {
  type: 0,
  title: 1,
  description: 1,
  categoryId: 1,
  image: 1,
  region: 2,
  city: 2,
  postalCode: 2,
  address: 2,
  occurredOn: 2,
  email: 3,
};

// Create and edit share this wizard. In "edit" mode every step has a "Gem" button and the last
// step says "Gem ændringer"; in "create" mode you finish with "Opret opslag" on the last step.
export default function ItemWizard({
  mode,
  categories,
  initialDraft,
  itemId,
  userEmail,
}: {
  mode: "create" | "edit";
  categories: Category[];
  initialDraft?: Partial<ItemDraft>;
  itemId?: string; // the item being edited
  userEmail: string | null; // set when logged in: the contact step is skipped and this is used
}) {
  // The date defaults to today (Danish time); an existing date from initialDraft wins when editing.
  const [draft, setDraft] = useState<ItemDraft>(() => ({
    ...EMPTY_DRAFT,
    occurredOn: todayInDenmark(),
    ...initialDraft,
    ...(userEmail && { email: userEmail }),
  }));
  const steps = visibleSteps(Boolean(userEmail));
  // A type chosen before the wizard opened (e.g. "Opret tabt" on the frontpage) skips step 1.
  // When editing, every step is already filled in, so all are reachable.
  const firstStep = draft.type ? 1 : 0;
  const [step, setStep] = useState(firstStep);
  const [reached, setReached] = useState(mode === "edit" ? STEPS.length - 1 : firstStep);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const isLast = step === STEPS.length - 1;
  const position = steps.indexOf(step);

  function update(patch: Partial<ItemDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    // Clear errors for the fields being edited.
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key as keyof ItemDraft];
      return next;
    });
    setNotice(null);
  }

  function goTo(target: number) {
    setStep(target);
    setReached((r) => Math.max(r, target));
    setErrors({});
    // Bring the top of the card into view if the user has scrolled down a long step.
    const card = cardRef.current;
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth" });
  }

  function next() {
    const stepErrors = validateStep(step, draft);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    goTo(steps[position + 1]);
  }

  // Validate every step; jump to the first one with a problem.
  function validateAll() {
    for (const i of steps) {
      const stepErrors = validateStep(i, draft);
      if (Object.keys(stepErrors).length) {
        goTo(i);
        setErrors(stepErrors);
        return false;
      }
    }
    return true;
  }

  function submit() {
    if (!validateAll()) return;

    const form = new FormData();
    const fields = [
      "type", "title", "description", "categoryId", "region",
      "city", "postalCode", "address", "occurredOn", "email",
    ] as const;
    for (const field of fields) form.set(field, draft[field] ?? "");
    if (draft.image) form.set("image", draft.image);
    if (draft.latitude != null && draft.longitude != null) {
      form.set("latitude", String(draft.latitude));
      form.set("longitude", String(draft.longitude));
    }
    form.set(HONEYPOT_FIELD, honeypotRef.current?.value ?? "");
    // The existing image is still shown, so keep it (a new file replaces it anyway).
    if (draft.imageUrl) form.set("keepImage", "1");

    setNotice(null);
    startSubmit(async () => {
      // On success the action redirects to the item, so we only get here on errors.
      const result =
        mode === "edit" && itemId ? await updateItem(itemId, form) : await createItem(form);
      if (result.errors && Object.keys(result.errors).length) {
        const steps = Object.keys(result.errors).map((f) => FIELD_STEP[f as keyof ItemDraft] ?? 0);
        goTo(Math.min(...steps));
        setErrors(result.errors);
      } else if (result.message) {
        setNotice(result.message);
      }
    });
  }

  return (
    <main className="flex-1 bg-zinc-100">
      <nav aria-label="Brødkrummer" className="border-b border-zinc-200 bg-white">
        <ol className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-6 text-sm sm:px-6">
          <li>
            <Link
              href={mode === "edit" ? "/profil" : "/genstande"}
              className="flex items-center gap-2 font-medium text-brand-black/80 hover:text-brand-black"
            >
              <ArrowLeft size={16} aria-hidden />
              {mode === "edit" ? "Min profil" : "Genstande"}
            </Link>
          </li>
          <li aria-hidden className="text-zinc-300">
            /
          </li>
          <li aria-current="page" className="font-semibold text-brand-black">
            {mode === "edit" ? "Rediger opslag" : "Opret opslag"}
          </li>
        </ol>
      </nav>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <Stepper steps={steps} current={step} reached={reached} onSelect={goTo} />

        <div
          ref={cardRef}
          className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white"
        >
          {/* Honeypot: invisible to people and screen readers; bots that fill every field fill this. */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input ref={honeypotRef} type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="p-6 sm:p-8">
            {step === 0 && <TypeStep draft={draft} errors={errors} update={update} />}
            {step === 1 && (
              <DetailsStep draft={draft} errors={errors} update={update} categories={categories} />
            )}
            {step === 2 && <LocationStep draft={draft} errors={errors} update={update} />}
            {step === 3 && <ContactStep draft={draft} errors={errors} update={update} />}
            {step === 4 && <ReviewStep draft={draft} categories={categories} />}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-5 sm:px-8">
            <button
              type="button"
              onClick={() => goTo(steps[position - 1])}
              disabled={position === 0}
              className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 font-medium text-brand-black transition-colors hover:border-brand-brown/40 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:bg-transparent disabled:text-zinc-300"
            >
              <ArrowLeft size={16} aria-hidden />
              Tilbage
            </button>

            <ProgressDots steps={steps} current={step} />

            <div className="flex items-center gap-3">
              {mode === "edit" && !isLast && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 font-medium text-brand-black transition-colors hover:border-brand-brown/40"
                >
                  <Save size={16} aria-hidden />
                  Gem
                </button>
              )}
              {isLast ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="flex h-11 items-center gap-2 rounded-xl bg-brand-brown px-5 font-medium text-white transition-colors hover:bg-brand-brown/90 disabled:cursor-wait disabled:opacity-70"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                  ) : mode === "edit" ? (
                    <Save size={16} aria-hidden />
                  ) : (
                    <Check size={16} aria-hidden />
                  )}
                  {submitting
                    ? mode === "edit" ? "Gemmer..." : "Opretter..."
                    : mode === "edit" ? "Gem ændringer" : "Opret opslag"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="flex h-11 items-center gap-2 rounded-xl bg-brand-brown px-5 font-medium text-white transition-colors hover:bg-brand-brown/90"
                >
                  Næste
                  <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>

        {notice && (
          <p role="status" className="text-center text-sm text-brand-rust">
            {notice}
          </p>
        )}
      </div>
    </main>
  );
}

function ProgressDots({ steps, current }: { steps: number[]; current: number }) {
  return (
    <div aria-hidden className="hidden items-center gap-1.5 sm:flex">
      {steps.map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-5 bg-brand-brown" : i < current ? "w-1.5 bg-brand-brown" : "w-1.5 bg-zinc-300"
          }`}
        />
      ))}
    </div>
  );
}
