"use server";

import { revalidateModuleAndDashboard } from "@/lib/dashboard/revalidate";
import {
  calendarSourceKeySchema,
  createCalendarEventInputSchema,
  deleteCalendarEventInputSchema,
  updateCalendarEventInputSchema,
} from "@/lib/domain/calendar-event";
import { isConcurrencyConflictError } from "@/lib/domain/concurrency";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/repositories/calendar-events";
import { upsertMyCalendarSourcePreference } from "@/lib/repositories/calendar-source-preferences";

export type CalendarActionState = {
  error: string | null;
  success: string | null;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formCheckbox(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function revalidateCalendar(): void {
  revalidateModuleAndDashboard("/calendar");
}

function conflictOr(error: unknown, fallback: string): CalendarActionState {
  if (isConcurrencyConflictError(error)) {
    return { error: error.message, success: null };
  }
  return { error: fallback, success: null };
}

function parseEventForm(formData: FormData) {
  const allDay = formCheckbox(formData, "allDay");
  const recurrence = formString(formData, "recurrence") || "none";
  const recurrenceEndRaw = formString(formData, "recurrenceEndOn");

  return {
    title: formString(formData, "title"),
    notes: formString(formData, "notes"),
    location: formString(formData, "location"),
    category: formString(formData, "category") || "other",
    allDay,
    startOn: formString(formData, "startOn"),
    endOn: formString(formData, "endOn") || formString(formData, "startOn"),
    startAt: allDay ? null : formString(formData, "startAt") || null,
    endAt: allDay ? null : formString(formData, "endAt") || null,
    recurrence,
    recurrenceEndOn:
      recurrence === "none" || !recurrenceEndRaw ? null : recurrenceEndRaw,
  };
}

export async function createCalendarEventAction(
  _previous: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const parsed = createCalendarEventInputSchema.safeParse(
    parseEventForm(formData),
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to add event.",
      success: null,
    };
  }

  try {
    await createCalendarEvent(parsed.data);
  } catch {
    return { error: "Unable to add event.", success: null };
  }

  revalidateCalendar();
  return { error: null, success: "Event added." };
}

export async function updateCalendarEventAction(
  _previous: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const id = formString(formData, "id");
  const parsed = updateCalendarEventInputSchema.safeParse({
    id,
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
    ...parseEventForm(formData),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to update event.",
      success: null,
    };
  }

  try {
    await updateCalendarEvent(parsed.data);
  } catch (error) {
    return conflictOr(error, "Unable to update event.");
  }

  revalidateCalendar();
  return { error: null, success: "Event updated." };
}

export async function deleteCalendarEventAction(
  _previous: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const parsed = deleteCalendarEventInputSchema.safeParse({
    id: formString(formData, "id"),
    expectedUpdatedAt: formString(formData, "expectedUpdatedAt"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Unable to delete that event.",
      success: null,
    };
  }

  try {
    await deleteCalendarEvent(parsed.data);
  } catch (error) {
    return conflictOr(error, "Unable to delete that event.");
  }

  revalidateCalendar();
  return { error: null, success: "Event deleted." };
}

export async function setCalendarSourceVisibleAction(
  sourceKey: string,
  visible: boolean,
): Promise<{ error: string | null }> {
  const parsed = calendarSourceKeySchema.safeParse(sourceKey);
  if (!parsed.success) {
    return { error: "Unknown calendar source." };
  }

  // V1 UI must not toggle payment_reminders — reject if somehow called.
  if (parsed.data === "payment_reminders") {
    return { error: "That calendar source is not available yet." };
  }

  try {
    await upsertMyCalendarSourcePreference({
      sourceKey: parsed.data,
      visible,
    });
  } catch {
    return { error: "Unable to update calendar sources." };
  }

  revalidateCalendar();
  return { error: null };
}
