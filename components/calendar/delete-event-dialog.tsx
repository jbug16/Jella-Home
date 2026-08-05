"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deleteCalendarEventAction,
  type CalendarActionState,
} from "@/app/(app)/calendar/actions";
import { ResponsiveAlertShell } from "@/components/common/responsive-alert-shell";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const initialState: CalendarActionState = { error: null, success: null };

type DeleteCalendarEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  updatedAt: string | null;
  isRecurring: boolean;
};

export function DeleteCalendarEventDialog({
  open,
  onOpenChange,
  eventId,
  updatedAt,
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
    <ResponsiveAlertShell
      open={open}
      onOpenChange={onOpenChange}
      title="Delete event?"
      description={
        isRecurring
          ? "This deletes the entire series — every occurrence."
          : "This permanently removes the event from the household calendar."
      }
    >
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="min-h-11 w-full sm:w-auto sm:min-w-24"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <form action={formAction} className="w-full sm:w-auto">
          {eventId ? <input type="hidden" name="id" value={eventId} /> : null}
          {updatedAt ? (
            <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
          ) : null}
          <Button
            type="submit"
            variant="destructive"
            disabled={pending || !eventId}
            className="min-h-11 w-full sm:min-w-24"
            data-testid="calendar-delete-confirm"
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </AlertDialogFooter>
    </ResponsiveAlertShell>
  );
}
