"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createCalendarEventAction,
  updateCalendarEventAction,
  type CalendarActionState,
} from "@/app/(app)/calendar/actions";
import { ResponsiveFormShell } from "@/components/budget/responsive-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CALENDAR_EVENT_CATEGORY_LABELS,
  CALENDAR_RECURRENCE_LABELS,
  calendarEventCategorySchema,
  calendarRecurrenceSchema,
  type CalendarEvent,
  type CalendarEventCategory,
  type CalendarRecurrence,
} from "@/lib/domain/calendar-event";

const initialState: CalendarActionState = { error: null, success: null };

const CATEGORY_OPTIONS = calendarEventCategorySchema.options;
const RECURRENCE_OPTIONS = calendarRecurrenceSchema.options;

type CalendarEventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStartOn: string;
  seriesId: string | null;
  event: CalendarEvent | null;
};

function timeInputValue(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

export function CalendarEventFormDialog({
  open,
  onOpenChange,
  defaultStartOn,
  seriesId,
  event,
}: CalendarEventFormDialogProps) {
  const isEdit = Boolean(seriesId && event);
  const title = isEdit ? "Edit event" : "Add event";
  const description = isEdit
    ? event?.recurrence && event.recurrence !== "none"
      ? "Changes apply to the entire series."
      : "Update this household event."
    : "Add something to the household calendar.";

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      desktopWidthClassName="sm:max-w-lg"
    >
      <EventForm
        key={`${seriesId ?? "new"}-${defaultStartOn}-${open}`}
        defaultStartOn={defaultStartOn}
        event={isEdit ? event : null}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveFormShell>
  );
}

function EventForm({
  defaultStartOn,
  event,
  onClose,
}: {
  defaultStartOn: string;
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(event);
  const action = isEdit ? updateCalendarEventAction : createCalendarEventAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [category, setCategory] = useState<CalendarEventCategory>(
    event?.category ?? "other",
  );
  const [recurrence, setRecurrence] = useState<CalendarRecurrence>(
    event?.recurrence ?? "none",
  );
  const [startOn, setStartOn] = useState(event?.startOn ?? defaultStartOn);
  const [endOn, setEndOn] = useState(event?.endOn ?? defaultStartOn);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="recurrence" value={recurrence} />
      <input type="hidden" name="allDay" value={allDay ? "true" : "false"} />

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="calendar-title">Title</Label>
        <Input
          id="calendar-title"
          name="title"
          required
          defaultValue={event?.title ?? ""}
          className="min-h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="calendar-category">Category</Label>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as CalendarEventCategory)}
        >
          <SelectTrigger id="calendar-category" className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {CALENDAR_EVENT_CATEGORY_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="size-4"
          data-testid="calendar-all-day"
        />
        All day
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="calendar-start-on">Start date</Label>
          <Input
            id="calendar-start-on"
            name="startOn"
            type="date"
            required
            value={startOn}
            onChange={(event) => {
              const next = event.target.value;
              setStartOn(next);
              if (endOn < next) {
                setEndOn(next);
              }
            }}
            className="min-h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="calendar-end-on">End date</Label>
          <Input
            id="calendar-end-on"
            name="endOn"
            type="date"
            required
            value={endOn}
            onChange={(event) => setEndOn(event.target.value)}
            className="min-h-11"
          />
        </div>
      </div>

      {!allDay ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="calendar-start-at">Start time</Label>
            <Input
              id="calendar-start-at"
              name="startAt"
              type="time"
              required
              defaultValue={timeInputValue(event?.startAt ?? "09:00:00")}
              className="min-h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="calendar-end-at">End time</Label>
            <Input
              id="calendar-end-at"
              name="endAt"
              type="time"
              required
              defaultValue={timeInputValue(event?.endAt ?? "10:00:00")}
              className="min-h-11"
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="calendar-location">Location (optional)</Label>
        <Input
          id="calendar-location"
          name="location"
          defaultValue={event?.location ?? ""}
          className="min-h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="calendar-recurrence">Repeats</Label>
        <Select
          value={recurrence}
          onValueChange={(value) => setRecurrence(value as CalendarRecurrence)}
        >
          <SelectTrigger
            id="calendar-recurrence"
            className="min-h-11"
            data-testid="calendar-recurrence"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECURRENCE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {CALENDAR_RECURRENCE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {recurrence !== "none" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="calendar-recurrence-end">Ends on (optional)</Label>
          <Input
            id="calendar-recurrence-end"
            name="recurrenceEndOn"
            type="date"
            defaultValue={event?.recurrenceEndOn ?? ""}
            className="min-h-11"
          />
          <p className="text-xs text-muted-foreground">
            Editing a repeating event updates every occurrence in the series.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="calendar-notes">Notes (optional)</Label>
        <Textarea
          id="calendar-notes"
          name="notes"
          defaultValue={event?.notes ?? ""}
          rows={3}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="min-h-11"
          disabled={pending}
          data-testid="calendar-event-submit"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add event"}
        </Button>
      </div>
    </form>
  );
}
