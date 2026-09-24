/**
 * Optimistic updates: applies mutations locally to the query cache
 * so offline changes are immediately visible in the UI.
 */

import * as queryCache from "./queryCache";

/** Generate a temporary ID for locally-created items */
export function tempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface OptimisticContext {
    notebookId?: string;
    contactId?: string;
    experienceId?: string;
}

/**
 * Apply an optimistic update to the query cache.
 * Returns a temp ID if a new item was created.
 */
export async function applyOptimisticUpdate(
    functionPath: string,
    args: Record<string, unknown>,
    context?: OptimisticContext
): Promise<string | undefined> {
    try {
        switch (functionPath) {
            case "notebooks:create":
                return await notebookCreate(args);
            case "notebooks:update":
                return void (await notebookUpdate(args));
            case "notebooks:archive":
                return void (await notebookArchive(args));
            case "notebooks:remove":
                return void (await notebookRemove(args));
            case "notebooks:reorder":
                return void (await notebookReorder(args));
            case "contacts:create":
                return await contactCreate(args);
            case "contacts:update":
                return void (await contactUpdate(args, context));
            case "contacts:remove":
                return void (await contactRemove(args, context));
            case "transactions:create":
                return await transactionCreate(args);
            case "transactions:update":
                return void (await transactionUpdate(args, context));
            case "transactions:remove":
                return void (await transactionRemove(args, context));
            case "experiences:create":
                return await experienceCreate(args);
            case "experiences:update":
                return void (await experienceUpdate(args, context));
            case "experiences:remove":
                return void (await experienceRemove(args, context));
            case "experiences:close":
                return void (await experienceSetClosed(args, context, true));
            case "experiences:reopen":
                return void (await experienceSetClosed(args, context, false));
            case "experiences:transfer":
                return void (await experienceTransfer(args, context));
            default:
                return undefined;
        }
    } catch {
        // Optimistic updates are best-effort — never block the mutation
        return undefined;
    }
}

// ─── Helpers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readList(key: string): Promise<any[]> {
    return (await queryCache.get<unknown[]>(key)) ?? [];
}

// ─── Notebooks ──────────────────────────────────────────────

async function notebookCreate(args: Record<string, unknown>): Promise<string> {
    const id = tempId();
    const key = queryCache.cacheKey("notebooks.list", {});
    const list = await readList(key);
    list.unshift({
        _id: id,
        _creationTime: Date.now(),
        userId: "local",
        name: args.name,
        createdAt: Date.now(),
        contactCount: 0,
        balance: 0,
    });
    await queryCache.set(key, list);
    return id;
}

async function notebookUpdate(args: Record<string, unknown>): Promise<void> {
    const key = queryCache.cacheKey("notebooks.list", {});
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = list.findIndex((n: any) => n._id === args.id);
    if (idx !== -1) {
        list[idx] = { ...list[idx], name: args.name };
        await queryCache.set(key, list);
    }
}

async function notebookArchive(args: Record<string, unknown>): Promise<void> {
    const key = queryCache.cacheKey("notebooks.list", {});
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = list.findIndex((n: any) => n._id === args.id);
    if (idx !== -1) {
        list[idx] = { ...list[idx], archived: args.archived };
        await queryCache.set(key, list);
    }
}


async function notebookRemove(args: Record<string, unknown>): Promise<void> {
    const key = queryCache.cacheKey("notebooks.list", {});
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryCache.set(key, list.filter((n: any) => n._id !== args.id));
}

async function notebookReorder(args: Record<string, unknown>): Promise<void> {
    const key = queryCache.cacheKey("notebooks.list", {});
    const list = await readList(key);
    const ids = args.ids as string[];
    
    // Sort local cache list elements to match the order of IDs in the array
    const sorted = [...list].sort((a, b) => {
        const indexA = ids.indexOf(a._id);
        const indexB = ids.indexOf(b._id);
        const valA = indexA !== -1 ? indexA : Number.MAX_SAFE_INTEGER;
        const valB = indexB !== -1 ? indexB : Number.MAX_SAFE_INTEGER;
        return valA - valB;
    });

    // Patch local order property
    for (let i = 0; i < sorted.length; i++) {
        const idx = ids.indexOf(sorted[i]._id);
        if (idx !== -1) {
            sorted[i] = { ...sorted[i], order: idx };
        }
    }

    await queryCache.set(key, sorted);
}

// ─── Contacts ───────────────────────────────────────────────

async function contactCreate(args: Record<string, unknown>): Promise<string> {
    const id = tempId();
    const notebookId = args.notebookId as string;
    const key = queryCache.cacheKey("contacts.list", { notebookId });
    const list = await readList(key);
    list.unshift({
        _id: id,
        _creationTime: Date.now(),
        userId: "local",
        notebookId,
        name: args.name,
        phone: args.phone,
        createdAt: Date.now(),
        balance: 0,
        transactionCount: 0,
    });
    await queryCache.set(key, list);

    // Update notebook contactCount
    const nbKey = queryCache.cacheKey("notebooks.list", {});
    const notebooks = await readList(nbKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nbIdx = notebooks.findIndex((n: any) => n._id === notebookId);
    if (nbIdx !== -1) {
        notebooks[nbIdx] = {
            ...notebooks[nbIdx],
            contactCount: (notebooks[nbIdx].contactCount ?? 0) + 1,
        };
        await queryCache.set(nbKey, notebooks);
    }

    return id;
}

async function contactUpdate(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("contacts.list", { notebookId });
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = list.findIndex((c: any) => c._id === args.id);
    if (idx !== -1) {
        list[idx] = { ...list[idx], name: args.name, phone: args.phone };
        await queryCache.set(key, list);
    }
}

async function contactRemove(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("contacts.list", { notebookId });
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = list.find((c: any) => c._id === args.id);
    if (!contact) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryCache.set(key, list.filter((c: any) => c._id !== args.id));

    // Update notebook balance & contactCount
    const nbKey = queryCache.cacheKey("notebooks.list", {});
    const notebooks = await readList(nbKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nbIdx = notebooks.findIndex((n: any) => n._id === notebookId);
    if (nbIdx !== -1) {
        notebooks[nbIdx] = {
            ...notebooks[nbIdx],
            contactCount: Math.max(0, (notebooks[nbIdx].contactCount ?? 0) - 1),
            balance: (notebooks[nbIdx].balance ?? 0) - (contact.balance ?? 0),
        };
        await queryCache.set(nbKey, notebooks);
    }
}

// ─── Transactions ───────────────────────────────────────────

async function transactionCreate(args: Record<string, unknown>): Promise<string> {
    const id = tempId();
    const contactId = args.contactId as string | undefined;
    const experienceId = args.experienceId as string | undefined;
    const notebookId = args.notebookId as string;
    const amount = args.amount as number;
    const txDate = (args.date as number) ?? Date.now();

    const txRecord = {
        _id: id,
        _creationTime: Date.now(),
        userId: "local",
        notebookId,
        contactId,
        experienceId,
        amount,
        description: args.description,
        date: txDate,
        createdAt: Date.now(),
    };

    // Add to the correct transactions list cache
    if (experienceId) {
        const key = queryCache.cacheKey("transactions.list", { experienceId });
        const list = await readList(key);
        list.unshift(txRecord);
        await queryCache.set(key, list);

        // Update experience balance, transactionCount & lastTransactionDate
        await updateExperienceSummary(experienceId, notebookId, amount, 1, txDate);
    } else if (contactId) {
        const key = queryCache.cacheKey("transactions.list", { contactId });
        const list = await readList(key);
        list.unshift(txRecord);
        await queryCache.set(key, list);

        // Update contact balance & transactionCount
        const ctKey = queryCache.cacheKey("contacts.list", { notebookId });
        const contacts = await readList(ctKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctIdx = contacts.findIndex((c: any) => c._id === contactId);
        if (ctIdx !== -1) {
            contacts[ctIdx] = {
                ...contacts[ctIdx],
                balance: (contacts[ctIdx].balance ?? 0) + amount,
                transactionCount: (contacts[ctIdx].transactionCount ?? 0) + 1,
            };
            await queryCache.set(ctKey, contacts);
        }
    }

    // Update notebook balance
    const nbKey = queryCache.cacheKey("notebooks.list", {});
    const notebooks = await readList(nbKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nbIdx = notebooks.findIndex((n: any) => n._id === notebookId);
    if (nbIdx !== -1) {
        notebooks[nbIdx] = {
            ...notebooks[nbIdx],
            balance: (notebooks[nbIdx].balance ?? 0) + amount,
        };
        await queryCache.set(nbKey, notebooks);
    }

    return id;
}

async function transactionUpdate(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const contactId = ctx?.contactId;
    const experienceId = ctx?.experienceId;
    const notebookId = ctx?.notebookId;

    // Determine which cache list this transaction lives in
    let key: string | null = null;
    if (experienceId) {
        key = queryCache.cacheKey("transactions.list", { experienceId });
    } else if (contactId) {
        key = queryCache.cacheKey("transactions.list", { contactId });
    }
    if (!key) return;

    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = list.findIndex((t: any) => t._id === args.id);
    if (idx === -1) return;

    const oldAmount = list[idx].amount as number;
    const newAmount = args.amount as number;
    const diff = newAmount - oldAmount;

    list[idx] = {
        ...list[idx],
        amount: newAmount,
        description: args.description,
        date: args.date,
    };
    await queryCache.set(key, list);

    if (notebookId) {
        if (experienceId) {
            // Update experience balance in the experiences.list cache
            await updateExperienceSummary(experienceId, notebookId, diff, 0);
        } else if (contactId) {
            // Update contact balance
            const ctKey = queryCache.cacheKey("contacts.list", { notebookId });
            const contacts = await readList(ctKey);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctIdx = contacts.findIndex((c: any) => c._id === contactId);
            if (ctIdx !== -1) {
                contacts[ctIdx] = {
                    ...contacts[ctIdx],
                    balance: (contacts[ctIdx].balance ?? 0) + diff,
                };
                await queryCache.set(ctKey, contacts);
            }
        }

        // Update notebook balance
        const nbKey = queryCache.cacheKey("notebooks.list", {});
        const notebooks = await readList(nbKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nbIdx = notebooks.findIndex((n: any) => n._id === notebookId);
        if (nbIdx !== -1) {
            notebooks[nbIdx] = {
                ...notebooks[nbIdx],
                balance: (notebooks[nbIdx].balance ?? 0) + diff,
            };
            await queryCache.set(nbKey, notebooks);
        }
    }
}

async function transactionRemove(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const contactId = ctx?.contactId;
    const experienceId = ctx?.experienceId;
    const notebookId = ctx?.notebookId;

    // Determine which cache list this transaction lives in
    let key: string | null = null;
    if (experienceId) {
        key = queryCache.cacheKey("transactions.list", { experienceId });
    } else if (contactId) {
        key = queryCache.cacheKey("transactions.list", { contactId });
    }
    if (!key) return;

    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = list.find((t: any) => t._id === args.id);
    if (!tx) return;

    const amount = tx.amount as number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryCache.set(key, list.filter((t: any) => t._id !== args.id));

    if (notebookId) {
        if (experienceId) {
            // Update experience balance & transactionCount in the experiences.list cache
            await updateExperienceSummary(experienceId, notebookId, -amount, -1);
        } else if (contactId) {
            // Update contact balance & transactionCount
            const ctKey = queryCache.cacheKey("contacts.list", { notebookId });
            const contacts = await readList(ctKey);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctIdx = contacts.findIndex((c: any) => c._id === contactId);
            if (ctIdx !== -1) {
                contacts[ctIdx] = {
                    ...contacts[ctIdx],
                    balance: (contacts[ctIdx].balance ?? 0) - amount,
                    transactionCount: Math.max(0, (contacts[ctIdx].transactionCount ?? 0) - 1),
                };
                await queryCache.set(ctKey, contacts);
            }
        }

        // Update notebook balance
        const nbKey = queryCache.cacheKey("notebooks.list", {});
        const notebooks = await readList(nbKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nbIdx = notebooks.findIndex((n: any) => n._id === notebookId);
        if (nbIdx !== -1) {
            notebooks[nbIdx] = {
                ...notebooks[nbIdx],
                balance: (notebooks[nbIdx].balance ?? 0) - amount,
            };
            await queryCache.set(nbKey, notebooks);
        }
    }
}

// ─── Experiences ─────────────────────────────────────────────

async function experienceCreate(args: Record<string, unknown>): Promise<string> {
    const id = tempId();
    const notebookId = args.notebookId as string;
    const key = queryCache.cacheKey("experiences.list", { notebookId });
    const list = await readList(key);
    list.unshift({
        _id: id,
        _creationTime: Date.now(),
        userId: "local",
        notebookId,
        name: args.name,
        contactId: args.contactId,
        closed: false,
        createdAt: Date.now(),
        balance: 0,
        transactionCount: 0,
    });
    await queryCache.set(key, list);
    return id;
}

async function experienceUpdate(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("experiences.list", { notebookId });
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = list.findIndex((e: any) => e._id === args.id);
    if (idx !== -1) {
        list[idx] = { ...list[idx], name: args.name, contactId: args.contactId };
        await queryCache.set(key, list);
    }
}

async function experienceRemove(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("experiences.list", { notebookId });
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryCache.set(key, list.filter((e: any) => e._id !== args.id));
}

async function experienceSetClosed(
    args: Record<string, unknown>,
    ctx?: OptimisticContext,
    closed?: boolean
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("experiences.list", { notebookId });
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = list.findIndex((e: any) => e._id === args.id);
    if (idx === -1) return;

    const experience = list[idx];
    const isClosed = closed ?? true;
    list[idx] = { ...experience, closed: isClosed };
    await queryCache.set(key, list);

    // Update contacts.list cache: closed experiences show as summary cards in the contact view
    const contactId = experience.contactId as string | undefined;
    if (!contactId) return;

    const ctKey = queryCache.cacheKey("contacts.list", { notebookId });
    const contacts = await readList(ctKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctIdx = contacts.findIndex((c: any) => c._id === contactId);
    if (ctIdx === -1) return;

    const contact = contacts[ctIdx];
    const expSummary = {
        _id: experience._id,
        name: experience.name,
        closed: true,
        balance: experience.balance ?? 0,
        transactionCount: experience.transactionCount ?? 0,
        lastTransactionDate: experience.lastTransactionDate,
    };

    if (isClosed) {
        // Closing: add experience summary to contact and include its balance
        const existingExperiences = contact.experiences ?? [];
        contacts[ctIdx] = {
            ...contact,
            experiences: [...existingExperiences, expSummary],
            balance: (contact.balance ?? 0) + (experience.balance ?? 0),
        };
    } else {
        // Reopening: remove experience summary from contact and subtract its balance
        const existingExperiences = contact.experiences ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const removedExp = existingExperiences.find((e: any) => e._id === experience._id);
        const removedBalance = removedExp?.balance ?? experience.balance ?? 0;
        contacts[ctIdx] = {
            ...contact,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            experiences: existingExperiences.filter((e: any) => e._id !== experience._id),
            balance: (contact.balance ?? 0) - removedBalance,
        };
    }
    await queryCache.set(ctKey, contacts);
}

// ─── Shared helpers ─────────────────────────────────────────────

/** Update an experience's summary (balance, transactionCount, lastTransactionDate) in the experiences.list cache */
async function updateExperienceSummary(
    experienceId: string,
    notebookId: string,
    balanceDiff: number,
    countDiff: number,
    newTxDate?: number
): Promise<void> {
    const expKey = queryCache.cacheKey("experiences.list", { notebookId });
    const experiences = await readList(expKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expIdx = experiences.findIndex((e: any) => e._id === experienceId);
    if (expIdx !== -1) {
        const exp = experiences[expIdx];
        const updatedExp = {
            ...exp,
            balance: (exp.balance ?? 0) + balanceDiff,
            transactionCount: Math.max(0, (exp.transactionCount ?? 0) + countDiff),
        };
        // Update lastTransactionDate if a new transaction date is provided and is more recent
        if (newTxDate !== undefined) {
            updatedExp.lastTransactionDate = Math.max(exp.lastTransactionDate ?? 0, newTxDate);
        }
        experiences[expIdx] = updatedExp;
        await queryCache.set(expKey, experiences);
    }
}

async function experienceTransfer(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const sourceNotebookId = ctx?.notebookId;
    const targetNotebookId = args.targetNotebookId as string;
    const experienceId = args.id as string;
    if (!sourceNotebookId || !targetNotebookId) return;

    // Remove from source notebook's experience list
    const sourceKey = queryCache.cacheKey("experiences.list", { notebookId: sourceNotebookId });
    const sourceList = await readList(sourceKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exp = sourceList.find((e: any) => e._id === experienceId);
    if (!exp) return;

    const expBalance = exp.balance ?? 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryCache.set(sourceKey, sourceList.filter((e: any) => e._id !== experienceId));

    // Add to target notebook's experience list (clear contactId)
    const targetKey = queryCache.cacheKey("experiences.list", { notebookId: targetNotebookId });
    const targetList = await readList(targetKey);
    targetList.unshift({
        ...exp,
        notebookId: targetNotebookId,
        contactId: undefined,
    });
    await queryCache.set(targetKey, targetList);

    // Update notebook balances
    const nbKey = queryCache.cacheKey("notebooks.list", {});
    const notebooks = await readList(nbKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srcIdx = notebooks.findIndex((n: any) => n._id === sourceNotebookId);
    if (srcIdx !== -1) {
        notebooks[srcIdx] = {
            ...notebooks[srcIdx],
            balance: (notebooks[srcIdx].balance ?? 0) - expBalance,
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tgtIdx = notebooks.findIndex((n: any) => n._id === targetNotebookId);
    if (tgtIdx !== -1) {
        notebooks[tgtIdx] = {
            ...notebooks[tgtIdx],
            balance: (notebooks[tgtIdx].balance ?? 0) + expBalance,
        };
    }
    if (srcIdx !== -1 || tgtIdx !== -1) {
        await queryCache.set(nbKey, notebooks);
    }
}
