import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
    args: { contactId: v.id("contacts") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
            .order("desc")
            .collect();

        return transactions.filter((t) => t.userId === userId);
    },
});

export const create = mutation({
    args: {
        notebookId: v.id("notebooks"),
        contactId: v.id("contacts"),
        amount: v.number(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Verify notebook belongs to user
        const notebook = await ctx.db.get(args.notebookId);
        if (!notebook || notebook.userId !== userId) {
            throw new Error("Notebook not found");
        }

        // Verify contact belongs to this notebook
        const contact = await ctx.db.get(args.contactId);
        if (!contact || contact.notebookId !== args.notebookId) {
            throw new Error("Contact not found");
        }

        return await ctx.db.insert("transactions", {
            userId,
            notebookId: args.notebookId,
            contactId: args.contactId,
            amount: args.amount,
            description: args.description,
            createdAt: Date.now(),
        });
    },
});

export const remove = mutation({
    args: { id: v.id("transactions") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const transaction = await ctx.db.get(args.id);
        if (!transaction || transaction.userId !== userId) {
            throw new Error("Transaction not found");
        }

        await ctx.db.delete(args.id);
    },
});

export const update = mutation({
    args: {
        id: v.id("transactions"),
        amount: v.number(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const transaction = await ctx.db.get(args.id);
        if (!transaction || transaction.userId !== userId) {
            throw new Error("Transaction not found");
        }

        await ctx.db.patch(args.id, {
            amount: args.amount,
            description: args.description,
        });
    },
});
