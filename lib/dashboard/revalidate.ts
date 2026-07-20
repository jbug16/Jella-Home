import "server-only";

import { revalidatePath } from "next/cache";

/** Paths that surface household summaries on the Dashboard home. */
export const DASHBOARD_PATH = "/dashboard";

/**
 * Revalidate the Dashboard after any mutation that can change home cards
 * (budget, meals, shopping, recipes). Prefer this helper so future actions
 * do not omit `/dashboard`.
 */
export function revalidateDashboard(): void {
  revalidatePath(DASHBOARD_PATH);
}

/**
 * Revalidate a module path and the Dashboard together.
 */
export function revalidateModuleAndDashboard(...modulePaths: string[]): void {
  for (const path of modulePaths) {
    revalidatePath(path);
  }
  revalidateDashboard();
}
