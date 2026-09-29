import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase client with the secret key. It BYPASSES Row Level Security, so only use it on the
// server, after validating input yourself. The "server-only" import makes the build fail if this
// file is ever pulled into client code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
