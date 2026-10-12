// Cleaning and checking category names typed when creating an item. Shared by the wizard (to
// show what will be saved) and the server (which always checks again). Keep free of server-only
// imports.

export const CATEGORY_MAX_LENGTH = 40;

// Letters (incl. æøå and other accents), digits, spaces and a few separators. Must start with a
// letter or digit, so names like "---" or "&" are refused.
const ALLOWED = /^[\p{L}\p{N}][\p{L}\p{N} &'/,.-]*$/u;

// Trims, collapses whitespace and capitalises: "  MOBIL  telefon " becomes "Mobil telefon".
export function normalizeCategoryName(raw: string) {
  const text = raw
    .normalize("NFC")
    .replace(/[\p{C}]/gu, "") // control and other invisible characters
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("da");
  return text.charAt(0).toLocaleUpperCase("da") + text.slice(1);
}

// Error message for a normalised name, or null if it's fine.
export function categoryNameError(name: string) {
  if (!name) return "Vælg eller skriv en kategori.";
  if (name.length < 2) return "Kategorien skal være mindst 2 tegn.";
  if (name.length > CATEGORY_MAX_LENGTH) return `Kategorien må højst være ${CATEGORY_MAX_LENGTH} tegn.`;
  if (!ALLOWED.test(name)) return "Kategorien må kun indeholde bogstaver, tal og mellemrum.";
  return null;
}

// The same category whatever the case: "nøgler" matches "Nøgler".
export function sameCategory(a: string, b: string) {
  return a.toLocaleLowerCase("da") === b.toLocaleLowerCase("da");
}
