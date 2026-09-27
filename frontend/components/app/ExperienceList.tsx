"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
    Compass,
    Plus,
    Trash2,
    Pencil,
    Lock,
    Unlock,
    ChevronRight,
    User,
    ArrowRightLeft,
    Archive,
    ArchiveRestore,
} from "lucide-react";
import Select from "@/components/ui/Select";
import UnsyncedBadge from "@/components/ui/UnsyncedBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EditModalDialog from "@/components/ui/EditModalDialog";
import ModalTextInput from "@/components/ui/ModalTextInput";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAmountsVisibility } from "@/contexts/AmountsVisibilityContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSync } from "@/contexts/SyncContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useEscapeCascade } from "@/hooks/useEscapeCascade";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { triggerHaptic } from "@/lib/haptics";
import { formatBalance, balanceColor } from "@/lib/money";

interface ExperienceSummary {
    _id: Id<"experiences">;
    name: string;
    closed: boolean;
    balance: number;
    transactionCount: number;
    contactId?: Id<"contacts">;
    lastTransactionDate?: number;
}

interface Contact {
    _id: Id<"contacts">;
    name: string;
}

interface Notebook {
    _id: Id<"notebooks">;
    name: string;
    order?: number;
    createdAt?: number;
    archived?: boolean;
}

interface ExperienceListProps {
    experiences: ExperienceSummary[];
    notebookId: Id<"notebooks">;
    contacts: Contact[];
    notebooks: Notebook[];
    onSelectExperience: (experience: ExperienceSummary) => void;
    onTransferComplete?: (targetNotebookId: Id<"notebooks">) => void;
}

export default function ExperienceList({
    experiences,
    notebookId,
    contacts,
    notebooks,
    onSelectExperience,
    onTransferComplete,
}: ExperienceListProps) {
    const { t } = useTranslation();
    const { mask } = useAmountsVisibility();

    // Sort experiences by most recent transaction date (newest first)
    const sortedExperiences = useMemo(() => {
        return [...experiences].sort((a, b) => {
            const dateA = a.lastTransactionDate ?? 0;
            const dateB = b.lastTransactionDate ?? 0;
            return dateB - dateA;
        });
    }, [experiences]);

    const contactOptions = useMemo(() => {
        return [
            { value: "", label: t("experience.noContact") },
            ...contacts.map((c) => ({ value: c._id, label: c.name })),
        ];
    }, [contacts, t]);

    const newContactOptions = useMemo(() => {
        return [
            { value: "", label: t("experience.contactOptional") },
            ...contacts.map((c) => ({ value: c._id, label: c.name })),
        ];
    }, [contacts, t]);

    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newContactId, setNewContactId] = useState<string>("");
    const [deleteTarget, setDeleteTarget] = useState<ExperienceSummary | null>(null);
    const [editTarget, setEditTarget] = useState<ExperienceSummary | null>(null);
    const [editName, setEditName] = useState("");
    const [editContactId, setEditContactId] = useState<string>("");
    const [isEditClosing, setIsEditClosing] = useState(false);
    const [transferTarget, setTransferTarget] = useState<ExperienceSummary | null>(null);
    const [transferNotebookId, setTransferNotebookId] = useState<string>("");
    const [isTransferClosing, setIsTransferClosing] = useState(false);
    const [showArchivedInTransfer, setShowArchivedInTransfer] = useState(false);

    const handleCloseEdit = useCallback(() => {
        triggerHaptic("light");
        setIsEditClosing(true);
        setTimeout(() => {
            setEditTarget(null);
            setIsEditClosing(false);
        }, 250);
    }, []);

    const handleCloseTransfer = useCallback(() => {
        triggerHaptic("light");
        setIsTransferClosing(true);
        setTimeout(() => {
            setTransferTarget(null);
            setTransferNotebookId("");
            setShowArchivedInTransfer(false);
            setIsTransferClosing(false);
        }, 250);
    }, []);

    const nameRef = useRef<HTMLInputElement>(null);
    const editNameRef = useRef<HTMLInputElement>(null);

    const createExperience = useMutation(api.experiences.create);
    const deleteExperience = useMutation(api.experiences.remove);
    const updateExperience = useMutation(api.experiences.update);
    const closeExperience = useMutation(api.experiences.close);
    const reopenExperience = useMutation(api.experiences.reopen);
    const transferExperience = useMutation(api.experiences.transfer);
    const { offlineMutation, isItemPending } = useSync();

    useBodyScrollLock(Boolean(deleteTarget || editTarget || transferTarget));
    const keyboardInset = useKeyboardInset();
    const keyboardOffsetStyle = keyboardInset > 0 ? { paddingBottom: `${keyboardInset + 12}px` } : undefined;

    useEscapeCascade(() => {
        if (transferTarget) {
            handleCloseTransfer();
        } else if (deleteTarget) {
            triggerHaptic("light");
            setDeleteTarget(null);
        } else if (editTarget) {
            handleCloseEdit();
        } else if (adding) {
            triggerHaptic("light");
            setAdding(false);
            setNewName("");
            setNewContactId("");
        }
    });

    useEffect(() => {
        if (adding && nameRef.current) nameRef.current.focus();
    }, [adding]);

    useEffect(() => {
        if (editTarget && editNameRef.current) editNameRef.current.focus();
    }, [editTarget]);

    const handleAdd = async () => {
        const name = newName.trim();
        if (!name) return;
        triggerHaptic("success");
        await offlineMutation(
            "experiences:create",
            createExperience,
            {
                notebookId,
                name,
                contactId: newContactId ? (newContactId as Id<"contacts">) : undefined,
            }
        );
        setNewName("");
        setNewContactId("");
        setAdding(false);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        triggerHaptic("warning");
        await offlineMutation(
            "experiences:remove",
            deleteExperience,
            { id: deleteTarget._id },
            { notebookId }
        );
        setDeleteTarget(null);
    };

    const openEdit = (exp: ExperienceSummary) => {
        triggerHaptic("light");
        setEditTarget(exp);
        setEditName(exp.name);
        setEditContactId(exp.contactId ?? "");
    };

    const handleEdit = async () => {
        if (!editTarget || !editName.trim()) return;
        triggerHaptic("success");
        await offlineMutation(
            "experiences:update",
            updateExperience,
            {
                id: editTarget._id,
                name: editName.trim(),
                contactId: editContactId ? (editContactId as Id<"contacts">) : undefined,
            },
            { notebookId }
        );
        handleCloseEdit();
    };

    const handleToggleClosed = async (exp: ExperienceSummary) => {
        triggerHaptic(exp.closed ? "selection" : "warning");
        if (exp.closed) {
            await offlineMutation(
                "experiences:reopen",
                reopenExperience,
                { id: exp._id },
                { notebookId }
            );
        } else {
            await offlineMutation(
                "experiences:close",
                closeExperience,
                { id: exp._id },
                { notebookId }
            );
        }
    };

    const transferNotebookOptions = useMemo(() => {
        const sorted = [...notebooks].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
            const orderB = b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

        return sorted
            .filter((n) => n._id !== notebookId && (showArchivedInTransfer || !n.archived))
            .map((n) => ({
                value: n._id,
                label: n.name,
                archived: n.archived
            }));
    }, [notebooks, notebookId, showArchivedInTransfer]);

    const handleTransfer = async () => {
        if (!transferTarget || !transferNotebookId) return;
        triggerHaptic("success");
        const targetId = transferNotebookId as Id<"notebooks">;
        await offlineMutation(
            "experiences:transfer",
            transferExperience,
            {
                id: transferTarget._id,
                targetNotebookId: targetId,
            },
            { notebookId }
        );
        handleCloseTransfer();

        // Check if user wants to redirect to the target notebook
        const redirectPref = typeof window !== "undefined"
            ? localStorage.getItem("tekyida-transfer-redirect")
            : null;
        if (redirectPref === "redirect" && onTransferComplete) {
            onTransferComplete(targetId);
        }
    };

    const getContactName = (contactId?: Id<"contacts">) => {
        if (!contactId) return null;
        const contact = contacts.find((c) => c._id === contactId);
        return contact?.name ?? null;
    };

    return (
        <div className="space-y-3">
            {/* Empty State */}
            {experiences.length === 0 && !adding && (
                <div className="liquid-glass-card p-8 text-center">
                    <div className="inline-flex p-3 rounded-2xl liquid-glass mb-4">
                        <Compass size={28} className="text-primary-500" />
                    </div>
                    <p className="text-sm font-semibold text-(--text-secondary)">
                        {t("experience.empty")}
                    </p>
                    <p className="text-xs text-(--text-tertiary) mt-1">
                        {t("experience.emptySubtitle")}
                    </p>
                </div>
            )}

            {/* Experience Cards */}
            {sortedExperiences.map((exp) => {
                const contactName = getContactName(exp.contactId);
                return (
                    <div
                        key={exp._id}
                        className="relative liquid-glass-card p-0 overflow-hidden w-full"
                    >
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                triggerHaptic("selection");
                                onSelectExperience(exp);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    triggerHaptic("selection");
                                    onSelectExperience(exp);
                                }
                            }}
                            className="w-full text-left p-4 cursor-pointer active:scale-[0.98] transition-all"
                        >
                            {/* Row 1: Icon + Name + Balance */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl liquid-glass shrink-0">
                                    <Compass size={18} className="text-primary-500" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                                    <p className="font-semibold text-sm whitespace-normal break-words flex-1 min-w-0 text-left">{exp.name}</p>
                                    {isItemPending(exp._id) && <UnsyncedBadge />}
                                </div>
                                <span className={`text-sm font-bold shrink-0 ${balanceColor(exp.balance)} pr-2`}>
                                    {formatBalance(exp.balance, mask)}
                                </span>
                            </div>

                            {/* Row 2: Metadata left */}
                            <div className="flex items-center pl-[46px] pr-32">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    {contactName && (
                                        <>
                                            <span className="inline-flex items-center gap-1 text-[11px] text-(--text-tertiary)">
                                                <User size={10} />
                                                {contactName}
                                            </span>
                                            <span className="text-[11px] text-(--text-tertiary)">·</span>
                                        </>
                                    )}
                                    <span className="text-[11px] text-(--text-tertiary)">
                                        {exp.transactionCount} {t("experience.transactions")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Absolute Sibling Actions Area */}
                        <div className="absolute bottom-3.5 right-4 z-10 flex items-center gap-0.5">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleClosed(exp);
                                }}
                                className={`p-1.5 rounded-lg hover:bg-white/10 active:bg-white/10 transition-all cursor-pointer shrink-0 ${
                                    exp.closed
                                        ? "bg-warning-500/15 text-warning-500"
                                        : "bg-accent-500/15 text-accent-500"
                                }`}
                                title={exp.closed ? t("experience.reopen") : t("experience.close")}
                            >
                                {exp.closed ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(exp);
                                }}
                                className="p-1.5 rounded-lg text-(--text-tertiary) hover:bg-white/10 active:bg-white/10 transition-all cursor-pointer"
                                title={t("experience.edit")}
                            >
                                <Pencil size={13} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic("selection");
                                    setTransferTarget(exp);
                                }}
                                className="p-1.5 rounded-lg text-(--text-tertiary) hover:bg-white/10 active:bg-white/10 transition-all cursor-pointer"
                                title={t("experience.transfer")}
                            >
                                <ArrowRightLeft size={13} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic("warning");
                                    setDeleteTarget(exp);
                                }}
                                className="p-1.5 rounded-lg text-danger-500/60 hover:bg-danger-500/10 active:bg-danger-500/10 transition-all cursor-pointer"
                                title={t("experience.delete")}
                            >
                                <Trash2 size={13} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic("selection");
                                    onSelectExperience(exp);
                                }}
                                className="p-1 text-(--text-tertiary) ml-0.5 hover:text-(--text-primary) transition-colors cursor-pointer"
                            >
                                <ChevronRight size={14} className="ml-0.5" />
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Delete Confirmation Popup */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title={t("experience.delete")}
                description={t("experience.deleteConfirm")}
                itemName={deleteTarget?.name}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                style={keyboardOffsetStyle}
            />

            {/* Edit Experience Popup */}
            <EditModalDialog
                isOpen={!!editTarget}
                isClosing={isEditClosing}
                title={t("experience.edit")}
                onClose={handleCloseEdit}
                onSave={handleEdit}
                saveDisabled={!editName.trim()}
                style={keyboardOffsetStyle}
            >
                <ModalTextInput
                    inputRef={editNameRef}
                    value={editName}
                    onChange={setEditName}
                    onConfirm={handleEdit}
                    onCancel={handleCloseEdit}
                    placeholder={t("experience.name")}
                />
                <Select
                    options={contactOptions}
                    value={editContactId}
                    onChange={setEditContactId}
                />
            </EditModalDialog>

            {/* Transfer Experience Popup */}
            <EditModalDialog
                isOpen={!!transferTarget}
                isClosing={isTransferClosing}
                title={t("experience.transferTitle")}
                onClose={handleCloseTransfer}
                onSave={handleTransfer}
                saveDisabled={!transferNotebookId}
                saveLabel={t("common.transfer")}
                style={keyboardOffsetStyle}
            >
                <p className="text-sm font-semibold break-words whitespace-normal">{transferTarget?.name}</p>
                <p className="text-xs text-(--text-secondary)">
                    {t("experience.transferConfirm")}
                </p>
                {transferNotebookOptions.length > 0 ? (
                    <Select
                        options={transferNotebookOptions}
                        value={transferNotebookId}
                        onChange={setTransferNotebookId}
                        placeholder={t("experience.selectNotebook")}
                        footerButton={
                            notebooks.some((n) => n.archived && n._id !== notebookId) ? {
                                icon: showArchivedInTransfer ? <ArchiveRestore size={15} /> : <Archive size={15} />,
                                label: showArchivedInTransfer ? t("notebook.hideArchived") : t("notebook.showArchived"),
                                onClick: () => {
                                    const nextShow = !showArchivedInTransfer;
                                    setShowArchivedInTransfer(nextShow);
                                    
                                    if (!nextShow && transferNotebookId) {
                                        const selectedNotebook = notebooks.find((n) => n._id === transferNotebookId);
                                        if (selectedNotebook?.archived) {
                                            setTransferNotebookId("");
                                        }
                                    }
                                },
                                active: showArchivedInTransfer
                            } : undefined
                        }
                    />
                ) : (
                    <p className="text-xs text-(--text-tertiary) italic text-center py-2">
                        {t("notebook.add")}
                    </p>
                )}
            </EditModalDialog>

            {/* Add Experience Section */}
            {adding ? (
                <div className="liquid-glass-card p-4 space-y-3 animate-scale-in">
                    <input
                        ref={nameRef}
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                            if (e.key === "Escape") {
                                e.stopPropagation();
                                setAdding(false);
                                setNewName("");
                                setNewContactId("");
                            }
                        }}
                        placeholder={t("experience.name")}
                        className="glass-input py-2.5 text-sm"
                    />
                    <Select
                        options={newContactOptions}
                        value={newContactId}
                        onChange={setNewContactId}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                triggerHaptic("light");
                                setAdding(false);
                                setNewName("");
                                setNewContactId("");
                            }}
                            className="flex-1 py-2 rounded-xl text-sm font-medium text-(--text-secondary) liquid-glass-flat hover:bg-white/10 transition-all cursor-pointer"
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={!newName.trim()}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-primary-800/80 dark:bg-primary-500/70 text-white transition-all hover:shadow-md disabled:opacity-40 cursor-pointer"
                        >
                            {t("experience.add")}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => {
                        triggerHaptic("selection");
                        setAdding(true);
                    }}
                    className="liquid-glass-card p-4 w-full flex items-center justify-center gap-2 text-primary-500 hover:shadow-lg transition-all cursor-pointer active:scale-[0.97]"
                >
                    <Plus size={18} />
                    <span className="text-sm font-semibold">{t("experience.add")}</span>
                </button>
            )}
        </div>
    );
}
