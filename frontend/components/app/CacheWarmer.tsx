"use client";

import { useCachedQuery } from "@/hooks/useCachedQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Invisible component that warms the query cache for notebooks' contacts and experiences lists.
 * Only warms the list-level queries, not individual transaction lists per contact/experience
 * (which would create O(n) subscriptions and degrade performance).
 */
export default function CacheWarmer({
    notebookIds,
}: {
    notebookIds: Id<"notebooks">[];
}) {
    return (
        <>
            {notebookIds.map((id) => (
                <NotebookCacheWarmer key={id} notebookId={id} />
            ))}
        </>
    );
}

function NotebookCacheWarmer({ notebookId }: { notebookId: Id<"notebooks"> }) {
    // Warm contacts list for this notebook
    useCachedQuery<
        { _id: Id<"contacts">; name: string; phone?: string; balance: number; transactionCount: number }[]
    >("contacts.list", api.contacts.list, { notebookId });

    // Warm experiences list for this notebook
    useCachedQuery<
        { _id: Id<"experiences">; name: string; closed: boolean; balance: number; transactionCount: number; lastTransactionDate?: number }[]
    >("experiences.list", api.experiences.list, { notebookId });

    return null;
}
