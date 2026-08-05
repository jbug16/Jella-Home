"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  deleteSubscriptionAction,
  type SubscriptionActionState,
} from "@/app/(app)/subscriptions/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  // Always the persisted vendor name — never open/confirm/boolean state.
  const vendorName = subscription.vendor;

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove from your list?</AlertDialogTitle>
        <AlertDialogDescription>
          “{vendorName}” will be removed from your subscriptions.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <AlertDialogFooter>
        <AlertDialogCancel
          disabled={pending}
          className="min-h-11 w-full sm:w-auto sm:min-w-24"
        >
          Cancel
        </AlertDialogCancel>
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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {open && subscription ? (
          <DeleteForm
            subscription={subscription}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
