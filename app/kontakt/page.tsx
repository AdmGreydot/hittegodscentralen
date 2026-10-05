import type { Metadata } from "next";
import { getCurrentUser } from "../../lib/auth";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Kontakt os · Hittegodscentralen",
  description: "Skriv til Hittegodscentralen, så svarer vi så hurtigt, vi kan.",
};

export default async function ContactPage() {
  const user = await getCurrentUser();

  return (
    <main className="flex-1 bg-zinc-100 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-4xl font-bold text-brand-brown">Kontakt os</h1>
        <p className="mt-3 font-light text-zinc-500">
          Har du spørgsmål, ris eller ros? Skriv til os, så svarer vi på den e-mail, du angiver.
        </p>
        <div className="mt-8 rounded-2xl border border-zinc-200/70 bg-white p-6 sm:p-8">
          <ContactForm defaultName={user?.fullName ?? ""} defaultEmail={user?.email ?? ""} />
        </div>
      </div>
    </main>
  );
}
