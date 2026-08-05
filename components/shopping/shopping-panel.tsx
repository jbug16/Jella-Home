"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";

import {
  deleteGroceryItemAction,
  setItemCheckedAction,
  type ShoppingActionState,
} from "@/app/(app)/shopping/actions";
import { WeekNavigator } from "@/components/meals/week-navigator";
import { EmptyState } from "@/components/common/empty-state";
import {
  ListRowBody,
  ListRowButton,
  ListRowTitle,
  ListRowTrailing,
} from "@/components/common/list-row";
import { PeriodPanelHeader } from "@/components/common/panel-header";
import { PanelList, PanelListItem } from "@/components/common/panel-list";
import { PrimaryAddButton } from "@/components/common/primary-add-button";
import { RowEditDeleteActions } from "@/components/common/row-edit-delete-actions";
import { SectionHeading } from "@/components/common/section-heading";
import { ResponsiveAlertShell } from "@/components/common/responsive-alert-shell";
import { ShoppingItemFormDialog } from "@/components/shopping/shopping-item-form-dialog";
import { AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { Progress } from "@/components/ui/progress";
import { formatQuantity } from "@/lib/domain/recipe";
import {
  groupGroceryItems,
  shoppingProgress,
  type GroceryList,
  type GroceryListItem,
} from "@/lib/domain/shopping";
import { cn } from "@/lib/utils";

const idle: ShoppingActionState = { error: null, success: null };

type ShoppingPanelProps = {
  weekStart: string;
  list: GroceryList;
  items: GroceryListItem[];
};

type ShoppingItemMutation =
  | { type: "toggle"; id: string; isChecked: boolean }
  | { type: "delete"; id: string };

function applyShoppingItemMutation(
  items: GroceryListItem[],
  mutation: ShoppingItemMutation,
): GroceryListItem[] {
  switch (mutation.type) {
    case "toggle":
      return items.map((row) =>
        row.id === mutation.id
          ? { ...row, isChecked: mutation.isChecked }
          : row,
      );
    case "delete":
      return items.filter((row) => row.id !== mutation.id);
  }
}

export function ShoppingPanel({ weekStart, list, items }: ShoppingPanelProps) {
  const [baseItems, setBaseItems] = useState(items);
  const [syncedItems, setSyncedItems] = useState(items);

  if (items !== syncedItems) {
    setSyncedItems(items);
    setBaseItems(items);
  }

  const [optimisticItems, applyOptimistic] = useOptimistic(
    baseItems,
    applyShoppingItemMutation,
  );
  const progress = shoppingProgress(optimisticItems);
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.checked / progress.total) * 100);

  const [actionFeedback, setActionFeedback] =
    useState<ShoppingActionState>(idle);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<GroceryListItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<GroceryListItem | null>(null);
  const [pending, startTransition] = useTransition();

  const unchecked = useMemo(
    () => optimisticItems.filter((item) => !item.isChecked),
    [optimisticItems],
  );
  const checked = useMemo(
    () => optimisticItems.filter((item) => item.isChecked),
    [optimisticItems],
  );
  const uncheckedSections = useMemo(
    () => groupGroceryItems(unchecked),
    [unchecked],
  );

  function toggleChecked(item: GroceryListItem) {
    const nextChecked = !item.isChecked;
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: item.id, isChecked: nextChecked });

      const formData = new FormData();
      formData.set("id", item.id);
      formData.set("expectedUpdatedAt", item.updatedAt);
      formData.set("isChecked", nextChecked ? "true" : "false");
      const result = await setItemCheckedAction(idle, formData);
      if (result.updatedItem) {
        setBaseItems((prev) =>
          prev.map((row) =>
            row.id === result.updatedItem!.id ? result.updatedItem! : row,
          ),
        );
      }
      setActionFeedback(result);
    });
  }

  function confirmDelete() {
    if (!deleteItem) return;
    const removed = deleteItem;
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: removed.id });

      const formData = new FormData();
      formData.set("id", removed.id);
      formData.set("expectedUpdatedAt", removed.updatedAt);
      const result = await deleteGroceryItemAction(idle, formData);
      setDeleteItem(null);
      if (!result.error) {
        setBaseItems((prev) => prev.filter((row) => row.id !== removed.id));
      }
      setActionFeedback(result);
    });
  }

  const hasItems = optimisticItems.length > 0;

  return (
    <div
      className="flex min-w-0 flex-col gap-3 overflow-x-hidden"
      data-testid="shopping-panel"
    >
      <PeriodPanelHeader
        navigator={
          <WeekNavigator
            weekStart={weekStart}
            basePath="/shopping"
            testIdPrefix="shopping"
          />
        }
        actions={
          <PrimaryAddButton
            label="Add item"
            disabled={pending}
            onClick={() => {
              setEditItem(null);
              setFormOpen(true);
            }}
            data-testid="shopping-add-item"
          />
        }
      />

      {hasItems ? (
        <div
          role="status"
          aria-live="polite"
          aria-label={`${progress.checked} of ${progress.total} items checked`}
          data-testid="shopping-progress"
        >
          <Progress value={percent} aria-hidden="true" />
        </div>
      ) : null}

      {actionFeedback.error ? (
        <p className="text-sm text-destructive" role="alert">
          {actionFeedback.error}
        </p>
      ) : null}
      {actionFeedback.success ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="shopping-message"
        >
          {actionFeedback.success}
        </p>
      ) : null}

      {!hasItems ? (
        <div data-testid="shopping-empty">
          <EmptyState
            icon={ShoppingCart}
            title="Nothing to buy this week"
            description="Your list builds from this week's meal plan. Add anything extra yourself."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {uncheckedSections.map((section) => (
            <section key={section.key} className="flex flex-col gap-1.5">
              <SectionHeading>{section.label}</SectionHeading>
              <PanelList>
                {section.items.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    disabled={pending}
                    onToggle={() => toggleChecked(item)}
                    onEdit={
                      item.source === "manual"
                        ? () => {
                            setEditItem(item);
                            setFormOpen(true);
                          }
                        : undefined
                    }
                    onDelete={() => setDeleteItem(item)}
                  />
                ))}
              </PanelList>
            </section>
          ))}

          {checked.length > 0 ? (
            <section
              className="flex flex-col gap-1.5"
              data-testid="shopping-checked-section"
            >
              <SectionHeading>Checked ({checked.length})</SectionHeading>
              <PanelList>
                {checked.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    disabled={pending}
                    onToggle={() => toggleChecked(item)}
                    onEdit={
                      item.source === "manual"
                        ? () => {
                            setEditItem(item);
                            setFormOpen(true);
                          }
                        : undefined
                    }
                    onDelete={() => setDeleteItem(item)}
                  />
                ))}
              </PanelList>
            </section>
          ) : null}
        </div>
      )}

      <ShoppingItemFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditItem(null);
        }}
        listId={list.id}
        weekStart={weekStart}
        item={editItem}
        onSaved={() => {
          setActionFeedback({
            error: null,
            success: editItem ? "Item updated." : "Item added.",
          });
        }}
      />

      <ResponsiveAlertShell
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
        title="Remove this item?"
        description={
          deleteItem
            ? `“${deleteItem.name}” will be removed from the list.`
            : undefined
        }
      >
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto sm:min-w-24"
            onClick={() => setDeleteItem(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 w-full sm:min-w-24"
            onClick={confirmDelete}
            data-testid="shopping-delete-confirm"
          >
            Remove
          </Button>
        </AlertDialogFooter>
      </ResponsiveAlertShell>
    </div>
  );
}

function ShoppingItemRow({
  item,
  disabled,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: GroceryListItem;
  disabled: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const qtyLabel =
    item.quantity === null && !item.unit
      ? null
      : [formatQuantity(item.quantity), item.unit].filter(Boolean).join(" ");

  return (
    <PanelListItem
      testId={`shopping-item-${item.id}`}
      className={cn(item.isChecked && "bg-muted/30")}
    >
      <div
        className="flex w-full min-w-0 items-center"
        data-generation-key={item.generationKey ?? undefined}
        data-source={item.source}
      >
        <div className="flex shrink-0 pl-3 sm:pl-4">
          <Checkbox
            checked={item.isChecked}
            disabled={disabled}
            onCheckedChange={() => onToggle()}
            className="size-5"
            aria-label={`Mark ${item.name} as ${item.isChecked ? "not done" : "done"}`}
            data-testid={`shopping-check-${item.id}`}
          />
        </div>
        <ListRowButton
          onClick={() => (onEdit ? onEdit() : onToggle())}
          disabled={disabled}
          className="items-center justify-between gap-2 py-2.5 pr-3 sm:pr-2"
        >
          <ListRowBody>
            <ListRowTitle
              className={cn(
                item.isChecked && "text-muted-foreground line-through",
              )}
            >
              {item.name}
            </ListRowTitle>
          </ListRowBody>
          {qtyLabel ? (
            <ListRowTrailing className="text-xs font-normal text-muted-foreground">
              {qtyLabel}
            </ListRowTrailing>
          ) : null}
        </ListRowButton>
        {onEdit ? (
          <RowEditDeleteActions
            className="hidden shrink-0 pr-3 sm:flex"
            onEdit={onEdit}
            onDelete={onDelete}
            editLabel={`Edit ${item.name}`}
            deleteLabel={`Remove ${item.name}`}
            editTestId={`shopping-edit-${item.id}`}
            deleteTestId={`shopping-delete-${item.id}`}
          />
        ) : (
          <IconButton
            label={`Remove ${item.name}`}
            variant="ghost"
            className="mr-3 hidden shrink-0 text-muted-foreground sm:inline-flex"
            onClick={onDelete}
            disabled={disabled}
            data-testid={`shopping-delete-${item.id}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </IconButton>
        )}
      </div>
    </PanelListItem>
  );
}
