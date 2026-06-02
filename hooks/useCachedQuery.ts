"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import * as queryCache from "@/lib/queryCache";

// Track hydration globally for this module to avoid hydration mismatches
// on the first render, while allowing synchronous cache reads thereafter.
let isHydrated = false;

/**
 * A wrapper around Convex's useQuery that caches results in IndexedDB and memory.
 * When offline (useQuery returns undefined), serves the last cached result.
 * Automatically re-reads from cache when optimistic updates modify it.
 *
 * When the browser goes offline, cached data (which includes optimistic updates)
 * takes priority over stale live data from the Convex WebSocket.
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
    const key = args === "skip" ? null : queryCache.cacheKey(name, args);

    const [cachedData, setCachedData] = useState<T | undefined>(() => 
        (isHydrated && key) ? queryCache.getInMemory<T>(key) : undefined
    );
    const [isOnline, setIsOnline] = useState(true);
    const [prevKey, setPrevKey] = useState<string | null>(key);

    // Reset/synchronize cache state during render when the key changes.
    // This avoids rendering stale data or needing react-hooks/set-state-in-effect disables.
    if (key !== prevKey) {
        setPrevKey(key);
        const syncData = key ? queryCache.getInMemory<T>(key) : undefined;
        setCachedData(syncData);
    }

    // Track online/offline status and sync initial state on mount to avoid hydration mismatch
    useEffect(() => {
        // Run asynchronously to prevent cascading renders during mount phase
        const timer = setTimeout(() => {
            setIsOnline(navigator.onLine);
        }, 0);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    // Read from cache
    const readCache = useCallback(() => {
        if (!key) return;
        queryCache.get<T>(key).then((cached) => {
            if (cached !== undefined) {
                setCachedData(cached);
            }
        });
    }, [key]);

    // Load cached data from IndexedDB if in-memory cache did not resolve
    useEffect(() => {
        isHydrated = true; // Safe to use synchronous cache for future components
        if (!key) return;

        const syncData = queryCache.getInMemory<T>(key);
        if (syncData === undefined) {
            readCache();
        }
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

    // When live data arrives while online, update the cache
    useEffect(() => {
        if (liveData !== undefined && key && isOnline) {
            queryCache.set(key, liveData);
        }
    }, [liveData, key, isOnline]);

    // When online: prefer live data (real-time from Convex)
    // When offline: prefer cached data (includes optimistic updates)
    if (!isOnline) {
        return cachedData;
    }
    return liveData !== undefined ? (liveData as T) : cachedData;
}
