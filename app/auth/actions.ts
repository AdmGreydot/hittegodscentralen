"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import {
  validatePassword,
  validateSignup,
  EMAIL_RE,
  type AuthErrors,
  type AuthResult,
} from "./validation";

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Passwords are taken as typed — spaces can be part of them.
function raw(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

// Where links in auth e-mails should point back to.
async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function logIn(form: FormData): Promise<AuthResult> {
  const email = text(form, "email").toLowerCase();
  const password = raw(form, "password");
  if (!email || !password) return { message: "Udfyld e-mail og adgangskode." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { message: "Du skal bekræfte din e-mail først. Tjek din indbakke." };
    }
    if (error.code === "invalid_credentials") {
      return { message: "Forkert e-mail eller adgangskode." };
    }
    console.error("logIn failed", error);
    return { message: "Du kunne ikke logges ind lige nu. Prøv igen om lidt." };
  }

  refresh();
  return { ok: true };
}

export async function signUp(form: FormData): Promise<AuthResult> {
  const input = {
    fullName: text(form, "fullName"),
    email: text(form, "email").toLowerCase(),
    emailRepeat: text(form, "emailRepeat").toLowerCase(),
    password: raw(form, "password"),
    passwordRepeat: raw(form, "passwordRepeat"),
    terms: form.get("terms") === "on",
  };
  const errors = validateSignup(input);
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.fullName },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/profil`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { errors: { email: "Der findes allerede en konto med denne e-mail. Log ind i stedet." } };
    }
    if (error.code === "weak_password") {
      return { errors: { password: "Adgangskoden er for svag. Vælg en længere eller mindre almindelig." } };
    }
    console.error("signUp failed", error);
    return { message: "Kontoen kunne ikke oprettes lige nu. Prøv igen om lidt." };
  }

  // With e-mail confirmation on, Supabase hides existing accounts by returning a user without
  // identities instead of an error.
  if (data.user && data.user.identities?.length === 0) {
    return { errors: { email: "Der findes allerede en konto med denne e-mail. Log ind i stedet." } };
  }

  // No session means the e-mail must be confirmed before the user can log in.
  if (!data.session) return { ok: true, checkEmail: true };

  refresh();
  return { ok: true };
}

export async function requestPasswordReset(form: FormData): Promise<AuthResult> {
  const email = text(form, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { errors: { email: "Skriv en gyldig e-mailadresse." } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/nulstil-adgangskode`,
  });
  // Don't reveal whether the e-mail has an account — answer the same either way.
  if (error && error.code !== "user_not_found") {
    console.error("requestPasswordReset failed", error);
    if (error.status === 429) {
      return { message: "Du har bedt om for mange links. Vent lidt, og prøv igen." };
    }
  }
  return { ok: true, checkEmail: true };
}

export async function updatePassword(form: FormData): Promise<AuthResult> {
  const password = raw(form, "password");
  const errors: AuthErrors = {};
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  else if (password !== raw(form, "passwordRepeat")) {
    errors.passwordRepeat = "Adgangskoderne er ikke ens.";
  }
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { message: "Linket er udløbet. Bed om et nyt link til at nulstille din adgangskode." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") {
      return { errors: { password: "Vælg en anden adgangskode end den, du havde før." } };
    }
    if (error.code === "weak_password") {
      return { errors: { password: "Adgangskoden er for svag. Vælg en længere eller mindre almindelig." } };
    }
    console.error("updatePassword failed", error);
    return { message: "Adgangskoden kunne ikke gemmes. Prøv igen om lidt." };
  }

  redirect("/profil");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
