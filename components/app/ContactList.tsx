"use client";

import { useState, useRef, useEffect } from "react";
import { UserPlus, User, Phone, ChevronRight, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Contact {
    _id: Id<"contacts">;
    name: string;
    phone?: string;
    balance: number;
    transactionCount: number;
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
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const nameRef = useRef<HTMLInputElement>(null);

    const createContact = useMutation(api.contacts.create);
    const deleteContact = useMutation(api.contacts.remove);

    useEffect(() => {
        if (adding && nameRef.current) nameRef.current.focus();
    }, [adding]);

    const handleAdd = async () => {
        const name = newName.trim();
        if (!name) return;
        await createContact({
            notebookId,
            name,
            phone: newPhone.trim() || undefined,
        });
        setNewName("");
        setNewPhone("");
        setAdding(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: Id<"contacts">) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm(t("contact.deleteConfirm"))) {
            await deleteContact({ id });
        }
    };

    const formatBalance = (amount: number) => {
        const sign = amount >= 0 ? "+" : "";
        return `${sign}${amount.toFixed(2)} MAD`;
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

            {contacts.map((contact) => (
                <div
                    key={contact._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectContact(contact)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onSelectContact(contact);
                    }}
                    className="liquid-glass-card p-4 w-full text-left flex items-center gap-3 group cursor-pointer active:scale-[0.98] transition-all"
                >
                    <div className="p-2 rounded-xl liquid-glass shrink-0">
                        <User size={18} className="text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{contact.name}</p>
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
                            onClick={(e) => handleDelete(e, contact._id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    handleDelete(e as unknown as React.MouseEvent, contact._id);
                                }
                            }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-500/10 transition-all cursor-pointer"
                        >
                            <Trash2 size={14} className="text-danger-500" />
                        </span>
                        <ChevronRight
                            size={16}
                            className="text-(--text-tertiary) group-hover:text-(--text-primary) transition-colors"
                        />
                    </div>
                </div>
            ))}

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
                    onClick={() => setAdding(true)}
                    className="liquid-glass-card p-4 w-full flex items-center justify-center gap-2 text-primary-500 hover:shadow-lg transition-all cursor-pointer active:scale-[0.97]"
                >
                    <UserPlus size={18} />
                    <span className="text-sm font-semibold">{t("contact.add")}</span>
                </button>
            )}
        </div>
    );
}
