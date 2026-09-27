import { describe, it, expect } from "vitest";
import { toLocalDatetime, formatDate } from "./dateUtils";

describe("toLocalDatetime", () => {
    it("formats a timestamp as a local datetime-local string", () => {
        const ts = new Date(2026, 0, 2, 3, 4).getTime();
        expect(toLocalDatetime(ts)).toBe("2026-01-02T03:04");
    });

    it("pads single digit months, days, hours and minutes", () => {
        const ts = new Date(2026, 10, 5, 7, 8).getTime();
        expect(toLocalDatetime(ts)).toBe("2026-11-05T07:08");
    });
});

describe("formatDate", () => {
    it("includes the year of the timestamp", () => {
        const ts = new Date(2024, 5, 15, 12, 0).getTime();
        expect(formatDate(ts)).toContain("2024");
    });

    it("formats the epoch", () => {
        expect(formatDate(0)).toContain("1970");
    });
});
