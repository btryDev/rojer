// Réécrit la section « D bis » de scripts/sante-base.sql depuis le schéma
// (src/lib/auth/portee/sonde-cles-croisees.ts). À relancer après un changement
// de schéma ou de CORRESPONDANCE : `sonde-cles-croisees.test.ts` tombe tant
// que la section n'est pas à jour.
//   pnpm exec tsx --import ./scripts/server-only-hors-next.mjs scripts/sonde-cles-croisees.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEBUT_SECTION, FIN_SECTION, sectionSanteBase } from "../src/lib/auth/portee/sonde-cles-croisees";

const FICHIER = join(process.cwd(), "scripts/sante-base.sql");
const texte = readFileSync(FICHIER, "utf8");
const debut = texte.indexOf(DEBUT_SECTION);
const fin = texte.indexOf(FIN_SECTION);
if (debut < 0 || fin < debut) throw new Error("sante-base.sql : marqueurs de la sonde introuvables");
writeFileSync(FICHIER, texte.slice(0, debut) + sectionSanteBase() + texte.slice(fin + FIN_SECTION.length));
console.log("sante-base.sql : section de la sonde réécrite");
