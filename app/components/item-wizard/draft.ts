import type { ItemType } from "../../../lib/item-card";

// Everything the create/edit wizard collects. Strings are kept as typed so inputs stay controlled.
export type ItemDraft = {
  type: ItemType | null;
  title: string;
  description: string;
  categoryId: string;
  image: File | null;
  imagePreview: string | null; // blob: URL for the chosen file
  imageUrl: string | null; // existing image when editing
  region: string;
  city: string;
  postalCode: string;
  address: string;
  occurredOn: string; // YYYY-MM-DD
  // Exact point from "Brug min placering"; cleared when the address is edited by hand.
  latitude: number | null;
  longitude: number | null;
  email: string;
};

export const EMPTY_DRAFT: ItemDraft = {
  type: null,
  title: "",
  description: "",
  categoryId: "",
  image: null,
  imagePreview: null,
  imageUrl: null,
  region: "",
  city: "",
  postalCode: "",
  address: "",
  occurredOn: "",
  latitude: null,
  longitude: null,
  email: "",
};

export const STEPS = ["Type", "Detaljer", "Lokation", "Kontakt", "Gennemse"] as const;

// The contact step. Skipped when logged in, since contact then goes through the account.
export const CONTACT_STEP = 3;

// Indexes of the steps shown, in order.
export function visibleSteps(loggedIn: boolean) {
  return STEPS.map((_, i) => i).filter((i) => !(loggedIn && i === CONTACT_STEP));
}

export const REGIONS = [
  "Region Hovedstaden",
  "Region Sjælland",
  "Region Syddanmark",
  "Region Midtjylland",
  "Region Nordjylland",
];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Hidden field only bots fill in. Sounds like a real field so they take the bait.
export const HONEYPOT_FIELD = "website";

export type DraftErrors = Partial<Record<keyof ItemDraft, string>>;

// Today in Denmark as YYYY-MM-DD.
export function todayInDenmark() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" }).format(new Date());
}

// Errors for one step (0-based). An empty object means the step is valid.
export function validateStep(step: number, draft: ItemDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (step === 0 && !draft.type) {
    errors.type = "Vælg om du har tabt eller fundet noget.";
  }

  if (step === 1) {
    if (!draft.title.trim()) errors.title = "Skriv en titel.";
    else if (draft.title.trim().length > 100) errors.title = "Titlen må højst være 100 tegn.";
    if (!draft.description.trim()) errors.description = "Beskriv genstanden.";
    else if (draft.description.trim().length > 2000) {
      errors.description = "Beskrivelsen må højst være 2000 tegn.";
    }
    if (!draft.categoryId) errors.categoryId = "Vælg en kategori.";
  }

  if (step === 2) {
    if (!draft.region) errors.region = "Vælg en region.";
    if (draft.postalCode && !/^\d{4}$/.test(draft.postalCode.trim())) {
      errors.postalCode = "Postnummeret skal være 4 cifre.";
    }
    if (!draft.occurredOn) errors.occurredOn = "Vælg en dato.";
    else if (draft.occurredOn > todayInDenmark()) errors.occurredOn = "Datoen kan ikke være i fremtiden.";
  }

  if (step === 3) {
    if (!draft.email.trim()) errors.email = "Skriv din e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      errors.email = "E-mailen ser ikke rigtig ud.";
    }
  }

  return errors;
}
