"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/lib/responsive/use-is-mobile";

type ResponsiveAlertShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Centered AlertDialog on sm+; bottom Sheet on phones so destructive
 * confirmations feel like native action sheets.
 */
export function ResponsiveAlertShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveAlertShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription asChild={typeof description !== "string"}>
                {description}
              </SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-4">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild={typeof description !== "string"}>
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {children}
      </AlertDialogContent>
    </AlertDialog>
  );
}
