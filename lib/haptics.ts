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
    const haptics = getHapticsInstance();
    if (!haptics) {
        return;
    }

    void haptics.trigger(input);
};
