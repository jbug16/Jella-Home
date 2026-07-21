import type { Metadata } from "next";

import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = {
  title: "Account not ready",
};

export default function NotProvisionedPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          Account not ready
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This login is not linked to the household yet. Use the shared
          household email and password, or ask Jenna to finish provisioning.
        </p>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
