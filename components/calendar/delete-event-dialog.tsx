"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deleteCalendarEventAction,
  type CalendarActionState,
} from "@/app/(app)/calendar/actions";
import { ResponsiveFormShell } from "@/components/budget/responsive-form-shell";
import { Button } from "@/components/ui/button";

const initialState: CalendarActionState = { error: null, success: null };

type DeleteCalendarEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  isRecurring: boolean;
};

export function DeleteCalendarEventDialog({
  open,
  onOpenChange,
  eventId,
  isRecurring,
}: DeleteCalendarEventDialogProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteCalendarEventAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onOpenChange(false);
    }
  }, [state.success, onOpenChange, router]);

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title="Delete event?"
      description={
        isRecurring
          ? "This deletes the entire series — every occurrence."
          : "This permanently removes the event from the household calendar."
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        {eventId ? <input type="hidden" name="id" value={eventId} /> : null}
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="min-h-11"
            disabled={pending || !eventId}
            data-testid="calendar-delete-confirm"
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </form>
    </ResponsiveFormShell>
  );
}
