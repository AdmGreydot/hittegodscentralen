"use client";

import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const inputClass =
  "h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-brand-black placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-brown/50 focus:bg-white aria-[invalid=true]:border-brand-rust";

// Label + input + hint/error, styled like the rest of the site's forms.
export function AuthInput({
  label,
  hint,
  error,
  type = "text",
  ...props
}: {
  label: string;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-brand-black">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${inputClass} ${isPassword ? "pr-12" : ""}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition-colors hover:text-brand-brown"
            aria-label={visible ? "Skjul adgangskode" : "Vis adgangskode"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-brand-rust">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-zinc-400">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-rust font-medium text-white transition-colors hover:bg-brand-rust/90 disabled:cursor-wait disabled:bg-brand-rust/60"
    >
      {pending && <Loader2 size={18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function FormMessage({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-xl bg-brand-rust/10 px-4 py-3 text-sm text-brand-rust">
      {text}
    </p>
  );
}
