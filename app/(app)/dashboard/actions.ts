"use server";

import { revalidateDashboard } from "@/lib/dashboard/revalidate";
import {
  createCountdownInputSchema,
  deleteCountdownInputSchema,
  DASHBOARD_COUNTDOWN_LIMIT,
  updateCountdownInputSchema,
} from "@/lib/domain/countdown";
import { isConcurrencyConflictError } from "@/lib/domain/concurrency";
import { todayIsoDate } from "@/lib/domain/dates";
import {
  createCountdown,
  deleteCountdown,
  listCountdowns,
  updateCountdown,
} from "@/lib/repositories/countdowns";

export type CountdownActionState = {
  error: string | null;
  success: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function conflictOr(error: unknown, fallback: string): CountdownActionState {
  if (isConcurrencyConflictError(error)) {
    return { error: error.message, success: null };
  }
  return { error: fallback, success: null };
}

function revalidateCountdowns(): void {
  revalidateDashboard();
}

export async function createCountdownAction(
  _previous: CountdownActionState,
  formData: FormData,
): Promise<CountdownActionState> {
  const parsed = createCountdownInputSchema.safeParse({
    title: formString(formData, "title"),
    targetOn: formString(formData, "targetOn"),
    color: formString(formData, "color"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to add countdown.",
      success: null,
    };
  }

  const existing = await listCountdowns();
  const todayIso = todayIsoDate();
  const activeCount = existing.filter((c) => c.targetOn >= todayIso).length;
  if (activeCount >= DASHBOARD_COUNTDOWN_LIMIT) {
    return {
      error: `You can track up to ${DASHBOARD_COUNTDOWN_LIMIT} countdowns at a time. Remove one to add another.`,
      success: null,
    };
  }

  try {
    await createCountdown(parsed.data);
    revalidateCountdowns();
    return { error: null, success: "Countdown added." };
  } catch (error) {
    return conflictOr(error, "Unable to add that countdown.");
  }
}

export async function updateCountdownAction(
  _previous: CountdownActionState,
  formData: FormData,
): Promise<CountdownActionState> {
  const parsed = updateCountdownInputSchema.safeParse({
    id: formString(formData, "id"),
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
    title: formString(formData, "title"),
    targetOn: formString(formData, "targetOn"),
    color: formString(formData, "color"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to update countdown.",
      success: null,
    };
  }

  try {
    await updateCountdown(parsed.data);
    revalidateCountdowns();
    return { error: null, success: "Countdown updated." };
  } catch (error) {
    return conflictOr(error, "Unable to update that countdown.");
  }
}

export async function deleteCountdownAction(
  _previous: CountdownActionState,
  formData: FormData,
): Promise<CountdownActionState> {
  const parsed = deleteCountdownInputSchema.safeParse({
    id: formString(formData, "id"),
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to delete countdown.",
      success: null,
    };
  }

  try {
    await deleteCountdown(parsed.data);
    revalidateCountdowns();
    return { error: null, success: "Countdown removed." };
  } catch (error) {
    return conflictOr(error, "Unable to delete that countdown.");
  }
}
