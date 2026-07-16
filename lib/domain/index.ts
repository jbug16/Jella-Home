/**
 * Shared domain schemas and types.
 *
 * Milestone 2 ships the household/membership schemas used by auth gating.
 * Feature domains (budget, recipes, meals, grocery, subscriptions) add schemas
 * with their respective milestones.
 */

export {
  householdMemberRoleSchema,
  householdMembershipSchema,
  householdSchema,
  type Household,
  type HouseholdMemberRole,
  type HouseholdMembership,
} from "@/lib/domain/household";
