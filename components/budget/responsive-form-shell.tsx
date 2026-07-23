"use client";

import { useSyncExternalStore } from "react";

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

const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

type ResponsiveFormShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Desktop Dialog width class. Defaults to a compact form width. */
  desktopWidthClassName?: string;
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
  children,
}: ResponsiveFormShellProps) {
  const isMobile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[min(92dvh,100%)] overflow-y-auto overscroll-contain rounded-t-xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="mt-4 px-1 pb-2">{children}</div>
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
