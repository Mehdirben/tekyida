import { describe, it, expect, beforeEach } from "vitest";
import {
    isLockEnabled,
    getStoredPinCredentials,
    verifyPin,
    savePin,
    clearPinStorage,
} from "./pinStorage";

describe("pinStorage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("reports lock disabled by default", () => {
        expect(isLockEnabled()).toBe(false);
    });

    it("returns no credentials when nothing is stored", async () => {
        expect(getStoredPinCredentials()).toBeNull();
        expect(await verifyPin("123456")).toBe(false);
    });

    it("saves a PIN, enables the lock, and verifies it", async () => {
        await savePin("123456");
        expect(isLockEnabled()).toBe(true);
        expect(getStoredPinCredentials()).not.toBeNull();
        expect(await verifyPin("123456")).toBe(true);
        expect(await verifyPin("000000")).toBe(false);
    });

    it("overwrites a previous PIN", async () => {
        await savePin("111111");
        await savePin("222222");
        expect(await verifyPin("222222")).toBe(true);
        expect(await verifyPin("111111")).toBe(false);
    });

    it("clears the PIN storage", async () => {
        await savePin("123456");
        clearPinStorage();
        expect(isLockEnabled()).toBe(false);
        expect(getStoredPinCredentials()).toBeNull();
    });
});
