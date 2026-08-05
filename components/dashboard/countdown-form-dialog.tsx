"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  createCountdownAction,
  updateCountdownAction,
  type CountdownActionState,
} from "@/app/(app)/dashboard/actions";
import { ResponsiveFormShell } from "@/components/budget/responsive-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COUNTDOWN_COLOR_LABELS,
  COUNTDOWN_COLOR_OPTIONS,
  COUNTDOWN_COLOR_STYLES,
  type CountdownColor,
  type CountdownListItem,
} from "@/lib/domain/countdown";
import { cn } from "@/lib/utils";

const initialState: CountdownActionState = { error: null, success: null };

type CountdownFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayIso: string;
  countdown?: CountdownListItem | null;
  onDelete?: () => void;
};

type CountdownFormProps = {
  todayIso: string;
  countdown?: CountdownListItem | null;
  onClose: () => void;
  onDelete?: () => void;
};

function ColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: CountdownColor;
  onChange: (color: CountdownColor) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Countdown color"
    >
      {COUNTDOWN_COLOR_OPTIONS.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COUNTDOWN_COLOR_LABELS[color]}
            disabled={disabled}
            onClick={() => onChange(color)}
            className={cn(
              "flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-foreground" : "border-transparent",
            )}
            data-testid={`countdown-color-${color}`}
          >
            <span
              className={cn(
                "size-7 rounded-full",
                COUNTDOWN_COLOR_STYLES[color].swatch,
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

function CountdownForm({
  todayIso,
  countdown,
  onClose,
  onDelete,
}: CountdownFormProps) {
  const router = useRouter();
  const isEdit = Boolean(countdown);
  const action = isEdit ? updateCountdownAction : createCountdownAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [color, setColor] = useState<CountdownColor>(
    countdown?.color ?? "teal",
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [state.success, onClose, router]);

  useEffect(() => {
    if (countdown) {
      setColor(countdown.color);
    }
  }, [countdown]);

  const defaultTarget = countdown?.targetOn ?? todayIso;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {countdown ? (
        <>
          <input type="hidden" name="id" value={countdown.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={countdown.updatedAt}
          />
        </>
      ) : null}
      <input type="hidden" name="color" value={color} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="countdown-title">
          What are you looking forward to?
        </Label>
        <Input
          id="countdown-title"
          name="title"
          required
          maxLength={120}
          defaultValue={countdown?.title ?? ""}
          placeholder="e.g. Beach trip"
          className="min-h-11"
          disabled={pending}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="countdown-targetOn">Date</Label>
        <Input
          id="countdown-targetOn"
          name="targetOn"
          type="date"
          required
          defaultValue={defaultTarget}
          className="min-h-11"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Color</Label>
        <ColorPicker value={color} onChange={setColor} disabled={pending} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="order-2 min-h-11 w-full sm:order-1 sm:w-auto"
          disabled={pending}
          onClick={onClose}
        >
          Cancel
        </Button>
        {isEdit && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="order-3 min-h-11 w-full text-destructive hover:text-destructive sm:order-2 sm:hidden sm:w-auto"
            disabled={pending}
            onClick={onDelete}
            data-testid="delete-countdown-mobile"
          >
            Remove countdown
          </Button>
        ) : null}
        <Button
          type="submit"
          className="order-1 min-h-11 w-full sm:order-3 sm:w-auto"
          disabled={pending}
          data-testid="countdown-form-submit"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add countdown"}
        </Button>
      </div>
    </form>
  );
}

export function CountdownFormDialog({
  open,
  onOpenChange,
  todayIso,
  countdown,
  onDelete,
}: CountdownFormDialogProps) {
  const isEdit = Boolean(countdown);

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit countdown" : "Add countdown"}
      description="Track something fun coming up on your dashboard."
    >
      {open ? (
        <CountdownForm
          todayIso={todayIso}
          countdown={countdown}
          onClose={() => onOpenChange(false)}
          onDelete={onDelete}
        />
      ) : null}
    </ResponsiveFormShell>
  );
}
