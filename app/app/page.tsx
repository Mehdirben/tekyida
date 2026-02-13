"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Logo from "@/components/ui/Logo";
import NotebookSwitcher from "@/components/app/NotebookSwitcher";
import QuickStats from "@/components/app/QuickStats";
import EmptyState from "@/components/app/EmptyState";
import ContactList from "@/components/app/ContactList";
import TransactionList from "@/components/app/TransactionList";

export default function DashboardPage() {
    const notebooks = useQuery(api.notebooks.list);
    const createNotebook = useMutation(api.notebooks.create);
    const updateNotebook = useMutation(api.notebooks.update);
    const deleteNotebook = useMutation(api.notebooks.remove);

    const [activeNotebookId, setActiveNotebookId] = useState<Id<"notebooks"> | undefined>();

    // Auto-select first notebook when loaded
    const resolvedActiveId =
        activeNotebookId && notebooks?.some((n) => n._id === activeNotebookId)
            ? activeNotebookId
            : notebooks?.[0]?._id;

    const activeNotebook = notebooks?.find((n) => n._id === resolvedActiveId);

    // Get contacts for active notebook
    const contacts = useQuery(
        api.contacts.list,
        resolvedActiveId ? { notebookId: resolvedActiveId } : "skip"
    );

    // Transaction sheet state
    const [selectedContact, setSelectedContact] = useState<{
        _id: Id<"contacts">;
        name: string;
    } | null>(null);

    // Compute stats from contacts
    const moneyGiven =
        contacts?.reduce((sum, c) => (c.balance < 0 ? sum + Math.abs(c.balance) : sum), 0) ?? 0;
    const moneyOwed =
        contacts?.reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0) ?? 0;
    const netBalance = moneyOwed - moneyGiven;

    const handleCreateNotebook = async (name: string) => {
        const id = await createNotebook({ name });
        setActiveNotebookId(id);
    };

    const handleEditNotebook = async (id: string, name: string) => {
        await updateNotebook({ id: id as Id<"notebooks">, name });
    };

    const handleDeleteNotebook = async (id: string) => {
        await deleteNotebook({ id: id as Id<"notebooks"> });
        if (resolvedActiveId === id) {
            setActiveNotebookId(undefined);
        }
    };

    // Loading state
    if (!notebooks) return null;

    return (
        <main className="flex-1 px-4 sm:px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
            {/* Dashboard Header: Logo left, Notebook Switcher right */}
            <div className="mb-6 animate-slide-up flex items-center justify-between relative z-50">
                <Logo size="md" />
                <NotebookSwitcher
                    notebooks={notebooks.map((n) => ({
                        id: n._id,
                        name: n.name,
                    }))}
                    activeNotebookId={resolvedActiveId}
                    onSelect={(id) => setActiveNotebookId(id as Id<"notebooks">)}
                    onAdd={handleCreateNotebook}
                    onEdit={handleEditNotebook}
                    onDelete={handleDeleteNotebook}
                />
            </div>

            {notebooks.length === 0 ? (
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
                    {resolvedActiveId && contacts && (
                        <div className="animate-slide-up delay-200">
                            <ContactList
                                contacts={contacts}
                                notebookId={resolvedActiveId}
                                onSelectContact={(c) =>
                                    setSelectedContact({
                                        _id: c._id,
                                        name: c.name,
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
                />
            )}
        </main>
    );
}
