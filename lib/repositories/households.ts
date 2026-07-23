import "server-only";

import { cache } from "react";

import {
  householdMembershipSchema,
  type HouseholdMembership,
} from "@/lib/domain/household";
import { createClient } from "@/lib/supabase/server";

/**
 * Household membership repository.
 *
 * Uses the cookie-backed SSR client so Row Level Security remains enforced.
 * Do not switch this module to the admin/secret client.
 *
 * Wrapped in React `cache()` so layout + every repository call in one request
 * share a single claims + membership lookup (no stale cross-request cache).
 */
export const getCurrentMembership = cache(
  async (): Promise<HouseholdMembership | null> => {
    const supabase = await createClient();

    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims?.sub) {
      return null;
    }

    const userId = String(claimsData.claims.sub);

    const { data: member, error: memberError } = await supabase
      .from("household_members")
      .select("id, user_id, display_name, role, household_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) {
      throw new Error("Unable to load household membership.");
    }

    if (!member) {
      return null;
    }

    const { data: household, error: householdError } = await supabase
      .from("households")
      .select("id, name")
      .eq("id", member.household_id)
      .maybeSingle();

    if (householdError) {
      throw new Error("Unable to load household.");
    }

    if (!household) {
      return null;
    }

    return householdMembershipSchema.parse({
      memberId: member.id,
      userId: member.user_id,
      displayName: member.display_name,
      role: member.role,
      household: {
        id: household.id,
        name: household.name,
      },
    });
  },
);

export async function requireCurrentMembership(): Promise<HouseholdMembership> {
  const membership = await getCurrentMembership();
  if (!membership) {
    throw new Error("Household membership is required.");
  }
  return membership;
}

/**
 * Count of members in the caller's household (RLS-scoped). Used by the
 * Dashboard household card — not a management surface.
 */
export async function countHouseholdMembers(): Promise<number> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("household_members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", membership.household.id);

  if (error) {
    throw new Error("Unable to load household members.");
  }

  return count ?? 0;
}
