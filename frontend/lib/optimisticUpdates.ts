/**
 * Optimistic updates: applies mutations locally to the query cache
 * so offline changes are immediately visible in the UI.
 */

import * as queryCache from "./queryCache";

type CachedDoc = Record<string, unknown>;

/** Generate a temporary ID for locally-created items */
export function tempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface OptimisticContext {
    notebookId?: string;
    contactId?: string;
    experienceId?: string;
}

type OptimisticHandler = (
    args: Record<string, unknown>,
    ctx?: OptimisticContext
) => Promise<unknown>;

const optimisticHandlers: Record<string, OptimisticHandler> = {
    "notebooks:create": notebookCreate,
    "notebooks:update": notebookUpdate,
    "notebooks:archive": notebookArchive,
    "notebooks:remove": notebookRemove,
    "notebooks:reorder": notebookReorder,
    "contacts:create": contactCreate,
    "contacts:update": contactUpdate,
    "contacts:remove": contactRemove,
    "transactions:create": transactionCreate,
    "transactions:update": transactionUpdate,
    "transactions:remove": transactionRemove,
    "experiences:create": experienceCreate,
    "experiences:update": experienceUpdate,
    "experiences:remove": experienceRemove,
    "experiences:close": (args, ctx) => experienceSetClosed(args, ctx, true),
    "experiences:reopen": (args, ctx) => experienceSetClosed(args, ctx, false),
    "experiences:transfer": experienceTransfer,
};

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
        const handler = optimisticHandlers[functionPath];
        if (!handler) return undefined;
        const result = await handler(args, context);
        return typeof result === "string" ? result : undefined;
    } catch {
        // Optimistic updates are best-effort — never block the mutation
        return undefined;
    }
}

// ─── Helpers ──────────────────────────────────────────────────

async function readList(key: string): Promise<CachedDoc[]> {
    return (await queryCache.get<CachedDoc[]>(key)) ?? [];
}

/**
 * Patch a single document (matched by `_id`) inside a cached list.
 * Returns the previous document, or undefined when not found.
 */
async function patchDoc(
    key: string,
    id: unknown,
    patch: (doc: CachedDoc) => CachedDoc
): Promise<CachedDoc | undefined> {
    const list = await readList(key);
    const idx = list.findIndex((doc) => doc._id === id);
    if (idx === -1) return undefined;
    const previous = list[idx];
    list[idx] = patch(previous);
    await queryCache.set(key, list);
    return previous;
}

async function adjustNotebookBalances(
    diffs: Array<{ notebookId: string; diff: number }>
): Promise<void> {
    const nbKey = queryCache.cacheKey("notebooks.list", {});
    const notebooks = await readList(nbKey);
    let changed = false;
    for (const { notebookId, diff } of diffs) {
        const idx = notebooks.findIndex((n) => n._id === notebookId);
        if (idx !== -1) {
            notebooks[idx] = {
                ...notebooks[idx],
                balance: ((notebooks[idx].balance as number) ?? 0) + diff,
            };
            changed = true;
        }
    }
    if (changed) {
        await queryCache.set(nbKey, notebooks);
    }
}

async function adjustBalances(
    notebookId: string,
    diff: number,
    contactId?: string,
    txCountDiff = 0
): Promise<void> {
    if (contactId) {
        const ctKey = queryCache.cacheKey("contacts.list", { notebookId });
        await patchDoc(ctKey, contactId, (doc) => ({
            ...doc,
            balance: ((doc.balance as number) ?? 0) + diff,
            ...(txCountDiff !== 0
                ? {
                      transactionCount: Math.max(
                          0,
                          ((doc.transactionCount as number) ?? 0) + txCountDiff
                      ),
                  }
                : {}),
        }));
    }

    await adjustNotebookBalances([{ notebookId, diff }]);
}

function getTransactionCacheKey(ctx?: OptimisticContext): string | null {
    if (ctx?.experienceId) {
        return queryCache.cacheKey("transactions.list", { experienceId: ctx.experienceId });
    }
    if (ctx?.contactId) {
        return queryCache.cacheKey("transactions.list", { contactId: ctx.contactId });
    }
    return null;
}

// ─── Notebooks ────────────────────────────────────────────────

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
    await patchDoc(key, args.id, (doc) => ({ ...doc, name: args.name }));
}

async function notebookArchive(args: Record<string, unknown>): Promise<void> {
    const key = queryCache.cacheKey("notebooks.list", {});
    await patchDoc(key, args.id, (doc) => ({ ...doc, archived: args.archived }));
}

async function notebookRemove(args: Record<string, unknown>): Promise<void> {
    const key = queryCache.cacheKey("notebooks.list", {});
    const list = await readList(key);
    await queryCache.set(key, list.filter((n) => n._id !== args.id));
}

async function notebookReorder(args: Record<string, unknown>): Promise<void> {
    const key = queryCache.cacheKey("notebooks.list", {});
    const list = await readList(key);
    const ids = args.ids as string[];
    
    // Sort local cache list elements to match the order of IDs in the array
    const sorted = [...list].sort((a, b) => {
        const indexA = ids.indexOf(a._id as string);
        const indexB = ids.indexOf(b._id as string);
        const valA = indexA !== -1 ? indexA : Number.MAX_SAFE_INTEGER;
        const valB = indexB !== -1 ? indexB : Number.MAX_SAFE_INTEGER;
        return valA - valB;
    });

    // Patch local order property
    for (let i = 0; i < sorted.length; i++) {
        const idx = ids.indexOf(sorted[i]._id as string);
        if (idx !== -1) {
            sorted[i] = { ...sorted[i], order: idx };
        }
    }

    await queryCache.set(key, sorted);
}

// ─── Contacts ─────────────────────────────────────────────────

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
    await patchDoc(nbKey, notebookId, (doc) => ({
        ...doc,
        contactCount: ((doc.contactCount as number) ?? 0) + 1,
    }));

    return id;
}

async function contactUpdate(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("contacts.list", { notebookId });
    await patchDoc(key, args.id, (doc) => ({
        ...doc,
        name: args.name,
        phone: args.phone,
    }));
}

async function contactRemove(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("contacts.list", { notebookId });
    const list = await readList(key);
    const contact = list.find((c) => c._id === args.id);
    if (!contact) return;

    await queryCache.set(key, list.filter((c) => c._id !== args.id));

    // Update notebook balance & contactCount
    const nbKey = queryCache.cacheKey("notebooks.list", {});
    await patchDoc(nbKey, notebookId, (doc) => ({
        ...doc,
        contactCount: Math.max(0, ((doc.contactCount as number) ?? 0) - 1),
        balance: ((doc.balance as number) ?? 0) - ((contact.balance as number) ?? 0),
    }));
}

// ─── Transactions ─────────────────────────────────────────────

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
    }

    await adjustBalances(notebookId, amount, experienceId ? undefined : contactId, 1);
    return id;
}

async function transactionUpdate(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const key = getTransactionCacheKey(ctx);
    if (!key) return;

    const previous = await patchDoc(key, args.id, (doc) => ({
        ...doc,
        amount: args.amount as number,
        description: args.description,
        date: args.date,
    }));
    if (!previous) return;

    const diff = (args.amount as number) - (previous.amount as number);

    if (ctx?.notebookId) {
        if (ctx.experienceId) {
            await updateExperienceSummary(ctx.experienceId, ctx.notebookId, diff, 0);
            await adjustBalances(ctx.notebookId, diff, undefined, 0);
        } else {
            await adjustBalances(ctx.notebookId, diff, ctx.contactId, 0);
        }
    }
}

async function transactionRemove(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const key = getTransactionCacheKey(ctx);
    if (!key) return;

    const list = await readList(key);
    const tx = list.find((t) => t._id === args.id);
    if (!tx) return;

    const amount = tx.amount as number;
    await queryCache.set(key, list.filter((t) => t._id !== args.id));

    if (ctx?.notebookId) {
        if (ctx.experienceId) {
            await updateExperienceSummary(ctx.experienceId, ctx.notebookId, -amount, -1);
            await adjustBalances(ctx.notebookId, -amount, undefined, 0);
        } else {
            await adjustBalances(ctx.notebookId, -amount, ctx.contactId, -1);
        }
    }
}

// ─── Experiences ──────────────────────────────────────────────

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
    await patchDoc(key, args.id, (doc) => ({
        ...doc,
        name: args.name,
        contactId: args.contactId,
    }));
}

async function experienceRemove(
    args: Record<string, unknown>,
    ctx?: OptimisticContext
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("experiences.list", { notebookId });
    const list = await readList(key);
    await queryCache.set(key, list.filter((e) => e._id !== args.id));
}

async function experienceSetClosed(
    args: Record<string, unknown>,
    ctx?: OptimisticContext,
    closed?: boolean
): Promise<void> {
    const notebookId = ctx?.notebookId;
    if (!notebookId) return;
    const key = queryCache.cacheKey("experiences.list", { notebookId });

    const isClosed = closed ?? true;
    const experience = await patchDoc(key, args.id, (doc) => ({ ...doc, closed: isClosed }));
    if (!experience) return;

    // Update contacts.list cache: closed experiences show as summary cards in the contact view
    const contactId = experience.contactId as string | undefined;
    if (!contactId) return;

    const ctKey = queryCache.cacheKey("contacts.list", { notebookId });
    const contacts = await readList(ctKey);
    const ctIdx = contacts.findIndex((c) => c._id === contactId);
    if (ctIdx === -1) return;

    const contact = contacts[ctIdx];
    const expSummary = {
        _id: experience._id,
        name: experience.name,
        closed: true,
        balance: (experience.balance as number) ?? 0,
        transactionCount: (experience.transactionCount as number) ?? 0,
        lastTransactionDate: experience.lastTransactionDate,
    };
    const existingExperiences = (contact.experiences as CachedDoc[] | undefined) ?? [];

    if (isClosed) {
        // Closing: add experience summary to contact and include its balance
        contacts[ctIdx] = {
            ...contact,
            experiences: [...existingExperiences, expSummary],
            balance: ((contact.balance as number) ?? 0) + ((experience.balance as number) ?? 0),
        };
    } else {
        // Reopening: remove experience summary from contact and subtract its balance
        const removedExp = existingExperiences.find((e) => e._id === experience._id);
        const removedBalance =
            (removedExp?.balance as number | undefined) ?? (experience.balance as number) ?? 0;
        contacts[ctIdx] = {
            ...contact,
            experiences: existingExperiences.filter((e) => e._id !== experience._id),
            balance: ((contact.balance as number) ?? 0) - removedBalance,
        };
    }
    await queryCache.set(ctKey, contacts);
}

// ─── Shared helpers ───────────────────────────────────────────

/** Update an experience's summary (balance, transactionCount, lastTransactionDate) in the experiences.list cache */
async function updateExperienceSummary(
    experienceId: string,
    notebookId: string,
    balanceDiff: number,
    countDiff: number,
    newTxDate?: number
): Promise<void> {
    const expKey = queryCache.cacheKey("experiences.list", { notebookId });
    await patchDoc(expKey, experienceId, (doc) => {
        const updated: CachedDoc = {
            ...doc,
            balance: ((doc.balance as number) ?? 0) + balanceDiff,
            transactionCount: Math.max(0, ((doc.transactionCount as number) ?? 0) + countDiff),
        };
        // Update lastTransactionDate if a new transaction date is provided and is more recent
        if (newTxDate !== undefined) {
            updated.lastTransactionDate = Math.max(
                (doc.lastTransactionDate as number | undefined) ?? 0,
                newTxDate
            );
        }
        return updated;
    });
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
    const exp = sourceList.find((e) => e._id === experienceId);
    if (!exp) return;

    const expBalance = (exp.balance as number) ?? 0;

    await queryCache.set(sourceKey, sourceList.filter((e) => e._id !== experienceId));

    // Add to target notebook's experience list (clear contactId)
    const targetKey = queryCache.cacheKey("experiences.list", { notebookId: targetNotebookId });
    const targetList = await readList(targetKey);
    targetList.unshift({
        ...exp,
        notebookId: targetNotebookId,
        contactId: undefined,
    });
    await queryCache.set(targetKey, targetList);

    // Update balances of both notebooks
    await adjustNotebookBalances([
        { notebookId: sourceNotebookId, diff: -expBalance },
        { notebookId: targetNotebookId, diff: expBalance },
    ]);
}
