// Shared by the auth forms and the server actions. Keep free of server-only imports.

export type AuthField =
  | "fullName"
  | "email"
  | "emailRepeat"
  | "password"
  | "passwordRepeat"
  | "terms";

export type AuthErrors = Partial<Record<AuthField, string>>;

// ok + checkEmail: done, but the user has to click a link in an e-mail first.
export type AuthResult = {
  ok?: boolean;
  checkEmail?: boolean;
  errors?: AuthErrors;
  message?: string;
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_HINT = "Mindst 8 tegn og mindst ét stort bogstav. Et tal gør den stærkere.";

export function validatePassword(password: string) {
  if (password.length < 8) return "Adgangskoden skal være mindst 8 tegn.";
  if (!/\p{Lu}/u.test(password)) return "Adgangskoden skal have mindst ét stort bogstav.";
  return null;
}

export function validateSignup(input: {
  fullName: string;
  email: string;
  emailRepeat: string;
  password: string;
  passwordRepeat: string;
  terms: boolean;
}) {
  const errors: AuthErrors = {};
  if (input.fullName.length < 2) errors.fullName = "Skriv dit fulde navn.";
  else if (input.fullName.length > 100) errors.fullName = "Navnet er for langt.";

  if (!EMAIL_RE.test(input.email)) errors.email = "Skriv en gyldig e-mailadresse.";
  else if (input.email !== input.emailRepeat) errors.emailRepeat = "E-mailadresserne er ikke ens.";

  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  else if (input.password !== input.passwordRepeat) {
    errors.passwordRepeat = "Adgangskoderne er ikke ens.";
  }

  if (!input.terms) errors.terms = "Du skal acceptere vilkårene for at oprette en konto.";
  return errors;
}
