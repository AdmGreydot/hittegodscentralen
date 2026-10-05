"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, CircleCheck, Loader2, RotateCcw, Trash2 } from "lucide-react";
import {
  RESOLUTION_OPTIONS,
  type ItemResolution,
  type ItemStatus,
  type ItemType,
} from "../../../../lib/item-card";
import { deleteGuestItem, extendGuestItem, reopenGuestItem, resolveGuestItem } from "./actions";

const QUESTION = { lost: "Er din genstand kommet hjem?", found: "Hvad skete der med genstanden?" };
const STATUS = { resolved: "Markeret som løst", archived: "Fjernet fra siden" };

export default function ManageItem({
  itemId,
  token,
  title,
  type,
  status,
  expiresOn,
  expired,
  extendedOn,
}: {
  itemId: string;
  token: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  expiresOn: string;
  expired: boolean;
  extendedOn: string;
}) {
  const [resolution, setResolution] = useState<ItemResolution | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const active = status === "active" && !expired;

  function run(action: () => Promise<{ error?: string }>, done: string) {
    setMessage(null);
    startTransition(async () => {
      const { error } = await action();
      setMessage(error ? { text: error, error: true } : { text: done, error: false });
    });
  }

  return (
    <div>
      <p className="font-serif text-xl font-bold text-brand-black">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">
        {active
          ? `Synligt for alle til og med den ${expiresOn}.`
          : status === "active"
            ? `Udløb den ${expiresOn}.`
            : STATUS[status]}
      </p>
      {active && (
        <Link href={`/genstande/${itemId}`} className="mt-2 inline-block text-sm font-medium text-brand-rust underline underline-offset-4">
          Se opslaget
        </Link>
      )}

      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            message.error ? "bg-brand-rust/10 text-brand-rust" : "bg-brand-green/10 text-brand-green"
          }`}
        >
          {message.text}
        </p>
      )}

      {active ? (
        <>
          <fieldset className="mt-6 border-t border-zinc-200 pt-6">
            <legend className="sr-only">Markér som løst</legend>
            <p className="font-medium text-brand-black">{QUESTION[type]}</p>
            <div className="mt-3 space-y-2">
              {RESOLUTION_OPTIONS[type].map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm has-checked:border-brand-brown has-checked:bg-brand-brown/5">
                  <input
                    type="radio"
                    name="resolution"
                    value={o.value}
                    checked={resolution === o.value}
                    onChange={() => setResolution(o.value)}
                    className="accent-brand-brown"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={!resolution || pending}
              onClick={() =>
                resolution &&
                run(() => resolveGuestItem(itemId, token, resolution), "Tak! Opslaget er markeret som løst og fjernet fra siden.")
              }
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-brown font-medium text-white transition-colors hover:bg-brand-brown/90 disabled:opacity-50"
            >
              <CircleCheck size={18} aria-hidden />
              Markér som løst
            </button>
          </fieldset>

          <div className="mt-6 border-t border-zinc-200 pt-6">
            <p className="font-medium text-brand-black">Har du brug for mere tid?</p>
            <p className="mt-1 text-sm text-zinc-500">Forlæng opslaget, så det er synligt til og med den {extendedOn}.</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => extendGuestItem(itemId, token), `Opslaget er forlænget til og med den ${extendedOn}.`)}
              className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-4 font-medium text-brand-black transition-colors hover:border-brand-brown/40"
            >
              <CalendarClock size={18} aria-hidden />
              Forlæng opslaget
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6 border-t border-zinc-200 pt-6">
          <p className="font-medium text-brand-black">Leder du stadig, eller har du stadig genstanden?</p>
          <p className="mt-1 text-sm text-zinc-500">Sæt opslaget op igen, så er det synligt til og med den {extendedOn}.</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => reopenGuestItem(itemId, token), "Opslaget er sat op igen og er synligt for alle.")}
            className="mt-3 flex h-11 items-center gap-2 rounded-xl bg-brand-brown px-4 font-medium text-white transition-colors hover:bg-brand-brown/90 disabled:opacity-70"
          >
            <RotateCcw size={18} aria-hidden />
            Sæt opslaget op igen
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-zinc-200 pt-6">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-sm font-medium text-brand-rust"
          >
            <Trash2 size={16} aria-hidden />
            Slet opslaget
          </button>
        ) : (
          <div className="rounded-xl bg-brand-rust/10 p-4">
            <p className="text-sm font-medium text-brand-rust">
              Opslaget og billedet bliver slettet med det samme. Det kan ikke fortrydes.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteGuestItem(itemId, token), "")}
                className="flex items-center gap-2 rounded-xl bg-brand-rust px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-rust/90 disabled:opacity-70"
              >
                {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
                Ja, slet opslaget
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-brand-black"
              >
                Annullér
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
