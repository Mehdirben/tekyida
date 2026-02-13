import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
    ...authTables,

    notebooks: defineTable({
        userId: v.id("users"),
        name: v.string(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    contacts: defineTable({
        userId: v.id("users"),
        notebookId: v.id("notebooks"),
        name: v.string(),
        phone: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_notebook", ["notebookId"]),

    transactions: defineTable({
        userId: v.id("users"),
        notebookId: v.id("notebooks"),
        contactId: v.id("contacts"),
        amount: v.number(), // positive = they owe you, negative = you owe them
        description: v.optional(v.string()),
        date: v.optional(v.number()), // user-selected date/time
        createdAt: v.number(),
    })
        .index("by_notebook", ["notebookId"])
        .index("by_contact", ["contactId"]),
});

export default schema;
