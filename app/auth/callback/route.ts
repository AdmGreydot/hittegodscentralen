import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";

// Links in Supabase's auth e-mails (confirm sign-up, reset password) land here with a one-time
// code. Swap it for a session, then continue to `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  // Only same-site paths, so the link can't be used to send people elsewhere.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("auth callback failed", error);
  }

  // Expired or already used link. The reset page explains and offers a new link.
  return NextResponse.redirect(new URL("/nulstil-adgangskode?fejl=1", origin));
}
