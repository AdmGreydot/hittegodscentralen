// The hidden "bots only" field in the public forms (contact, mail to an item, create item). Bots
// fill in every field; people never see it. The name must not look like anything browsers
// autofill: "website", "url", "company", "email" and the like get filled by Chrome and Safari even
// when hidden, which made real people look like bots. Shared by client and server code.
export const HONEYPOT_FIELD = "hgc_ref";

// Props for the hidden input. autoComplete="off" alone doesn't stop autofill, so it's also given
// a value-less, non-standard autocomplete token.
export const honeypotInputProps = {
  type: "text",
  name: HONEYPOT_FIELD,
  tabIndex: -1,
  autoComplete: "nope",
  "aria-hidden": true,
} as const;
