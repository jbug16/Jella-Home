/**
 * Ensure the shared household login exists (create or update password) and is
 * linked to a household. Safe to re-run. Never logs email or password.
 *
 * Reads from `.env.local`:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *   PROVISION_MEMBER_1_EMAIL / PASSWORD / DISPLAY_NAME
 *   PROVISION_HOUSEHOLD_NAME (used only when creating a new household)
 *   PROVISION_HOUSEHOLD_ID (optional; attach to this household if set)
 */

import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../lib/supabase/database.types";
import { loadEnvLocal } from "./lib/load-env-local";

loadEnvLocal();

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PROVISION_MEMBER_1_EMAIL: z.string().trim().min(3).includes("@"),
  PROVISION_MEMBER_1_PASSWORD: z.string().min(8),
  PROVISION_MEMBER_1_DISPLAY_NAME: z.string().min(1),
  PROVISION_HOUSEHOLD_NAME: z.string().min(1).default("Jella Home"),
  PROVISION_HOUSEHOLD_ID: z.uuid().optional(),
});

async function findUserByEmail(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<User | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === normalized,
    );
    if (match) {
      return match;
    }
    if (data.users.length < perPage) {
      return null;
    }
    page += 1;
  }
}

async function main() {
  const env = schema.parse(process.env);
  const admin = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  let user = await findUserByEmail(admin, env.PROVISION_MEMBER_1_EMAIL);
  let createdUser = false;

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: env.PROVISION_MEMBER_1_EMAIL,
      password: env.PROVISION_MEMBER_1_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(
        `Failed to create shared login: ${error?.message ?? "unknown"}`,
      );
    }
    user = data.user;
    createdUser = true;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: env.PROVISION_MEMBER_1_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      throw new Error(
        `Failed to update shared login password: ${error.message}`,
      );
    }
  }

  const { data: existingMembership, error: membershipLookupError } = await admin
    .from("household_members")
    .select("household_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipLookupError) {
    throw new Error(
      `Failed to load membership: ${membershipLookupError.message}`,
    );
  }

  let householdId = existingMembership?.household_id ?? null;

  if (!householdId && env.PROVISION_HOUSEHOLD_ID) {
    householdId = env.PROVISION_HOUSEHOLD_ID;
    const { error } = await admin.from("household_members").insert({
      household_id: householdId,
      user_id: user.id,
      display_name: env.PROVISION_MEMBER_1_DISPLAY_NAME,
      role: "owner",
    });
    if (error) {
      throw new Error(`Failed to link shared login: ${error.message}`);
    }
  }

  if (!householdId) {
    const { data: household, error: householdError } = await admin
      .from("households")
      .insert({ name: env.PROVISION_HOUSEHOLD_NAME })
      .select("id")
      .single();
    if (householdError || !household) {
      throw new Error(
        `Failed to create household: ${householdError?.message ?? "unknown"}`,
      );
    }
    householdId = household.id;
    const { error } = await admin.from("household_members").insert({
      household_id: householdId,
      user_id: user.id,
      display_name: env.PROVISION_MEMBER_1_DISPLAY_NAME,
      role: "owner",
    });
    if (error) {
      throw new Error(`Failed to link shared login: ${error.message}`);
    }
  } else if (existingMembership) {
    const { error } = await admin
      .from("household_members")
      .update({ display_name: env.PROVISION_MEMBER_1_DISPLAY_NAME })
      .eq("user_id", user.id);
    if (error) {
      throw new Error(`Failed to update display name: ${error.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        createdUser,
        householdId,
        userId: user.id,
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
