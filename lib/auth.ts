import { cache } from "react";
import { createClient } from "./supabase/server";

export type CurrentUser = { id: string; email: string; fullName: string };

// The logged-in user from the session token, or null. getClaims() verifies the token, unlike
// getSession(). Wrapped in cache() so the layout and the page share one check per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const fullName = claims.user_metadata?.full_name;
  return {
    id: claims.sub,
    email: claims.email ?? "",
    fullName: typeof fullName === "string" ? fullName : "",
  };
});

// The logged-in user's id, or null.
export async function getCurrentUserId() {
  return (await getCurrentUser())?.id ?? null;
}

