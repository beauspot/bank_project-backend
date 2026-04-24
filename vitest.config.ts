import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.ts", "src/**/*.test.ts"],
    exclude: [
      "node_modules",
      "dist",
      "src/__test__/db.config.ts",
      "src/__test__/testApp.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/**/index.ts", "src/server.ts"],
    },
    setupFiles: ["src/__tests__/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      // run tests sequentially to avaoid DB conflicts
      concurrent: false,
    },
  },
});
