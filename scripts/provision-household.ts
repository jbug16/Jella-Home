/**
 * Server-only household provisioning (CLI).
 *
 * Creates one household and two Auth users (email/password), then links them
 * as members. Uses SUPABASE_SECRET_KEY (bypasses RLS). Never commit real
 * emails or passwords.
 *
 * Usage:
 *   npx tsx scripts/provision-household.ts
 *
 * Reads unset vars from `.env.local` when present. Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   PROVISION_HOUSEHOLD_NAME
 *   PROVISION_MEMBER_1_EMAIL / PASSWORD / DISPLAY_NAME
 *   PROVISION_MEMBER_2_EMAIL / PASSWORD / DISPLAY_NAME
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../lib/supabase/database.types";
import { loadEnvLocal } from "./lib/load-env-local";

loadEnvLocal();

const provisionEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PROVISION_HOUSEHOLD_NAME: z.string().min(1),
  PROVISION_MEMBER_1_EMAIL: z.email(),
  PROVISION_MEMBER_1_PASSWORD: z.string().min(8),
  PROVISION_MEMBER_1_DISPLAY_NAME: z.string().min(1),
  PROVISION_MEMBER_2_EMAIL: z.email(),
  PROVISION_MEMBER_2_PASSWORD: z.string().min(8),
  PROVISION_MEMBER_2_DISPLAY_NAME: z.string().min(1),
});

async function createAuthUser(
  admin: SupabaseClient<Database>,
  email: string,
  password: string,
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(
      `Failed to create auth user for ${email}: ${error?.message}`,
    );
  }

  return data.user.id;
}

async function main() {
  const env = provisionEnvSchema.parse(process.env);

  if (
    env.PROVISION_MEMBER_1_EMAIL.toLowerCase() ===
    env.PROVISION_MEMBER_2_EMAIL.toLowerCase()
  ) {
    throw new Error("Member emails must be distinct.");
  }

  const admin = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const user1Id = await createAuthUser(
    admin,
    env.PROVISION_MEMBER_1_EMAIL,
    env.PROVISION_MEMBER_1_PASSWORD,
  );
  const user2Id = await createAuthUser(
    admin,
    env.PROVISION_MEMBER_2_EMAIL,
    env.PROVISION_MEMBER_2_PASSWORD,
  );

  const { data: household, error: householdError } = await admin
    .from("households")
    .insert({ name: env.PROVISION_HOUSEHOLD_NAME })
    .select("id, name")
    .single();

  if (householdError || !household) {
    throw new Error(`Failed to create household: ${householdError?.message}`);
  }

  const { error: membersError } = await admin.from("household_members").insert([
    {
      household_id: household.id,
      user_id: user1Id,
      display_name: env.PROVISION_MEMBER_1_DISPLAY_NAME,
      role: "owner",
    },
    {
      household_id: household.id,
      user_id: user2Id,
      display_name: env.PROVISION_MEMBER_2_DISPLAY_NAME,
      role: "member",
    },
  ]);

  if (membersError) {
    throw new Error(`Failed to create members: ${membersError.message}`);
  }

  // Intentional: only IDs/names — never emails or passwords.
  console.log(
    JSON.stringify(
      {
        householdId: household.id,
        householdName: household.name,
        memberCount: 2,
        memberUserIds: [user1Id, user2Id],
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
