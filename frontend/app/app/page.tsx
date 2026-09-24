"use client";

import { useState, useEffect } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import AppLayout from "@/components/app/AppLayout";
import QuickStats from "@/components/app/QuickStats";
import EmptyState from "@/components/app/EmptyState";
import ContactList from "@/components/app/ContactList";
import TransactionList from "@/components/app/TransactionList";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useActiveNotebook } from "@/hooks/useActiveNotebook";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
    const notebookManager = useActiveNotebook();
    const { notebooks, resolvedActiveId, handleCreateNotebook, isOffline } = notebookManager;

    // Get contacts for active notebook
    const contacts = useCachedQuery<{ _id: Id<"contacts">; name: string; phone?: string; balance: number; transactionCount: number; experiences: { _id: Id<"experiences">; name: string; closed: boolean; balance: number; transactionCount: number; lastTransactionDate?: number }[] }[]>(
        "contacts.list",
        api.contacts.list,
        resolvedActiveId ? { notebookId: resolvedActiveId } : "skip"
    );

    const [selectedContact, setSelectedContact] = useState<{
        _id: Id<"contacts">;
        name: string;
        experiences: { _id: Id<"experiences">; name: string; closed: boolean; balance: number; transactionCount: number; lastTransactionDate?: number }[];
    } | null>(null);

    const [animateIn, setAnimateIn] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimateIn(false);
        }, 900);
        return () => clearTimeout(timer);
    }, []);

    // Compute stats from contacts
    const moneyGiven =
        contacts?.reduce((sum, c) => (c.balance < 0 ? sum + Math.abs(c.balance) : sum), 0) ?? 0;
    const moneyOwed =
        contacts?.reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0) ?? 0;
    const netBalance = moneyOwed - moneyGiven;

    // Wait for data before rendering — prevents flash from 0 to loaded values
    const dataReady = !!notebooks && (!resolvedActiveId || contacts !== undefined);

    if (!dataReady && !isOffline) return null;

    return (
        <AppLayout notebookManager={notebookManager} animateIn={animateIn}>
            {!resolvedActiveId ? (
                /* Empty State */
                <div className={animateIn ? "animate-slide-up delay-100" : ""}>
                    <EmptyState
                        onCreateNotebook={() => {
                            const name = prompt("Notebook name:");
                            if (name?.trim()) handleCreateNotebook(name.trim());
                        }}
                    />
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className={`mb-6 ${animateIn ? "animate-slide-up delay-100" : ""}`}>
                        <QuickStats
                            moneyGiven={moneyGiven}
                            moneyOwed={moneyOwed}
                            netBalance={netBalance}
                        />
                    </div>

                    {/* Contact List */}
                    {resolvedActiveId && contacts !== undefined && (
                        <div className={animateIn ? "animate-slide-up delay-200" : ""}>
                            <ContactList
                                contacts={contacts}
                                notebookId={resolvedActiveId}
                                onSelectContact={(c) =>
                                    setSelectedContact({
                                        _id: c._id,
                                        name: c.name,
                                        experiences: (c as { experiences?: { _id: Id<"experiences">; name: string; closed: boolean; balance: number; transactionCount: number; lastTransactionDate?: number }[] }).experiences ?? [],
                                    })
                                }
                            />
                        </div>
                    )}
                </>
            )}

            {/* Transaction Sheet */}
            {selectedContact && resolvedActiveId && (
                <TransactionList
                    contactId={selectedContact._id}
                    contactName={selectedContact.name}
                    notebookId={resolvedActiveId}
                    onClose={() => setSelectedContact(null)}
                    experiences={selectedContact.experiences}
                />
            )}
        </AppLayout>
    );
}
