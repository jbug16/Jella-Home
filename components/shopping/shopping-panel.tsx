"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  clearCheckedItemsAction,
  deleteGroceryItemAction,
  generateGroceryListAction,
  setItemCheckedAction,
  type ShoppingActionState,
} from "@/app/(app)/shopping/actions";
import { WeekNavigator } from "@/components/meals/week-navigator";
import { ShoppingItemFormDialog } from "@/components/shopping/shopping-item-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  skippedCustomMeals: number;
};

export function ShoppingPanel({
  weekStart,
  list,
  items,
  skippedCustomMeals,
}: ShoppingPanelProps) {
  const router = useRouter();
  const [generateState, generateAction, generatePending] = useActionState(
    generateGroceryListAction,
    idle,
  );
  const [actionFeedback, setActionFeedback] =
    useState<ShoppingActionState>(idle);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<GroceryListItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<GroceryListItem | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [checkedOpen, setCheckedOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const progress = shoppingProgress(items);
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.checked / progress.total) * 100);

  const unchecked = useMemo(
    () => items.filter((item) => !item.isChecked),
    [items],
  );
  const checked = useMemo(
    () => items.filter((item) => item.isChecked),
    [items],
  );
  const uncheckedSections = useMemo(
    () => groupGroceryItems(unchecked),
    [unchecked],
  );

  useEffect(() => {
    if (generateState.success) {
      router.refresh();
    }
  }, [generateState.success, router]);

  const bannerError = generateState.error ?? actionFeedback.error;
  const bannerSuccess = generateState.success ?? actionFeedback.success;

  function toggleChecked(item: GroceryListItem) {
    const formData = new FormData();
    formData.set("id", item.id);
    formData.set("isChecked", item.isChecked ? "false" : "true");
    startTransition(async () => {
      const result = await setItemCheckedAction(idle, formData);
      setActionFeedback(result);
      if (!result.error) {
        router.refresh();
      }
    });
  }

  function confirmDelete() {
    if (!deleteItem) return;
    const formData = new FormData();
    formData.set("id", deleteItem.id);
    startTransition(async () => {
      const result = await deleteGroceryItemAction(idle, formData);
      setDeleteItem(null);
      setActionFeedback(result);
      if (!result.error) {
        router.refresh();
      }
    });
  }

  function clearChecked() {
    const formData = new FormData();
    formData.set("listId", list.id);
    startTransition(async () => {
      const result = await clearCheckedItemsAction(idle, formData);
      setActionFeedback(result);
      if (!result.error) {
        router.refresh();
      }
    });
  }

  const hasItems = items.length > 0;

  return (
    <div
      className="flex min-w-0 flex-col gap-4 overflow-x-hidden"
      data-testid="shopping-panel"
    >
      <div className="flex flex-col gap-3 sidebar:flex-row sidebar:items-start sidebar:justify-between">
        <WeekNavigator
          weekStart={weekStart}
          basePath="/shopping"
          testIdPrefix="shopping"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending || generatePending}
            onClick={() => {
              setEditItem(null);
              setFormOpen(true);
            }}
            data-testid="shopping-add-item"
          >
            <Plus className="size-4" />
            Add item
          </Button>
          {hasItems ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={generatePending || pending}
              onClick={() => setConfirmRegen(true)}
              data-testid="shopping-refresh"
            >
              <RefreshCw className="size-4" />
              Refresh from meals
            </Button>
          ) : (
            <form action={generateAction}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <Button
                type="submit"
                className="min-h-11"
                disabled={generatePending}
                data-testid="shopping-generate"
              >
                <RefreshCw className="size-4" />
                {generatePending ? "Generating…" : "Generate from meals"}
              </Button>
            </form>
          )}
        </div>
      </div>

      {progress.total > 0 ? (
        <div
          className="flex flex-col gap-2"
          role="status"
          aria-live="polite"
          data-testid="shopping-progress"
        >
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium tabular-nums">
              {progress.checked} of {progress.total}
            </span>
            <span className="text-muted-foreground">checked off</span>
          </div>
          <Progress value={percent} aria-hidden="true" />
        </div>
      ) : null}

      {skippedCustomMeals > 0 ? (
        <p
          className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          data-testid="shopping-skipped-notice"
        >
          {skippedCustomMeals} meal
          {skippedCustomMeals === 1 ? "" : "s"} without recipes{" "}
          {skippedCustomMeals === 1 ? "was" : "were"} skipped — link recipes in
          Meals or add items by hand.
        </p>
      ) : null}

      {bannerError ? (
        <p className="text-sm text-destructive" role="alert">
          {bannerError}
        </p>
      ) : null}
      {bannerSuccess ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="shopping-message"
        >
          {bannerSuccess}
        </p>
      ) : null}

      {!hasItems ? (
        <div
          className="rounded-lg border border-dashed border-border px-4 py-10 text-center"
          data-testid="shopping-empty"
        >
          <p className="font-medium">Nothing on the list yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate from this week&apos;s meals, or add items yourself.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {uncheckedSections.map((section) => (
            <section key={section.key} className="flex flex-col gap-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h2>
              <ul className="divide-y divide-border rounded-lg border border-border">
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
              </ul>
            </section>
          ))}

          {checked.length > 0 ? (
            <Collapsible open={checkedOpen} onOpenChange={setCheckedOpen}>
              <div className="flex items-center justify-between gap-2">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="min-h-11 px-2"
                    data-testid="shopping-toggle-checked"
                  >
                    Checked ({checked.length})
                  </Button>
                </CollapsibleTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 text-muted-foreground"
                  disabled={pending}
                  onClick={clearChecked}
                  data-testid="shopping-clear-checked"
                >
                  <Trash2 className="size-4" />
                  Clear checked
                </Button>
              </div>
              <CollapsibleContent>
                <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
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
                </ul>
              </CollapsibleContent>
            </Collapsible>
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
        item={editItem}
        onSaved={() => {
          setActionFeedback({
            error: null,
            success: editItem ? "Item updated." : "Item added.",
          });
          router.refresh();
        }}
      />

      <AlertDialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh from meals?</AlertDialogTitle>
            <AlertDialogDescription>
              Quantities from this week&apos;s recipes will update. Checked
              items stay checked. Manual items are left alone. Items no longer
              needed and still unchecked are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={generateAction}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <AlertDialogAction
                type="submit"
                data-testid="shopping-refresh-confirm"
              >
                Refresh list
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem
                ? `“${deleteItem.name}” will be removed from the list.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="shopping-delete-confirm"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <li
      className={cn(
        "flex min-h-12 items-center gap-3 px-3 py-2",
        item.isChecked && "bg-muted/30",
      )}
      data-testid={`shopping-item-${item.id}`}
      data-generation-key={item.generationKey ?? undefined}
      data-source={item.source}
    >
      <Checkbox
        checked={item.isChecked}
        disabled={disabled}
        onCheckedChange={() => onToggle()}
        className="size-5"
        aria-label={`Mark ${item.name} as ${item.isChecked ? "not done" : "done"}`}
        data-testid={`shopping-check-${item.id}`}
      />
      <button
        type="button"
        className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center text-left"
        onClick={onToggle}
        disabled={disabled}
      >
        <span
          className={cn(
            "truncate text-sm font-medium",
            item.isChecked && "text-muted-foreground line-through",
          )}
        >
          {item.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {[qtyLabel, item.notes].filter(Boolean).join(" · ")}
        </span>
      </button>
      {onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 shrink-0"
          onClick={onEdit}
          disabled={disabled}
          data-testid={`shopping-edit-${item.id}`}
        >
          Edit
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-muted-foreground"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Remove ${item.name}`}
        data-testid={`shopping-delete-${item.id}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
