"use client";

import { Trash2, Archive, ArchiveRestore } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useTranslation } from "@/i18n/LanguageContext";
import type { Notebook } from "./notebookTypes";

interface NotebookConfirmModalsProps {
    deleteTarget: Notebook | undefined;
    archiveTarget: Notebook | undefined;
    unarchiveTarget: Notebook | undefined;
    onDeleteCancel: () => void;
    onDeleteConfirm: () => void;
    onArchiveCancel: () => void;
    onArchiveConfirm: () => void;
    onUnarchiveCancel: () => void;
    onUnarchiveConfirm: () => void;
}

export default function NotebookConfirmModals({
    deleteTarget,
    archiveTarget,
    unarchiveTarget,
    onDeleteCancel,
    onDeleteConfirm,
    onArchiveCancel,
    onArchiveConfirm,
    onUnarchiveCancel,
    onUnarchiveConfirm,
}: NotebookConfirmModalsProps) {
    const { t } = useTranslation();

    return (
        <>
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title={t("notebook.delete")}
                description={t("notebook.deleteConfirm")}
                itemName={deleteTarget?.name}
                icon={Trash2}
                tint="danger"
                onCancel={onDeleteCancel}
                onConfirm={onDeleteConfirm}
            />

            <ConfirmDialog
                isOpen={!!archiveTarget}
                title={t("notebook.archive")}
                description={t("notebook.archiveConfirm")}
                itemName={archiveTarget?.name}
                icon={Archive}
                tint="warning"
                confirmLabel={t("common.archive")}
                onCancel={onArchiveCancel}
                onConfirm={onArchiveConfirm}
            />

            <ConfirmDialog
                isOpen={!!unarchiveTarget}
                title={t("notebook.unarchive")}
                description={t("notebook.unarchiveConfirm")}
                itemName={unarchiveTarget?.name}
                icon={ArchiveRestore}
                tint="warning"
                confirmLabel={t("common.restore")}
                onCancel={onUnarchiveCancel}
                onConfirm={onUnarchiveConfirm}
            />
        </>
    );
}
