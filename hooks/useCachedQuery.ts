"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import * as queryCache from "@/lib/queryCache";

/**
 * A wrapper around Convex's useQuery that caches results in IndexedDB.
 * When offline (useQuery returns undefined), serves the last cached result.
 *
 * Usage:
 *   const data = useCachedQuery("notebooks.list", api.notebooks.list, {});
 *   const data = useCachedQuery("contacts.list", api.contacts.list, { notebookId });
 */
export function useCachedQuery<T>(
    /** A stable string key like "notebooks.list" */
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    funcRef: any,
    args: Record<string, unknown> | "skip"
): T | undefined {
    const liveData = useQuery(funcRef, args === "skip" ? "skip" : args);
    const [cachedData, setCachedData] = useState<T | undefined>(undefined);
    const cacheKeyRef = useRef<string | null>(null);

    const key = args === "skip" ? null : queryCache.cacheKey(name, args);

    // Load cached data on mount / when key changes
    useEffect(() => {
        if (!key) {
            setCachedData(undefined);
            return;
        }
        if (cacheKeyRef.current === key) return;
        cacheKeyRef.current = key;

        queryCache.get<T>(key).then((cached) => {
            if (cached !== undefined) {
                setCachedData(cached);
            }
        });
    }, [key]);

    // When live data arrives, update the cache
    useEffect(() => {
        if (liveData !== undefined && key) {
            setCachedData(liveData as T);
            queryCache.set(key, liveData);
        }
    }, [liveData, key]);

    // Return live data if available, otherwise cached data
    return liveData !== undefined ? (liveData as T) : cachedData;
}
