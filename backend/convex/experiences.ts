import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: { notebookId: v.id("notebooks") },
    handler: async (ctx, { notebookId }) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const currentNotebook = await ctx.db.get(notebookId);
        if (!currentNotebook || currentNotebook.userId !== userId) {
            return [];
        }

        const experiences = await ctx.db
            .query("experiences")
            .withIndex("by_notebook", (q) => q.eq("notebookId", notebookId))
            .order("desc")
            .collect();

        const result = await Promise.all(
            experiences
                .filter((e) => e.userId === userId)
                .map(async (experience) => {
                    const transactions = (await ctx.db
                        .query("transactions")
                        .withIndex("by_experience", (q) => q.eq("experienceId", experience._id))
                        .collect()).filter((t) => t.userId === userId);

                    const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

                    // Find the most recent transaction date
                    let lastTransactionDate: number | undefined;
                    if (transactions.length > 0) {
                        lastTransactionDate = transactions.reduce((latest, t) => {
                            const txDate = t.date ?? t.createdAt;
                            return txDate > latest ? txDate : latest;
                        }, 0);
                    }

                    return {
                        ...experience,
                        balance,
                        transactionCount: transactions.length,
                        lastTransactionDate,
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
        contactId: v.optional(v.id("contacts")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const name = args.name.trim();
        if (!name || name.length > 200) throw new Error("Invalid experience name");

        const notebook = await ctx.db.get(args.notebookId);
        if (!notebook || notebook.userId !== userId) {
            throw new Error("Notebook not found");
        }

        if (args.contactId) {
            const contact = await ctx.db.get(args.contactId);
            if (!contact || contact.userId !== userId || contact.notebookId !== args.notebookId) {
                throw new Error("Contact not found");
            }
        }

        return await ctx.db.insert("experiences", {
            userId,
            notebookId: args.notebookId,
            name,
            contactId: args.contactId,
            closed: false,
            createdAt: Date.now(),
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("experiences"),
        name: v.string(),
        contactId: v.optional(v.id("contacts")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const name = args.name.trim();
        if (!name || name.length > 200) throw new Error("Invalid experience name");

        const experience = await ctx.db.get(args.id);
        if (!experience || experience.userId !== userId) {
            throw new Error("Experience not found");
        }

        if (args.contactId) {
            const contact = await ctx.db.get(args.contactId);
            if (!contact || contact.userId !== userId || contact.notebookId !== experience.notebookId) {
                throw new Error("Contact not found");
            }
        }

        await ctx.db.patch(args.id, {
            name,
            contactId: args.contactId,
        });
    },
});

export const remove = mutation({
    args: { id: v.id("experiences") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const experience = await ctx.db.get(args.id);
        if (!experience || experience.userId !== userId) {
            throw new Error("Experience not found");
        }

        // Cascade: delete all transactions linked to this experience
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_experience", (q) => q.eq("experienceId", args.id))
            .collect();
        for (const t of transactions) {
            await ctx.db.delete(t._id);
        }

        await ctx.db.delete(args.id);
    },
});

export const close = mutation({
    args: { id: v.id("experiences") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const experience = await ctx.db.get(args.id);
        if (!experience || experience.userId !== userId) {
            throw new Error("Experience not found");
        }

        await ctx.db.patch(args.id, { closed: true });
    },
});

export const reopen = mutation({
    args: { id: v.id("experiences") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const experience = await ctx.db.get(args.id);
        if (!experience || experience.userId !== userId) {
            throw new Error("Experience not found");
        }

        await ctx.db.patch(args.id, { closed: false });
    },
});

export const transfer = mutation({
    args: {
        id: v.id("experiences"),
        targetNotebookId: v.id("notebooks"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const experience = await ctx.db.get(args.id);
        if (!experience || experience.userId !== userId) {
            throw new Error("Experience not found");
        }

        if (experience.notebookId === args.targetNotebookId) {
            throw new Error("Already in this notebook");
        }

        const targetNotebook = await ctx.db.get(args.targetNotebookId);
        if (!targetNotebook || targetNotebook.userId !== userId) {
            throw new Error("Target notebook not found");
        }

        // Move experience — clear contactId (contacts are notebook-scoped)
        await ctx.db.patch(args.id, {
            notebookId: args.targetNotebookId,
            contactId: undefined,
        });

        // Move all linked transactions
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_experience", (q) => q.eq("experienceId", args.id))
            .collect();
        for (const t of transactions) {
            await ctx.db.patch(t._id, {
                notebookId: args.targetNotebookId,
                contactId: undefined,
            });
        }
    },
});
