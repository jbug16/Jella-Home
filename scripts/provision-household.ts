/**
 * Server-only household provisioning (CLI).
 *
 * Creates one household and one shared Auth login by default (recommended).
 * Optionally creates a second member when MEMBER_2_* vars are set (local /
 * verification only). Uses SUPABASE_SECRET_KEY (bypasses RLS). Never commit
 * real emails or passwords.
 *
 * Usage:
 *   npx tsx scripts/provision-household.ts
 *
 * Reads unset vars from `.env.local` when present. Required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   PROVISION_HOUSEHOLD_NAME
 *   PROVISION_MEMBER_1_EMAIL / PASSWORD / DISPLAY_NAME
 *
 * Optional second member:
 *   PROVISION_MEMBER_2_EMAIL / PASSWORD / DISPLAY_NAME
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../lib/supabase/database.types";
import { loadEnvLocal } from "./lib/load-env-local";

loadEnvLocal();

const provisionEnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
    PROVISION_HOUSEHOLD_NAME: z.string().min(1),
    PROVISION_MEMBER_1_EMAIL: z.string().trim().min(3).includes("@"),
    PROVISION_MEMBER_1_PASSWORD: z.string().min(8),
    PROVISION_MEMBER_1_DISPLAY_NAME: z.string().min(1),
    PROVISION_MEMBER_2_EMAIL: z.string().trim().min(3).includes("@").optional(),
    PROVISION_MEMBER_2_PASSWORD: z.string().min(8).optional(),
    PROVISION_MEMBER_2_DISPLAY_NAME: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    const member2Fields = [
      env.PROVISION_MEMBER_2_EMAIL,
      env.PROVISION_MEMBER_2_PASSWORD,
      env.PROVISION_MEMBER_2_DISPLAY_NAME,
    ];
    const provided = member2Fields.filter((value) => value !== undefined);
    if (provided.length > 0 && provided.length < 3) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide all of PROVISION_MEMBER_2_EMAIL, PASSWORD, and DISPLAY_NAME, or none.",
      });
    }
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
  const hasSecondMember =
    Boolean(env.PROVISION_MEMBER_2_EMAIL) &&
    Boolean(env.PROVISION_MEMBER_2_PASSWORD) &&
    Boolean(env.PROVISION_MEMBER_2_DISPLAY_NAME);

  if (
    hasSecondMember &&
    env.PROVISION_MEMBER_1_EMAIL.toLowerCase() ===
      env.PROVISION_MEMBER_2_EMAIL!.toLowerCase()
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
  const memberUserIds = [user1Id];

  if (hasSecondMember) {
    memberUserIds.push(
      await createAuthUser(
        admin,
        env.PROVISION_MEMBER_2_EMAIL!,
        env.PROVISION_MEMBER_2_PASSWORD!,
      ),
    );
  }

  const { data: household, error: householdError } = await admin
    .from("households")
    .insert({ name: env.PROVISION_HOUSEHOLD_NAME })
    .select("id, name")
    .single();

  if (householdError || !household) {
    throw new Error(`Failed to create household: ${householdError?.message}`);
  }

  const members: Database["public"]["Tables"]["household_members"]["Insert"][] =
    [
      {
        household_id: household.id,
        user_id: user1Id,
        display_name: env.PROVISION_MEMBER_1_DISPLAY_NAME,
        role: "owner",
      },
    ];

  if (hasSecondMember) {
    members.push({
      household_id: household.id,
      user_id: memberUserIds[1]!,
      display_name: env.PROVISION_MEMBER_2_DISPLAY_NAME!,
      role: "member",
    });
  }

  const { error: membersError } = await admin
    .from("household_members")
    .insert(members);

  if (membersError) {
    throw new Error(`Failed to create members: ${membersError.message}`);
  }

  // Intentional: only IDs/names — never emails or passwords.
  console.log(
    JSON.stringify(
      {
        householdId: household.id,
        householdName: household.name,
        memberCount: members.length,
        memberUserIds,
        sharedLogin: !hasSecondMember,
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
