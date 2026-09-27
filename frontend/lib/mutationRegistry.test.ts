import { describe, it, expect } from "vitest";
import { mutationRegistry } from "./mutationRegistry";

describe("mutationRegistry", () => {
    it("maps all 17 supported offline mutation paths", () => {
        const paths = Object.keys(mutationRegistry);
        expect(paths).toHaveLength(17);
        expect(paths).toContain("notebooks:create");
        expect(paths).toContain("notebooks:reorder");
        expect(paths).toContain("contacts:remove");
        expect(paths).toContain("transactions:update");
        expect(paths).toContain("experiences:transfer");
    });

    it("maps every path to a Convex function reference", () => {
        for (const ref of Object.values(mutationRegistry)) {
            expect(ref).toBeDefined();
            expect((ref as unknown as { _def?: { path?: string } })._def?.path).toBeTruthy();
        }
    });
});
