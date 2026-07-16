import { describe, expect, it } from "vitest";

import {
  parseEnv,
  parsePublicSupabaseEnv,
  parseSecretSupabaseEnv,
} from "@/lib/config/env-schema";

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
  SUPABASE_SECRET_KEY: "sb_secret_test_key",
};

describe("parsePublicSupabaseEnv", () => {
  it("parses public Supabase variables", () => {
    const result = parsePublicSupabaseEnv(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBe(
        "http://127.0.0.1:54321",
      );
    }
  });

  it("rejects an invalid URL", () => {
    const result = parsePublicSupabaseEnv({
      ...validEnv,
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("parseSecretSupabaseEnv", () => {
  it("requires the secret key", () => {
    const result = parseSecretSupabaseEnv({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.join("\n")).toContain("SUPABASE_SECRET_KEY");
    }
  });
});

describe("parseEnv", () => {
  it("parses the full environment", () => {
    const result = parseEnv(validEnv);
    expect(result.success).toBe(true);
  });

  it("reports missing variables by name without leaking values", () => {
    const result = parseEnv({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const joined = result.errors.join("\n");
      expect(joined).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(joined).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
      expect(joined).toContain("SUPABASE_SECRET_KEY");
      expect(joined).not.toContain("sb_secret");
    }
  });
});
