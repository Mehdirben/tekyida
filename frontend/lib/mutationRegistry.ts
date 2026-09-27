import { api } from "@/convex/_generated/api";
import type { FunctionReference } from "convex/server";

/**
 * Maps offline queue function paths to their Convex mutation references.
 * Used by SyncContext to resolve a queued mutation to its API function.
 */
export const mutationRegistry: Record<string, FunctionReference<"mutation">> = {
    "notebooks:create": api.notebooks.create,
    "notebooks:update": api.notebooks.update,
    "notebooks:archive": api.notebooks.archive,
    "notebooks:remove": api.notebooks.remove,
    "notebooks:reorder": api.notebooks.reorder,
    "contacts:create": api.contacts.create,
    "contacts:update": api.contacts.update,
    "contacts:remove": api.contacts.remove,
    "transactions:create": api.transactions.create,
    "transactions:update": api.transactions.update,
    "transactions:remove": api.transactions.remove,
    "experiences:create": api.experiences.create,
    "experiences:update": api.experiences.update,
    "experiences:remove": api.experiences.remove,
    "experiences:close": api.experiences.close,
    "experiences:reopen": api.experiences.reopen,
    "experiences:transfer": api.experiences.transfer,
};
