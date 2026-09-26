import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "../tests/reports/frontend",
      reporter: ["text", "json", "html", "json-summary"],
      include: [
        "lib/crypto.ts",
        "lib/offlineQueue.ts",
        "lib/queryCache.ts",
        "hooks/useBodyScrollLock.ts",
        "hooks/useKeyboardInset.ts",
        "hooks/useLocalAmountsVisibility.ts",
        "contexts/AmountsVisibilityContext.tsx",
        "components/ui/Badge.tsx",
        "components/ui/Button.tsx",
        "components/ui/Card.tsx",
        "components/ui/Logo.tsx",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@/convex": path.resolve(__dirname, "../backend/convex"),
      "@": path.resolve(__dirname, "./"),
    },
  },
});
