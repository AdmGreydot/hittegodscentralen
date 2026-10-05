"use client";

import { useRef, useState } from "react";
import {
  Heart,
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  PencilLine,
  ShieldCheck,
  X,
  ZoomIn,
} from "lucide-react";
import { reverseGeocode } from "../../../lib/geo";
import LazyMap, { type MapPoint } from "../map/LazyMap";
import { formatDate, type ItemType } from "../../../lib/item-card";
import {
  MAX_IMAGE_BYTES,
  REGIONS,
  todayInDenmark,
  type DraftErrors,
  type ItemDraft,
} from "./draft";
import { Field, Select, StepHeading, TextArea, TextInput } from "./fields";
import { resizeImage } from "./resizeImage";

type StepProps = {
  draft: ItemDraft;
  errors: DraftErrors;
  update: (patch: Partial<ItemDraft>) => void;
};

type Category = { id: number; name: string };

// --- 1. Type -----------------------------------------------------------------

const TYPE_OPTIONS: {
  value: ItemType;
  label: string;
  hint: string;
  icon: typeof ZoomIn;
  selected: string;
  iconBox: string;
}[] = [
  {
    value: "lost",
    label: "Jeg har tabt noget",
    hint: "Opret en efterlysning",
    icon: ZoomIn,
    selected: "border-brand-rust bg-brand-rust/5 text-brand-rust",
    iconBox: "bg-brand-rust/10 text-brand-rust",
  },
  {
    value: "found",
    label: "Jeg har fundet noget",
    hint: "Hjælp en anden",
    icon: Heart,
    selected: "border-brand-green bg-brand-green/5 text-brand-green",
    iconBox: "bg-brand-green/10 text-brand-green",
  },
];

export function TypeStep({ draft, errors, update }: StepProps) {
  return (
    <>
      <StepHeading title="Hvad er det?" subtitle="Vælg om du har tabt eller fundet en genstand." />
      <div role="radiogroup" aria-label="Type" className="grid gap-4 sm:grid-cols-2">
        {TYPE_OPTIONS.map((option) => {
          const selected = draft.type === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => update({ type: option.value })}
              className={`flex flex-col items-center rounded-2xl border-2 px-6 py-8 text-center transition-colors ${
                selected
                  ? option.selected
                  : "border-zinc-200 text-brand-black hover:border-zinc-300"
              }`}
            >
              <span className={`grid size-14 place-items-center rounded-xl ${option.iconBox}`}>
                <Icon size={24} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="mt-4 font-bold">{option.label}</span>
              <span className="mt-0.5 text-sm text-zinc-400">{option.hint}</span>
            </button>
          );
        })}
      </div>
      {errors.type && <p className="mt-3 text-sm text-brand-rust">{errors.type}</p>}
    </>
  );
}

// --- 2. Details --------------------------------------------------------------

export function DetailsStep({
  draft,
  errors,
  update,
  categories,
}: StepProps & { categories: Category[] }) {
  return (
    <>
      <StepHeading
        title="Beskriv genstanden"
        subtitle="Jo flere detaljer, desto nemmere er det at matche."
      />
      <div className="space-y-5">
        <Field label="Titel" required error={errors.title}>
          {(a11y) => (
            <TextInput
              {...a11y}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={draft.type === "found" ? "Fx Sort pung" : "Fx Hvid JBL in-ear etui"}
              maxLength={100}
            />
          )}
        </Field>
        <Field label="Beskrivelse" required error={errors.description}>
          {(a11y) => (
            <TextArea
              {...a11y}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Farve, mærke, kendetegn..."
              maxLength={2000}
            />
          )}
        </Field>
        <Field label="Kategori" required error={errors.categoryId}>
          {(a11y) => (
            <Select
              {...a11y}
              value={draft.categoryId}
              onChange={(e) => update({ categoryId: e.target.value })}
              required
            >
              <option value="" disabled>
                Vælg kategori
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <ImagePicker draft={draft} update={update} error={errors.image} />
      </div>
    </>
  );
}

function ImagePicker({
  draft,
  update,
  error,
}: {
  draft: ItemDraft;
  update: StepProps["update"];
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const shown = draft.imagePreview ?? draft.imageUrl;

  const [processing, setProcessing] = useState(false);

  async function choose(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setLocalError("Vælg en billedfil.");
    if (file.size > MAX_IMAGE_BYTES) return setLocalError("Billedet må højst fylde 10 MB.");
    setLocalError(null);
    setProcessing(true);
    const resized = await resizeImage(file);
    setProcessing(false);
    if (!resized) return setLocalError("Billedformatet understøttes ikke. Prøv JPG eller PNG.");
    // Preview URL is made here, in the event, and released when replaced or removed.
    if (draft.imagePreview) URL.revokeObjectURL(draft.imagePreview);
    update({ image: resized, imagePreview: URL.createObjectURL(resized) });
  }

  const message = localError ?? error;

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-brown">Billede</p>
      {shown ? (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border-2 border-dashed border-zinc-300">
          {/* Local preview or existing Supabase image. Plain img since next/image can't load blob: URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="Valgt billede" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => {
              if (draft.imagePreview) URL.revokeObjectURL(draft.imagePreview);
              update({ image: null, imagePreview: null, imageUrl: null });
              if (inputRef.current) inputRef.current.value = "";
            }}
            aria-label="Fjern billede"
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-zinc-800/70 text-white transition-colors hover:bg-zinc-900"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
          <span className="absolute bottom-3 left-3 rounded-md bg-zinc-800/70 px-2 py-1 text-xs font-medium text-white">
            Klik × for at fjerne
          </span>
        </div>
      ) : (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files[0]);
          }}
          className="flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-center transition-colors hover:border-brand-brown/40 hover:bg-white"
        >
          <ImagePlus size={32} strokeWidth={1.5} className="text-zinc-400" aria-hidden />
          <span className="font-medium text-brand-black">
            {processing ? "Klargør billede..." : "Tilføj et billede"}
          </span>
          <span className="text-sm text-zinc-400">Klik eller træk en fil hertil · maks. 10 MB</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
      )}
      {message && <p className="mt-1.5 text-sm text-brand-rust">{message}</p>}
    </div>
  );
}

// --- 3. Location & time ------------------------------------------------------

// Editing the address by hand means the exact point no longer matches it, so drop it.
const CLEAR_POINT = { latitude: null, longitude: null };
const CLEAR_LOCATION = { region: "", city: "", postalCode: "", address: "", ...CLEAR_POINT };

// Above this GPS uncertainty (typical for laptops locating by Wi-Fi/IP), a street address
// would be a guess, so only the area is filled in.
const MAX_ACCURACY_FOR_ADDRESS_M = 200;

const GEO_ERRORS: Record<number, string> = {
  1: "Du har ikke givet adgang til din placering. Udfyld felterne herunder i stedet.",
  2: "Din placering kunne ikke findes. Udfyld felterne herunder i stedet.",
  3: "Det tog for lang tid at finde din placering. Udfyld felterne herunder, eller prøv igen.",
};

type LocationMethod = "gps" | "manual";

export function LocationStep({ draft, errors, update }: StepProps) {
  // Coming back to the step with a place filled in: show the fields straight away.
  const [method, setMethod] = useState<LocationMethod | null>(() =>
    draft.latitude != null ? "gps" : draft.region || draft.city || draft.postalCode ? "manual" : null,
  );
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);

  const locationError = errors.region || errors.city || errors.postalCode || errors.address;

  function focusFirstField() {
    requestAnimationFrame(() => fieldsRef.current?.querySelector<HTMLElement>("select, input")?.focus());
  }

  function chooseManual() {
    // Values filled in from the GPS are cleared, so the user types their own.
    if (method === "gps" || draft.latitude != null) update(CLEAR_LOCATION);
    setMethod("manual");
    setMessage(null);
    focusFirstField();
  }

  // "Ret" on the GPS result: edit the found place instead of starting over.
  function editFoundPlace() {
    setMethod("manual");
    setMessage(null);
    focusFirstField();
  }

  function fallBackToManual(text: string) {
    setLocating(false);
    setMethod("manual");
    setMessage({ text, error: true });
    focusFirstField();
  }

  // Clicked the map or dragged the pin: look up that spot and fill in the fields from it.
  async function pickOnMap({ latitude, longitude }: MapPoint) {
    update({ latitude, longitude });
    setMessage(null);
    const place = await reverseGeocode(latitude, longitude);
    if (!place) {
      update(CLEAR_POINT);
      setMessage({ text: "Vælg et sted i Danmark.", error: true });
      return;
    }
    update({
      region: place.region ?? "",
      city: place.city,
      postalCode: place.postalCode,
      address: place.address ?? "",
      latitude,
      longitude,
    });
    setMethod("gps");
    setMessage({
      text: place.address ? "Stedet er sat ud fra kortet." : "Området er sat ud fra kortet. Tilføj gerne fx en station eller park.",
      error: false,
    });
  }

  function chooseGps() {
    if (!("geolocation" in navigator)) {
      return fallBackToManual("Din browser kan ikke dele placering. Udfyld felterne herunder i stedet.");
    }
    setLocating(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const place = await reverseGeocode(coords.latitude, coords.longitude);
        if (!place) {
          return fallBackToManual(
            "Vi kunne ikke finde en dansk adresse ved din placering. Udfyld felterne herunder i stedet.",
          );
        }

        const precise = coords.accuracy <= MAX_ACCURACY_FOR_ADDRESS_M;
        const address = precise ? place.address : null;
        update({
          region: place.region ?? "",
          city: place.city,
          postalCode: place.postalCode,
          address: address ?? "",
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocating(false);
        setMethod("gps");
        setMessage({
          text: address
            ? `Fundet ud fra din placering (±${Math.round(coords.accuracy)} m).`
            : "Vi fandt området, men ikke et præcist sted. Tilføj gerne fx en station eller park.",
          error: false,
        });
      },
      (err) => fallBackToManual(GEO_ERRORS[err.code] ?? GEO_ERRORS[2]),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <>
      <StepHeading title="Lokation & tidspunkt" subtitle="Hvor og hvornår skete det?" />

      <div role="radiogroup" aria-label="Angiv sted" className="grid gap-3 sm:grid-cols-2">
        <MethodButton
          selected={method === "gps"}
          onClick={chooseGps}
          disabled={locating}
          icon={
            locating ? (
              <Loader2 size={20} className="animate-spin" aria-hidden />
            ) : (
              <LocateFixed size={20} aria-hidden />
            )
          }
          title={locating ? "Finder din placering..." : "Brug min lokation"}
          hint="Udfyld automatisk ud fra hvor du er"
        />
        <MethodButton
          selected={method === "manual"}
          onClick={chooseManual}
          disabled={locating}
          icon={<PencilLine size={20} aria-hidden />}
          title="Tilføj manuelt"
          hint="Skriv region, by og sted selv"
        />
      </div>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.error ? "text-brand-rust" : "text-brand-green"}`}
        >
          {message.text}
        </p>
      )}

      {/* Pressed "Næste" without choosing how to give the place. */}
      {locationError && method !== "manual" && (
        <p className="mt-3 text-sm text-brand-rust">
          Vælg om du vil bruge din lokation eller tilføje stedet manuelt.
        </p>
      )}

      {/* GPS: a compact summary instead of input fields. */}
      {method === "gps" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-zinc-100 px-4 py-3">
          <MapPin size={18} className="mt-0.5 shrink-0 text-brand-brown" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-brand-black">
              {draft.address || "Intet præcist sted"}
            </p>
            <p className="text-zinc-500">
              {[draft.postalCode, draft.city].filter(Boolean).join(" ")}
              {draft.region && ` · ${draft.region.replace(/^Region /, "")}`}
            </p>
          </div>
          <button
            type="button"
            onClick={editFoundPlace}
            className="shrink-0 text-sm font-medium text-brand-brown underline-offset-2 hover:underline"
          >
            {draft.address ? "Ret" : "Tilføj sted"}
          </button>
        </div>
      )}

      {method === "manual" && (
        <div ref={fieldsRef} className="mt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Region" required error={errors.region}>
              {(a11y) => (
                <Select
                  {...a11y}
                  value={draft.region}
                  onChange={(e) => update({ region: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Vælg region
                  </option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/^Region /, "")}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="By" error={errors.city}>
              {(a11y) => (
                <TextInput
                  {...a11y}
                  value={draft.city}
                  onChange={(e) => update({ city: e.target.value, ...CLEAR_POINT })}
                  autoComplete="address-level2"
                />
              )}
            </Field>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_2fr]">
            <Field label="Postnummer" error={errors.postalCode}>
              {(a11y) => (
                <TextInput
                  {...a11y}
                  value={draft.postalCode}
                  onChange={(e) => update({ postalCode: e.target.value, ...CLEAR_POINT })}
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="postal-code"
                />
              )}
            </Field>
            <Field label="Præcis adresse / sted" error={errors.address}>
              {(a11y) => (
                <TextInput
                  {...a11y}
                  value={draft.address}
                  onChange={(e) => update({ address: e.target.value, ...CLEAR_POINT })}
                  placeholder="Fx Østerbro, bus 1A"
                />
              )}
            </Field>
          </div>
        </div>
      )}

      <Field
        label={draft.type === "found" ? "Dato for fund" : "Dato for tab"}
        required
        error={errors.occurredOn}
        className="mt-6"
      >
        {(a11y) => (
          <TextInput
            {...a11y}
            type="date"
            value={draft.occurredOn}
            max={todayInDenmark()}
            onChange={(e) => update({ occurredOn: e.target.value })}
          />
        )}
      </Field>

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-brand-black">Sæt stedet på kortet</p>
        <div className="h-64 overflow-hidden rounded-xl border border-zinc-200 sm:h-72">
          <LazyMap
            point={
              draft.latitude != null && draft.longitude != null
                ? { latitude: draft.latitude, longitude: draft.longitude }
                : null
            }
            onPick={pickOnMap}
            label="Kort. Klik for at vælge stedet"
          />
        </div>
        <p className="mt-1.5 text-xs text-zinc-400">
          Klik på kortet, eller træk nålen, for at angive stedet præcist.
        </p>
      </div>
    </>
  );
}

function MethodButton({
  selected,
  onClick,
  disabled,
  icon,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-colors disabled:cursor-wait ${
        selected
          ? "border-brand-brown bg-brand-brown/5"
          : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-lg ${
          selected ? "bg-brand-brown text-white" : "bg-zinc-100 text-brand-brown"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block font-bold text-brand-black">{title}</span>
        <span className="block text-sm text-zinc-500">{hint}</span>
      </span>
    </button>
  );
}

// --- 4. Contact --------------------------------------------------------------

export function ContactStep({ draft, errors, update }: StepProps) {
  return (
    <>
      <StepHeading title="Kontaktoplysninger" subtitle="Hvordan skal andre kontakte dig?" />
      <div className="space-y-5">
        <Field
          label="E-mail"
          required
          hint="Vises ikke offentligt. Vi formidler kontakten."
          error={errors.email}
        >
          {(a11y) => (
            <TextInput
              {...a11y}
              type="email"
              value={draft.email}
              onChange={(e) => update({ email: e.target.value })}
              autoComplete="email"
              placeholder="navn@email.dk"
            />
          )}
        </Field>

        <div className="flex gap-3 rounded-xl bg-zinc-100 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-200 text-zinc-600">
            <ShieldCheck size={18} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-brand-black">Dit privatliv er beskyttet</p>
            <p className="text-sm text-zinc-500">
              Vi deler aldrig dine kontaktoplysninger direkte. Al kommunikation foregår gennem
              vores platform.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// --- 5. Review ---------------------------------------------------------------

export function ReviewStep({ draft, categories }: { draft: ItemDraft; categories: Category[] }) {
  const image = draft.imagePreview ?? draft.imageUrl;
  const category = categories.find((c) => String(c.id) === draft.categoryId)?.name;
  const typeLabel = draft.type === "found" ? "Fundet" : "Tabt";
  const place = [draft.address, draft.postalCode].filter(Boolean).join(" · ");

  const rows: [string, string | undefined][] = [
    ["Type", typeLabel],
    ["Kategori", category],
    ["Region", draft.region.replace(/^Region /, "")],
    ["By", [draft.city, draft.postalCode].filter(Boolean).join(", ")],
    ["Dato", draft.occurredOn ? formatDate(`${draft.occurredOn}T12:00:00`) : undefined],
    ["Kontakt", draft.email],
  ];

  return (
    <>
      <StepHeading
        title="Gennemse dit opslag"
        subtitle="Tjek at alt ser rigtigt ud, inden du opretter det."
      />

      <article className="overflow-hidden rounded-2xl border border-zinc-200">
        {image && (
          <div className="aspect-[16/6] bg-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="size-full object-cover" />
          </div>
        )}
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${
                draft.type === "found" ? "bg-brand-green" : "bg-brand-rust"
              }`}
            >
              {typeLabel}
            </span>
            {category && (
              <span className="rounded-full border border-zinc-200 px-3 py-0.5 text-xs text-zinc-500">
                {category}
              </span>
            )}
          </div>
          <h3 className="mt-3 font-serif text-xl font-bold text-brand-black">{draft.title}</h3>
          <p className="mt-1 font-light whitespace-pre-line text-zinc-500">{draft.description}</p>
          {(place || draft.occurredOn) && (
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-200 pt-4 text-sm text-zinc-400">
              {place && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} aria-hidden />
                  {place}
                </span>
              )}
              {draft.occurredOn && <span>{formatDate(`${draft.occurredOn}T12:00:00`)}</span>}
            </p>
          )}
        </div>
      </article>

      <dl className="mt-6">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-zinc-200 py-3">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-right font-medium text-brand-black">{value}</dd>
            </div>
          ))}
      </dl>
    </>
  );
}
