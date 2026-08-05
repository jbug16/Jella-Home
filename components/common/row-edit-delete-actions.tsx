import { Pencil, Trash2 } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

type RowEditDeleteActionsProps = {
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
  editTestId?: string;
  deleteTestId?: string;
  className?: string;
};

/** Standard pencil + trash row actions used on list items across features. */
export function RowEditDeleteActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  editTestId,
  deleteTestId,
  className,
}: RowEditDeleteActionsProps) {
  return (
    <div className={cn("flex shrink-0 gap-1", className)}>
      <IconButton
        label={editLabel}
        variant="ghost"
        onClick={onEdit}
        data-testid={editTestId}
      >
        <Pencil className="size-4" aria-hidden />
      </IconButton>
      <IconButton
        label={deleteLabel}
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
        data-testid={deleteTestId}
      >
        <Trash2 className="size-4" aria-hidden />
      </IconButton>
    </div>
  );
}
