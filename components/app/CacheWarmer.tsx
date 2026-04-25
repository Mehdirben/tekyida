"use client";

import { useCachedQuery } from "@/hooks/useCachedQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Invisible component that warms the query cache for a single notebook's contacts and experiences.
 * Each instance calls useCachedQuery (which triggers useQuery + caches the result).
 */
function NotebookCacheWarmer({ notebookId }: { notebookId: Id<"notebooks"> }) {
    // This fetches + caches contacts for this notebook
    const contacts = useCachedQuery<
        { _id: Id<"contacts">; name: string; phone?: string; balance: number; transactionCount: number }[]
    >("contacts.list", api.contacts.list, { notebookId });

    // This fetches + caches experiences for this notebook
    const experiences = useCachedQuery<
        { _id: Id<"experiences">; name: string; closed: boolean; balance: number; transactionCount: number; lastTransactionDate?: number }[]
    >("experiences.list", api.experiences.list, { notebookId });

    return (
        <>
            {/* For each contact, warm the transactions cache */}
            {contacts?.map((contact) => (
                <ContactCacheWarmer key={contact._id} contactId={contact._id} />
            ))}
            {/* For each experience, warm the transactions cache */}
            {experiences?.map((experience) => (
                <ExperienceCacheWarmer key={experience._id} experienceId={experience._id} />
            ))}
        </>
    );
}

function ContactCacheWarmer({ contactId }: { contactId: Id<"contacts"> }) {
    // This fetches + caches transactions for this contact
    useCachedQuery<
        { _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number }[]
    >("transactions.list", api.transactions.list, { contactId });

    return null;
}

function ExperienceCacheWarmer({ experienceId }: { experienceId: Id<"experiences"> }) {
    // This fetches + caches transactions for this experience
    useCachedQuery<
        { _id: Id<"transactions">; amount: number; description?: string; date?: number; createdAt: number }[]
    >("transactions.list", api.transactions.list, { experienceId });

    return null;
}

/**
 * Renders nothing visible. Mounts one NotebookCacheWarmer per notebook,
 * ensuring all contacts, experiences, and their transactions get cached for offline use.
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
