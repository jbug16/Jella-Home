import {
  Car,
  Clapperboard,
  Cpu,
  CreditCard,
  Heart,
  Home,
  Landmark,
  PawPrint,
  PiggyBank,
  Receipt,
  Shield,
  ShoppingCart,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { BudgetCategoryKind } from "@/lib/domain/budget";

export type BudgetCategoryVisual = {
  icon: LucideIcon;
  /** Icon badge on lists. */
  chipClassName: string;
  /** Bar / chart segment fill (Tailwind). */
  barClassName: string;
  /** Hex color for CSS charts (conic-gradient). */
  chartColor: string;
};

/** Keyword → visual (first match wins). */
const NAME_VISUALS: Array<{ pattern: RegExp; visual: BudgetCategoryVisual }> = [
  {
    pattern: /grocer|grocery|food shop|\bfood\b/i,
    visual: {
      icon: ShoppingCart,
      chipClassName:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      barClassName: "bg-emerald-500",
      chartColor: "#10b981",
    },
  },
  {
    pattern: /dining|restaurant|takeout|eat out/i,
    visual: {
      icon: UtensilsCrossed,
      chipClassName:
        "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
      barClassName: "bg-orange-500",
      chartColor: "#f97316",
    },
  },
  {
    pattern: /entertain|stream|movie|fun/i,
    visual: {
      icon: Clapperboard,
      chipClassName:
        "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
      barClassName: "bg-violet-500",
      chartColor: "#8b5cf6",
    },
  },
  {
    pattern: /transport|gas|car|uber|transit/i,
    visual: {
      icon: Car,
      chipClassName:
        "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
      barClassName: "bg-sky-500",
      chartColor: "#0ea5e9",
    },
  },
  {
    pattern: /health|medical|doctor|pharmacy/i,
    visual: {
      icon: Heart,
      chipClassName:
        "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
      barClassName: "bg-rose-500",
      chartColor: "#f43f5e",
    },
  },
  {
    pattern: /home|household|rent|mortgage/i,
    visual: {
      icon: Home,
      chipClassName:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
      barClassName: "bg-amber-500",
      chartColor: "#f59e0b",
    },
  },
  {
    pattern: /utilit|electric|water|internet|phone/i,
    visual: {
      icon: Zap,
      chipClassName:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
      barClassName: "bg-yellow-500",
      chartColor: "#eab308",
    },
  },
  {
    pattern: /insur/i,
    visual: {
      icon: Shield,
      chipClassName:
        "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
      barClassName: "bg-teal-500",
      chartColor: "#14b8a6",
    },
  },
  {
    pattern: /pet/i,
    visual: {
      icon: PawPrint,
      chipClassName:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
      barClassName: "bg-amber-600",
      chartColor: "#d97706",
    },
  },
  {
    pattern: /tech|software|app|subscri/i,
    visual: {
      icon: Cpu,
      chipClassName:
        "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
      barClassName: "bg-cyan-500",
      chartColor: "#06b6d4",
    },
  },
  {
    pattern: /saving/i,
    visual: {
      icon: PiggyBank,
      chipClassName:
        "bg-lime-100 text-lime-800 dark:bg-lime-950/50 dark:text-lime-300",
      barClassName: "bg-lime-500",
      chartColor: "#84cc16",
    },
  },
  {
    pattern: /debt|loan|credit card/i,
    visual: {
      icon: Landmark,
      chipClassName:
        "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      barClassName: "bg-red-500",
      chartColor: "#ef4444",
    },
  },
  {
    pattern: /bill/i,
    visual: {
      icon: Receipt,
      chipClassName:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      barClassName: "bg-slate-500",
      chartColor: "#64748b",
    },
  },
];

const KIND_VISUALS: Record<BudgetCategoryKind, BudgetCategoryVisual> = {
  income: {
    icon: TrendingUp,
    chipClassName:
      "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    barClassName: "bg-green-500",
    chartColor: "#22c55e",
  },
  expense: {
    icon: Wallet,
    chipClassName:
      "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    barClassName: "bg-sky-500",
    chartColor: "#0ea5e9",
  },
  bill: {
    icon: Receipt,
    chipClassName:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    barClassName: "bg-slate-500",
    chartColor: "#64748b",
  },
  savings: {
    icon: PiggyBank,
    chipClassName:
      "bg-lime-100 text-lime-800 dark:bg-lime-950/50 dark:text-lime-300",
    barClassName: "bg-lime-500",
    chartColor: "#84cc16",
  },
  debt: {
    icon: CreditCard,
    chipClassName:
      "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    barClassName: "bg-red-500",
    chartColor: "#ef4444",
  },
};

const FALLBACK_VISUAL: BudgetCategoryVisual = {
  icon: Tag,
  chipClassName: "bg-muted text-muted-foreground",
  barClassName: "bg-muted-foreground/50",
  chartColor: "#94a3b8",
};

/** Resolve icon + colors from category name, then kind, then fallback. */
export function budgetCategoryVisual(
  name: string,
  kind: BudgetCategoryKind,
): BudgetCategoryVisual {
  const trimmed = name.trim();
  for (const entry of NAME_VISUALS) {
    if (entry.pattern.test(trimmed)) {
      return entry.visual;
    }
  }
  return KIND_VISUALS[kind] ?? FALLBACK_VISUAL;
}
