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

        // Sort notebooks by order (ascending), fallback to createdAt (descending)
        const sortedNotebooks = [...notebooks].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
            const orderB = b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

        // Compute contact count and balance for each notebook
        const result = await Promise.all(
            sortedNotebooks.map(async (notebook) => {
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

        const name = args.name.trim();
        if (!name || name.length > 20) throw new Error("Invalid notebook name");

        return await ctx.db.insert("notebooks", {
            userId,
            name,
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

        // Cascade: delete all experiences in this notebook
        const experiences = await ctx.db
            .query("experiences")
            .withIndex("by_notebook", (q) => q.eq("notebookId", args.id))
            .collect();
        for (const e of experiences) {
            await ctx.db.delete(e._id);
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

export const update = mutation({
    args: {
        id: v.id("notebooks"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const name = args.name.trim();
        if (!name || name.length > 20) throw new Error("Invalid notebook name");

        const notebook = await ctx.db.get(args.id);
        if (!notebook || notebook.userId !== userId) {
            throw new Error("Notebook not found");
        }

        await ctx.db.patch(args.id, { name });
    },
});

export const reorder = mutation({
    args: {
        ids: v.array(v.id("notebooks")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Verify all notebooks belong to the user and patch their order
        for (let i = 0; i < args.ids.length; i++) {
            const id = args.ids[i];
            const notebook = await ctx.db.get(id);
            if (!notebook || notebook.userId !== userId) {
                throw new Error(`Notebook not found or access denied: ${id}`);
            }
            await ctx.db.patch(id, { order: i });
        }
    },
});

export const archive = mutation({
    args: {
        id: v.id("notebooks"),
        archived: v.boolean(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const notebook = await ctx.db.get(args.id);
        if (!notebook || notebook.userId !== userId) {
            throw new Error("Notebook not found");
        }

        await ctx.db.patch(args.id, { archived: args.archived });
    },
});

