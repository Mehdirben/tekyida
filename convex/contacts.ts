import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
    args: { notebookId: v.id("notebooks") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const contacts = await ctx.db
            .query("contacts")
            .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
            .order("desc")
            .collect();

        // Filter to current user's contacts and compute balance
        const result = await Promise.all(
            contacts
                .filter((c) => c.userId === userId)
                .map(async (contact) => {
                    const transactions = await ctx.db
                        .query("transactions")
                        .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
                        .collect();

                    const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

                    return {
                        ...contact,
                        balance,
                        transactionCount: transactions.length,
                    };
                })
        );

        return result;
    },
});

export const create = mutation({
    args: {
        notebookId: v.id("notebooks"),
        name: v.string(),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Verify notebook belongs to user
        const notebook = await ctx.db.get(args.notebookId);
        if (!notebook || notebook.userId !== userId) {
            throw new Error("Notebook not found");
        }

        return await ctx.db.insert("contacts", {
            userId,
            notebookId: args.notebookId,
            name: args.name,
            phone: args.phone,
            createdAt: Date.now(),
        });
    },
});

export const remove = mutation({
    args: { id: v.id("contacts") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const contact = await ctx.db.get(args.id);
        if (!contact || contact.userId !== userId) {
            throw new Error("Contact not found");
        }

        // Cascade: delete all transactions for this contact
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_contact", (q) => q.eq("contactId", args.id))
            .collect();
        for (const t of transactions) {
            await ctx.db.delete(t._id);
        }

        await ctx.db.delete(args.id);
    },
});
