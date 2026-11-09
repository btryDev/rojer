// Réécrit la section « D bis » de scripts/sante-base.sql depuis le schéma
// (src/lib/auth/portee/sonde-cles-croisees.ts). À relancer après un changement
// de schéma ou de CORRESPONDANCE : `sonde-cles-croisees.test.ts` tombe tant
// que la section n'est pas à jour.
//   pnpm exec tsx --import ./scripts/server-only-hors-next.mjs scripts/sonde-cles-croisees.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { remplacerSection } from "../src/lib/auth/portee/sonde-cles-croisees";

const FICHIER = join(process.cwd(), "scripts/sante-base.sql");
writeFileSync(FICHIER, remplacerSection(readFileSync(FICHIER, "utf8")));
console.log("sante-base.sql : section de la sonde réécrite");
