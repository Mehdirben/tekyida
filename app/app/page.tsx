"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import Logo from "@/components/ui/Logo";
import SyncIndicator from "@/components/app/SyncIndicator";
import NotebookSwitcher from "@/components/app/NotebookSwitcher";
import QuickStats from "@/components/app/QuickStats";
import EmptyState from "@/components/app/EmptyState";
import ContactList from "@/components/app/ContactList";
import TransactionList from "@/components/app/TransactionList";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { useActiveNotebook } from "@/hooks/useActiveNotebook";
import { api } from "@/convex/_generated/api";
import CacheWarmer from "@/components/app/CacheWarmer";

export default function DashboardPage() {
    const {
        notebooks,
        safeNotebooks,
        resolvedActiveId,
        setActiveNotebookId,
        handleCreateNotebook,
        handleEditNotebook,
        handleDeleteNotebook,
        isItemPending,
        isOffline,
    } = useActiveNotebook();

    // Get contacts for active notebook
    const contacts = useCachedQuery<{ _id: Id<"contacts">; name: string; phone?: string; balance: number; transactionCount: number; experiences: { _id: Id<"experiences">; name: string; closed: boolean; balance: number; transactionCount: number; lastTransactionDate?: number }[] }[]>(
        "contacts.list",
        api.contacts.list,
        resolvedActiveId ? { notebookId: resolvedActiveId } : "skip"
    );

    // Transaction sheet state
    const [selectedContact, setSelectedContact] = useState<{
        _id: Id<"contacts">;
        name: string;
        experiences: { _id: Id<"experiences">; name: string; closed: boolean; balance: number; transactionCount: number; lastTransactionDate?: number }[];
    } | null>(null);

    // Compute stats from contacts
    const moneyGiven =
        contacts?.reduce((sum, c) => (c.balance < 0 ? sum + Math.abs(c.balance) : sum), 0) ?? 0;
    const moneyOwed =
        contacts?.reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0) ?? 0;
    const netBalance = moneyOwed - moneyGiven;

    // Wait for data before rendering — prevents flash from 0 to loaded values
    const dataReady = !!notebooks && (safeNotebooks.length === 0 || contacts !== undefined);

    if (!dataReady && !isOffline) return null;

    return (
        <>
            {/* Invisible: pre-caches contacts & transactions for ALL notebooks */}
            <CacheWarmer notebookIds={safeNotebooks.map((n) => n._id)} />
            <main className="flex-1 px-4 sm:px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
                {/* Dashboard Header: Logo left, Notebook Switcher right */}
                <div className="mb-6 animate-slide-up flex items-center justify-between relative z-50">
                    <div className="flex items-center gap-2">
                        <Logo size="md" />
                        <SyncIndicator />
                    </div>
                    <NotebookSwitcher
                        notebooks={safeNotebooks.map((n) => ({
                            id: n._id,
                            name: n.name,
                        }))}
                        activeNotebookId={resolvedActiveId}
                        onSelect={(id) => setActiveNotebookId(id as Id<"notebooks">)}
                        onAdd={handleCreateNotebook}
                        onEdit={handleEditNotebook}
                        onDelete={handleDeleteNotebook}
                        isItemPending={isItemPending}
                    />
                </div>

                {safeNotebooks.length === 0 ? (
                    /* Empty State */
                    <div className="animate-slide-up delay-100">
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
                        <div className="mb-6 animate-slide-up delay-100">
                            <QuickStats
                                moneyGiven={moneyGiven}
                                moneyOwed={moneyOwed}
                                netBalance={netBalance}
                            />
                        </div>

                        {/* Contact List */}
                        {resolvedActiveId && contacts !== undefined && (
                            <div className="animate-slide-up delay-200">
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
            </main>
        </>
    );
}
