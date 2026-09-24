import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20000,
    server: { deps: { inline: ["convex-test"] } },
    coverage: {
      provider: "v8",
      reportsDirectory: "../tests/reports/backend",
      reporter: ["text", "json", "html", "json-summary"],
      include: [
        "convex/notebooks.ts",
        "convex/contacts.ts",
        "convex/experiences.ts",
        "convex/transactions.ts",
        "convex/users.ts",
        "convex/schema.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
