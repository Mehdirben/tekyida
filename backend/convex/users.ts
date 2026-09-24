import { v } from "convex/values";
import { query, action, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const currentEmail = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        const user = await ctx.db.get(userId);
        return user?.email ?? null;
    },
});

export const getUserEmail = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        return user?.email ?? null;
    },
});

/** Check if an email is already used by another user */
export const isEmailTaken = internalQuery({
    args: {
        email: v.string(),
        excludeUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), args.email))
            .first();
        return existingUser !== null && existingUser._id !== args.excludeUserId;
    },
});

export const updateUserEmail = internalMutation({
    args: {
        userId: v.id("users"),
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
        currentPassword: v.string(),
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

        // Verify the current password before allowing change
        try {
            await retrieveAccount(ctx, {
                provider: "password",
                account: {
                    id: email,
                    secret: args.currentPassword,
                },
            });
        } catch {
            throw new Error("Current password is incorrect.");
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

        // Check if the new email is already taken by another user
        const taken = await ctx.runQuery(internal.users.isEmailTaken, {
            email: args.newEmail,
            excludeUserId: userId,
        });
        if (taken) {
            throw new Error("Email address is already in use.");
        }

        // Update email in users table and authAccounts table
        await ctx.runMutation(internal.users.updateUserEmail, {
            userId,
            newEmail: args.newEmail,
        });
    },
});
