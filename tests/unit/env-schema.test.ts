import { describe, expect, it } from "vitest";

import {
  normalizePrivateKey,
  parseAllowlist,
  parseEnv,
} from "@/lib/config/env-schema";

const validEnv = {
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@project.iam.gserviceaccount.com",
  GOOGLE_PRIVATE_KEY:
    "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
  GOOGLE_SHEETS_SPREADSHEET_ID: "sheet-123",
  AUTH_ALLOWLIST: "Jenna@example.com, partner@example.com",
};

describe("normalizePrivateKey", () => {
  it("converts escaped newlines into real newlines", () => {
    expect(normalizePrivateKey("line1\\nline2")).toBe("line1\nline2");
  });

  it("leaves already-real newlines untouched", () => {
    expect(normalizePrivateKey("line1\nline2")).toBe("line1\nline2");
  });
});

describe("parseAllowlist", () => {
  it("trims, lower-cases, and de-duplicates emails", () => {
    expect(parseAllowlist("A@x.com, a@x.com , B@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
    ]);
  });

  it("ignores empty entries", () => {
    expect(parseAllowlist("a@x.com,,")).toEqual(["a@x.com"]);
  });
});

describe("parseEnv", () => {
  it("parses and transforms a valid environment", () => {
    const result = parseEnv(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GOOGLE_PRIVATE_KEY).toContain("\n");
      expect(result.data.GOOGLE_PRIVATE_KEY).not.toContain("\\n");
      expect(result.data.AUTH_ALLOWLIST).toEqual([
        "jenna@example.com",
        "partner@example.com",
      ]);
    }
  });

  it("reports missing variables by name without leaking values", () => {
    const result = parseEnv({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const joined = result.errors.join("\n");
      expect(joined).toContain("GOOGLE_SERVICE_ACCOUNT_EMAIL");
      expect(joined).toContain("AUTH_ALLOWLIST");
    }
  });

  it("rejects an invalid service-account email", () => {
    const result = parseEnv({
      ...validEnv,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});
