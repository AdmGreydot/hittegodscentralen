import type { ReactNode } from "react";

export type LegalSection = { id: string; title: string; body: ReactNode };

// Shared layout for vilkår, privatlivspolitik and cookiepolitik: title, table of contents and
// numbered sections. Links, lists, subheadings and tables inside `body` are styled here.
export default function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="flex-1 bg-zinc-100 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-rust">
          Senest opdateret {updated}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-brand-brown sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-relaxed font-light text-zinc-600">{intro}</p>

        <nav aria-label="Indhold" className="mt-8 rounded-2xl border border-zinc-200/70 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-zinc-500">Indhold</h2>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {sections.map((section, i) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-brand-brown hover:underline">
                  {i + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-6 space-y-6">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-2xl border border-zinc-200/70 bg-white p-6 sm:p-8"
            >
              <h2 className="font-serif text-2xl font-bold text-brand-black">
                {i + 1}. {section.title}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-zinc-600 [&_a]:font-medium [&_a]:text-brand-rust [&_a]:underline [&_a]:underline-offset-4 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-brand-black [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-zinc-200 [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-brand-black [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
