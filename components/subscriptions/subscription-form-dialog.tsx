"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createSubscriptionAction,
  updateSubscriptionAction,
  type SubscriptionActionState,
} from "@/app/(app)/subscriptions/actions";
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
  SUBSCRIPTION_CADENCE_LABELS,
  subscriptionCadenceSchema,
  type Subscription,
  type SubscriptionCadence,
} from "@/lib/domain/subscription";

const initialState: SubscriptionActionState = { error: null, success: null };

const CADENCE_OPTIONS = subscriptionCadenceSchema.options;

type SubscriptionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayIso: string;
  subscription?: Subscription | null;
  onDelete?: () => void;
};

type SubscriptionFormProps = {
  todayIso: string;
  subscription?: Subscription | null;
  onClose: () => void;
  onDelete?: () => void;
};

function SubscriptionForm({
  todayIso,
  subscription,
  onClose,
  onDelete,
}: SubscriptionFormProps) {
  const router = useRouter();
  const isEdit = Boolean(subscription);
  const action = isEdit ? updateSubscriptionAction : createSubscriptionAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [cadence, setCadence] = useState<SubscriptionCadence>(
    subscription?.cadence ?? "monthly",
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  const defaultAmount = subscription
    ? (subscription.amountCents / 100).toFixed(2)
    : "";
  const defaultRenewal = subscription?.renewalOn ?? todayIso;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {subscription ? (
        <>
          <input type="hidden" name="id" value={subscription.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={subscription.updatedAt}
          />
        </>
      ) : null}
      <input type="hidden" name="cadence" value={cadence} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="vendor">Vendor</Label>
        <Input
          id="vendor"
          name="vendor"
          required
          maxLength={120}
          defaultValue={subscription?.vendor ?? ""}
          placeholder="e.g. Netflix"
          className="min-h-11"
          disabled={pending}
          autoComplete="organization"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="amountDollars">Amount</Label>
        <Input
          id="amountDollars"
          name="amountDollars"
          inputMode="decimal"
          required
          defaultValue={defaultAmount}
          placeholder="15.99"
          className="min-h-11"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cadence">Billing frequency</Label>
        <Select
          value={cadence}
          onValueChange={(value) => setCadence(value as SubscriptionCadence)}
          disabled={pending}
        >
          <SelectTrigger id="cadence" className="min-h-11 w-full">
            <SelectValue placeholder="Choose frequency" />
          </SelectTrigger>
          <SelectContent>
            {CADENCE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {SUBSCRIPTION_CADENCE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="renewalOn">Next billing</Label>
        <Input
          id="renewalOn"
          name="renewalOn"
          type="date"
          required
          defaultValue={defaultRenewal}
          className="min-h-11"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="categoryLabel">Category (optional)</Label>
        <Input
          id="categoryLabel"
          name="categoryLabel"
          maxLength={80}
          defaultValue={subscription?.categoryLabel ?? ""}
          placeholder="e.g. Entertainment"
          className="min-h-11"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          maxLength={500}
          defaultValue={subscription?.notes ?? ""}
          rows={3}
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </Button>
        {isEdit && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full text-destructive hover:text-destructive sm:hidden"
            disabled={pending}
            onClick={onDelete}
            data-testid={`delete-subscription-${subscription?.id}`}
          >
            Delete subscription
          </Button>
        ) : null}
        <Button
          type="submit"
          className="min-h-11 w-full sm:w-auto"
          disabled={pending}
          data-testid={isEdit ? "save-subscription" : "add-subscription-submit"}
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add subscription"}
        </Button>
      </div>
    </form>
  );
}

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  todayIso,
  subscription,
  onDelete,
}: SubscriptionFormDialogProps) {
  const isEdit = Boolean(subscription);
  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit subscription" : "Add subscription"}
      description="Track amount, billing frequency, and the next charge date."
    >
      <SubscriptionForm
        key={subscription?.id ?? "new"}
        todayIso={todayIso}
        subscription={subscription}
        onClose={() => onOpenChange(false)}
        onDelete={onDelete}
      />
    </ResponsiveFormShell>
  );
}
