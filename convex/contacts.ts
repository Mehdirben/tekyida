import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
    args: { notebookId: v.id("notebooks") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Verify notebook belongs to user before querying
        const notebook = await ctx.db.get(args.notebookId);
        if (!notebook || notebook.userId !== userId) return [];

        // Batch-fetch all data for this notebook in 3 queries (eliminates N+1)
        const [contacts, allTransactions, allExperiences] = await Promise.all([
            ctx.db
                .query("contacts")
                .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
                .order("desc")
                .collect(),
            ctx.db
                .query("transactions")
                .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
                .collect(),
            ctx.db
                .query("experiences")
                .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
                .collect(),
        ]);

        // Group transactions by contactId and experienceId in memory
        const txByContact = new Map<string, typeof allTransactions>();
        const txByExperience = new Map<string, typeof allTransactions>();
        for (const t of allTransactions) {
            if (t.contactId) {
                const key = t.contactId as string;
                if (!txByContact.has(key)) txByContact.set(key, []);
                txByContact.get(key)!.push(t);
            }
            if (t.experienceId) {
                const key = t.experienceId as string;
                if (!txByExperience.has(key)) txByExperience.set(key, []);
                txByExperience.get(key)!.push(t);
            }
        }

        // Group experiences by contactId
        const expByContact = new Map<string, typeof allExperiences>();
        for (const e of allExperiences) {
            if (e.contactId) {
                const key = e.contactId as string;
                if (!expByContact.has(key)) expByContact.set(key, []);
                expByContact.get(key)!.push(e);
            }
        }

        // Build results for user's contacts
        const result = contacts
            .filter((c) => c.userId === userId)
            .map((contact) => {
                const contactTx = txByContact.get(contact._id as string) ?? [];

                // Only count non-experience transactions for the contact's own balance
                const directTransactions = contactTx.filter((t) => !t.experienceId);
                const directBalance = directTransactions.reduce((sum, t) => sum + t.amount, 0);

                // Find the most recent transaction date (across all transactions including experience ones)
                let lastTransactionDate: number | undefined;
                if (contactTx.length > 0) {
                    lastTransactionDate = contactTx.reduce((latest, t) => {
                        const txDate = t.date ?? t.createdAt;
                        return txDate > latest ? txDate : latest;
                    }, 0);
                }

                // Process closed experiences linked to this contact
                const contactExperiences = expByContact.get(contact._id as string) ?? [];
                const closedExperiences = contactExperiences.filter((e) => e.closed);

                const experienceSummaries = closedExperiences.map((exp) => {
                    const expTx = txByExperience.get(exp._id as string) ?? [];
                    const expBalance = expTx.reduce((sum, t) => sum + t.amount, 0);

                    let expLastTransactionDate: number | undefined;
                    if (expTx.length > 0) {
                        expLastTransactionDate = expTx.reduce((latest, t) => {
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
                        lastTransactionDate: expLastTransactionDate,
                    };
                });

                // Total balance = direct transactions + closed experience totals
                const experienceBalance = experienceSummaries.reduce((sum, e) => sum + e.balance, 0);

                return {
                    ...contact,
                    balance: directBalance + experienceBalance,
                    transactionCount: directTransactions.length,
                    lastTransactionDate,
                    experiences: experienceSummaries,
                };
            });

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

        const name = args.name.trim();
        if (!name || name.length > 200) throw new Error("Invalid contact name");

        // Verify notebook belongs to user
        const notebook = await ctx.db.get(args.notebookId);
        if (!notebook || notebook.userId !== userId) {
            throw new Error("Notebook not found");
        }

        return await ctx.db.insert("contacts", {
            userId,
            notebookId: args.notebookId,
            name,
            phone: args.phone?.trim(),
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

        // Cascade: unlink experiences that reference this contact
        const experiences = await ctx.db
            .query("experiences")
            .withIndex("by_contact", (q) => q.eq("contactId", args.id))
            .collect();
        for (const e of experiences) {
            await ctx.db.patch(e._id, { contactId: undefined });
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

        const name = args.name.trim();
        if (!name || name.length > 200) throw new Error("Invalid contact name");

        const contact = await ctx.db.get(args.id);
        if (!contact || contact.userId !== userId) {
            throw new Error("Contact not found");
        }

        await ctx.db.patch(args.id, {
            name,
            phone: args.phone?.trim(),
        });
    },
});
