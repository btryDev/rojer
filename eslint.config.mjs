import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // « Ce qui doit être en place » (2026-10-17, relecture de c6) : la page lit
  // son compte dans `compte.ts`, pas dans le module du widget du tableau de
  // bord. La règle tient quelle que soit l'écriture du chemin, ce qu'un test
  // de source sur une chaîne ne faisait pas.
  {
    files: ["src/app/**/etats-permanents/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/etats-permanents/widget"],
              message:
                "La page lit son compte dans `@/lib/etats-permanents/compte` ; `widget.ts` appartient au tableau de bord.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
