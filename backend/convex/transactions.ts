import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
    args: {
        contactId: v.optional(v.id("contacts")),
        experienceId: v.optional(v.id("experiences")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        let transactions;
        if (args.experienceId) {
            const experience = await ctx.db.get(args.experienceId);
            if (!experience || experience.userId !== userId) return [];
            transactions = await ctx.db
                .query("transactions")
                .withIndex("by_experience", (q) => q.eq("experienceId", args.experienceId))
                .order("desc")
                .collect();
        } else if (args.contactId) {
            const contact = await ctx.db.get(args.contactId);
            if (!contact || contact.userId !== userId) return [];
            const allContactTx = await ctx.db
                .query("transactions")
                .withIndex("by_contact", (q) => q.eq("contactId", args.contactId!))
                .order("desc")
                .collect();
            // Exclude transactions belonging to an experience — those are shown via the experience card
            transactions = allContactTx.filter((t) => !t.experienceId);
        } else {
            return [];
        }

        return transactions.filter((t) => t.userId === userId);
    },
});

export const create = mutation({
    args: {
        notebookId: v.id("notebooks"),
        contactId: v.optional(v.id("contacts")),
        experienceId: v.optional(v.id("experiences")),
        amount: v.number(),
        description: v.optional(v.string()),
        date: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Validate inputs
        if (!isFinite(args.amount) || args.amount === 0) {
            throw new Error("Invalid amount");
        }
        if (args.description !== undefined && args.description.trim().length > 500) {
            throw new Error("Description too long");
        }

        // Verify notebook belongs to user
        const notebook = await ctx.db.get(args.notebookId);
        if (!notebook || notebook.userId !== userId) {
            throw new Error("Notebook not found");
        }

        // Verify contact belongs to this notebook (if provided)
        if (args.contactId) {
            const contact = await ctx.db.get(args.contactId);
            if (!contact || contact.userId !== userId || contact.notebookId !== args.notebookId) {
                throw new Error("Contact not found");
            }
        }

        // If linked to an experience, verify it exists and is not closed
        if (args.experienceId) {
            const experience = await ctx.db.get(args.experienceId);
            if (!experience || experience.userId !== userId) {
                throw new Error("Experience not found");
            }
            if (experience.notebookId !== args.notebookId) {
                throw new Error("Experience must belong to the transaction notebook");
            }
            if (experience.contactId && args.contactId !== experience.contactId) {
                throw new Error("Transaction contact must match the experience contact");
            }
            if (experience.closed) {
                throw new Error("Experience is closed");
            }
        }

        return await ctx.db.insert("transactions", {
            userId,
            notebookId: args.notebookId,
            contactId: args.contactId,
            experienceId: args.experienceId,
            amount: args.amount,
            description: args.description,
            date: args.date ?? Date.now(),
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

        // Block if linked to a closed experience
        if (transaction.experienceId) {
            const experience = await ctx.db.get(transaction.experienceId);
            if (experience?.closed) {
                throw new Error("Experience is closed");
            }
        }

        await ctx.db.delete(args.id);
    },
});

export const update = mutation({
    args: {
        id: v.id("transactions"),
        amount: v.number(),
        description: v.optional(v.string()),
        date: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const transaction = await ctx.db.get(args.id);
        if (!transaction || transaction.userId !== userId) {
            throw new Error("Transaction not found");
        }

        // Validate inputs
        if (!isFinite(args.amount) || args.amount === 0) {
            throw new Error("Invalid amount");
        }
        if (args.description !== undefined && args.description.trim().length > 500) {
            throw new Error("Description too long");
        }

        // Block if linked to a closed experience
        if (transaction.experienceId) {
            const experience = await ctx.db.get(transaction.experienceId);
            if (experience?.closed) {
                throw new Error("Experience is closed");
            }
        }

        await ctx.db.patch(args.id, {
            amount: args.amount,
            description: args.description,
            date: args.date,
        });
    },
});
