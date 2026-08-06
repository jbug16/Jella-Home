"use client";

import { useActionState, useEffect } from "react";

import {
  createManualItemAction,
  updateGroceryItemAction,
  type ShoppingActionState,
} from "@/app/(app)/shopping/actions";
import {
  FormError,
  FormScrollBody,
  FormStickyFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GroceryListItem } from "@/lib/domain/shopping";

const initialState: ShoppingActionState = { error: null, success: null };

type ShoppingItemFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId?: string | null;
  weekStart?: string;
  item?: GroceryListItem | null;
};

export function ShoppingItemFormDialog({
  open,
  onOpenChange,
  listId,
  weekStart,
  item,
}: ShoppingItemFormDialogProps) {
  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Edit item" : "Add item"}
      description={
        item
          ? "Update this manually added item."
          : "Add something that is not from the meal plan."
      }
    >
      {open ? (
        <ShoppingItemForm
          listId={listId}
          weekStart={weekStart}
          item={item}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveFormShell>
  );
}

function ShoppingItemForm({
  listId,
  weekStart,
  item,
  onClose,
}: {
  listId?: string | null;
  weekStart?: string;
  item?: GroceryListItem | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(item);
  const action = isEdit ? updateGroceryItemAction : createManualItemAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <form
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
      key={item?.id ?? "new"}
    >
      {isEdit && item ? (
        <>
          <input type="hidden" name="id" value={item.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={item.updatedAt}
          />
        </>
      ) : listId ? (
        <input type="hidden" name="listId" value={listId} />
      ) : weekStart ? (
        <input type="hidden" name="weekStart" value={weekStart} />
      ) : null}

      <FormScrollBody>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="shopping-item-name">Item</Label>
            <Input
              id="shopping-item-name"
              name="name"
              required
              className="min-h-11"
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
                className="min-h-11"
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
                className="min-h-11"
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
              className="min-h-11"
              defaultValue={item?.storeSection ?? ""}
              data-testid="shopping-item-section"
            />
          </div>

          <FormError message={state.error} />
        </div>
      </FormScrollBody>

      <FormStickyFooter>
        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
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
            data-testid="shopping-item-submit"
          >
            {pending ? "Saving…" : isEdit ? "Save" : "Add item"}
          </Button>
        </div>
      </FormStickyFooter>
    </form>
  );
}
