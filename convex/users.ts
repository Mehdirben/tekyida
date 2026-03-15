import { v } from "convex/values";
import { action, internalQuery, internalMutation } from "./_generated/server";
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

export const updateUserEmail = internalMutation({
    args: {
        userId: v.id("users"),
        oldEmail: v.string(),
        newEmail: v.string(),
    },
    handler: async (ctx, args) => {
        // Update the email on the users table
        await ctx.db.patch(args.userId, { email: args.newEmail });

        // Update the providerAccountId on the authAccounts table
        const account = await ctx.db
            .query("authAccounts")
            .withIndex("userIdAndProvider", (q) =>
                q.eq("userId", args.userId).eq("provider", "password")
            )
            .unique();

        if (account) {
            await ctx.db.patch(account._id, {
                providerAccountId: args.newEmail,
            });
        }
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

export const changeEmail = action({
    args: {
        newEmail: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(args.newEmail)) {
            throw new Error("Invalid email address.");
        }

        // Get the user's current email
        const currentEmail = await ctx.runQuery(internal.users.getUserEmail, { userId });
        if (!currentEmail) {
            throw new Error("Could not determine current email");
        }

        // Update email in users table and authAccounts table
        await ctx.runMutation(internal.users.updateUserEmail, {
            userId,
            oldEmail: currentEmail,
            newEmail: args.newEmail,
        });
    },
});
