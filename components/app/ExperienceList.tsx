"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
    Compass,
    Plus,
    Trash2,
    Pencil,
    X,
    Lock,
    Unlock,
    ChevronRight,
    CloudOff,
    User,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAmountsVisibility } from "@/contexts/AmountsVisibilityContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSync } from "@/contexts/SyncContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { triggerHaptic } from "@/lib/haptics";

function UnsyncedBadge() {
    return <CloudOff size={12} className="text-warning-500 shrink-0" />;
}

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

interface ExperienceListProps {
    experiences: ExperienceSummary[];
    notebookId: Id<"notebooks">;
    contacts: Contact[];
    onSelectExperience: (experience: ExperienceSummary) => void;
}

export default function ExperienceList({
    experiences,
    notebookId,
    contacts,
    onSelectExperience,
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
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newContactId, setNewContactId] = useState<string>("");
    const [deleteTarget, setDeleteTarget] = useState<ExperienceSummary | null>(null);
    const [editTarget, setEditTarget] = useState<ExperienceSummary | null>(null);
    const [editName, setEditName] = useState("");
    const [editContactId, setEditContactId] = useState<string>("");
    const nameRef = useRef<HTMLInputElement>(null);
    const editNameRef = useRef<HTMLInputElement>(null);

    const createExperience = useMutation(api.experiences.create);
    const deleteExperience = useMutation(api.experiences.remove);
    const updateExperience = useMutation(api.experiences.update);
    const closeExperience = useMutation(api.experiences.close);
    const reopenExperience = useMutation(api.experiences.reopen);
    const { offlineMutation, isItemPending } = useSync();

    useBodyScrollLock(Boolean(deleteTarget || editTarget));
    const keyboardInset = useKeyboardInset();
    const keyboardOffsetStyle = keyboardInset > 0 ? { paddingBottom: `${keyboardInset + 12}px` } : undefined;

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
        setEditTarget(null);
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

    const formatBalance = (amount: number) => {
        const sign = amount >= 0 ? "+" : "";
        return mask(`${sign}${amount.toFixed(2)} MAD`);
    };

    const balanceColor = (amount: number) =>
        amount > 0
            ? "text-accent-500"
            : amount < 0
                ? "text-danger-500"
                : "text-(--text-primary)";

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
                        className="liquid-glass-card p-4 w-full text-left cursor-pointer active:scale-[0.98] transition-all"
                    >
                        {/* Row 1: Icon + Name + Balance */}
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl liquid-glass shrink-0">
                                <Compass size={18} className="text-primary-500" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                                <p className="font-semibold text-sm whitespace-normal break-words flex-1 min-w-0">{exp.name}</p>
                                {isItemPending(exp._id) && <UnsyncedBadge />}
                            </div>
                            <span className={`text-sm font-bold shrink-0 ${balanceColor(exp.balance)}`}>
                                {formatBalance(exp.balance)}
                            </span>
                        </div>

                        {/* Row 2: Metadata left + Actions right */}
                        <div className="flex items-center justify-between pl-[46px]">
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
                            <div className="flex items-center gap-0.5 shrink-0">
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleToggleClosed(exp);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.stopPropagation();
                                            handleToggleClosed(exp);
                                        }
                                    }}
                                    className={`p-1.5 rounded-lg active:bg-white/10 transition-all cursor-pointer shrink-0 ${
                                        exp.closed
                                            ? "bg-warning-500/15 text-warning-500"
                                            : "bg-accent-500/15 text-accent-500"
                                    }`}
                                    title={exp.closed ? t("experience.reopen") : t("experience.close")}
                                >
                                    {exp.closed ? <Lock size={13} /> : <Unlock size={13} />}
                                </span>
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        openEdit(exp);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.stopPropagation();
                                            openEdit(exp);
                                        }
                                    }}
                                    className="p-1.5 rounded-lg text-(--text-tertiary) active:bg-white/10 transition-all cursor-pointer"
                                >
                                    <Pencil size={13} />
                                </span>
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        triggerHaptic("warning");
                                        setDeleteTarget(exp);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.stopPropagation();
                                            setDeleteTarget(exp);
                                        }
                                    }}
                                    className="p-1.5 rounded-lg text-danger-500/60 active:bg-danger-500/10 transition-all cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                </span>
                                <ChevronRight size={14} className="text-(--text-tertiary) ml-0.5" />
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Delete Confirmation Popup */}
            {deleteTarget && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center transition-[padding] duration-200" style={keyboardOffsetStyle}>
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                        onClick={() => {
                            triggerHaptic("light");
                            setDeleteTarget(null);
                        }}
                    />
                    <div className="relative z-10 w-[90%] max-w-sm liquid-glass-heavy rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                        <div className="p-5 text-center">
                            <div className="inline-flex p-3 rounded-full bg-danger-500/10 mb-3">
                                <Trash2 size={22} className="text-danger-500" />
                            </div>
                            <h3 className="text-base font-bold mb-1">{t("experience.delete")}</h3>
                            <p className="text-sm text-(--text-secondary)">
                                {t("experience.deleteConfirm")}
                            </p>
                            <p className="text-sm font-semibold mt-2">{deleteTarget.name}</p>
                        </div>
                        <div className="flex border-t border-(--border)">
                            <button
                                onClick={() => {
                                    triggerHaptic("light");
                                    setDeleteTarget(null);
                                }}
                                className="flex-1 py-3.5 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3.5 text-sm font-semibold text-danger-500 border-l border-(--border) transition-all active:bg-danger-500/10 cursor-pointer"
                            >
                                {t("common.delete")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Experience Popup */}
            {editTarget && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center transition-[padding] duration-200" style={keyboardOffsetStyle}>
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                        onClick={() => {
                            triggerHaptic("light");
                            setEditTarget(null);
                        }}
                    />
                    <div className="relative z-10 w-[90%] max-w-sm liquid-glass-heavy rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-(--border)">
                            <h3 className="text-base font-bold">{t("experience.edit")}</h3>
                            <button
                                onClick={() => {
                                    triggerHaptic("light");
                                    setEditTarget(null);
                                }}
                                className="p-1.5 rounded-lg active:bg-white/10 transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <input
                                ref={editNameRef}
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEdit();
                                    if (e.key === "Escape") setEditTarget(null);
                                }}
                                placeholder={t("experience.name")}
                                className="glass-input py-2.5 text-sm"
                            />
                            <select
                                value={editContactId}
                                onChange={(e) => setEditContactId(e.target.value)}
                                className="glass-input py-2.5 text-sm"
                            >
                                <option value="">{t("experience.noContact")}</option>
                                {contacts.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex border-t border-(--border)">
                            <button
                                onClick={() => {
                                    triggerHaptic("light");
                                    setEditTarget(null);
                                }}
                                className="flex-1 py-3.5 text-sm font-medium text-(--text-secondary) transition-all active:bg-white/5 cursor-pointer"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={!editName.trim()}
                                className="flex-1 py-3.5 text-sm font-semibold text-primary-500 border-l border-(--border) transition-all active:bg-primary-500/10 disabled:opacity-40 cursor-pointer"
                            >
                                {t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
                                setAdding(false);
                                setNewName("");
                                setNewContactId("");
                            }
                        }}
                        placeholder={t("experience.name")}
                        className="glass-input py-2.5 text-sm"
                    />
                    <select
                        value={newContactId}
                        onChange={(e) => setNewContactId(e.target.value)}
                        className="glass-input py-2.5 text-sm"
                    >
                        <option value="">{t("experience.contactOptional")}</option>
                        {contacts.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                triggerHaptic("light");
                                setAdding(false);
                                setNewName("");
                                setNewContactId("");
                            }}
                            className="flex-1 py-2 rounded-xl text-sm font-medium text-(--text-secondary) liquid-glass hover:bg-white/10 transition-all cursor-pointer"
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
