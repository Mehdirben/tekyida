import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { modifyAccountCredentials } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const getUserEmail = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        return user?.email ?? null;
    },
});

export const changePassword = action({
    args: {
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        if (!args.newPassword || args.newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters.");
        }

        // Get the user's email from the database
        const email = await ctx.runQuery(internal.users.getUserEmail, { userId });
        if (!email) {
            throw new Error("Could not determine user email");
        }

        await modifyAccountCredentials(ctx, {
            provider: "password",
            account: {
                id: email,
                secret: args.newPassword,
            },
        });
    },
});
