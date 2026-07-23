import "server-only";

import {
  calendarEventCouldOverlapRange,
  createCalendarEventInputSchema,
  mapCalendarEvent,
  updateCalendarEventInputSchema,
  type CalendarEvent,
  type CalendarEventRow,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from "@/lib/domain/calendar-event";
import { requireCurrentMembership } from "@/lib/repositories/households";
import { createClient } from "@/lib/supabase/server";

const EVENT_SELECT =
  "id, household_id, title, notes, location, category, all_day, start_on, end_on, start_at, end_at, recurrence, recurrence_end_on, created_at, updated_at";

/**
 * Candidate rows that may produce occurrences intersecting [rangeStart, rangeEnd].
 * Expansion happens in domain — this is a coarse SQL filter.
 */
export async function listCalendarEventsOverlappingRange(args: {
  rangeStart: string;
  rangeEnd: string;
}): Promise<CalendarEvent[]> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  // Coarse filter: series that start on/before range end. Domain expansion
  // applies precise overlap (incl. multi-day spill and recurrence end).
  // Keep this filter simple — nested PostgREST `and()`/`or()` filters have
  // dropped valid rows in practice; tighten later with a proven lower bound.
  const { data, error } = await supabase
    .from("calendar_events")
    .select(EVENT_SELECT)
    .eq("household_id", membership.household.id)
    .lte("start_on", args.rangeEnd)
    .order("start_on");

  if (error) {
    throw new Error("Unable to load calendar events.");
  }

  return (data ?? [])
    .map((row) => mapCalendarEvent(row as CalendarEventRow))
    .filter((event) =>
      calendarEventCouldOverlapRange(event, args.rangeStart, args.rangeEnd),
    );
}

export async function getCalendarEvent(id: string): Promise<CalendarEvent> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_events")
    .select(EVENT_SELECT)
    .eq("household_id", membership.household.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Unable to find that event.");
  }

  return mapCalendarEvent(data as CalendarEventRow);
}

export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CalendarEvent> {
  const membership = await requireCurrentMembership();
  const parsed = createCalendarEventInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      household_id: membership.household.id,
      title: parsed.title,
      notes: parsed.notes,
      location: parsed.location,
      category: parsed.category,
      all_day: parsed.allDay,
      start_on: parsed.startOn,
      end_on: parsed.endOn,
      start_at: parsed.startAt,
      end_at: parsed.endAt,
      recurrence: parsed.recurrence,
      recurrence_end_on: parsed.recurrenceEndOn,
    })
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error("Unable to create that event.");
  }

  return mapCalendarEvent(data as CalendarEventRow);
}

export async function updateCalendarEvent(
  input: UpdateCalendarEventInput,
): Promise<CalendarEvent> {
  const membership = await requireCurrentMembership();
  const parsed = updateCalendarEventInputSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      title: parsed.title,
      notes: parsed.notes,
      location: parsed.location,
      category: parsed.category,
      all_day: parsed.allDay,
      start_on: parsed.startOn,
      end_on: parsed.endOn,
      start_at: parsed.startAt,
      end_at: parsed.endAt,
      recurrence: parsed.recurrence,
      recurrence_end_on: parsed.recurrenceEndOn,
    })
    .eq("household_id", membership.household.id)
    .eq("id", parsed.id)
    .select(EVENT_SELECT)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Unable to update that event.");
  }

  return mapCalendarEvent(data as CalendarEventRow);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("household_id", membership.household.id)
    .eq("id", id);

  if (error) {
    throw new Error("Unable to delete that event.");
  }
}
