"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAccount } from "../../auth/actions";

// "Slet min konto" at the bottom of the profile page, with a confirmation step.
export default function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mt-12 rounded-2xl border border-zinc-200/70 bg-white p-6">
      <h2 className="font-medium text-brand-black">Slet konto</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Sletter din konto med alle dine opslag, billeder og beskeder. Det kan ikke fortrydes.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-brand-rust transition-colors hover:border-brand-rust/50"
        >
          <Trash2 size={16} aria-hidden />
          Slet min konto
        </button>
      ) : (
        <div role="alert" className="mt-4 rounded-xl bg-brand-rust/10 p-4">
          <p className="text-sm font-medium text-brand-rust">
            Er du sikker? Alt bliver slettet med det samme, og de, du har skrevet med, får besked om,
            at samtalen er slettet.
          </p>
          {error && <p className="mt-2 text-sm text-brand-rust">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  // On success the action redirects to /konto-slettet.
                  setError((await deleteAccount()).error ?? null);
                })
              }
              className="flex items-center gap-2 rounded-xl bg-brand-rust px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-rust/90 disabled:opacity-70"
            >
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
              Ja, slet min konto
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-brand-black transition-colors hover:border-brand-brown/40"
            >
              Annullér
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
