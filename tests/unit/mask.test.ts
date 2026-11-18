import { describe, expect, it } from "vitest";
import { maskEmail } from "@/lib/mask";

describe("maskEmail (order-confirmation PII policy)", () => {
  it("keeps the first character of the local part and the full domain", () => {
    expect(maskEmail("test@nordhem.sg")).toBe("t***@nordhem.sg");
    expect(maskEmail("grace.tan@example.com")).toBe("g***@example.com");
  });

  it("handles short local parts without producing an empty mask", () => {
    expect(maskEmail("ab@x.sg")).toBe("a***@x.sg");
    expect(maskEmail("a@x.sg")).toBe("a***@x.sg");
  });

  it("returns a safe placeholder for malformed input (never throws, never echoes)", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail("not-an-email")).toBe("");
    expect(maskEmail("   ")).toBe("");
  });
});
