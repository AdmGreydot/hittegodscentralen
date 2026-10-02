"use client";

import { LogIn, UserRound } from "lucide-react";
import { useAuthModal } from "../../components/auth/AuthModal";

// Shown on /profil when nobody is logged in. Logging in refreshes the page into the profile.
export default function LoggedOut() {
  const openAuth = useAuthModal();
  return (
    <main className="grid flex-1 place-items-center bg-zinc-100 px-4 py-20">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/70 bg-white p-8 text-center sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-gold/25 text-brand-brown">
          <UserRound size={26} aria-hidden />
        </span>
        <h1 className="mt-5 font-serif text-3xl font-bold text-brand-brown">Min profil</h1>
        <p className="mt-2 font-light text-zinc-500">
          Log ind for at se dine genstande og beskeder.
        </p>
        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-rust font-medium text-white transition-colors hover:bg-brand-rust/90"
          >
            <LogIn size={18} aria-hidden />
            Log ind
          </button>
          <button
            type="button"
            onClick={() => openAuth("signup")}
            className="h-12 rounded-xl border-2 border-brand-brown font-medium text-brand-brown transition-colors hover:bg-brand-brown hover:text-white"
          >
            Opret konto
          </button>
        </div>
      </div>
    </main>
  );
}
