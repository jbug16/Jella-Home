import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : undefined;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Jella Home</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with your household account.
        </p>
        <div className="mt-8">
          <SignInForm nextPath={nextPath} />
        </div>
      </div>
    </div>
  );
}
