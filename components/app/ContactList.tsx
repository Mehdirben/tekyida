"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { UserPlus, User, Phone, ChevronRight, Trash2, Pencil, X, CloudOff } from "lucide-react";
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

interface Contact {
    _id: Id<"contacts">;
    name: string;
    phone?: string;
    balance: number;
    transactionCount: number;
    lastTransactionDate?: number;
}

interface ContactListProps {
    contacts: Contact[];
    notebookId: Id<"notebooks">;
    onSelectContact: (contact: Contact) => void;
}

export default function ContactList({
    contacts,
    notebookId,
    onSelectContact,
}: ContactListProps) {
    const { t } = useTranslation();

    const sortedContacts = useMemo(() => {
        return [...contacts].sort((a, b) => {
            const aHasBalance = a.balance !== 0;
            const bHasBalance = b.balance !== 0;
            if (aHasBalance !== bHasBalance) {
                return aHasBalance ? -1 : 1;
            }
            const dateA = a.lastTransactionDate ?? 0;
            const dateB = b.lastTransactionDate ?? 0;
            return dateB - dateA;
        });
    }, [contacts]);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
    const [editTarget, setEditTarget] = useState<Contact | null>(null);
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const nameRef = useRef<HTMLInputElement>(null);
    const editNameRef = useRef<HTMLInputElement>(null);

    const createContact = useMutation(api.contacts.create);
    const deleteContact = useMutation(api.contacts.remove);
    const updateContact = useMutation(api.contacts.update);
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
            "contacts:create",
            createContact,
            {
                notebookId,
                name,
                phone: newPhone.trim() || undefined,
            }
        );
        setNewName("");
        setNewPhone("");
        setAdding(false);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        triggerHaptic("warning");
        await offlineMutation(
            "contacts:remove",
            deleteContact,
            { id: deleteTarget._id },
            { notebookId }
        );
        setDeleteTarget(null);
    };

    const openEdit = (contact: Contact) => {
        triggerHaptic("light");
        setEditTarget(contact);
        setEditName(contact.name);
        setEditPhone(contact.phone || "");
    };

    const handleEdit = async () => {
        if (!editTarget || !editName.trim()) return;
        triggerHaptic("success");
        await offlineMutation(
            "contacts:update",
            updateContact,
            {
                id: editTarget._id,
                name: editName.trim(),
                phone: editPhone.trim() || undefined,
            },
            { notebookId }
        );
        setEditTarget(null);
    };

    const { mask } = useAmountsVisibility();

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

    return (
        <div className="space-y-3">
            {/* Contact Cards */}
            {contacts.length === 0 && !adding && (
                <div className="liquid-glass-card p-8 text-center">
                    <div className="inline-flex p-3 rounded-2xl liquid-glass mb-4">
                        <User size={28} className="text-primary-500" />
                    </div>
                    <p className="text-sm font-semibold text-(--text-secondary)">
                        {t("contact.empty")}
                    </p>
                    <p className="text-xs text-(--text-tertiary) mt-1">
                        {t("contact.emptySubtitle")}
                    </p>
                </div>
            )}

            {sortedContacts.map((contact) => (
                <div
                    key={contact._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        triggerHaptic("selection");
                        onSelectContact(contact);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            triggerHaptic("selection");
                            onSelectContact(contact);
                        }
                    }}
                    className="liquid-glass-card p-4 w-full text-left flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
                >
                    <div className="p-2 rounded-xl liquid-glass shrink-0">
                        <User size={18} className="text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <p className="font-semibold text-sm whitespace-normal break-words flex-1 min-w-0">{contact.name}</p>
                            {isItemPending(contact._id) && <UnsyncedBadge />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            {contact.phone && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-(--text-tertiary)">
                                    <Phone size={10} />
                                    {contact.phone}
                                </span>
                            )}
                            <span className={`text-xs font-bold ${balanceColor(contact.balance)}`}>
                                {formatBalance(contact.balance)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                openEdit(contact);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    openEdit(contact);
                                }
                            }}
                            className="p-1.5 rounded-lg text-(--text-tertiary) active:bg-white/10 transition-all cursor-pointer"
                        >
                            <Pencil size={14} />
                        </span>
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                triggerHaptic("warning");
                                setDeleteTarget(contact);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    setDeleteTarget(contact);
                                }
                            }}
                            className="p-1.5 rounded-lg text-danger-500/60 active:bg-danger-500/10 transition-all cursor-pointer"
                        >
                            <Trash2 size={14} />
                        </span>
                        <ChevronRight
                            size={16}
                            className="text-(--text-tertiary) transition-colors"
                        />
                    </div>
                </div>
            ))}

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
                            <h3 className="text-base font-bold mb-1">{t("contact.delete")}</h3>
                            <p className="text-sm text-(--text-secondary)">
                                {t("contact.deleteConfirm")}
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

            {/* Edit Contact Popup */}
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
                            <h3 className="text-base font-bold">{t("contact.edit")}</h3>
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
                                placeholder={t("contact.name")}
                                className="glass-input py-2.5 text-sm"
                            />
                            <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEdit();
                                    if (e.key === "Escape") setEditTarget(null);
                                }}
                                placeholder={t("contact.phone")}
                                className="glass-input py-2.5 text-sm"
                            />
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

            {/* Add Contact Section */}
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
                                setNewPhone("");
                            }
                        }}
                        placeholder={t("contact.name")}
                        className="glass-input py-2.5 text-sm"
                    />
                    <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                            if (e.key === "Escape") {
                                setAdding(false);
                                setNewName("");
                                setNewPhone("");
                            }
                        }}
                        placeholder={t("contact.phone")}
                        className="glass-input py-2.5 text-sm"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                triggerHaptic("light");
                                setAdding(false);
                                setNewName("");
                                setNewPhone("");
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
                            {t("contact.add")}
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
                    <UserPlus size={18} />
                    <span className="text-sm font-semibold">{t("contact.add")}</span>
                </button>
            )}
        </div>
    );
}
