import { describe, it, expect } from "vitest";
import { parseTransactionForm } from "./transactionForm";

describe("parseTransactionForm", () => {
    it("parses a valid form with positive sign", () => {
        const result = parseTransactionForm("10.5", true, "  Lunch  ", "2026-01-02T10:30");
        expect(result).toEqual({
            amount: 10.5,
            description: "Lunch",
            date: new Date("2026-01-02T10:30").getTime(),
        });
    });

    it("negates the amount when sign is negative", () => {
        const result = parseTransactionForm("42", false, "", "2026-01-02T10:30");
        expect(result?.amount).toBe(-42);
    });

    it("returns undefined description when blank", () => {
        const result = parseTransactionForm("5", true, "   ", "2026-01-02T10:30");
        expect(result?.description).toBeUndefined();
    });

    it("returns null for empty amount", () => {
        expect(parseTransactionForm("", true, "x", "2026-01-02T10:30")).toBeNull();
    });

    it("returns null for non-numeric amount", () => {
        expect(parseTransactionForm("abc", true, "", "")).toBeNull();
    });

    it("returns null for zero amount", () => {
        expect(parseTransactionForm("0", true, "", "")).toBeNull();
    });

    it("returns null for negative amount", () => {
        expect(parseTransactionForm("-5", true, "", "")).toBeNull();
    });

    it("falls back to Date.now() when date input is empty", () => {
        const before = Date.now();
        const result = parseTransactionForm("5", true, "", "");
        expect(result?.date).toBeGreaterThanOrEqual(before);
    });

    it("falls back to Date.now() when date input is invalid", () => {
        const before = Date.now();
        const result = parseTransactionForm("5", true, "", "not-a-date");
        expect(result?.date).toBeGreaterThanOrEqual(before);
    });
});
