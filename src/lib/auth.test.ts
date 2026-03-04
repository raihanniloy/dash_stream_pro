import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("Auth", () => {
  it("hashes a password to a non-plaintext string", async () => {
    const hash = await hashPassword("mysecretpassword");
    expect(hash).not.toBe("mysecretpassword");
    expect(hash.length).toBeGreaterThan(32);
  });

  it("verifies correct password against hash", async () => {
    const hash = await hashPassword("mysecretpassword");
    expect(await verifyPassword("mysecretpassword", hash)).toBe(true);
  });

  it("rejects wrong password against hash", async () => {
    const hash = await hashPassword("mysecretpassword");
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("produces different hashes for same password (salt randomness)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2);
  });
});
