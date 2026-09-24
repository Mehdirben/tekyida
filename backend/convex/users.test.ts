import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

describe("users", () => {
  it("currentEmail - returns null when unauthenticated", async () => {
    const t = convexTest(schema);
    const email = await t.query(api.users.currentEmail);
    expect(email).toBeNull();
  });

  it("currentEmail & getUserEmail - returns user email when authenticated", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Mehdi", email: "test@example.com" })
    );

    const asUser = t.withIdentity({ subject: userId });
    expect(await asUser.query(api.users.currentEmail)).toBe("test@example.com");

    const email = await t.query(internal.users.getUserEmail, { userId });
    expect(email).toBe("test@example.com");
  });

  it("isEmailTaken & updateUserEmail - checks duplicates and updates account", async () => {
    const t = convexTest(schema);
    const user1 = await t.run((ctx) =>
      ctx.db.insert("users", { name: "User 1", email: "user1@example.com" })
    );
    const user2 = await t.run((ctx) =>
      ctx.db.insert("users", { name: "User 2", email: "user2@example.com" })
    );

    await t.run((ctx) =>
      ctx.db.insert("authAccounts", {
        userId: user1,
        provider: "password",
        providerAccountId: "user1@example.com",
      })
    );

    // Email taken checks
    const takenByOther = await t.query(internal.users.isEmailTaken, {
      email: "user1@example.com",
      excludeUserId: user2,
    });
    expect(takenByOther).toBe(true);

    const sameUserCheck = await t.query(internal.users.isEmailTaken, {
      email: "user1@example.com",
      excludeUserId: user1,
    });
    expect(sameUserCheck).toBe(false);

    const unusedCheck = await t.query(internal.users.isEmailTaken, {
      email: "new@example.com",
      excludeUserId: user1,
    });
    expect(unusedCheck).toBe(false);

    // Update email
    await t.mutation(internal.users.updateUserEmail, {
      userId: user1,
      newEmail: "updated@example.com",
    });

    const user1Data = await t.run((ctx) => ctx.db.get(user1));
    expect(user1Data?.email).toBe("updated@example.com");

    const account = await t.run((ctx) =>
      ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) =>
          q.eq("userId", user1).eq("provider", "password")
        )
        .unique()
    );
    expect(account?.providerAccountId).toBe("updated@example.com");
  });

  it("changeEmail - validates email format and duplicate checks", async () => {
    const t = convexTest(schema);
    const user1 = await t.run((ctx) =>
      ctx.db.insert("users", { name: "User 1", email: "user1@example.com" })
    );
    const user2 = await t.run((ctx) =>
      ctx.db.insert("users", { name: "User 2", email: "user2@example.com" })
    );
    const asUser1 = t.withIdentity({ subject: user1 });

    // Unauthenticated
    await expect(t.action(api.users.changeEmail, { newEmail: "valid@email.com" })).rejects.toThrow("Not authenticated");

    // Invalid format
    await expect(asUser1.action(api.users.changeEmail, { newEmail: "invalid-email" })).rejects.toThrow("Invalid email address");

    // Already in use
    await expect(asUser1.action(api.users.changeEmail, { newEmail: "user2@example.com" })).rejects.toThrow("Email address is already in use");

    // Valid update
    await asUser1.action(api.users.changeEmail, { newEmail: "newuser1@example.com" });
    expect(await asUser1.query(api.users.currentEmail)).toBe("newuser1@example.com");
  });

  it("changePassword - validates password length and unauthenticated check", async () => {
    const t = convexTest(schema);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "User", email: "user@example.com" })
    );
    const asUser = t.withIdentity({ subject: userId });

    await expect(t.action(api.users.changePassword, { currentPassword: "old", newPassword: "newpassword" })).rejects.toThrow("Not authenticated");
    await expect(asUser.action(api.users.changePassword, { currentPassword: "old", newPassword: "123" })).rejects.toThrow("Password must be at least 6 characters");
  });
});
