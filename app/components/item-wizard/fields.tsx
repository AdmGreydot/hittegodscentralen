import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export const inputClass =
  "h-12 w-full rounded-xl border bg-white px-4 text-brand-black placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-brown/50 aria-[invalid=true]:border-brand-rust";

const borderClass = "border-zinc-200";

// Label + control + hint/error. `children` receives the ids so the control can reference them.
export function Field({
  label,
  required = false,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid": boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-wider text-brand-brown"
      >
        {label}
        {required && " *"}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": Boolean(error) })}
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

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${borderClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={4}
      {...props}
      className={`${inputClass} ${borderClass} h-auto resize-y py-3 ${props.className ?? ""}`}
    />
  );
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${inputClass} ${borderClass} cursor-pointer appearance-none pr-10 invalid:text-zinc-400`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
    </div>
  );
}

export function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-serif text-2xl font-bold text-brand-brown">{title}</h2>
      <p className="mt-1 font-light text-zinc-500">{subtitle}</p>
    </div>
  );
}
