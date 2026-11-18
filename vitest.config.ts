import { defineConfig } from "vitest/config";
import path from "node:path";

// `import image from "@/assets/….webp"` : Next en fait un objet
// `StaticImageData` (adresse, largeur, hauteur) ; Vite, une simple chaîne.
// Les tests reçoivent la même forme que l'app (dimensions factices).
const imagesStatiques = {
  name: "images-statiques",
  enforce: "pre" as const,
  load(id: string) {
    if (!/\/src\/assets\/.+\.(webp|png|jpe?g)$/.test(id)) return null;
    return `export default { src: ${JSON.stringify(id)}, width: 400, height: 500 };`;
  },
};

export default defineConfig({
  plugins: [imagesStatiques],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // Le client borné rend le client simulé des tests (voir le fichier).
    setupFiles: ["./vitest.setup.ts"],
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
