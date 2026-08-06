"use client";

import { Check, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type ComboboxProps = {
  id: string;
  ariaLabel: string;
  value: string;
  options: ComboboxOption[];
  onValueChange: (value: string) => void;
  onSelect: (option: ComboboxOption | null) => void;
  allowCustomValue?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  inputTestId?: string;
  optionTestId?: string;
  addTestId?: string;
};

const MAX_OPTIONS = 50;

export function Combobox({
  id,
  ariaLabel,
  value,
  options,
  onValueChange,
  onSelect,
  allowCustomValue = false,
  disabled,
  required,
  placeholder,
  inputTestId,
  optionTestId,
  addTestId,
}: ComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
    portalTarget: Element;
    strategy: "absolute" | "fixed";
  } | null>(null);
  const trimmed = value.trim();

  const filtered = useMemo(() => {
    const query = trimmed.toLowerCase();
    return (
      query
        ? options.filter((option) => option.label.toLowerCase().includes(query))
        : options
    ).slice(0, MAX_OPTIONS);
  }, [options, trimmed]);

  const exactMatch = options.some(
    (option) => option.label.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCustom = allowCustomValue && trimmed.length > 0 && !exactMatch;
  const optionCount = filtered.length + (showCustom ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      const target = event.target as Node | null;
      if (
        target &&
        !rootRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function placeList() {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const formSurface = inputRef.current?.closest(
        '[data-testid="responsive-form-shell"]',
      );
      const formOverlay = formSurface?.querySelector(
        "[data-form-overlay-root]",
      );
      const bounds = formSurface?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
      };
      const below = bounds.bottom - rect.bottom - 8;
      const above = rect.top - bounds.top - 8;
      const useBelow = below >= 176 || below >= above;
      const available = Math.max(96, Math.min(256, useBelow ? below : above));
      const localLeft = rect.left - bounds.left;
      setPosition({
        left: Math.max(8, Math.min(localLeft, bounds.width - rect.width - 8)),
        top: useBelow
          ? rect.bottom - bounds.top + 4
          : Math.max(8, rect.top - bounds.top - available - 4),
        width: rect.width,
        maxHeight: available,
        portalTarget: formOverlay ?? document.body,
        strategy: formOverlay ? "absolute" : "fixed",
      });
    }
    placeList();
    window.addEventListener("resize", placeList);
    window.addEventListener("scroll", placeList, true);
    return () => {
      window.removeEventListener("resize", placeList);
      window.removeEventListener("scroll", placeList, true);
    };
  }, [open]);

  function openList() {
    if (!disabled && optionCount > 0) {
      setOpen(true);
      setHighlight(0);
    }
  }

  function commit(option: ComboboxOption | null) {
    if (option) onValueChange(option.label);
    onSelect(option);
    setOpen(false);
  }

  function commitIndex(index: number) {
    if (showCustom && index === 0) return commit(null);
    commit(filtered[showCustom ? index - 1 : index] ?? null);
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    action: () => void,
  ) {
    event.preventDefault();
    if (event.pointerType === "touch") action();
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        data-testid={inputTestId}
        className="min-h-11"
        onChange={(event) => {
          onValueChange(event.target.value);
          onSelect(null);
          setHighlight(0);
          if (!disabled) setOpen(true);
        }}
        onFocus={openList}
        onClick={openList}
        onBlur={() => {
          requestAnimationFrame(() => {
            if (!rootRef.current?.contains(document.activeElement))
              setOpen(false);
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) return openList();
            setHighlight((current) =>
              optionCount ? (current + 1) % optionCount : 0,
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) return openList();
            setHighlight((current) =>
              optionCount ? (current - 1 + optionCount) % optionCount : 0,
            );
          } else if (event.key === "Enter" && open && optionCount) {
            event.preventDefault();
            commitIndex(highlight);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />

      {open && optionCount > 0 && position
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              style={{
                position: position.strategy,
                left: position.left,
                top: position.top,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              className="pointer-events-auto z-[100] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-md touch-pan-y"
            >
              {showCustom ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={highlight === 0}
                  data-testid={addTestId}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-sm",
                    highlight === 0 && "bg-accent",
                  )}
                  onPointerDown={(event) =>
                    handlePointerDown(event, () => commit(null))
                  }
                  onClick={() => commit(null)}
                  onPointerMove={() => setHighlight(0)}
                >
                  <Plus className="size-4" aria-hidden />
                  Add “{trimmed}”
                </button>
              ) : null}
              {filtered.map((option, index) => {
                const optionIndex = showCustom ? index + 1 : index;
                const selected =
                  option.label.toLowerCase() === trimmed.toLowerCase();
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-testid={optionTestId}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-2 rounded-sm px-3 text-left text-sm",
                      highlight === optionIndex && "bg-accent",
                    )}
                    onPointerDown={(event) =>
                      handlePointerDown(event, () => commit(option))
                    }
                    onClick={() => commit(option)}
                    onPointerMove={() => setHighlight(optionIndex)}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.description ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                    {selected ? (
                      <Check className="size-4 shrink-0" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>,
            position.portalTarget,
          )
        : null}
    </div>
  );
}
