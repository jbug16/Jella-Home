import "server-only";

import { ConcurrencyConflictError } from "@/lib/domain/concurrency";
import {
  archiveSubscriptionInputSchema,
  createSubscriptionPersistedSchema,
  mapSubscription,
  subscriptionSchema,
  updateSubscriptionPersistedSchema,
  type ArchiveSubscriptionInput,
  type CreateSubscriptionInput,
  type Subscription,
  type SubscriptionRow,
  type UpdateSubscriptionInput,
} from "@/lib/domain/subscription";
import { requireCurrentMembership } from "@/lib/repositories/households";
import { createClient } from "@/lib/supabase/server";

const SUBSCRIPTION_SELECT =
  "id, household_id, vendor, category_label, amount_cents, cadence, billing_day, renewal_on, status, notes, created_at, updated_at";

function mapRow(row: SubscriptionRow): Subscription {
  return mapSubscription(row);
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("household_id", membership.household.id)
    .order("status")
    .order("renewal_on", { ascending: true, nullsFirst: false })
    .order("vendor");

  if (error) {
    throw new Error("Unable to load subscriptions.");
  }

  return (data ?? []).map((row) => mapRow(row as SubscriptionRow));
}

export async function getSubscription(id: string): Promise<Subscription> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("household_id", membership.household.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Unable to find that subscription.");
  }

  return mapRow(data as SubscriptionRow);
}

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  const membership = await requireCurrentMembership();
  const parsed = createSubscriptionPersistedSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      household_id: membership.household.id,
      vendor: parsed.vendor,
      category_label: parsed.categoryLabel,
      amount_cents: parsed.amountCents,
      cadence: parsed.cadence,
      billing_day: parsed.billingDay,
      renewal_on: parsed.renewalOn,
      status: "active",
      notes: parsed.notes,
    })
    .select(SUBSCRIPTION_SELECT)
    .single();

  if (error || !data) {
    throw new Error("Unable to add subscription.");
  }

  return mapRow(data as SubscriptionRow);
}

export async function updateSubscription(
  input: UpdateSubscriptionInput,
): Promise<Subscription> {
  const membership = await requireCurrentMembership();
  const parsed = updateSubscriptionPersistedSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      vendor: parsed.vendor,
      category_label: parsed.categoryLabel,
      amount_cents: parsed.amountCents,
      cadence: parsed.cadence,
      billing_day: parsed.billingDay,
      renewal_on: parsed.renewalOn,
      notes: parsed.notes,
    })
    .eq("household_id", membership.household.id)
    .eq("id", parsed.id)
    .eq("status", "active")
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select(SUBSCRIPTION_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to update subscription.");
  }
  if (!data) {
    throw new ConcurrencyConflictError();
  }

  return mapRow(data as SubscriptionRow);
}

export async function archiveSubscription(
  input: ArchiveSubscriptionInput,
): Promise<Subscription> {
  const membership = await requireCurrentMembership();
  const parsed = archiveSubscriptionInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "archived" })
    .eq("household_id", membership.household.id)
    .eq("id", parsed.id)
    .eq("status", "active")
    .eq("updated_at", parsed.expectedUpdatedAt)
    .select(SUBSCRIPTION_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to archive subscription.");
  }
  if (!data) {
    throw new ConcurrencyConflictError();
  }

  return mapRow(data as SubscriptionRow);
}

export async function restoreSubscription(id: string): Promise<Subscription> {
  const membership = await requireCurrentMembership();
  subscriptionSchema.shape.id.parse(id);
  const supabase = await createClient();

  const existing = await getSubscription(id);
  if (existing.status !== "archived") {
    throw new Error("That subscription is already active.");
  }
  if (!existing.renewalOn) {
    throw new Error("Set a next billing date before restoring.");
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "active" })
    .eq("household_id", membership.household.id)
    .eq("id", id)
    .eq("status", "archived")
    .select(SUBSCRIPTION_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to restore subscription.");
  }
  if (!data) {
    throw new Error("Unable to find that subscription.");
  }

  return mapRow(data as SubscriptionRow);
}
