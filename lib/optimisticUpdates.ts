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
            case "notebooks:remove":
                return void (await notebookRemove(args));
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

async function notebookRemove(args: Record<string, unknown>): Promise<void> {
    const key = queryCache.cacheKey("notebooks.list", {});
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryCache.set(key, list.filter((n: any) => n._id !== args.id));
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
    const contactId = args.contactId as string;
    const notebookId = args.notebookId as string;
    const amount = args.amount as number;

    // Add to transactions list
    const key = queryCache.cacheKey("transactions.list", { contactId });
    const list = await readList(key);
    list.unshift({
        _id: id,
        _creationTime: Date.now(),
        userId: "local",
        notebookId,
        contactId,
        amount,
        description: args.description,
        date: args.date ?? Date.now(),
        createdAt: Date.now(),
    });
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
    const notebookId = ctx?.notebookId;
    if (!contactId) return;

    const key = queryCache.cacheKey("transactions.list", { contactId });
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
    const notebookId = ctx?.notebookId;
    if (!contactId) return;

    const key = queryCache.cacheKey("transactions.list", { contactId });
    const list = await readList(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = list.find((t: any) => t._id === args.id);
    if (!tx) return;

    const amount = tx.amount as number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await queryCache.set(key, list.filter((t: any) => t._id !== args.id));

    if (notebookId) {
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
    if (idx !== -1) {
        list[idx] = { ...list[idx], closed: closed ?? true };
        await queryCache.set(key, list);
    }
}
