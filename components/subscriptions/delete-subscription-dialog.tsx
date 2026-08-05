"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deleteSubscriptionAction,
  type SubscriptionActionState,
} from "@/app/(app)/subscriptions/actions";
import { ResponsiveAlertShell } from "@/components/common/responsive-alert-shell";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { SubscriptionListItem } from "@/lib/domain/subscription";

const initialState: SubscriptionActionState = { error: null, success: null };

type DeleteSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionListItem | null;
};

type DeleteFormProps = {
  subscription: SubscriptionListItem;
  onClose: () => void;
};

function DeleteForm({ subscription, onClose }: DeleteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deleteSubscriptionAction,
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
          <input type="hidden" name="id" value={subscription.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={subscription.updatedAt}
          />
          <Button
            type="submit"
            variant="destructive"
            disabled={pending}
            className="min-h-11 w-full sm:min-w-24"
            data-testid="confirm-delete-subscription"
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </AlertDialogFooter>
    </>
  );
}

export function DeleteSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
}: DeleteSubscriptionDialogProps) {
  const vendorName = subscription?.vendor;

  return (
    <ResponsiveAlertShell
      open={open}
      onOpenChange={onOpenChange}
      title="Remove from your list?"
      description={
        vendorName
          ? `“${vendorName}” will be removed from your subscriptions.`
          : undefined
      }
    >
      {open && subscription ? (
        <DeleteForm
          subscription={subscription}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveAlertShell>
  );
}
