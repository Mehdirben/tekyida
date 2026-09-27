import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionCreator } from "./useTransactionCreator";

describe("useTransactionCreator", () => {
    it("starts with the add sheet closed and empty defaults", () => {
        const onCreateTx = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useTransactionCreator(onCreateTx));

        expect(result.current.adding).toBe(false);
        expect(result.current.amount).toBe("");
        expect(result.current.isPositive).toBe(true);
        expect(result.current.description).toBe("");
        expect(result.current.date).toBeTruthy();
    });

    it("does not submit when the amount is invalid", async () => {
        const onCreateTx = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useTransactionCreator(onCreateTx));

        act(() => {
            result.current.setAdding(true);
            result.current.setAmount("abc");
        });

        await act(async () => {
            await result.current.handleAdd();
        });

        expect(onCreateTx).not.toHaveBeenCalled();
        expect(result.current.adding).toBe(true);
    });

    it("does not submit for zero or negative amounts", async () => {
        const onCreateTx = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useTransactionCreator(onCreateTx));

        act(() => {
            result.current.setAmount("0");
        });
        await act(async () => {
            await result.current.handleAdd();
        });
        expect(onCreateTx).not.toHaveBeenCalled();

        act(() => {
            result.current.setAmount("-3");
        });
        await act(async () => {
            await result.current.handleAdd();
        });
        expect(onCreateTx).not.toHaveBeenCalled();
    });

    it("submits parsed args and resets the form", async () => {
        const onCreateTx = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useTransactionCreator(onCreateTx));

        act(() => {
            result.current.setAdding(true);
            result.current.setAmount("12.5");
            result.current.setIsPositive(false);
            result.current.setDescription("  Coffee  ");
            result.current.setDate("2026-03-04T09:30");
        });

        await act(async () => {
            await result.current.handleAdd();
        });

        expect(onCreateTx).toHaveBeenCalledWith({
            amount: -12.5,
            description: "Coffee",
            date: new Date("2026-03-04T09:30").getTime(),
        });
        expect(result.current.adding).toBe(false);
        expect(result.current.amount).toBe("");
        expect(result.current.description).toBe("");
        expect(result.current.date).not.toBe("2026-03-04T09:30");
    });

    it("keeps the description undefined when left blank", async () => {
        const onCreateTx = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useTransactionCreator(onCreateTx));

        act(() => {
            result.current.setAmount("5");
        });

        await act(async () => {
            await result.current.handleAdd();
        });

        expect(onCreateTx).toHaveBeenCalledWith(
            expect.objectContaining({ description: undefined })
        );
    });
});
