import { useState } from "react";
import { useAmountsVisibility } from "@/contexts/AmountsVisibilityContext";
import { triggerHaptic } from "@/lib/haptics";

export function useLocalAmountsVisibility() {
    const { hidden: globalHidden } = useAmountsVisibility();
    const [localHidden, setLocalHidden] = useState(globalHidden);
    const localMask = (value: string) => (localHidden ? "••••••" : value);
    const toggleLocal = () => {
        setLocalHidden((prev) => !prev);
        triggerHaptic("selection");
    };
    return { localHidden, localMask, toggleLocal };
}
