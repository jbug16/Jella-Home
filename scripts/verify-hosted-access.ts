/**
 * Hosted access checks (server-only / CLI).
 *
 * Verifies:
 * - member 1 can read/write household-scoped data
 * - member 2 can read/write the same household (equal permissions)
 * - a non-member Auth user cannot read household data
 *
 * Required env (also reads `.env.local` when unset):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SECRET_KEY
 *   VERIFY_MEMBER_1_EMAIL / VERIFY_MEMBER_1_PASSWORD
 *   VERIFY_MEMBER_2_EMAIL / VERIFY_MEMBER_2_PASSWORD
 *   VERIFY_NON_MEMBER_EMAIL / VERIFY_NON_MEMBER_PASSWORD
 *
 * Creates a temporary budget category as each member, then deletes it.
 * Does not print emails, passwords, or keys.
 */

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../lib/supabase/database.types";
import { loadEnvLocal } from "./lib/load-env-local";

loadEnvLocal();

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  VERIFY_MEMBER_1_EMAIL: z.email(),
  VERIFY_MEMBER_1_PASSWORD: z.string().min(1),
  VERIFY_MEMBER_2_EMAIL: z.email(),
  VERIFY_MEMBER_2_PASSWORD: z.string().min(1),
  VERIFY_NON_MEMBER_EMAIL: z.email(),
  VERIFY_NON_MEMBER_PASSWORD: z.string().min(1),
});

function userClient(url: string, publishableKey: string) {
  return createClient<Database>(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function asMember(
  url: string,
  publishableKey: string,
  email: string,
  password: string,
  label: string,
) {
  const client = userClient(url, publishableKey);
  const { data: auth, error: authError } = await client.auth.signInWithPassword(
    {
      email,
      password,
    },
  );
  if (authError || !auth.user) {
    throw new Error(`${label}: sign-in failed`);
  }

  const { data: membership, error: memberError } = await client
    .from("household_members")
    .select("household_id, display_name, role")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (memberError || !membership) {
    throw new Error(`${label}: membership missing`);
  }

  const marker = `verify-${label}-${Date.now()}`;
  const { data: inserted, error: insertError } = await client
    .from("budget_categories")
    .insert({
      household_id: membership.household_id,
      name: marker,
      kind: "expense",
    })
    .select("id, household_id")
    .single();

  if (insertError || !inserted) {
    throw new Error(`${label}: insert denied or failed`);
  }

  const { error: deleteError } = await client
    .from("budget_categories")
    .delete()
    .eq("id", inserted.id);

  if (deleteError) {
    throw new Error(`${label}: delete failed`);
  }

  await client.auth.signOut();

  return {
    label,
    householdId: membership.household_id,
    role: membership.role,
    readWrite: true as const,
  };
}

async function asNonMember(
  url: string,
  publishableKey: string,
  secretKey: string,
  email: string,
  password: string,
) {
  const admin = createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure the non-member Auth user exists (no household_members row).
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!existing) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      throw new Error(
        `non-member: failed to create Auth user (${error.message})`,
      );
    }
  }

  const client = userClient(url, publishableKey);
  const { error: authError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (authError) {
    throw new Error("non-member: sign-in failed");
  }

  const { data: households, error: householdError } = await client
    .from("households")
    .select("id");

  if (householdError) {
    throw new Error("non-member: unexpected error reading households");
  }

  const { data: categories, error: categoryError } = await client
    .from("budget_categories")
    .select("id");

  if (categoryError) {
    throw new Error("non-member: unexpected error reading categories");
  }

  await client.auth.signOut();

  return {
    householdsVisible: households?.length ?? 0,
    categoriesVisible: categories?.length ?? 0,
  };
}

async function main() {
  const env = schema.parse(process.env);

  const member1 = await asMember(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.VERIFY_MEMBER_1_EMAIL,
    env.VERIFY_MEMBER_1_PASSWORD,
    "member1",
  );
  const member2 = await asMember(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.VERIFY_MEMBER_2_EMAIL,
    env.VERIFY_MEMBER_2_PASSWORD,
    "member2",
  );

  if (member1.householdId !== member2.householdId) {
    throw new Error("members are not in the same household");
  }

  const nonMember = await asNonMember(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_SECRET_KEY,
    env.VERIFY_NON_MEMBER_EMAIL,
    env.VERIFY_NON_MEMBER_PASSWORD,
  );

  if (nonMember.householdsVisible !== 0 || nonMember.categoriesVisible !== 0) {
    throw new Error("non-member could see household data");
  }

  console.log(
    JSON.stringify(
      {
        sameHousehold: true,
        equalReadWrite: true,
        nonMemberDenied: true,
        memberRoles: [member1.role, member2.role],
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exit(1);
});
