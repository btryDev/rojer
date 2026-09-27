import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `import "server-only"` (stockage) : hors de Next, la version « serveur »
      // du module — vide. C'est le rôle que le compilateur de Next lui donne
      // côté serveur ; la garde côté client reste celle de Next au build, et
      // `storage/serveur-seul.test.ts` la double par un relevé des imports.
      "server-only": path.resolve(
        __dirname,
        "./node_modules/next/dist/compiled/server-only/empty.js",
      ),
    },
  },
});
