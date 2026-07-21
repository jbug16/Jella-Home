"use client";

import { useTransition } from "react";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

/**
 * Escape hatch only — the app shell has no sign-out. Used when the wrong
 * credentials leave someone on /not-provisioned.
 */
export function SignOutButton({
  label = "Try a different login",
}: {
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="min-h-11"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void signOut();
        });
      }}
    >
      {pending ? "Switching…" : label}
    </Button>
  );
}
