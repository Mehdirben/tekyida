import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
    coverage: {
      provider: "v8",
      reportsDirectory: "../tests/reports/backend",
      reporter: ["text", "json", "html"],
      include: [
        "convex/notebooks.ts",
        "convex/contacts.ts",
        "convex/experiences.ts",
        "convex/transactions.ts",
        "convex/users.ts",
        "convex/schema.ts",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 85,
        statements: 95,
      },
    },
  },
});
