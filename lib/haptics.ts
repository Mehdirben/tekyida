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
 * When the user touches an interactive element (button, link, or role="button"),
 * it dynamically overlays a transparent `<label>` associated with an `<input type="checkbox" switch>`
 * directly over the touched element before the click event fires.
 *
 * Because the subsequent click is registered by the browser as a trusted user click directly targeting
 * the label, the browser toggles the switch and fires the native iOS system haptic,
 * after which the click bubbles up normally to execute the original action.
 */
export const initGlobalHaptics = (): (() => void) => {
    if (typeof window === "undefined") {
        return () => {};
    }

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!isIOS) {
        return () => {};
    }

    let activeHaptic: {
        container: HTMLElement;
        input: HTMLInputElement;
        label: HTMLLabelElement;
        originalPosition: string;
    } | null = null;

    const cleanupActiveHaptic = () => {
        if (activeHaptic) {
            const { container, input, label, originalPosition } = activeHaptic;
            try {
                if (originalPosition) {
                    container.style.position = originalPosition;
                } else {
                    container.style.removeProperty("position");
                }
                input.remove();
                label.remove();
            } catch (e) {
                // Ignore removal errors
            }
            activeHaptic = null;
        }
    };

    const handleTouchStart = (e: TouchEvent) => {
        cleanupActiveHaptic();

        // Find the closest interactive element being touched
        const target = (e.target as HTMLElement).closest("button, a, [role='button'], [data-haptic]") as HTMLElement | null;
        if (!target || target.hasAttribute("disabled") || (target as any).disabled) {
            return;
        }

        const id = `global-haptic-${Math.random().toString(36).substring(2, 11)}`;

        // Create the hidden switch input
        const input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute("switch", "");
        input.id = id;
        input.style.position = "absolute";
        input.style.width = "1px";
        input.style.height = "1px";
        input.style.opacity = "0.0001";
        input.style.left = "0px";
        input.style.top = "0px";
        input.style.pointerEvents = "none";
        input.style.zIndex = "-99999";
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
        const originalPosition = target.style.position;
        const computedStyle = window.getComputedStyle(target);
        if (computedStyle.position === "static") {
            target.style.position = "relative";
        }

        // Append to interactive element
        target.appendChild(input);
        target.appendChild(label);

        activeHaptic = {
            container: target,
            input,
            label,
            originalPosition,
        };
    };

    const handleInteractionEnd = () => {
        // 100ms delay to let the browser process the trusted switch toggle and click propagation
        setTimeout(cleanupActiveHaptic, 100);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleInteractionEnd, { passive: true });
    window.addEventListener("touchcancel", handleInteractionEnd, { passive: true });
    window.addEventListener("click", handleInteractionEnd, { capture: true, passive: true });

    return () => {
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchend", handleInteractionEnd);
        window.removeEventListener("touchcancel", handleInteractionEnd);
        window.removeEventListener("click", handleInteractionEnd, { capture: true });
        cleanupActiveHaptic();
    };
};
