import type { EmailOtpType } from "@supabase/supabase-js";
import { after, NextResponse, type NextRequest } from "next/server";
import { welcomeMail } from "../../../lib/emails";
import { sendMail } from "../../../lib/mail";
import { createClient } from "../../../lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "recovery", "email"];

// Links in our own auth e-mails (confirm sign-up, reset password; see app/auth/actions.ts) land
// here with a one-time token. Verifying it logs the user in; then continue to `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/";
  // Only same-site paths, so the link can't be used to send people elsewhere.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // The e-mail is confirmed, so the account is real: say welcome.
      const user = data.user;
      if (type !== "recovery" && user?.email) {
        const fullName = user.user_metadata?.full_name;
        const email = user.email;
        after(() => sendMail({ to: email, ...welcomeMail(typeof fullName === "string" ? fullName : "") }));
      }
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("auth confirm failed", error);
  }

  // Expired or already used link. The reset page explains and offers a new link; for a sign-up
  // link the profile page lets them log in (or sign up again to get a new link).
  const failed = type === "recovery" ? "/nulstil-adgangskode?fejl=1" : "/profil";
  return NextResponse.redirect(new URL(failed, origin));
}
