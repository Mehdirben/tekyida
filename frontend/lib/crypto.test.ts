import { describe, it, expect } from "vitest";
import { hashPin, generateSalt } from "./crypto";

describe("crypto utilities", () => {
  it("generateSalt - generates unique random hex string", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    expect(salt1.length).toBeGreaterThan(20);
    expect(salt2.length).toBeGreaterThan(20);
    expect(salt1).not.toBe(salt2);
    expect(/^[0-9a-f]+$/i.test(salt1)).toBe(true);
  });

  it("hashPin - produces deterministic PBKDF2 hash", async () => {
    const salt = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    const pin = "123456";

    const hash1 = await hashPin(pin, salt);
    const hash2 = await hashPin(pin, salt);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // 256 bits = 32 bytes = 64 hex chars

    // Different pin gives different hash
    const differentPinHash = await hashPin("654321", salt);
    expect(differentPinHash).not.toBe(hash1);
  });

  it("throws when window.crypto is unavailable", async () => {
    const originalCrypto = window.crypto;
    // @ts-expect-error testing missing crypto
    delete window.crypto;

    expect(() => generateSalt()).toThrow("Secure crypto not available");
    await expect(hashPin("123456", "salt")).rejects.toThrow("Secure crypto not available");

    window.crypto = originalCrypto;
  });
});
