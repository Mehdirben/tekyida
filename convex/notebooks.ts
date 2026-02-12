import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const notebooks = await ctx.db
            .query("notebooks")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        // Compute contact count and balance for each notebook
        const result = await Promise.all(
            notebooks.map(async (notebook) => {
                const contacts = await ctx.db
                    .query("contacts")
                    .withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id))
                    .collect();

                const transactions = await ctx.db
                    .query("transactions")
                    .withIndex("by_notebook", (q) => q.eq("notebookId", notebook._id))
                    .collect();

                const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

                return {
                    ...notebook,
                    contactCount: contacts.length,
                    balance,
                };
            })
        );

        return result;
    },
});

export const create = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        return await ctx.db.insert("notebooks", {
            userId,
            name: args.name,
            createdAt: Date.now(),
        });
    },
});

export const remove = mutation({
    args: { id: v.id("notebooks") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const notebook = await ctx.db.get(args.id);
        if (!notebook || notebook.userId !== userId) {
            throw new Error("Notebook not found");
        }

        // Cascade: delete all transactions in this notebook
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_notebook", (q) => q.eq("notebookId", args.id))
            .collect();
        for (const t of transactions) {
            await ctx.db.delete(t._id);
        }

        // Cascade: delete all contacts in this notebook
        const contacts = await ctx.db
            .query("contacts")
            .withIndex("by_notebook", (q) => q.eq("notebookId", args.id))
            .collect();
        for (const c of contacts) {
            await ctx.db.delete(c._id);
        }

        // Delete the notebook itself
        await ctx.db.delete(args.id);
    },
});
