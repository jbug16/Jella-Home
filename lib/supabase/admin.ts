import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Secret-key Supabase client. Bypasses RLS.
 *
 * Allowed only in explicit server-only provisioning or administrative code
 * (e.g. scripts/provision-household.ts). Never import from repositories or UI.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = getEnv();

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
