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
                    const allTransactions = await ctx.db
                        .query("transactions")
                        .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
                        .collect();

                    // Only count non-experience transactions for the contact's own balance
                    const directTransactions = allTransactions.filter((t) => !t.experienceId);
                    const directBalance = directTransactions.reduce((sum, t) => sum + t.amount, 0);

                    // Fetch experiences linked to this contact
                    const experiences = await ctx.db
                        .query("experiences")
                        .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
                        .collect();

                    // Only show CLOSED experiences as summary cards
                    const closedExperiences = experiences.filter((e) => e.closed);

                    const experienceSummaries = await Promise.all(
                        closedExperiences.map(async (exp) => {
                            const expTx = await ctx.db
                                .query("transactions")
                                .withIndex("by_experience", (q) => q.eq("experienceId", exp._id))
                                .collect();
                            const expBalance = expTx.reduce((sum, t) => sum + t.amount, 0);

                            // Find the date of the last transaction
                            let lastTransactionDate: number | undefined;
                            if (expTx.length > 0) {
                                lastTransactionDate = expTx.reduce((latest, t) => {
                                    const txDate = t.date ?? t.createdAt;
                                    return txDate > latest ? txDate : latest;
                                }, 0);
                            }

                            return {
                                _id: exp._id,
                                name: exp.name,
                                closed: exp.closed,
                                balance: expBalance,
                                transactionCount: expTx.length,
                                lastTransactionDate,
                            };
                        })
                    );

                    // Total balance = direct transactions + closed experience totals
                    const experienceBalance = experienceSummaries.reduce((sum, e) => sum + e.balance, 0);

                    return {
                        ...contact,
                        balance: directBalance + experienceBalance,
                        transactionCount: directTransactions.length,
                        experiences: experienceSummaries,
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

export const update = mutation({
    args: {
        id: v.id("contacts"),
        name: v.string(),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const contact = await ctx.db.get(args.id);
        if (!contact || contact.userId !== userId) {
            throw new Error("Contact not found");
        }

        await ctx.db.patch(args.id, {
            name: args.name,
            phone: args.phone,
        });
    },
});
