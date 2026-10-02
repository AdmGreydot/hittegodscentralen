"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "../auth/actions";
import { PASSWORD_HINT, type AuthResult } from "../auth/validation";
import { useAuthModal } from "../components/auth/AuthModal";
import { AuthInput, FormMessage, SubmitButton } from "../components/auth/fields";

export default function ResetPasswordForm({ expired }: { expired: boolean }) {
  const openAuth = useAuthModal();
  const [result, setResult] = useState<AuthResult>({});
  const [pending, startTransition] = useTransition();

  if (expired) {
    return (
      <button
        type="button"
        onClick={() => openAuth("forgot")}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-rust font-medium text-white transition-colors hover:bg-brand-rust/90"
      >
        Send mig et nyt link
      </button>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        // On success the action redirects to the profile page.
        startTransition(async () => setResult(await updatePassword(form)));
      }}
      className="space-y-5"
    >
      <FormMessage text={result.message} />
      <AuthInput
        label="Ny adgangskode"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={result.errors?.password}
        autoFocus
      />
      <AuthInput
        label="Gentag adgangskode"
        name="passwordRepeat"
        type="password"
        autoComplete="new-password"
        error={result.errors?.passwordRepeat}
      />
      <SubmitButton pending={pending}>Gem adgangskode</SubmitButton>
    </form>
  );
}
