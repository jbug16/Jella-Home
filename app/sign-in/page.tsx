import type { Metadata } from "next";

import { SessionKeepAlive } from "@/components/auth/session-keep-alive";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const metadata: Metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath =
    params.next !== undefined
      ? safeNextPath(params.next, "") || undefined
      : undefined;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <SessionKeepAlive />
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Jella&apos;s Home</h1>
        <div className="mt-8">
          <SignInForm nextPath={nextPath} />
        </div>
      </div>
    </div>
  );
}
