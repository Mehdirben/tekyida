import { WebHaptics, type HapticInput } from "web-haptics";

let hapticsInstance: WebHaptics | null = null;

const getHapticsInstance = (): WebHaptics | null => {
    if (typeof window === "undefined") {
        return null;
    }

    if (!hapticsInstance) {
        hapticsInstance = new WebHaptics();

        // iOS 26.5 WebKit Fix: iOS 26.5 WebKit optimizes or prevents haptic clicks on elements set to "display: none".
        // We preemptively call ensureDOM and replace "display: none" with an off-screen, opacity: 0 layout that remains active in the render tree.
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hapticObj = hapticsInstance as any;
            if (typeof hapticObj.ensureDOM === "function") {
                hapticObj.ensureDOM();
                const label = hapticObj.hapticLabel as HTMLLabelElement | null;
                if (label) {
                    label.style.display = "block";
                    label.style.position = "fixed";
                    label.style.left = "-9999px";
                    label.style.top = "-9999px";
                    label.style.width = "1px";
                    label.style.height = "1px";
                    label.style.overflow = "hidden";
                    label.style.opacity = "0";
                    label.style.pointerEvents = "none";

                    const input = label.querySelector("input");
                    if (input) {
                        input.style.display = "block";
                        input.style.position = "absolute";
                        input.style.opacity = "0";
                        input.style.pointerEvents = "none";
                    }
                }
            }
        } catch (error) {
            console.warn("[web-haptics] Failed to apply iOS 26.5 DOM override:", error);
        }
    }

    return hapticsInstance;
};

export const triggerHaptic = (input: HapticInput = "medium"): void => {
    const haptics = getHapticsInstance();
    if (!haptics) {
        return;
    }

    void haptics.trigger(input);
};

