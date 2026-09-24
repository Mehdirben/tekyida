"use client";

import { useState, useCallback, useEffect } from "react";
import { triggerHaptic } from "@/lib/haptics";

export function useSheetAnimation(onClose: () => void) {
    const [isClosing, setIsClosing] = useState(false);
    const [animateIn, setAnimateIn] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimateIn(false);
        }, 450);
        return () => clearTimeout(timer);
    }, []);

    const handleAnimatedClose = useCallback(() => {
        triggerHaptic("light");
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    }, [onClose]);

    return {
        isClosing,
        animateIn,
        handleAnimatedClose,
    };
}
