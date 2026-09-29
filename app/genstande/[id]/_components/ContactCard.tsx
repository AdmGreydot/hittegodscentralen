"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Info, Lock, LogIn, Mail, Send, UserPlus } from "lucide-react";
import type { ItemType } from "../../../../lib/item-card";

// chat:  the poster has an account and the viewer is logged in
// login: the poster has an account, but the viewer must log in to write to them
// mail:  the poster has no account — the viewer sends an e-mail relayed through Hittegodscentralen
// own:   the viewer is the poster
export type ContactMode = "chat" | "login" | "mail" | "own";

type Owner = { fullName: string; memberSince: string } | null;

const COPY = {
  lost: {
    heading: "Har du fundet denne genstand?",
    placeholder: "Beskriv hvor og hvornår du fandt genstanden...",
  },
  found: {
    heading: "Er det din genstand?",
    placeholder: "Beskriv genstanden, så finderen kan se at den er din...",
  },
};

// Who posted the item: a lost item was posted by the one who lost it (taberen),
// a found item by the one who found it (finderen).
const ROLE = {
  lost: { noun: "Taber", the: "taberen", The: "Taberen", of: "taberens" },
  found: { noun: "Finder", the: "finderen", The: "Finderen", of: "finderens" },
};
type Role = (typeof ROLE)[ItemType];

function subtitle(mode: ContactMode, role: Role) {
  switch (mode) {
    case "chat":
      return `Skriv direkte til ${role.the} via chat — din besked er privat.`;
    case "login":
      return `Du skal være logget ind for at skrive til ${role.the}.`;
    case "mail":
      return `${role.The} har ikke en profil. Send en e-mail via Hittegodscentralen.`;
    case "own":
      return "Det er din egen annonce.";
  }
}

// Name of the mail form's honeypot field. Sounds like a real field so bots fill it in.
export const HONEYPOT_FIELD = "website";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?"
  );
}

export default function ContactCard({
  mode,
  type,
  owner,
  itemId,
}: {
  mode: ContactMode;
  type: ItemType;
  owner: Owner;
  itemId: string;
}) {
  const copy = COPY[type];
  const role = ROLE[type];

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white">
      <div className="border-b border-zinc-200 px-6 py-5">
        <h2 className="font-serif text-xl font-bold text-brand-black">
          {mode === "own" ? "Din annonce" : copy.heading}
        </h2>
        <p className="mt-1 text-sm font-light text-zinc-500">
          {subtitle(mode, role)}
        </p>
      </div>

      <div className="p-6">
        {mode === "chat" && (
          <ChatForm owner={owner} role={role} placeholder={copy.placeholder} />
        )}
        {mode === "login" && (
          <LoginPrompt owner={owner} role={role} itemId={itemId} />
        )}
        {mode === "mail" && (
          <MailForm role={role} placeholder={copy.placeholder} />
        )}
        {mode === "own" && (
          <p className="flex gap-3 rounded-xl bg-zinc-100 p-4 text-sm text-zinc-600">
            <Info
              size={18}
              className="mt-0.5 shrink-0 text-brand-brown"
              aria-hidden
            />
            Når nogen skriver til dig om denne genstand, kan du se beskederne
            under din profil.
          </p>
        )}
      </div>
    </section>
  );
}

function OwnerRow({ owner, role }: { owner: Owner; role: Role }) {
  const name = owner?.fullName || role.noun;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-brown text-sm font-semibold text-white">
        {initials(name)}
      </span>
      <p className="min-w-0 truncate text-sm font-medium text-brand-black">
        {name}
      </p>
    </div>
  );
}

function ChatForm({
  owner,
  role,
  placeholder,
}: {
  owner: Owner;
  role: Role;
  placeholder: string;
}) {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: send via the chat backend once it exists.
        setNotice("Beskeder kan ikke sendes endnu — funktionen er på vej.");
      }}
    >
      <OwnerRow owner={owner} role={role} />
      <TextArea
        value={message}
        onChange={(value) => {
          setMessage(value);
          setNotice(null);
        }}
        placeholder={placeholder}
        label={`Besked til ${role.the}`}
      />
      <SubmitButton
        disabled={!message.trim()}
        icon={<Send size={18} aria-hidden />}
      >
        Send besked
      </SubmitButton>
      <Notice text={notice} />
      <FinePrint>Din e-mail deles ikke med {role.the}</FinePrint>
    </form>
  );
}

function LoginPrompt({
  owner,
  role,
  itemId,
}: {
  owner: Owner;
  role: Role;
  itemId: string;
}) {
  // Bring the user back to this item after logging in.
  const next = encodeURIComponent(`/genstande/${itemId}`);
  const name = owner?.fullName.split(" ")[0] || role.the;

  return (
    <>
      <OwnerRow owner={owner} role={role} />
      <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-zinc-300 px-6 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand-gold/20 text-brand-brown">
          <Lock size={20} aria-hidden />
        </span>
        <p className="mt-4 font-medium text-brand-black">
          Log ind for at skrive til {name}
        </p>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">
          Så kan I tale sammen i en privat chat og aftale, hvordan genstanden
          kommer hjem.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/log-ind?next=${next}`}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-brown font-medium text-white transition-colors hover:bg-brand-brown/90"
        >
          <LogIn size={18} aria-hidden />
          Log ind
        </Link>
        <Link
          href={`/opret-konto?next=${next}`}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand-brown font-medium text-brand-brown transition-colors hover:bg-brand-brown hover:text-white"
        >
          <UserPlus size={18} aria-hidden />
          Opret konto
        </Link>
      </div>
    </>
  );
}

function MailForm({ role, placeholder }: { role: Role; placeholder: string }) {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const input =
    "h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-brand-black placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-brown/40 focus:bg-white";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        // Honeypot filled in: almost certainly a bot. Pretend it worked so it doesn't retry.
        if (form.get(HONEYPOT_FIELD)) {
          setNotice("Tak! Din besked er sendt.");
          return;
        }
        // TODO: relay the e-mail through Hittegodscentralen (Resend) once the backend exists.
        // The server must check the honeypot too — bots often post directly without this page.
        setNotice("E-mails kan ikke sendes endnu — funktionen er på vej.");
      }}
    >
      {/* Honeypot: hidden from people and screen readers, but bots filling every field will fill it.
          Moved off-screen rather than display:none, since some bots skip fields that are display:none. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label>
          Website
          <input
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-gold/30 text-brand-brown">
          <Mail size={18} aria-hidden />
        </span>
        <p className="text-sm text-zinc-600">
          Din besked sendes gennem Hittegodscentralen, så {role.of} e-mail
          forbliver privat.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Navn">
          <input name="name" required autoComplete="name" className={input} />
        </Field>
        <Field label="E-mail">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={input}
          />
        </Field>
      </div>
      <Field label="Telefon (valgfri)" className="mt-3">
        <input name="phone" type="tel" autoComplete="tel" className={input} />
      </Field>

      <TextArea
        value={message}
        onChange={(value) => {
          setMessage(value);
          setNotice(null);
        }}
        placeholder={placeholder}
        label="Besked"
        showLabel
      />

      <SubmitButton
        disabled={!message.trim()}
        icon={<Mail size={18} aria-hidden />}
      >
        Send e-mail
      </SubmitButton>
      <Notice text={notice} />
      <FinePrint>{role.The} kan svare dig på den e-mail, du angiver</FinePrint>
    </form>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-brand-black">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  label,
  showLabel = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  showLabel?: boolean;
}) {
  const textarea = (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      required
      placeholder={placeholder}
      aria-label={showLabel ? undefined : label}
      className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-brand-black placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-brown/40 focus:bg-white"
    />
  );
  return showLabel ? (
    <Field label={label} className="mt-3">
      {textarea}
    </Field>
  ) : (
    <div className="mt-4">{textarea}</div>
  );
}

function SubmitButton({
  disabled,
  icon,
  children,
}: {
  disabled: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-rust font-medium text-white transition-colors hover:bg-brand-rust/90 disabled:cursor-not-allowed disabled:bg-brand-rust/35"
    >
      {icon}
      {children}
    </button>
  );
}

function Notice({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="status" className="mt-3 text-center text-sm text-brand-rust">
      {text}
    </p>
  );
}

function FinePrint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
      <Lock size={12} aria-hidden />
      {children}
    </p>
  );
}
