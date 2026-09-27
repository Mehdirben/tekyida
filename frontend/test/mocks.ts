import { vi } from "vitest";

/**
 * Shared Vitest mock factories.
 * Usage: vi.mock("convex/react", async () => { const m = await import("@/test/mocks"); return m.convexReactMock(); });
 */

type MockFn = ReturnType<typeof vi.fn>;

export const convexMutationMocks: Record<string, MockFn> = {};
let convexQueryResults: Record<string, unknown> = {};

function ref(path: string) {
    return { _def: { path } };
}

function trackedMutation(path: string) {
    if (!convexMutationMocks[path]) {
        convexMutationMocks[path] = vi.fn().mockResolvedValue(undefined);
    }
    return ref(path);
}

/** Build a stub of the generated Convex api module with tracked mutation fns. */
export function makeApiStub() {
    return {
        notebooks: {
            create: trackedMutation("notebooks:create"),
            update: trackedMutation("notebooks:update"),
            archive: trackedMutation("notebooks:archive"),
            remove: trackedMutation("notebooks:remove"),
            reorder: trackedMutation("notebooks:reorder"),
            list: ref("notebooks:list"),
        },
        contacts: {
            create: trackedMutation("contacts:create"),
            update: trackedMutation("contacts:update"),
            remove: trackedMutation("contacts:remove"),
            list: ref("contacts:list"),
        },
        transactions: {
            create: trackedMutation("transactions:create"),
            update: trackedMutation("transactions:update"),
            remove: trackedMutation("transactions:remove"),
            list: ref("transactions:list"),
        },
        experiences: {
            create: trackedMutation("experiences:create"),
            update: trackedMutation("experiences:update"),
            remove: trackedMutation("experiences:remove"),
            close: trackedMutation("experiences:close"),
            reopen: trackedMutation("experiences:reopen"),
            transfer: trackedMutation("experiences:transfer"),
            list: ref("experiences:list"),
        },
        users: {
            changePassword: trackedMutation("users:changePassword"),
            changeEmail: trackedMutation("users:changeEmail"),
            currentEmail: ref("users:currentEmail"),
        },
    };
}

export function resetConvexMocks() {
    for (const fn of Object.values(convexMutationMocks)) {
        fn.mockReset();
        fn.mockResolvedValue(undefined);
    }
    convexQueryResults = {};
}

export function setConvexMutationResult(path: string, impl: MockFn) {
    convexMutationMocks[path] = impl;
}

export function getConvexMutationMock(path: string): MockFn {
    return convexMutationMocks[path];
}

/** Store a query result. Cloned like real Convex, which returns fresh objects per run. */
export function setQueryResult(path: string, value: unknown) {
    convexQueryResults[path] = deepClone(value);
}

export function useMutationMock(def: { _def?: { path?: string } }): MockFn {
    const path = def?._def?.path ?? "";
    return (
        convexMutationMocks[path] ?? vi.fn().mockResolvedValue(undefined)
    ) as MockFn;
}

export function useQueryMock(def: { _def?: { path?: string } }): unknown {
    return deepClone(convexQueryResults[def?._def?.path ?? ""]);
}

function deepClone(value: unknown): unknown {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(deepClone);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = deepClone(v);
    }
    return out;
}

export function useActionMock(): MockFn {
    return vi.fn().mockResolvedValue(undefined);
}

export function convexReactMock() {
    return {
        useMutation: useMutationMock,
        useQuery: useQueryMock,
        useAction: useActionMock,
        Authenticated: ({ children }: { children: React.ReactNode }) => children,
        Unauthenticated: () => null,
        Loading: () => null,
    };
}

/** Override navigator.onLine (must be re-set after renders that read it). */
export function setOnline(online: boolean) {
    Object.defineProperty(navigator, "onLine", {
        value: online,
        configurable: true,
    });
}

export const routerPush = vi.fn();
export const routerReplace = vi.fn();
export const routerBack = vi.fn();

export function nextNavigationMock() {
    return {
        useRouter: () => ({
            push: routerPush,
            replace: routerReplace,
            back: routerBack,
            prefetch: vi.fn(),
            refresh: vi.fn(),
        }),
        useSearchParams: () => new URLSearchParams(window.location.search),
        usePathname: () => "/",
        useServerInsertedHTML: (cb: () => unknown) => void cb(),
        redirect: vi.fn(),
    };
}
