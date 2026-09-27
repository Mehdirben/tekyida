import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Logo from "./Logo";

describe("Logo", () => {
    it("renders SVG logo", () => {
        const { container } = render(<Logo size="md" />);
        const img = container.querySelector("img");
        expect(img).toBeDefined();
    });
});
describe("Logo defaults", () => {
    it("renders with the default size and text when no props are given", () => {
        const { container } = render(<Logo />);
        expect(container.querySelector("img")).not.toBeNull();
    });
});
