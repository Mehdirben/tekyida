import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "../tests/reports/frontend",
      reporter: ["text", "json", "html"],
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
        lines: 90,
        functions: 80,
        branches: 70,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
