"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Menu, UserPlus, UserRound, X } from "lucide-react";
import { initials } from "../../lib/initials";
import { logOut } from "../auth/actions";
import { useAuthModal } from "./auth/AuthModal";
import Brand from "./Brand";

const NAV_LINKS = [
  { href: "/genstande", label: "Genstande" },
  { href: "/om-os", label: "Om os" },
  { href: "/business", label: "Business" },
];

const MOBILE_LINKS = [{ href: "/", label: "Forside" }, ...NAV_LINKS];

// Pages with a full-bleed hero get a transparent navbar until the user scrolls.
const HERO_ROUTES = ["/", "/om-os"];
const SCROLL_THRESHOLD = 24;

type NavUser = { fullName: string; email: string } | null;

export default function Navbar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const openAuth = useAuthModal();
  const hasHero = HERO_ROUTES.includes(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!hasHero) return;
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasHero]);

  // While the mobile menu is open: lock page scroll, close on Escape, and move focus into the menu
  // (and back to the burger button when it closes).
  useEffect(() => {
    if (!menuOpen) return;
    const menuButton = menuButtonRef.current;
    const onKeyDown = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      menuButton?.focus();
    };
  }, [menuOpen]);

  const solid = !hasHero || scrolled;

  return (
    <header
      className={`${hasHero ? "fixed" : "sticky"} inset-x-0 top-0 z-50 text-white`}
    >
      {/* Gradients can't be transitioned directly, so fade a background layer instead. */}
      <div
        aria-hidden
        className={`absolute inset-0 bg-brand-surface shadow-lg shadow-black/20 transition-opacity duration-300 ${
          solid ? "opacity-100" : "opacity-0"
        }`}
      />

      <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:py-4">
        <Brand />

        <ul className="hidden items-center gap-10 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`text-[17px] transition-colors hover:text-white ${
                  pathname.startsWith(link.href)
                    ? "text-white"
                    : "text-white/85"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 lg:flex">
          {user ? (
            <>
              <form action={logOut}>
                <button
                  type="submit"
                  className="text-[17px] text-white/70 transition-colors hover:text-white"
                >
                  Log ud
                </button>
              </form>
              <Link
                href="/profil"
                className="flex gap-2.5 rounded-lg bg-brand-gold py-1.5 pr-2 pl-1.5 text-[17px] font-medium text-brand-black transition-colors hover:bg-brand-gold/90"
              >
                <p className="flex justify-center items-center"> Min profil</p>
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="text-[17px] text-white/70 transition-colors hover:text-white"
              >
                Log ind
              </button>
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="rounded-lg bg-brand-gold px-5 py-2.5 text-[17px] font-medium text-brand-black transition-colors hover:bg-brand-gold/90"
              >
                Opret konto
              </button>
            </>
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          className="rounded-md p-2 text-white/90 hover:text-white lg:hidden"
          aria-label="Åbn menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <Menu size={26} />
        </button>
      </nav>

      {/* Mobile menu: slides in from the right. Stays mounted so it can animate out. */}
      <div className="lg:hidden">
        <div
          aria-hidden
          onClick={() => setMenuOpen(false)}
          className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!menuOpen}
          onClick={(e) =>
            (e.target as HTMLElement).closest("a") && setMenuOpen(false)
          }
          className={`fixed inset-y-0 right-0 flex w-80 max-w-[85%] flex-col bg-brand-surface shadow-2xl shadow-black/40 transition-transform duration-300 ease-out motion-reduce:transition-none ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 py-3 pr-3 pl-5">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-brand-gold">
              Menu
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-md p-2 text-white/90 hover:text-white"
              aria-label="Luk menu"
            >
              <X size={22} />
            </button>
          </div>

          <ul className="flex flex-col gap-1 p-2">
            {MOBILE_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-md px-3 py-3 font-serif text-lg transition-colors ${
                      active
                        ? "bg-white/10 font-semibold text-brand-gold"
                        : "text-white/90 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto flex flex-col gap-3 border-t border-white/10 p-5">
            {user ? (
              <>
                <Link
                  href="/profil"
                  className="flex items-center justify-center gap-2 rounded-md border border-brand-gold/60 px-4 py-2.5 text-brand-gold transition-colors hover:border-brand-gold hover:bg-brand-gold/10"
                >
                  <UserRound size={18} aria-hidden />
                  Min profil
                </Link>
                <form action={logOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-white/25 px-4 py-2.5 text-white/90 transition-colors hover:border-white/50 hover:text-white"
                  >
                    <LogOut size={18} aria-hidden />
                    Log ud
                  </button>
                </form>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openAuth("login");
                  }}
                  className="flex items-center justify-center gap-2 rounded-md border border-white/25 px-4 py-2.5 text-white/90 transition-colors hover:border-white/50 hover:text-white"
                >
                  <LogIn size={18} aria-hidden />
                  Log ind
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openAuth("signup");
                  }}
                  className="flex items-center justify-center gap-2 rounded-md border border-brand-gold/60 px-4 py-2.5 text-brand-gold transition-colors hover:border-brand-gold hover:bg-brand-gold/10"
                >
                  <UserPlus size={18} aria-hidden />
                  Opret konto
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
