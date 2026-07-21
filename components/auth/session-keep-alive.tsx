"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/browser";

/**
 * Keeps the shared household session alive while the app is open.
 * Mounts the browser Auth client so access tokens refresh ahead of expiry.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Subscription alone starts the client's auto-refresh timer.
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
