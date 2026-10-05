"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { MailCheck, X } from "lucide-react";
import { logIn, requestPasswordReset, signUp } from "../../auth/actions";
import { PASSWORD_HINT, type AuthResult } from "../../auth/validation";
import { AuthInput, FormMessage, SubmitButton } from "./fields";

export type AuthView = "login" | "signup" | "forgot";

const AuthModalContext = createContext<(view: AuthView) => void>(() => {});

// Opens the log in / sign up popup from anywhere: `const openAuth = useAuthModal(); openAuth("login")`.
export function useAuthModal() {
  return useContext(AuthModalContext);
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<AuthView | null>(null);
  // Bumped on every open so the forms start empty each time.
  const [session, setSession] = useState(0);

  const open = useCallback((next: AuthView) => {
    setView(next);
    setSession((s) => s + 1);
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !view || dialog.open) return;
    dialog.showModal();
    document.documentElement.style.overflow = "hidden";
  }, [view, session]);

  return (
    <AuthModalContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="auth-title"
        onClose={() => {
          setView(null);
          document.documentElement.style.overflow = "";
        }}
        // A click on the dialog element itself is a click on the backdrop around the card.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
      >
        {view && (
          <div key={session} className="relative px-6 pt-10 pb-8 sm:px-10">
            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-4 grid size-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-brand-black"
              aria-label="Luk"
            >
              <X size={20} aria-hidden />
            </button>

            {view === "login" && (
              <LoginForm onDone={close} onSwitch={setView} />
            )}
            {view === "signup" && (
              <SignupForm onDone={close} onSwitch={setView} />
            )}
            {view === "forgot" && <ForgotForm onSwitch={setView} />}
          </div>
        )}
      </dialog>
    </AuthModalContext.Provider>
  );
}

// Submits the form to a server action without React resetting the fields afterwards,
// so the user keeps what they typed when there's an error.
function useAuthAction(action: (form: FormData) => Promise<AuthResult>) {
  const [result, setResult] = useState<AuthResult>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => setResult(await action(form)));
  }

  return { result, pending, onSubmit };
}

function Title({ children }: { children: ReactNode }) {
  return (
    <h2
      id="auth-title"
      className="mt-2 mb-6 text-center font-serif text-3xl font-bold text-brand-black"
    >
      {children}
    </h2>
  );
}

function SwitchLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-medium text-brand-rust underline-offset-4 hover:underline"
    >
      {children}
    </button>
  );
}

function LoginForm({
  onDone,
  onSwitch,
}: {
  onDone: () => void;
  onSwitch: (v: AuthView) => void;
}) {
  const { result, pending, onSubmit } = useAuthAction(logIn);

  useEffect(() => {
    if (result.ok) onDone();
  }, [result, onDone]);

  return (
    <>
      <Title>Log ind</Title>
      <form onSubmit={onSubmit} className="space-y-5">
        <FormMessage text={result.message} />
        <AuthInput
          label="E-mailadresse"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="din@mail.dk"
          autoFocus
        />
        <div>
          <AuthInput
            label="Adgangskode"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
          <div className="mt-2 text-right text-sm">
            <SwitchLink onClick={() => onSwitch("forgot")}>
              Glemt adgangskode?
            </SwitchLink>
          </div>
        </div>
        <SubmitButton pending={pending}>Log ind</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Har du ikke en konto?{" "}
        <SwitchLink onClick={() => onSwitch("signup")}>Opret konto</SwitchLink>
      </p>
    </>
  );
}

function SignupForm({
  onDone,
  onSwitch,
}: {
  onDone: () => void;
  onSwitch: (v: AuthView) => void;
}) {
  const { result, pending, onSubmit } = useAuthAction(signUp);
  const errors = result.errors ?? {};

  useEffect(() => {
    if (result.ok && !result.checkEmail) onDone();
  }, [result, onDone]);

  if (result.checkEmail) {
    return (
      <CheckEmail title="Tjek din indbakke">
        Vi har sendt dig en mail med et link. Klik på det for at bekræfte din
        e-mail, så er din konto klar.
      </CheckEmail>
    );
  }

  return (
    <>
      <Title>Opret konto</Title>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormMessage text={result.message} />
        <AuthInput
          label="Fulde navn"
          name="fullName"
          autoComplete="name"
          placeholder="Hans Hansen"
          error={errors.fullName}
          autoFocus
        />
        <AuthInput
          label="E-mailadresse"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="din@mail.dk"
          error={errors.email}
        />
        <AuthInput
          label="Gentag e-mailadresse"
          name="emailRepeat"
          type="email"
          autoComplete="email"
          placeholder="din@mail.dk"
          hint="En tastefejl her betyder, at hverken bekræftelse eller nulstillingslink kan nå frem."
          error={errors.emailRepeat}
        />
        <AuthInput
          label="Adgangskode"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={errors.password}
        />
        <AuthInput
          label="Gentag adgangskode"
          name="passwordRepeat"
          type="password"
          autoComplete="new-password"
          error={errors.passwordRepeat}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-600">
            <input
              type="checkbox"
              name="terms"
              aria-invalid={Boolean(errors.terms)}
              className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-brand-rust"
            />
            <span>
              Jeg accepterer{" "}
              <Link
                href="/vilkaar-og-betingelser"
                target="_blank"
                className="font-medium text-brand-rust underline underline-offset-4"
              >
                vilkår og betingelser
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="mt-1.5 text-sm text-brand-rust">{errors.terms}</p>
          )}
        </div>

        <SubmitButton pending={pending}>Opret konto</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Har du allerede en konto?{" "}
        <SwitchLink onClick={() => onSwitch("login")}>Log ind</SwitchLink>
      </p>
    </>
  );
}

function ForgotForm({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const { result, pending, onSubmit } = useAuthAction(requestPasswordReset);

  if (result.checkEmail) {
    return (
      <CheckEmail title="Tjek din indbakke">
        Hvis der findes en konto med den e-mail, har vi sendt et link til at
        vælge en ny adgangskode. Linket virker i en time.
        <span className="mt-6 block">
          <SwitchLink onClick={() => onSwitch("login")}>
            Tilbage til log ind
          </SwitchLink>
        </span>
      </CheckEmail>
    );
  }

  return (
    <>
      <Title>Glemt adgangskode</Title>
      <p className="-mt-2 mb-6 text-center font-light text-zinc-500">
        Skriv den mail, du oprettede kontoen med, så sender vi et link til at
        vælge en ny adgangskode.
      </p>
      <form onSubmit={onSubmit} className="space-y-5">
        <FormMessage text={result.message} />
        <AuthInput
          label="Din e-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="din@mail.dk"
          error={result.errors?.email}
          autoFocus
        />
        <SubmitButton pending={pending}>Send mig et link</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Kom du i tanke om den?{" "}
        <SwitchLink onClick={() => onSwitch("login")}>Log ind</SwitchLink>
      </p>
    </>
  );
}

function CheckEmail({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-8 text-center" role="status">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-green/15 text-brand-green">
        <MailCheck size={26} aria-hidden />
      </span>
      <h2
        id="auth-title"
        className="mt-5 font-serif text-2xl font-bold text-brand-black"
      >
        {title}
      </h2>
      <p className="mt-2 font-light text-zinc-500">{children}</p>
    </div>
  );
}
