import { WebHaptics, type HapticInput } from "web-haptics";

let hapticsInstance: WebHaptics | null = null;

const getHapticsInstance = (): WebHaptics | null => {
    if (typeof window === "undefined") {
        return null;
    }

    if (!hapticsInstance) {
        hapticsInstance = new WebHaptics();
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

    const SELECTOR = "button, a, [role='button'], [data-haptic]";

    const setupHapticElements = (el: HTMLElement) => {
        // Skip if disabled
        if (el.hasAttribute("disabled") || (el as any).disabled) {
            return;
        }

        // Check if already has haptic elements as direct children (prevents nested querySelector bugs)
        const hasHapticInput = Array.from(el.children).some(child => child.id && child.id.startsWith("global-haptic-"));
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
        // Removed z-10 to prevent blocking explicitly layered nested interactive elements
        label.className = "absolute inset-0 cursor-pointer opacity-0";
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
    document.querySelectorAll(SELECTOR).forEach((el) => {
        setupHapticElements(el as HTMLElement);
    });

    // Observe future elements and subtree changes
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const targetEl = mutation.target as HTMLElement;

            // Handle attribute changes (e.g., button becoming enabled/disabled)
            if (mutation.type === "attributes" && mutation.attributeName === "disabled") {
                if (targetEl.matches && targetEl.matches(SELECTOR)) {
                    if (targetEl.hasAttribute("disabled") || (targetEl as any).disabled) {
                        // Elements are disabled, clicks naturally won't trigger haptics.
                    } else {
                        setupHapticElements(targetEl);
                    }
                }
                continue;
            }

            // If the mutated element's children changed, verify if it is interactive
            if (targetEl && targetEl.closest) {
                const interactiveParent = targetEl.closest(SELECTOR) as HTMLElement | null;
                if (interactiveParent) {
                    setupHapticElements(interactiveParent);
                }
            }

            // Check newly added nodes
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        if (node.matches(SELECTOR)) {
                            setupHapticElements(node);
                        }
                        node.querySelectorAll(SELECTOR).forEach((child) => {
                            setupHapticElements(child as HTMLElement);
                        });
                    }
                });
            }
        }
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled"]
    });

    return () => {
        observer.disconnect();
    };
};
