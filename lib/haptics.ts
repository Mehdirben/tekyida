import { WebHaptics, type HapticInput } from "web-haptics";

let hapticsInstance: WebHaptics | null = null;

const getHapticsInstance = (): WebHaptics | null => {
    if (typeof window === "undefined") {
        return null;
    }

    if (!hapticsInstance) {
        hapticsInstance = new WebHaptics();

        // iOS WebKit display: none / off-screen optimizations workaround
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hapticObj = hapticsInstance as any;
            if (typeof hapticObj.ensureDOM === "function") {
                hapticObj.ensureDOM();
                const label = hapticObj.hapticLabel as HTMLLabelElement | null;
                if (label) {
                    label.style.display = "block";
                    label.style.position = "fixed";
                    label.style.left = "0px";
                    label.style.top = "0px";
                    label.style.width = "1px";
                    label.style.height = "1px";
                    label.style.overflow = "hidden";
                    label.style.opacity = "0.0001";
                    label.style.pointerEvents = "none";
                    label.style.zIndex = "-99999";

                    const input = label.querySelector("input");
                    if (input) {
                        input.style.display = "block";
                        input.style.position = "absolute";
                        input.style.left = "0px";
                        input.style.top = "0px";
                        input.style.width = "1px";
                        input.style.height = "1px";
                        input.style.opacity = "0.0001";
                        input.style.pointerEvents = "none";
                        input.style.zIndex = "-99999";
                    }
                }
            }
        } catch (error) {
            console.warn("[web-haptics] Failed to apply WebKit DOM override:", error);
        }
    }

    return hapticsInstance;
};

export const triggerHaptic = (input: HapticInput = "medium"): void => {
    // On iOS, programmatic triggers are blocked by WebKit unless initiated directly by a trusted user event on the checkbox/label.
    // Thus, iOS haptics are handled globally via a trusted event overlay.
    if (typeof window !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))) {
        return;
    }

    const haptics = getHapticsInstance();
    if (!haptics) {
        return;
    }

    void haptics.trigger(input);
};

/**
 * Initializes global haptic feedback listeners for iOS Safari (WebKit) on iOS 26.5+.
 * This solution scans the DOM and uses a MutationObserver to append a static, transparent
 * `<label>` and `<input type="checkbox" switch>` pair inside all interactive elements (buttons, links, etc.).
 *
 * Because these elements are present in the DOM *before* the user touches the screen,
 * a single tap correctly targets the transparent label, triggers native switch haptics
 * on iOS, and bubbles up to fire the button's action in one smooth step.
 */
export const initGlobalHaptics = (): (() => void) => {
    if (typeof window === "undefined") {
        return () => {};
    }

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!isIOS) {
        return () => {};
    }

    const setupHapticElements = (el: HTMLElement) => {
        // Skip if disabled or already containing haptic elements
        if (el.hasAttribute("disabled") || (el as any).disabled) {
            return;
        }

        const hasHapticInput = el.querySelector("input[id^='global-haptic-']");
        if (hasHapticInput) {
            return;
        }

        const id = `global-haptic-${Math.random().toString(36).substring(2, 11)}`;

        // Create the hidden switch input
        const input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute("switch", "");
        input.id = id;
        input.className = "absolute pointer-events-none opacity-0 w-px h-px left-0 top-0";
        input.style.zIndex = "-1";
        input.readOnly = true;

        // Create the transparent label overlay
        const label = document.createElement("label");
        label.htmlFor = id;
        label.style.position = "absolute";
        label.style.top = "0px";
        label.style.left = "0px";
        label.style.right = "0px";
        label.style.bottom = "0px";
        label.style.opacity = "0.0001";
        label.style.zIndex = "99999";
        label.style.cursor = "pointer";
        label.style.setProperty("-webkit-tap-highlight-color", "transparent");

        // Ensure container is relative/absolute/fixed so absolute overlay fits it
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.position === "static") {
            el.style.position = "relative";
        }

        // Append to interactive element
        el.appendChild(input);
        el.appendChild(label);
    };

    // Scan existing elements
    document.querySelectorAll("button, a, [role='button'], [data-haptic]").forEach((el) => {
        setupHapticElements(el as HTMLElement);
    });

    // Observe future elements and subtree changes
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // If the mutated element's children changed, verify if it is interactive
            const targetEl = mutation.target as HTMLElement;
            if (targetEl && targetEl.closest) {
                const interactiveParent = targetEl.closest("button, a, [role='button'], [data-haptic]") as HTMLElement | null;
                if (interactiveParent) {
                    setupHapticElements(interactiveParent);
                }
            }

            // Check newly added nodes
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        if (node.matches("button, a, [role='button'], [data-haptic]")) {
                            setupHapticElements(node);
                        }
                        node.querySelectorAll("button, a, [role='button'], [data-haptic]").forEach((child) => {
                            setupHapticElements(child as HTMLElement);
                        });
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
        observer.disconnect();
    };
};
