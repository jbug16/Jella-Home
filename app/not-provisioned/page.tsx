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
          You are signed in, but this account is not linked to the household
          yet. Ask Jenna to finish provisioning, then sign in again.
        </p>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
