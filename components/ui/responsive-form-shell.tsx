"use client";

import { useRef, useSyncExternalStore } from "react";

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
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/responsive/use-is-mobile";

type ResponsiveFormShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  desktopWidthClassName?: string;
  children: React.ReactNode;
};

const TOUCH_QUERY = "(hover: none), (pointer: coarse)";

function subscribeTouch(onChange: () => void) {
  const media = window.matchMedia(TOUCH_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useIsTouchDevice() {
  return useSyncExternalStore(
    subscribeTouch,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
}

export function ResponsiveFormShell({
  open,
  onOpenChange,
  title,
  description,
  desktopWidthClassName = "sm:max-w-md",
  children,
}: ResponsiveFormShellProps) {
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const autoFocus = (event: Event) => {
    if (!isTouch && !isMobile) return;
    event.preventDefault();
    requestAnimationFrame(() =>
      surfaceRef.current?.focus({ preventScroll: true }),
    );
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          ref={surfaceRef}
          tabIndex={-1}
          side="bottom"
          onOpenAutoFocus={autoFocus}
          className="flex max-h-[min(94dvh,100%)] min-h-0 flex-col gap-0 overflow-hidden rounded-t-xl p-0 outline-none"
          data-testid="responsive-form-shell"
        >
          <SheetHeader className="shrink-0 border-b px-4 py-4 pr-14 text-left">
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <div
            data-form-overlay-root
            className="pointer-events-none absolute inset-0 z-[100]"
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={surfaceRef}
        tabIndex={-1}
        onOpenAutoFocus={autoFocus}
        className={cn(
          "flex max-h-[min(90dvh,100%)] min-h-0 flex-col gap-0 overflow-hidden p-0 outline-none",
          desktopWidthClassName,
        )}
        data-testid="responsive-form-shell"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-16">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <div
          data-form-overlay-root
          className="pointer-events-none absolute inset-0 z-[100]"
        />
      </DialogContent>
    </Dialog>
  );
}

export function FormScrollBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 scroll-pb-32 touch-pan-y sm:px-6",
        className,
      )}
      data-testid="responsive-form-body"
    >
      {children}
    </div>
  );
}

export function FormStickyFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-3",
        className,
      )}
      data-testid="responsive-form-footer"
    >
      {children}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}
