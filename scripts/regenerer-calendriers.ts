#!/usr/bin/env tsx
//
// Recalcule le calendrier des dossiers dont le SCEAU est périmé — après un
// changement du référentiel ou du moteur (`VERSION_MOTEUR_CALENDRIER`).
//
// Sans ce script, un dossier n'est recalculé qu'à sa prochaine ouverture
// (`assurerCalendrierAJour`) : ce que l'utilisateur voit est toujours juste,
// mais un dossier jamais rouvert garde en base l'ancien calcul — lu tel quel
// par le serveur MCP, par exemple. Ce script applique le changement à tous les
// comptes d'un coup, par la MÊME régénération que l'ouverture (idempotente,
// ADR-012 : les lignes portant un rapport ou une action sont archivées, jamais
// supprimées).
//
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/regenerer-calendriers.ts
//       → À BLANC : liste les dossiers au sceau périmé, n'écrit rien.
//   … scripts/regenerer-calendriers.ts --ecrire
//       → les recalcule, un par un ; une erreur n'arrête pas les autres.
//   … --tous   → tous les dossiers, sceau à jour compris.
//
// Aucun nom de personne ni d'établissement n'est imprimé : des identifiants.
// Pour voir ce qui changera ligne par ligne avant d'écrire :
// `scripts/passage-a-blanc-echeances.ts` (lecture seule).
//
// En production : `outils-prod/regenerer-calendriers-prod.sh`, APRÈS le
// déploiement du code dont on veut appliquer le calcul.

import { prisma } from "../src/lib/prisma";
import { regenererSansControleDeSession } from "../src/lib/calendrier/actions";
import { SCEAU_CALENDRIER } from "../src/lib/calendrier/version-moteur";

const ecrire = process.argv.includes("--ecrire");
const tous = process.argv.includes("--tous");

const hote = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "(inconnue)";
  } catch {
    return "(illisible)";
  }
})();

async function main() {
  console.log(`Base : ${hote}`);
  console.log(`Sceau attendu : ${SCEAU_CALENDRIER}`);
  const etabs = await prisma.etablissement.findMany({
    select: { id: true, referentielVersionCalendrier: true },
    orderBy: { createdAt: "asc" },
  });
  const cibles = tous ? etabs : etabs.filter((e) => e.referentielVersionCalendrier !== SCEAU_CALENDRIER);
  console.log(`${etabs.length} dossier(s), ${cibles.length} à recalculer${tous ? " (--tous)" : ""}.`);
  for (const e of cibles) console.log(`  ${e.id}  sceau posé : ${e.referentielVersionCalendrier ?? "aucun"}`);

  if (!ecrire) {
    console.log("\nÀ blanc : rien n'est écrit. Relancer avec --ecrire pour appliquer.");
    return;
  }

  let ok = 0;
  const echecs: string[] = [];
  for (const e of cibles) {
    try {
      const r = await regenererSansControleDeSession(e.id);
      ok += 1;
      console.log(`  ✓ ${e.id}  ${JSON.stringify(r)}`);
    } catch (err) {
      echecs.push(e.id);
      console.log(`  ✗ ${e.id}  ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\n${ok} recalculé(s), ${echecs.length} en échec.`);
  if (echecs.length > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 2;
  })
  .finally(() => prisma.$disconnect());
