"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deleteCountdownAction,
  type CountdownActionState,
} from "@/app/(app)/dashboard/actions";
import { ResponsiveAlertShell } from "@/components/common/responsive-alert-shell";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { CountdownListItem } from "@/lib/domain/countdown";

const initialState: CountdownActionState = { error: null, success: null };

type DeleteCountdownDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countdown: CountdownListItem | null;
};

type DeleteFormProps = {
  countdown: CountdownListItem;
  onClose: () => void;
};

function DeleteForm({ countdown, onClose }: DeleteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteCountdownAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  return (
    <>
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
          onClick={onClose}
        >
          Cancel
        </Button>
        <form action={formAction} className="w-full sm:w-auto">
          <input type="hidden" name="id" value={countdown.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={countdown.updatedAt}
          />
          <Button
            type="submit"
            variant="destructive"
            disabled={pending}
            className="min-h-11 w-full sm:min-w-24"
            data-testid="confirm-delete-countdown"
          >
            {pending ? "Removing…" : "Remove"}
          </Button>
        </form>
      </AlertDialogFooter>
    </>
  );
}

export function DeleteCountdownDialog({
  open,
  onOpenChange,
  countdown,
}: DeleteCountdownDialogProps) {
  return (
    <ResponsiveAlertShell
      open={open}
      onOpenChange={onOpenChange}
      title="Remove this countdown?"
      description={
        countdown ? (
          <>“{countdown.title}” will disappear from your dashboard.</>
        ) : undefined
      }
    >
      {open && countdown ? (
        <DeleteForm countdown={countdown} onClose={() => onOpenChange(false)} />
      ) : null}
    </ResponsiveAlertShell>
  );
}
