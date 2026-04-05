"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Logo from "@/components/ui/Logo";
import SyncIndicator from "@/components/app/SyncIndicator";
import NotebookSwitcher from "@/components/app/NotebookSwitcher";
import ExperienceList from "@/components/app/ExperienceList";
import ExperienceBalanceCard from "@/components/app/ExperienceBalanceCard";
import ExperienceDetail from "@/components/app/ExperienceDetail";
import { AmountsVisibilityProvider } from "@/contexts/AmountsVisibilityContext";
import { useSync } from "@/contexts/SyncContext";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import CacheWarmer from "@/components/app/CacheWarmer";

interface ExperienceSummary {
    _id: Id<"experiences">;
    name: string;
    closed: boolean;
    balance: number;
    transactionCount: number;
    contactId?: Id<"contacts">;
    lastTransactionDate?: number;
}

export default function ExperiencesPage() {
    const notebooks = useCachedQuery<{ _id: Id<"notebooks">; name: string; contactCount: number; balance: number }[]>("notebooks.list", api.notebooks.list, {});
    const createNotebook = useMutation(api.notebooks.create);
    const updateNotebook = useMutation(api.notebooks.update);
    const deleteNotebook = useMutation(api.notebooks.remove);
    const closeExperience = useMutation(api.experiences.close);
    const reopenExperience = useMutation(api.experiences.reopen);
    const { offlineMutation, isItemPending } = useSync();
    const router = useRouter();

    const [activeNotebookId, setActiveNotebookIdRaw] = useState<Id<"notebooks"> | undefined>(() => {
        if (typeof window === "undefined") return undefined;
        const saved = localStorage.getItem("tekyida-active-notebook");
        return saved ? (saved as Id<"notebooks">) : undefined;
    });

    const setActiveNotebookId = useCallback((id: Id<"notebooks"> | undefined) => {
        setActiveNotebookIdRaw(id);
        if (id) {
            localStorage.setItem("tekyida-active-notebook", id);
        } else {
            localStorage.removeItem("tekyida-active-notebook");
        }
    }, []);

    const resolvedActiveId =
        activeNotebookId && notebooks?.some((n) => n._id === activeNotebookId)
            ? activeNotebookId
            : notebooks?.[0]?._id;

    // Get contacts for the active notebook (for linking experiences)
    const contacts = useCachedQuery<{ _id: Id<"contacts">; name: string }[]>(
        "contacts.list",
        api.contacts.list,
        resolvedActiveId ? { notebookId: resolvedActiveId } : "skip"
    );

    // Get experiences for active notebook
    const experiences = useCachedQuery<ExperienceSummary[]>(
        "experiences.list",
        api.experiences.list,
        resolvedActiveId ? { notebookId: resolvedActiveId } : "skip"
    );

    // Selected experience for detail sheet
    const [selectedExperience, setSelectedExperience] = useState<ExperienceSummary | null>(null);

    // Auto-open experience detail from ?open=<id> query param (once only)
    const searchParams = useSearchParams();
    const openId = searchParams.get("open");
    const handledOpenRef = useRef<string | null>(null);
    useEffect(() => {
        if (openId && openId !== handledOpenRef.current && experiences) {
            const match = experiences.find((e) => e._id === openId);
            if (match) {
                handledOpenRef.current = openId;
                setSelectedExperience(match);
            }
        }
    }, [openId, experiences]);

    const safeNotebooks = notebooks ?? [];
    const safeContacts = contacts ?? [];

    // Total balance of open (not closed) experiences
    const openExperiencesBalance = useMemo(() => {
        if (!experiences) return 0;
        return experiences
            .filter((e) => !e.closed)
            .reduce((sum, e) => sum + e.balance, 0);
    }, [experiences]);

    const handleCreateNotebook = async (name: string) => {
        const id = await offlineMutation(
            "notebooks:create",
            createNotebook,
            { name }
        );
        if (id) setActiveNotebookId(id as Id<"notebooks">);
    };

    const handleEditNotebook = async (id: string, name: string) => {
        await offlineMutation(
            "notebooks:update",
            updateNotebook,
            { id: id as Id<"notebooks">, name }
        );
    };

    const handleDeleteNotebook = async (id: string) => {
        await offlineMutation(
            "notebooks:remove",
            deleteNotebook,
            { id: id as Id<"notebooks"> }
        );
        if (resolvedActiveId === id) {
            setActiveNotebookId(undefined);
        }
    };

    const handleToggleClosed = async () => {
        if (!selectedExperience) return;
        if (selectedExperience.closed) {
            await offlineMutation(
                "experiences:reopen",
                reopenExperience,
                { id: selectedExperience._id },
                { notebookId: resolvedActiveId }
            );
            setSelectedExperience({ ...selectedExperience, closed: false });
        } else {
            await offlineMutation(
                "experiences:close",
                closeExperience,
                { id: selectedExperience._id },
                { notebookId: resolvedActiveId }
            );
            setSelectedExperience({ ...selectedExperience, closed: true });
        }
    };

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const dataReady = !!notebooks && (safeNotebooks.length === 0 || experiences !== undefined);

    if (!dataReady && !isOffline) return null;

    return (
        <AmountsVisibilityProvider>
            <CacheWarmer notebookIds={safeNotebooks.map((n) => n._id)} />
            <main className="flex-1 px-4 sm:px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
                {/* Header */}
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

                {/* Open Experiences Balance Card */}
                {resolvedActiveId && experiences !== undefined && experiences.length > 0 && (
                    <div className="mb-6 animate-slide-up delay-100">
                        <ExperienceBalanceCard balance={openExperiencesBalance} />
                    </div>
                )}

                {/* Experience List */}
                {resolvedActiveId && experiences !== undefined && (
                    <div className="animate-slide-up delay-100">
                        <ExperienceList
                            experiences={experiences}
                            notebookId={resolvedActiveId}
                            contacts={safeContacts.map((c) => ({ _id: c._id, name: c.name }))}
                            onSelectExperience={(exp) => setSelectedExperience(exp)}
                        />
                    </div>
                )}

                {/* Experience Detail Sheet */}
                {selectedExperience && resolvedActiveId && (
                    <ExperienceDetail
                        experienceId={selectedExperience._id}
                        experienceName={selectedExperience.name}
                        notebookId={resolvedActiveId}
                        contactId={selectedExperience.contactId}
                        closed={selectedExperience.closed}
                        onClose={() => {
                            setSelectedExperience(null);
                            if (openId) router.replace("/app/experiences", { scroll: false });
                        }}
                        onToggleClosed={handleToggleClosed}
                    />
                )}
            </main>
        </AmountsVisibilityProvider>
    );
}
