"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  // Allow private / non-public domains (e.g. household@example.home).
  email: z
    .string()
    .trim()
    .min(3, "Enter a valid email address.")
    .includes("@", { message: "Enter a valid email address." }),
  password: z.string().min(1, "Password is required."),
  next: z.string().optional(),
});

export type SignInState = {
  error: string | null;
};

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to sign in.",
    };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      error: "Sign-in is unavailable. Check that Supabase is configured.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  const nextPath =
    parsed.data.next && parsed.data.next.startsWith("/")
      ? parsed.data.next
      : "/dashboard";

  redirect(nextPath);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
