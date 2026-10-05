"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CircleCheck, Loader2, RotateCcw, X } from "lucide-react";
import { RESOLUTION_OPTIONS, type ItemResolution, type ItemStatus, type ItemType } from "../../../lib/item-card";
import { reopenItem, resolveItem } from "../../opret/actions";
import EjendelsregisteretNudge from "../EjendelsregisteretNudge";
import Tooltip from "../Tooltip";

export type StatusItem = { id: string; title: string; type: ItemType; status: ItemStatus };
export type StatusConversation = { id: string; otherName: string };

// "Markér som fundet/afleveret" on an active item, "Genåbn" on a finished one.
// It stays mounted when the status changes, so the thank-you step can show after saving.
const ACTION_LABEL = { lost: "Markér som fundet", found: "Markér som afleveret" };

const QUESTION = {
  lost: "Er din genstand kommet hjem?",
  found: "Hvad skete der med genstanden?",
};

const OPTIONS = RESOLUTION_OPTIONS;

const WHO = { lost: "Hvem fandt den?", found: "Hvem var ejeren?" };

const VARIANT = {
  // Square button in the stack on a "Mine genstande" card.
  icon: "grid size-8 place-items-center rounded-lg bg-brand-gold text-brand-brown shadow-sm transition-colors hover:bg-brand-gold/85",
  // Full-width button, e.g. on the item page.
  button:
    "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-brown font-medium text-white transition-colors hover:bg-brand-brown/90 disabled:opacity-70",
  // Small outlined button, e.g. in the chat header.
  chip: "flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-brand-black transition-colors hover:border-brand-brown/40 disabled:opacity-60",
};

export default function ItemStatusControl({
  item,
  conversations,
  defaultConversationId,
  variant,
}: {
  item: StatusItem;
  conversations: StatusConversation[]; // conversations about this item, to pick who it went to
  defaultConversationId?: string;
  variant: keyof typeof VARIANT;
}) {
  const [open, setOpen] = useState(false);
  const [reopening, startReopen] = useTransition();
  const [reopenError, setReopenError] = useState<string | null>(null);
  const active = item.status === "active";
  const label = active ? ACTION_LABEL[item.type] : "Genåbn opslag";
  const iconSize = variant === "icon" ? 15 : 18;

  const button = (
    <button
      type="button"
      disabled={reopening}
      onClick={() =>
        active
          ? setOpen(true)
          : startReopen(async () => setReopenError((await reopenItem(item.id)).error ?? null))
      }
      className={VARIANT[variant]}
      aria-label={variant === "icon" ? `${label}: ${item.title}` : undefined}
    >
      {reopening ? (
        <Loader2 size={iconSize} className="animate-spin" aria-hidden />
      ) : active ? (
        <CircleCheck size={iconSize} aria-hidden />
      ) : (
        <RotateCcw size={iconSize} aria-hidden />
      )}
      {variant !== "icon" && label}
    </button>
  );

  return (
    <>
      {variant === "icon" ? (
        <Tooltip label={active ? "Markér som afsluttet" : "Genåbn opslag"}>{button}</Tooltip>
      ) : (
        button
      )}
      {reopenError && (
        <p role="alert" className="mt-2 text-sm text-brand-rust">
          {reopenError}
        </p>
      )}
      {/* Rendered whatever the status, so the thank-you step survives the status change. */}
      <ResolveDialog
        open={open}
        onClose={() => setOpen(false)}
        item={item}
        conversations={conversations}
        defaultConversationId={defaultConversationId}
      />
    </>
  );
}

function ResolveDialog({
  open,
  onClose,
  item,
  conversations,
  defaultConversationId,
}: {
  open: boolean;
  onClose: () => void;
  item: StatusItem;
  conversations: StatusConversation[];
  defaultConversationId?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [resolution, setResolution] = useState<ItemResolution | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ItemResolution | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog || dialog.open) return;
    // Start fresh each time. With only one conversation about the item, it's the likely one.
    setResolution(null);
    setConversationId(defaultConversationId ?? (conversations.length === 1 ? conversations[0].id : ""));
    setNote("");
    setError(null);
    setDone(null);
    dialog.showModal();
  }, [open, defaultConversationId, conversations]);

  const close = () => dialogRef.current?.close();

  function save() {
    if (!resolution) return setError("Vælg hvordan det endte.");
    setError(null);
    startTransition(async () => {
      const result = await resolveItem(item.id, {
        resolution,
        conversationId: resolution === "returned" ? conversationId || null : null,
        note,
      });
      if (result.error) setError(result.error);
      else setDone(resolution);
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`resolve-title-${item.id}`}
      onClose={onClose}
      // A click on the dialog element itself is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && !pending && close()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-0 text-left shadow-2xl backdrop:bg-black/55"
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={close}
          disabled={pending}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-brand-black"
          aria-label="Luk"
        >
          <X size={20} aria-hidden />
        </button>

        {done ? (
          <div className="text-center" role="status">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-green/15 text-brand-green">
              <CircleCheck size={28} aria-hidden />
            </span>
            <h2
              id={`resolve-title-${item.id}`}
              className="mt-4 font-serif text-2xl font-bold text-brand-black"
            >
              {done === "gave_up" ? "Opslaget er arkiveret" : "Tak fordi du gav besked"}
            </h2>
            <p className="mt-1 font-light text-zinc-500">
              {done === "gave_up"
                ? "Det vises ikke længere for andre. Du kan altid genåbne det under Mine genstande."
                : "Opslaget er afsluttet og vises ikke længere for andre."}
            </p>
            <EjendelsregisteretNudge className="mt-6" />
            <button
              type="button"
              onClick={close}
              className="mt-3 h-11 w-full rounded-xl border border-zinc-200 font-medium text-brand-black transition-colors hover:border-brand-brown/40"
            >
              Luk
            </button>
          </div>
        ) : (
          <>
            <h2
              id={`resolve-title-${item.id}`}
              className="pr-8 font-serif text-2xl font-bold text-brand-black"
            >
              {QUESTION[item.type]}
            </h2>
            <p className="mt-1 truncate text-sm font-light text-zinc-500">{item.title}</p>

            <fieldset className="mt-6 space-y-2">
              <legend className="sr-only">{QUESTION[item.type]}</legend>
              {OPTIONS[item.type].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    resolution === option.value
                      ? "border-brand-brown bg-brand-brown/5"
                      : "border-zinc-200 hover:border-brand-brown/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={`resolution-${item.id}`}
                    value={option.value}
                    checked={resolution === option.value}
                    onChange={() => {
                      setResolution(option.value);
                      setError(null);
                    }}
                    className="size-4 accent-brand-brown"
                  />
                  <span className="text-brand-black">{option.label}</span>
                </label>
              ))}
            </fieldset>

            {resolution === "returned" && conversations.length > 0 && (
              <label className="mt-5 block">
                <span className="mb-1.5 block text-sm font-medium text-brand-black">
                  {WHO[item.type]}
                </span>
                <select
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  className="h-12 w-full cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-brand-black outline-none focus:border-brand-brown/50 focus:bg-white"
                >
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.otherName || "Ukendt bruger"}
                    </option>
                  ))}
                  <option value="">Ikke via Hittegodscentralen</option>
                </select>
              </label>
            )}

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium text-brand-black">
                Note <span className="font-light text-zinc-400">(valgfri, kun til dig)</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Fx hvor og hvornår den blev afleveret"
                className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-brand-black outline-none placeholder:text-zinc-400 focus:border-brand-brown/50 focus:bg-white"
              />
            </label>

            {error && (
              <p role="alert" className="mt-4 text-sm text-brand-rust">
                {error}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="h-11 rounded-xl border border-zinc-200 font-medium text-brand-black transition-colors hover:border-brand-brown/40"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-brown font-medium text-white transition-colors hover:bg-brand-brown/90 disabled:opacity-70"
              >
                {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
                Gem
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
