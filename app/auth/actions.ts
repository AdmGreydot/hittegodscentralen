"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { confirmEmailMail, resetPasswordMail } from "../../lib/emails";
import { sendMail, withinRateLimit } from "../../lib/mail";
import { createAdminClient } from "../../lib/supabase/admin";
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

// Passwords are taken as typed: spaces can be part of them.
function raw(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

// Where links in auth e-mails should point back to.
async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// Link for our own auth e-mails. Supabase only makes the token; app/auth/confirm verifies it.
async function confirmLink(tokenHash: string, type: string, next: string) {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next });
  return `${await siteOrigin()}/auth/confirm?${params}`;
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

  if (!(await withinRateLimit("signup"))) {
    return { message: "Du har prøvet mange gange på kort tid. Vent lidt, og prøv igen." };
  }

  // Creates the unconfirmed user and a confirmation token without Supabase sending its own mail.
  // We send the mail ourselves, so it comes from info@ and looks like the rest.
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
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

  const { hashed_token, verification_type } = data.properties;
  const link = await confirmLink(hashed_token, verification_type, "/profil");
  if (!(await sendMail({ to: input.email, ...confirmEmailMail(input.fullName, link) }))) {
    return { message: "Vi kunne ikke sende bekræftelsesmailen. Prøv igen om lidt." };
  }
  // The welcome mail is sent once the e-mail is confirmed (app/auth/confirm).
  return { ok: true, checkEmail: true };
}

export async function requestPasswordReset(form: FormData): Promise<AuthResult> {
  const email = text(form, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { errors: { email: "Skriv en gyldig e-mailadresse." } };

  if (!(await withinRateLimit("reset")) || !(await withinRateLimit("reset-email", email))) {
    return { message: "Du har bedt om for mange links. Vent lidt, og prøv igen." };
  }

  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "recovery",
    email,
  });
  // Don't reveal whether the e-mail has an account. Answer the same either way.
  if (error) {
    if (error.code !== "user_not_found") console.error("requestPasswordReset failed", error);
    return { ok: true, checkEmail: true };
  }

  const fullName = data.user.user_metadata?.full_name;
  const link = await confirmLink(data.properties.hashed_token, "recovery", "/nulstil-adgangskode");
  await sendMail({
    to: email,
    ...resetPasswordMail(typeof fullName === "string" ? fullName : "", link),
  });
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
