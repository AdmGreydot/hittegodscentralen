import Link from "next/link";
import Brand from "./Brand";

const LINKS = [
  { href: "https://greydot.dk", label: "Greydot.dk" },
  { href: "https://ejendelsregisteret.dk", label: "Ejendelsregisteret.dk" },
  { href: "https://hittegodscentralen.dk", label: "Hittegodscentralen.dk" },
];

const CONTACT = [
  { href: "/kontakt", label: "Skriv til os" },
  { href: null, label: "J Skjoldborgs Vej 57, 8230 Åbyhøj" },
  { href: "tel:+4522984222", label: "+45 22 98 42 22" },
  {
    href: "mailto:info@hittegodscentralen.dk",
    label: "info@hittegodscentralen.dk",
  },
];

const LEGAL = [
  { href: "/cookiepolitik", label: "Cookiepolitik" },
  { href: "/vilkaar-og-betingelser", label: "Vilkår & betingelser" },
  { href: "/privatlivspolitik", label: "Privatlivspolitik" },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-brand-surface text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 py-14 md:grid-cols-3 md:gap-8 lg:py-16">
          <div>
            <Brand compact />
            <p className="mt-5 max-w-sm leading-relaxed font-light text-white/60">
              Danmarks platform for tabte og fundne genstande.
            </p>
          </div>

          <FooterColumn title="Links">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Kontakt">
            {CONTACT.map((item) => (
              <li key={item.label} className="text-white/80">
                {item.href ? (
                  <a
                    href={item.href}
                    className="transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                ) : (
                  item.label
                )}
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-8 text-sm text-white/40 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
            {LEGAL.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-white/80"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p>
            © {new Date().getFullYear()} Hittegodscentralen. Alle rettigheder
            forbeholdes.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium uppercase tracking-[0.15em] text-white/40">
        {title}
      </h2>
      <ul className="mt-5 space-y-2.5 text-[17px]">{children}</ul>
    </div>
  );
}
