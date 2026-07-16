/**
 * Typed domain repositories.
 *
 * Conventions:
 * - Import `createClient` from `lib/supabase/server` (cookie-backed SSR).
 * - Never use `createAdminClient` in normal repositories.
 * - Validate inputs/outputs with Zod domain schemas.
 * - UI routes and Server Actions call repositories; they do not query Supabase.
 *
 * Milestone 2 implements the household/auth membership path only.
 * Product repositories (budget, recipes, meals, grocery, subscriptions) land
 * with their feature milestones; tables and RLS already exist.
 */

export {
  getCurrentMembership,
  requireCurrentMembership,
} from "@/lib/repositories/households";
