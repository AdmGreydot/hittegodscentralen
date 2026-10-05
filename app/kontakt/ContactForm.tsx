"use client";

import { useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { AuthInput, FormMessage, SubmitButton } from "../components/auth/fields";
import { sendContactMail, type MailResult } from "../mail/actions";

export default function ContactForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const [result, setResult] = useState<MailResult>({});
  const [pending, startTransition] = useTransition();

  if (result.sent) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <CircleCheck size={32} className="text-brand-green" aria-hidden />
        <p className="mt-3 font-medium text-brand-black">Tak for din besked</p>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">
          Vi vender tilbage på din e-mail så hurtigt, vi kan.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        startTransition(async () => setResult(await sendContactMail(form)));
      }}
      className="space-y-5"
    >
      {/* Honeypot: hidden from people and screen readers, but bots filling every field will fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <FormMessage text={result.message} />
      <div className="grid gap-5 sm:grid-cols-2">
        <AuthInput
          label="Navn"
          name="name"
          autoComplete="name"
          defaultValue={defaultName}
          error={result.errors?.name}
        />
        <AuthInput
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          error={result.errors?.email}
        />
      </div>
      <AuthInput
        label="Telefon (valgfri)"
        name="phone"
        type="tel"
        autoComplete="tel"
        error={result.errors?.phone}
      />
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-brand-black">
          Besked
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          maxLength={2000}
          aria-invalid={Boolean(result.errors?.message)}
          className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-brand-black placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-brown/50 focus:bg-white aria-[invalid=true]:border-brand-rust"
        />
        {result.errors?.message && (
          <p className="mt-1.5 text-sm text-brand-rust">{result.errors.message}</p>
        )}
      </div>
      <SubmitButton pending={pending}>Send besked</SubmitButton>
    </form>
  );
}
