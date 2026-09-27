import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionEditor, useTransactionSheetEscape } from "./useTransactionEditor";
import { toLocalDatetime } from "@/lib/dateUtils";

afterEach(() => {
    vi.useRealTimers();
});

const sampleTx = {
    _id: "tx_1" as never,
    amount: 42,
    description: "Groceries",
    date: new Date(2026, 0, 1, 8, 0).getTime(),
    createdAt: 1000,
};

describe("useTransactionEditor", () => {
    it("opens the editor with values derived from the transaction", () => {
        const { result } = renderHook(() => useTransactionEditor(vi.fn().mockResolvedValue(undefined)));

        act(() => {
            result.current.handleOpenEdit(sampleTx);
        });

        expect(result.current.editTarget).toEqual(sampleTx);
        expect(result.current.editAmount).toBe("42");
        expect(result.current.editIsPositive).toBe(true);
        expect(result.current.editDescription).toBe("Groceries");
        expect(result.current.editDate).toBe("2026-01-01T08:00");
        expect(result.current.isEditClosing).toBe(false);
    });

    it("derives a negative sign from negative amounts", () => {
        const { result } = renderHook(() => useTransactionEditor(vi.fn().mockResolvedValue(undefined)));

        act(() => {
            result.current.handleOpenEdit({ ...sampleTx, amount: -30 });
        });
        expect(result.current.editAmount).toBe("30");
        expect(result.current.editIsPositive).toBe(false);
    });

    it("falls back to empty description and createdAt when the transaction lacks them", () => {
        const { result } = renderHook(() => useTransactionEditor(vi.fn().mockResolvedValue(undefined)));

        act(() => {
            result.current.handleOpenEdit({ _id: "tx_2" as never, amount: 5, createdAt: 9999 });
        });

        expect(result.current.editDescription).toBe("");
        expect(result.current.editDate).toBe(toLocalDatetime(9999));
    });

    it("does not save when no editor is open", async () => {
        const onSaveTx = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useTransactionEditor(onSaveTx));

        await act(async () => {
            await result.current.handleSaveEdit();
        });
        expect(onSaveTx).not.toHaveBeenCalled();
    });

    it("does not save when the amount is invalid", async () => {
        const onSaveTx = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useTransactionEditor(onSaveTx));

        act(() => {
            result.current.handleOpenEdit(sampleTx);
            result.current.setEditAmount("0");
        });

        await act(async () => {
            await result.current.handleSaveEdit();
        });
        expect(onSaveTx).not.toHaveBeenCalled();
        expect(result.current.editTarget).toEqual(sampleTx);
    });

    it("saves the edited transaction and closes the sheet", async () => {
        vi.useFakeTimers();
        const onSaveTx = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useTransactionEditor(onSaveTx));

        act(() => {
            result.current.handleOpenEdit(sampleTx);
            result.current.setEditAmount("55");
            result.current.setEditDescription("Updated");
            result.current.setEditDate("2026-02-02T10:00");
        });

        await act(async () => {
            await result.current.handleSaveEdit();
        });

        expect(onSaveTx).toHaveBeenCalledWith({
            id: sampleTx._id,
            amount: 55,
            description: "Updated",
            date: new Date("2026-02-02T10:00").getTime(),
        });

        act(() => {
            vi.advanceTimersByTime(250);
        });
        expect(result.current.editTarget).toBeNull();
        expect(result.current.isEditClosing).toBe(false);
    });

    it("closes the editor with the closing animation", async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useTransactionEditor(vi.fn().mockResolvedValue(undefined)));

        act(() => {
            result.current.handleOpenEdit(sampleTx);
        });

        act(() => {
            result.current.handleCloseEdit();
        });
        expect(result.current.isEditClosing).toBe(true);
        expect(result.current.editTarget).toEqual(sampleTx);

        await act(async () => {
            vi.advanceTimersByTime(250);
        });
        expect(result.current.editTarget).toBeNull();
        expect(result.current.isEditClosing).toBe(false);
    });
});

describe("useTransactionSheetEscape", () => {
    function setup(overrides: {
        deleteTargetId?: unknown;
        setDeleteTargetId?: (val: null) => void;
        editTarget?: unknown;
        adding?: boolean;
        onClose?: () => void;
    }) {
        const setDeleteTargetId = overrides.setDeleteTargetId ?? vi.fn();
        const handleCloseEdit = vi.fn();
        const setAdding = vi.fn();
        const onClose = overrides.onClose ?? vi.fn();

        const txEditor = {
            editTarget: overrides.editTarget ?? null,
            handleCloseEdit,
        };

        renderHook(() =>
            useTransactionSheetEscape({
                deleteTargetId: overrides.deleteTargetId ?? null,
                setDeleteTargetId,
                txEditor,
                adding: overrides.adding ?? false,
                setAdding,
                onClose,
            })
        );

        const press = () =>
            act(() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
            });

        return { press, setDeleteTargetId, handleCloseEdit, setAdding, onClose };
    }

    it("closes the delete confirmation first", () => {
        const h = setup({ deleteTargetId: "tx_1" });
        h.press();
        expect(h.setDeleteTargetId).toHaveBeenCalledWith(null);
        expect(h.handleCloseEdit).not.toHaveBeenCalled();
        expect(h.onClose).not.toHaveBeenCalled();
    });

    it("closes the edit sheet when no delete confirmation is open", () => {
        const h = setup({ editTarget: { _id: "tx_1" } });
        h.press();
        expect(h.handleCloseEdit).toHaveBeenCalledTimes(1);
        expect(h.onClose).not.toHaveBeenCalled();
    });

    it("closes the add form when no editor is open", () => {
        const h = setup({ adding: true });
        h.press();
        expect(h.setAdding).toHaveBeenCalledWith(false);
        expect(h.onClose).not.toHaveBeenCalled();
    });

    it("closes the whole sheet as a last resort", () => {
        const h = setup({});
        h.press();
        expect(h.onClose).toHaveBeenCalledTimes(1);
    });
});
