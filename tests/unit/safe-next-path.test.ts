import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/safe-next-path";

describe("safeNextPath", () => {
  it("allows internal paths and query strings", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/budget?month=2026-07")).toBe("/budget?month=2026-07");
    expect(safeNextPath("/meals?week=2026-07-19")).toBe(
      "/meals?week=2026-07-19",
    );
  });

  it("rejects protocol-relative and absolute external URLs", () => {
    expect(safeNextPath("//attacker.example")).toBe("/dashboard");
    expect(safeNextPath("https://attacker.example")).toBe("/dashboard");
    expect(safeNextPath("http://attacker.example/phish")).toBe("/dashboard");
  });

  it("rejects backslashes and control characters", () => {
    expect(safeNextPath("/\\evil")).toBe("/dashboard");
    expect(safeNextPath("/ok\n/evil")).toBe("/dashboard");
  });

  it("falls back when empty or missing", () => {
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath("relative")).toBe("/dashboard");
  });
});
