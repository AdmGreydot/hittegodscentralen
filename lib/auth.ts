import { createClient } from "./supabase/server";

// The logged-in user's id, or null. getClaims() verifies the session token, unlike getSession().
export async function getCurrentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}
