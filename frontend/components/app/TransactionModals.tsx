"use client";

import type { CSSProperties } from "react";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import EditTransactionModal from "@/components/app/EditTransactionModal";
import { useTranslation } from "@/i18n/LanguageContext";
import type { useTransactionEditor } from "@/hooks/useTransactionEditor";
import type { Id } from "@/convex/_generated/dataModel";

interface TransactionModalsProps {
    deleteTargetId: Id<"transactions"> | null;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
    txEditor: ReturnType<typeof useTransactionEditor>;
    keyboardOffsetStyle?: CSSProperties;
}

export default function TransactionModals({
    deleteTargetId,
    onCancelDelete,
    onConfirmDelete,
    txEditor,
    keyboardOffsetStyle,
}: TransactionModalsProps) {
    const { t } = useTranslation();

    return (
        <>
            <ConfirmDeleteModal
                isOpen={!!deleteTargetId}
                title={t("transaction.delete")}
                description={t("transaction.deleteConfirm")}
                onCancel={onCancelDelete}
                onConfirm={onConfirmDelete}
                style={keyboardOffsetStyle}
            />

            <EditTransactionModal
                isOpen={!!txEditor.editTarget}
                isClosing={txEditor.isEditClosing}
                amount={txEditor.editAmount}
                isPositive={txEditor.editIsPositive}
                description={txEditor.editDescription}
                date={txEditor.editDate}
                onAmountChange={txEditor.setEditAmount}
                onPositiveToggle={() => txEditor.setEditIsPositive(!txEditor.editIsPositive)}
                onDescriptionChange={txEditor.setEditDescription}
                onDateChange={txEditor.setEditDate}
                onClose={txEditor.handleCloseEdit}
                onSave={txEditor.handleSaveEdit}
                style={keyboardOffsetStyle}
            />
        </>
    );
}
