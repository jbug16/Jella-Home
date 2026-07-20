"use client";

import { useActionState, useEffect } from "react";

import {
  createManualItemAction,
  updateGroceryItemAction,
  type ShoppingActionState,
} from "@/app/(app)/shopping/actions";
import { ResponsiveFormShell } from "@/components/budget/responsive-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroceryListItem } from "@/lib/domain/shopping";

const initialState: ShoppingActionState = { error: null, success: null };

type ShoppingItemFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  item?: GroceryListItem | null;
  onSaved: () => void;
};

export function ShoppingItemFormDialog({
  open,
  onOpenChange,
  listId,
  item,
  onSaved,
}: ShoppingItemFormDialogProps) {
  const isEdit = Boolean(item);
  const action = isEdit ? updateGroceryItemAction : createManualItemAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      onSaved();
      onOpenChange(false);
    }
  }, [state.success, onSaved, onOpenChange]);

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit item" : "Add item"}
      description={
        isEdit
          ? "Update this manually added item."
          : "Add something that is not from the meal plan."
      }
    >
      <form
        action={formAction}
        className="flex flex-col gap-4"
        key={item?.id ?? "new"}
      >
        {isEdit && item ? (
          <input type="hidden" name="id" value={item.id} />
        ) : (
          <input type="hidden" name="listId" value={listId} />
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="shopping-item-name">Item</Label>
          <Input
            id="shopping-item-name"
            name="name"
            required
            defaultValue={item?.name ?? ""}
            maxLength={160}
            data-testid="shopping-item-name"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="shopping-item-quantity">Quantity</Label>
            <Input
              id="shopping-item-quantity"
              name="quantity"
              inputMode="decimal"
              placeholder="Optional"
              defaultValue={
                item?.quantity === null || item?.quantity === undefined
                  ? ""
                  : String(item.quantity)
              }
              data-testid="shopping-item-quantity"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shopping-item-unit">Unit</Label>
            <Input
              id="shopping-item-unit"
              name="unit"
              placeholder="Optional"
              defaultValue={item?.unit ?? ""}
              data-testid="shopping-item-unit"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="shopping-item-section">Section</Label>
          <Input
            id="shopping-item-section"
            name="storeSection"
            placeholder="Optional"
            defaultValue={item?.storeSection ?? ""}
            data-testid="shopping-item-section"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="shopping-item-notes">Notes</Label>
          <Textarea
            id="shopping-item-notes"
            name="notes"
            rows={2}
            defaultValue={item?.notes ?? ""}
            data-testid="shopping-item-notes"
          />
        </div>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending}
            data-testid="shopping-item-submit"
          >
            {pending ? "Saving…" : isEdit ? "Save" : "Add item"}
          </Button>
        </div>
      </form>
    </ResponsiveFormShell>
  );
}
