import { z } from "zod";

export const householdMemberRoleSchema = z.enum(["owner", "member"]);

export const householdSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const householdMembershipSchema = z.object({
  memberId: z.uuid(),
  userId: z.uuid(),
  displayName: z.string().min(1),
  role: householdMemberRoleSchema,
  household: householdSchema,
});

export type Household = z.infer<typeof householdSchema>;
export type HouseholdMembership = z.infer<typeof householdMembershipSchema>;
export type HouseholdMemberRole = z.infer<typeof householdMemberRoleSchema>;
