import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

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

// Text input with a styled dropdown of suggestions under it, the full width of the field. The user
// can pick a suggestion or type something else; `createLabel` adds a last row for a new value.
// Keyboard: arrows move, Enter picks, Escape closes (the ARIA combobox pattern).
export function ComboBox({
  value,
  onChange,
  options,
  createLabel,
  onBlur,
  matches = (a, b) => a.toLowerCase() === b.toLowerCase(),
  ...a11y
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  createLabel?: string | null; // e.g. "Opret ny kategori: Cykel", shown when the value is new
  onBlur?: () => void;
  matches?: (a: string, b: string) => boolean;
  id: string;
  "aria-describedby"?: string;
  "aria-invalid": boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Once a suggestion is picked, show them all again; while typing, only those that fit.
  const query = value.trim().toLowerCase();
  const picked = options.some((o) => matches(o, value.trim()));
  const shown = picked || !query ? options : options.filter((o) => o.toLowerCase().includes(query));
  const rows = createLabel ? [...shown, createLabel] : shown;

  useEffect(() => {
    if (active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(index: number) {
    if (index < shown.length) onChange(shown[index]);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative">
      <input
        {...a11y}
        role="combobox"
        aria-expanded={open && rows.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (rows.length ? (i + step + rows.length) % rows.length : -1));
          } else if (e.key === "Enter" && open && active >= 0) {
            e.preventDefault();
            choose(active);
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
        className={`${inputClass} ${borderClass} pr-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? "Skjul forslag" : "Vis forslag"}
        // Keep focus in the input, so opening doesn't trigger its blur.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="absolute top-0 right-0 grid h-12 w-10 place-items-center text-zinc-400"
      >
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && rows.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg"
        >
          {rows.map((row, i) => {
            const isCreate = createLabel != null && i === rows.length - 1;
            const selected = !isCreate && matches(row, value.trim());
            return (
              <li
                key={isCreate ? "__create" : row}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                // mousedown would blur the input before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 ${
                  i === active ? "bg-zinc-100" : ""
                } ${isCreate ? "border-t border-zinc-100 font-medium text-brand-rust" : "text-brand-black"}`}
              >
                {isCreate ? (
                  <Plus size={16} aria-hidden />
                ) : (
                  <Check size={16} className={selected ? "text-brand-brown" : "invisible"} aria-hidden />
                )}
                {row}
              </li>
            );
          })}
        </ul>
      )}
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
