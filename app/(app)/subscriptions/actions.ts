"use server";

import { revalidateModuleAndDashboard } from "@/lib/dashboard/revalidate";
import { parseDollarInputToNonNegativeCents } from "@/lib/domain/budget";
import { isConcurrencyConflictError } from "@/lib/domain/concurrency";
import {
  archiveSubscriptionInputSchema,
  createSubscriptionInputSchema,
  updateSubscriptionInputSchema,
} from "@/lib/domain/subscription";
import {
  archiveSubscription,
  createSubscription,
  updateSubscription,
} from "@/lib/repositories/subscriptions";

export type SubscriptionActionState = {
  error: string | null;
  success: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateSubscriptions(): void {
  revalidateModuleAndDashboard("/subscriptions", "/calendar");
}

function conflictOr(error: unknown, fallback: string): SubscriptionActionState {
  if (isConcurrencyConflictError(error)) {
    return { error: error.message, success: null };
  }
  return { error: fallback, success: null };
}

function parseSubscriptionForm(formData: FormData) {
  let amountCents: number;
  try {
    amountCents = parseDollarInputToNonNegativeCents(
      formString(formData, "amountDollars"),
    );
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Enter a valid amount.",
    );
  }

  return {
    vendor: formString(formData, "vendor"),
    categoryLabel: formString(formData, "categoryLabel"),
    amountCents,
    cadence: formString(formData, "cadence"),
    renewalOn: formString(formData, "renewalOn"),
    notes: formString(formData, "notes"),
  };
}

export async function createSubscriptionAction(
  _previous: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  let raw: ReturnType<typeof parseSubscriptionForm>;
  try {
    raw = parseSubscriptionForm(formData);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Enter a valid amount.",
      success: null,
    };
  }

  const parsed = createSubscriptionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to add subscription.",
      success: null,
    };
  }

  try {
    await createSubscription(parsed.data);
  } catch {
    return { error: "Unable to add subscription.", success: null };
  }

  revalidateSubscriptions();
  return { error: null, success: "Subscription added." };
}

export async function updateSubscriptionAction(
  _previous: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  let raw: ReturnType<typeof parseSubscriptionForm> & {
    id: string;
    expectedUpdatedAt: string;
  };
  try {
    raw = {
      id: formString(formData, "id"),
      expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
      ...parseSubscriptionForm(formData),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Enter a valid amount.",
      success: null,
    };
  }

  const parsed = updateSubscriptionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Unable to update subscription.",
      success: null,
    };
  }

  try {
    await updateSubscription(parsed.data);
  } catch (error) {
    return conflictOr(error, "Unable to update subscription.");
  }

  revalidateSubscriptions();
  return { error: null, success: "Subscription updated." };
}

/** Soft-removes a subscription (status → archived). UX is labeled Delete. */
export async function deleteSubscriptionAction(
  _previous: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const parsed = archiveSubscriptionInputSchema.safeParse({
    id: formString(formData, "id"),
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Unable to delete subscription.",
      success: null,
    };
  }

  try {
    await archiveSubscription(parsed.data);
  } catch (error) {
    return conflictOr(error, "Unable to delete subscription.");
  }

  revalidateSubscriptions();
  return { error: null, success: "Subscription deleted." };
}
