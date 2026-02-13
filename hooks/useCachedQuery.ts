"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import * as queryCache from "@/lib/queryCache";

/**
 * A wrapper around Convex's useQuery that caches results in IndexedDB.
 * When offline (useQuery returns undefined), serves the last cached result.
 * Automatically re-reads from cache when optimistic updates modify it.
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
    const initialLoadDone = useRef(false);

    const key = args === "skip" ? null : queryCache.cacheKey(name, args);

    // Read from cache
    const readCache = useCallback(() => {
        if (!key) return;
        queryCache.get<T>(key).then((cached) => {
            if (cached !== undefined) {
                setCachedData(cached);
            }
        });
    }, [key]);

    // Load cached data on mount / when key changes
    useEffect(() => {
        if (!key) {
            setCachedData(undefined);
            cacheKeyRef.current = null;
            initialLoadDone.current = false;
            return;
        }
        // Key changed — clear stale data immediately, then load new cache
        if (cacheKeyRef.current !== key) {
            setCachedData(undefined);
        }
        cacheKeyRef.current = key;
        initialLoadDone.current = false;
        readCache();
    }, [key, readCache]);

    // Subscribe to cache changes (from optimistic updates)
    useEffect(() => {
        if (!key) return;
        const unsub = queryCache.subscribe((changedKey) => {
            if (changedKey === key) {
                readCache();
            }
        });
        return unsub;
    }, [key, readCache]);

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
