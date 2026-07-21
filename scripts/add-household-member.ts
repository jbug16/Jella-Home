/**
 * Server-only: add one Auth user to an existing household.
 *
 * Usage:
 *   npx tsx scripts/add-household-member.ts
 *
 * Required env (also reads `.env.local` when unset):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   PROVISION_HOUSEHOLD_ID
 *   PROVISION_MEMBER_EMAIL
 *   PROVISION_MEMBER_PASSWORD
 *   PROVISION_MEMBER_DISPLAY_NAME
 *   PROVISION_MEMBER_ROLE   (optional: owner | member; default member)
 */

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../lib/supabase/database.types";
import { loadEnvLocal } from "./lib/load-env-local";

loadEnvLocal();

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PROVISION_HOUSEHOLD_ID: z.uuid(),
  PROVISION_MEMBER_EMAIL: z.string().trim().min(3).includes("@"),
  PROVISION_MEMBER_PASSWORD: z.string().min(8),
  PROVISION_MEMBER_DISPLAY_NAME: z.string().min(1),
  PROVISION_MEMBER_ROLE: z.enum(["owner", "member"]).default("member"),
});

async function main() {
  const env = schema.parse(process.env);

  const admin = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const { data: household, error: householdError } = await admin
    .from("households")
    .select("id, name")
    .eq("id", env.PROVISION_HOUSEHOLD_ID)
    .maybeSingle();

  if (householdError) {
    throw new Error(`Failed to load household: ${householdError.message}`);
  }
  if (!household) {
    throw new Error("Household not found for PROVISION_HOUSEHOLD_ID.");
  }

  const { data: userData, error: userError } =
    await admin.auth.admin.createUser({
      email: env.PROVISION_MEMBER_EMAIL,
      password: env.PROVISION_MEMBER_PASSWORD,
      email_confirm: true,
    });

  if (userError || !userData.user) {
    throw new Error(
      `Failed to create auth user: ${userError?.message ?? "unknown"}`,
    );
  }

  const { error: memberError } = await admin.from("household_members").insert({
    household_id: household.id,
    user_id: userData.user.id,
    display_name: env.PROVISION_MEMBER_DISPLAY_NAME,
    role: env.PROVISION_MEMBER_ROLE,
  });

  if (memberError) {
    throw new Error(`Failed to link member: ${memberError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        householdId: household.id,
        householdName: household.name,
        memberUserId: userData.user.id,
        role: env.PROVISION_MEMBER_ROLE,
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
