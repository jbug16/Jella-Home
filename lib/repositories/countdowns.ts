import "server-only";

import {
  createCountdownInputSchema,
  deleteCountdownInputSchema,
  mapCountdown,
  updateCountdownInputSchema,
  type Countdown,
  type CountdownRow,
  type CreateCountdownInput,
  type DeleteCountdownInput,
  type UpdateCountdownInput,
} from "@/lib/domain/countdown";
import { ConcurrencyConflictError } from "@/lib/domain/concurrency";
import { requireCurrentMembership } from "@/lib/repositories/households";
import { createClient } from "@/lib/supabase/server";

const COUNTDOWN_SELECT =
  "id, household_id, title, target_on, color, created_at, updated_at";

function mapRow(row: CountdownRow): Countdown {
  return mapCountdown(row);
}

export async function listCountdowns(): Promise<Countdown[]> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countdowns")
    .select(COUNTDOWN_SELECT)
    .eq("household_id", membership.household.id)
    .order("target_on")
    .order("title");

  if (error) {
    throw new Error("Unable to load countdowns.");
  }

  return (data ?? []).map((row) => mapRow(row as CountdownRow));
}

export async function createCountdown(
  input: CreateCountdownInput,
): Promise<Countdown> {
  const membership = await requireCurrentMembership();
  const parsed = createCountdownInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countdowns")
    .insert({
      household_id: membership.household.id,
      title: parsed.title,
      target_on: parsed.targetOn,
      color: parsed.color,
    })
    .select(COUNTDOWN_SELECT)
    .single();

  if (error || !data) {
    throw new Error("Unable to add that countdown.");
  }

  return mapRow(data as CountdownRow);
}

export async function updateCountdown(
  input: UpdateCountdownInput,
): Promise<Countdown> {
  const membership = await requireCurrentMembership();
  const parsed = updateCountdownInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countdowns")
    .update({
      title: parsed.title,
      target_on: parsed.targetOn,
      color: parsed.color,
    })
    .eq("household_id", membership.household.id)
    .eq("id", parsed.id)
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select(COUNTDOWN_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to update that countdown.");
  }

  if (!data) {
    throw new ConcurrencyConflictError();
  }

  return mapRow(data as CountdownRow);
}

export async function deleteCountdown(
  input: DeleteCountdownInput,
): Promise<void> {
  const membership = await requireCurrentMembership();
  const parsed = deleteCountdownInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("countdowns")
    .delete()
    .eq("household_id", membership.household.id)
    .eq("id", parsed.id)
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to delete that countdown.");
  }

  if (!data) {
    throw new ConcurrencyConflictError();
  }
}
