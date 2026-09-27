import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * haptics.ts keeps module-level state (a singleton instance), so every test
 * re-imports the module in isolation with vi.resetModules().
 */

const triggerMock = vi.fn().mockResolvedValue(undefined);

vi.mock("web-haptics", () => ({
    WebHaptics: class {
        trigger = triggerMock;
    },
}));

async function importHaptics() {
    return await import("./haptics");
}

function stubNavigator(overrides: Partial<{ userAgent: string; platform: string; maxTouchPoints: number }>) {
    const original = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
    };
    for (const [key, value] of Object.entries(overrides)) {
        Object.defineProperty(navigator, key, { value, configurable: true });
    }
    return () => {
        Object.defineProperty(navigator, "userAgent", { value: original.userAgent, configurable: true });
        Object.defineProperty(navigator, "platform", { value: original.platform, configurable: true });
        Object.defineProperty(navigator, "maxTouchPoints", { value: original.maxTouchPoints, configurable: true });
    };
}

describe("triggerHaptic", () => {
    beforeEach(() => {
        vi.resetModules();
        triggerMock.mockClear();
    });

    it("triggers haptics with the default intensity", async () => {
        const restore = stubNavigator({ userAgent: "Chrome", platform: "Linux", maxTouchPoints: 0 });
        const { triggerHaptic } = await importHaptics();
        triggerHaptic();
        expect(triggerMock).toHaveBeenCalledWith("medium");
        restore();
    });

    it("triggers haptics with a specific intensity", async () => {
        const restore = stubNavigator({ userAgent: "Chrome", platform: "Linux", maxTouchPoints: 0 });
        const { triggerHaptic } = await importHaptics();
        triggerHaptic("success");
        expect(triggerMock).toHaveBeenCalledWith("success");
        restore();
    });

    it("reuses the singleton instance across calls", async () => {
        const restore = stubNavigator({ userAgent: "Chrome", platform: "Linux", maxTouchPoints: 0 });
        const { triggerHaptic } = await importHaptics();
        triggerHaptic("light");
        triggerHaptic("warning");
        expect(triggerMock).toHaveBeenCalledTimes(2);
        restore();
    });

    it("does nothing on iOS devices", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { triggerHaptic } = await importHaptics();
        triggerHaptic("light");
        expect(triggerMock).not.toHaveBeenCalled();
        restore();
    });

    it("does nothing on iPad-identified Macs (MacIntel with touch)", async () => {
        const restore = stubNavigator({ userAgent: "Safari", platform: "MacIntel", maxTouchPoints: 2 });
        const { triggerHaptic } = await importHaptics();
        triggerHaptic("light");
        expect(triggerMock).not.toHaveBeenCalled();
        restore();
    });

    it("triggers normally on Intel Macs without touch", async () => {
        const restore = stubNavigator({ userAgent: "Safari", platform: "MacIntel", maxTouchPoints: 1 });
        const { triggerHaptic } = await importHaptics();
        triggerHaptic("light");
        expect(triggerMock).toHaveBeenCalledWith("light");
        restore();
    });

    it("does nothing when window is undefined (SSR)", async () => {
        const { triggerHaptic } = await importHaptics();
        const windowSpy = vi.spyOn(globalThis, "window", "get").mockReturnValue(undefined as never);
        triggerHaptic("light");
        expect(triggerMock).not.toHaveBeenCalled();
        windowSpy.mockRestore();
    });
});

describe("initGlobalHaptics", () => {
    beforeEach(() => {
        vi.resetModules();
        document.body.innerHTML = "";
    });

    afterEach(() => {
        document.body.innerHTML = "";
        stubNavigator({ userAgent: "Chrome", platform: "Linux", maxTouchPoints: 0 })();
    });

    it("returns a no-op cleanup on iOS-less browsers", async () => {
        const restore = stubNavigator({ userAgent: "Chrome", platform: "Linux", maxTouchPoints: 0 });
        const { initGlobalHaptics } = await importHaptics();
        const cleanup = initGlobalHaptics();
        expect(typeof cleanup).toBe("function");
        expect(() => cleanup()).not.toThrow();
        restore();
    });

    it("initializes on iPad-identified Macs", async () => {
        const restore = stubNavigator({ userAgent: "Safari", platform: "MacIntel", maxTouchPoints: 2 });
        const { initGlobalHaptics } = await importHaptics();

        const button = document.createElement("button");
        document.body.appendChild(button);

        const cleanup = initGlobalHaptics();
        expect(button.querySelector("input[id^='global-haptic-']")).not.toBeNull();

        cleanup();
        restore();
    });

    it("returns a no-op cleanup when window is undefined", async () => {
        const { initGlobalHaptics } = await importHaptics();
        const windowSpy = vi.spyOn(globalThis, "window", "get").mockReturnValue(undefined as never);
        const cleanup = initGlobalHaptics();
        expect(() => cleanup()).not.toThrow();
        windowSpy.mockRestore();
    });

    it("sets up haptic overlays for existing interactive elements on iOS", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const button = document.createElement("button");
        button.textContent = "Tap";
        button.style.position = "static";
        document.body.appendChild(button);

        const cleanup = initGlobalHaptics();

        const hapticInput = button.querySelector("input[id^='global-haptic-']");
        const hapticLabel = button.querySelector("label");
        expect(hapticInput).not.toBeNull();
        expect(hapticLabel).not.toBeNull();
        expect(button.style.position).toBe("relative");

        cleanup();
        restore();
    });

    it("keeps existing positioning on non-static elements", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const button = document.createElement("button");
        button.style.position = "absolute";
        document.body.appendChild(button);

        const cleanup = initGlobalHaptics();
        expect(button.querySelector("input[id^='global-haptic-']")).not.toBeNull();
        expect(button.style.position).toBe("absolute");

        cleanup();
        restore();
    });

    it("syncs disabled state for elements that already have overlays", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const button = document.createElement("button");
        document.body.appendChild(button);
        const cleanup = initGlobalHaptics();

        // Disable the button: the overlay input should become disabled too
        button.setAttribute("disabled", "disabled");
        await new Promise((r) => setTimeout(r, 0));

        const hapticInput = button.querySelector("input[id^='global-haptic-']") as HTMLInputElement;
        expect(hapticInput.disabled).toBe(true);

        // Re-enable
        button.removeAttribute("disabled");
        await new Promise((r) => setTimeout(r, 0));
        expect(hapticInput.disabled).toBe(false);

        cleanup();
        restore();
    });

    it("sets up overlays for buttons added after initialization", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const cleanup = initGlobalHaptics();

        const button = document.createElement("button");
        document.body.appendChild(button);
        await new Promise((r) => setTimeout(r, 0));

        expect(button.querySelector("input[id^='global-haptic-']")).not.toBeNull();

        cleanup();
        restore();
    });

    it("ignores mutations caused by its own overlay elements", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const button = document.createElement("button");
        document.body.appendChild(button);
        const cleanup = initGlobalHaptics();
        const input = button.querySelector("input[id^='global-haptic-']") as HTMLInputElement;

        // Mutating the overlay itself must not duplicate overlays
        input.appendChild(document.createElement("span"));
        await new Promise((r) => setTimeout(r, 0));

        expect(button.querySelectorAll("input[id^='global-haptic-']").length).toBe(1);

        cleanup();
        restore();
    });

    it("re-dispatches clicks from the overlay input onto the host element", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const button = document.createElement("button");
        const clickSpy = vi.fn();
        button.addEventListener("click", clickSpy);
        document.body.appendChild(button);

        const cleanup = initGlobalHaptics();
        const hapticInput = button.querySelector("input[id^='global-haptic-']") as HTMLInputElement;

        hapticInput.click();
        await new Promise((r) => setTimeout(r, 10));

        expect(clickSpy).toHaveBeenCalledTimes(1);

        cleanup();
        restore();
    });

    it("produces a single host click when the overlay label is clicked", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const button = document.createElement("button");
        const clickSpy = vi.fn();
        button.addEventListener("click", clickSpy);
        document.body.appendChild(button);

        const cleanup = initGlobalHaptics();
        const hapticLabel = button.querySelector("label") as HTMLLabelElement;

        hapticLabel.click();
        await new Promise((r) => setTimeout(r, 10));

        expect(clickSpy).toHaveBeenCalledTimes(1);

        cleanup();
        restore();
    });

    it("sets up overlays for buttons nested inside added nodes", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const cleanup = initGlobalHaptics();

        const container = document.createElement("div");
        const nestedButton = document.createElement("button");
        container.appendChild(nestedButton);
        document.body.appendChild(container);
        await new Promise((r) => setTimeout(r, 10));

        expect(nestedButton.querySelector("input[id^='global-haptic-']")).not.toBeNull();

        cleanup();
        restore();
    });

    it("syncs disabled state when a disabled element is added before its overlay exists", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const cleanup = initGlobalHaptics();

        const button = document.createElement("button");
        button.setAttribute("disabled", "disabled");
        document.body.appendChild(button);
        await new Promise((r) => setTimeout(r, 10));

        const hapticInput = button.querySelector("input[id^='global-haptic-']") as HTMLInputElement | null;
        expect(hapticInput).not.toBeNull();
        expect(hapticInput!.disabled).toBe(true);

        cleanup();
        restore();
    });

    it("skips the disabled sync when the overlay input is gone", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const button = document.createElement("button");
        document.body.appendChild(button);
        const cleanup = initGlobalHaptics();
        const hapticInput = button.querySelector("input[id^='global-haptic-']");
        expect(hapticInput).not.toBeNull();

        // Trigger the disabled attribute change after removing the overlay:
        // the observer processes the attribute record against the current DOM,
        // where no overlay input exists anymore.
        button.setAttribute("disabled", "disabled");
        button.removeChild(hapticInput!);
        await new Promise((r) => setTimeout(r, 0));

        cleanup();
        restore();
    });

    it("disconnects the observer on cleanup", async () => {
        const restore = stubNavigator({ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
        const { initGlobalHaptics } = await importHaptics();

        const cleanup = initGlobalHaptics();
        cleanup();

        const button = document.createElement("button");
        document.body.appendChild(button);
        await new Promise((r) => setTimeout(r, 0));

        expect(button.querySelector("input[id^='global-haptic-']")).toBeNull();
        restore();
    });
});
