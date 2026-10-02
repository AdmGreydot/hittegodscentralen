import type { Metadata } from "next";
import { getCurrentUser } from "../../lib/auth";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Ny adgangskode · Hittegodscentralen",
};

// The link in the "glemt adgangskode" e-mail goes through /auth/callback, which logs the user in
// and sends them here to choose a new password.
export default async function ResetPasswordPage({ searchParams }: PageProps<"/nulstil-adgangskode">) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const expired = !user || query.fejl === "1";

  return (
    <main className="flex-1 bg-zinc-100 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-4xl font-bold text-brand-brown">Vælg ny adgangskode</h1>
        <p className="mt-3 font-light text-zinc-500">
          {expired
            ? "Linket er udløbet eller allerede brugt. Bed om et nyt, så sender vi det til din mail."
            : `Du er logget ind som ${user.email}. Vælg en ny adgangskode til din konto.`}
        </p>
        <div className="mt-8 rounded-2xl border border-zinc-200/70 bg-white p-6 sm:p-8">
          <ResetPasswordForm expired={expired} />
        </div>
      </div>
    </main>
  );
}
