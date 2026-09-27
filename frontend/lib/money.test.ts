import { describe, it, expect } from "vitest";
import { formatBalance, balanceColor } from "./money";

describe("formatBalance", () => {
    it("formats positive amounts with + sign and MAD suffix", () => {
        expect(formatBalance(100)).toBe("+100.00 MAD");
        expect(formatBalance(12.5)).toBe("+12.50 MAD");
    });

    it("formats negative amounts without extra sign", () => {
        expect(formatBalance(-50.25)).toBe("-50.25 MAD");
    });

    it("treats zero as positive", () => {
        expect(formatBalance(0)).toBe("+0.00 MAD");
    });

    it("applies the mask function when provided", () => {
        const mask = (v: string) => `hidden(${v})`;
        expect(formatBalance(100, mask)).toBe("hidden(+100.00 MAD)");
    });
});

describe("balanceColor", () => {
    it("returns accent class for positive balances", () => {
        expect(balanceColor(1)).toBe("text-accent-500");
    });

    it("returns danger class for negative balances", () => {
        expect(balanceColor(-1)).toBe("text-danger-500");
    });

    it("returns primary zero class by default", () => {
        expect(balanceColor(0)).toBe("text-(--text-primary)");
    });

    it("returns custom zero class when provided", () => {
        expect(balanceColor(0, "text-(--text-secondary)")).toBe("text-(--text-secondary)");
    });
});
