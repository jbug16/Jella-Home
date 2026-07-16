import {
  BookOpen,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Primary items appear directly in the mobile bottom bar.
   * Non-primary items are grouped under the "More" sheet on mobile.
   * Every item always appears in the desktop/tablet-landscape sidebar.
   */
  primary: boolean;
};

/**
 * Single source of truth for household navigation. Consumed by both the
 * sidebar (desktop + iPad landscape) and the mobile navigation (phones +
 * iPad portrait) so the two modes never drift apart.
 */
export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    primary: true,
  },
  { label: "Budget", href: "/budget", icon: Wallet, primary: true },
  { label: "Meals", href: "/meals", icon: UtensilsCrossed, primary: true },
  { label: "Shopping", href: "/shopping", icon: ShoppingCart, primary: true },
  { label: "Recipes", href: "/recipes", icon: BookOpen, primary: false },
  {
    label: "Subscriptions",
    href: "/subscriptions",
    icon: CreditCard,
    primary: false,
  },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, primary: false },
];

export const primaryNavItems = navItems.filter((item) => item.primary);
export const secondaryNavItems = navItems.filter((item) => !item.primary);

/** True when the given nav href matches the current pathname. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
