"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/lib/responsive/use-is-mobile";

type ResponsiveFormShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Desktop Dialog width class. Defaults to a compact form width. */
  desktopWidthClassName?: string;
  /** Pin primary actions to the bottom of the mobile sheet. */
  stickyFooter?: boolean;
  children: React.ReactNode;
};

/**
 * Dialog on sm+; bottom Sheet on phones.
 * Uses `dvh` max-height so the on-screen keyboard shrinks the usable viewport
 * and the sheet/dialog can scroll. Avoid nested overflow-hidden shells — meal
 * recipe comboboxes use in-flow absolute lists (not portals).
 */
export function ResponsiveFormShell({
  open,
  onOpenChange,
  title,
  description,
  desktopWidthClassName = "sm:max-w-md",
  stickyFooter = false,
  children,
}: ResponsiveFormShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={
            stickyFooter
              ? "flex max-h-[min(92dvh,100%)] flex-col overflow-hidden rounded-t-xl pb-0"
              : "max-h-[min(92dvh,100%)] overflow-y-auto overscroll-contain rounded-t-xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          }
        >
          <SheetHeader className="shrink-0">
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          {stickyFooter ? (
            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden px-1">
              {children}
            </div>
          ) : (
            <div className="mt-4 px-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[min(90dvh,100%)] overflow-y-auto overscroll-contain ${desktopWidthClassName}`}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Scrollable form body when using stickyFooter on mobile sheets. */
export function FormScrollBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/** Pinned submit area for mobile sheets — sits above the home indicator. */
export function FormStickyFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 border-t bg-background px-1 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sidebar:border-t-0">
      {children}
    </div>
  );
}
