"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/browser";

/**
 * Keeps the shared household session alive while the app is open.
 * Mounts the browser Auth client so access tokens refresh ahead of expiry.
 * Clears stale refresh tokens (e.g. after a local DB reset) so sign-in works.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getSession().then(({ error }) => {
      if (error) {
        void supabase.auth.signOut({ scope: "local" });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        return;
      }
      // No-op for other events; subscription keeps auto-refresh running.
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
