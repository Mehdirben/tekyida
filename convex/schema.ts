import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
    ...authTables,

    notebooks: defineTable({
        userId: v.id("users"),
        name: v.string(),
        createdAt: v.number(),
        order: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    contacts: defineTable({
        userId: v.id("users"),
        notebookId: v.id("notebooks"),
        name: v.string(),
        phone: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_notebook", ["notebookId"]),

    experiences: defineTable({
        userId: v.id("users"),
        notebookId: v.id("notebooks"),
        name: v.string(),
        contactId: v.optional(v.id("contacts")),
        closed: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_notebook", ["notebookId"])
        .index("by_contact", ["contactId"]),

    transactions: defineTable({
        userId: v.id("users"),
        notebookId: v.id("notebooks"),
        contactId: v.optional(v.id("contacts")),
        experienceId: v.optional(v.id("experiences")),
        amount: v.number(), // positive = they owe you, negative = you owe them
        description: v.optional(v.string()),
        date: v.optional(v.number()), // user-selected date/time
        createdAt: v.number(),
    })
        .index("by_notebook", ["notebookId"])
        .index("by_contact", ["contactId"])
        .index("by_experience", ["experienceId"]),
});

export default schema;
