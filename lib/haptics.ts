import { WebHaptics, type HapticInput } from "web-haptics";

let hapticsInstance: WebHaptics | null = null;

const getHapticsInstance = (): WebHaptics | null => {
    if (typeof window === "undefined") {
        return null;
    }

    if (!hapticsInstance) {
        hapticsInstance = new WebHaptics();

        // iOS 26.5 WebKit Fix: iOS 26.5 WebKit optimizes or prevents haptic clicks on elements set to "display: none" or placed off-screen.
        // We preemptively call ensureDOM and keep the element in the active viewport with a tiny, non-zero opacity (0.0001) and z-index so WebKit's visibility check is satisfied while keeping it invisible.
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

