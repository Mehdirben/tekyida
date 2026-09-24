"use client";

import { useEffect } from "react";

// Prevent background page scroll while an overlay/sheet is open.
export function useBodyScrollLock(locked: boolean) {
    useEffect(() => {
        if (!locked) return;

        const body = document.body;
        const html = document.documentElement;
        const scrollY = window.scrollY;

        const previousBody = {
            position: body.style.position,
            top: body.style.top,
            left: body.style.left,
            right: body.style.right,
            width: body.style.width,
            overflow: body.style.overflow,
            touchAction: body.style.touchAction,
        };

        const previousHtml = {
            overflow: html.style.overflow,
            overscrollBehavior: html.style.overscrollBehavior,
        };

        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        body.style.overflow = "hidden";
        body.style.touchAction = "none";

        html.style.overflow = "hidden";
        html.style.overscrollBehavior = "none";

        return () => {
            // Disable smooth scrolling temporarily to prevent page scroll transitions
            const prevScrollBehavior = html.style.scrollBehavior;
            html.style.scrollBehavior = "auto";

            body.style.position = previousBody.position;
            body.style.top = previousBody.top;
            body.style.left = previousBody.left;
            body.style.right = previousBody.right;
            body.style.width = previousBody.width;
            body.style.overflow = previousBody.overflow;
            body.style.touchAction = previousBody.touchAction;

            html.style.overflow = previousHtml.overflow;
            html.style.overscrollBehavior = previousHtml.overscrollBehavior;

            window.scrollTo(0, scrollY);

            // Force layout reflow to ensure the instant scroll is applied before restoring smooth scroll
            void html.offsetHeight;
            html.style.scrollBehavior = prevScrollBehavior;
        };
    }, [locked]);
}
