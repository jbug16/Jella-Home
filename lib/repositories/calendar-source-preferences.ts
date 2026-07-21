import "server-only";

import {
  calendarSourceKeySchema,
  mergeCalendarSourcePreferences,
  type CalendarSourceKey,
  type CalendarSourcePreferences,
} from "@/lib/domain/calendar-event";
import { requireCurrentMembership } from "@/lib/repositories/households";
import { createClient } from "@/lib/supabase/server";

type PrefRow = {
  source_key: string;
  visible: boolean;
};

export async function listMyCalendarSourcePreferences(): Promise<CalendarSourcePreferences> {
  const membership = await requireCurrentMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_source_preferences")
    .select("source_key, visible")
    .eq("household_id", membership.household.id)
    .eq("user_id", membership.userId);

  if (error) {
    throw new Error("Unable to load calendar preferences.");
  }

  const rows = (data ?? []).flatMap((row) => {
    const parsed = calendarSourceKeySchema.safeParse(
      (row as PrefRow).source_key,
    );
    if (!parsed.success) {
      return [];
    }
    return [{ sourceKey: parsed.data, visible: (row as PrefRow).visible }];
  });

  return mergeCalendarSourcePreferences(rows);
}

export async function upsertMyCalendarSourcePreference(args: {
  sourceKey: CalendarSourceKey;
  visible: boolean;
}): Promise<CalendarSourcePreferences> {
  const membership = await requireCurrentMembership();
  const sourceKey = calendarSourceKeySchema.parse(args.sourceKey);
  const supabase = await createClient();

  const { error } = await supabase.from("calendar_source_preferences").upsert(
    {
      household_id: membership.household.id,
      user_id: membership.userId,
      source_key: sourceKey,
      visible: args.visible,
    },
    { onConflict: "household_id,user_id,source_key" },
  );

  if (error) {
    throw new Error("Unable to save calendar preferences.");
  }

  return listMyCalendarSourcePreferences();
}
