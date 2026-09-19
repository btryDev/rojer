#!/usr/bin/env tsx
//
// Le passage à blanc de l'ADR-036, devenu CONTRÔLE DE SANTÉ à la bascule
// (lot 4, 2026-09-19) : ce que la base PORTE, comparé à ce que le moteur
// ÉCRIRAIT à la prochaine régénération — établissement par établissement,
// ligne par ligne, catégorie par catégorie. Sans rien écrire.
//
// ~~Il comparait la stratégie candidate (`deciderParFaits`) à la stratégie en
// ligne (`deciderParConservation`).~~ Il n'y a plus qu'une stratégie. Juste
// après la fusion du lot 4, il montre ce que la première régénération de
// chaque dossier réécrira ; ensuite, tout doit y être `identique`, et un écart
// dit qu'un chemin a écrit une date que le moteur ne reconnaît pas.
//
// LECTURE SEULE STRICTE. Toute la lecture se fait dans UNE transaction
// interactive dont la première instruction est `SET TRANSACTION READ ONLY` :
// PostgreSQL refuserait alors toute écriture, même par erreur. Le script ne
// contient de toute façon aucune écriture Prisma — `passage-a-blanc.test.ts`
// relit ce fichier et le vérifie — et n'offre AUCUNE option `--appliquer` : ce
// n'est pas un script de reprise, c'est un instrument de mesure. Ce qui répare
// un dossier, c'est sa régénération, par le code.
//
// La base lue est celle de `DATABASE_URL`. Sur la machine de la propriétaire,
// `.env` pointe la PRODUCTION : le script l'affiche en tête, mot de passe
// masqué, pour qu'on sache toujours où l'on lit. Aucun nom de personne ni
// d'établissement n'est imprimé — des identifiants seulement.
//
//   pnpm tsx --env-file=.env scripts/passage-a-blanc-echeances.ts
//   pnpm tsx --env-file=.env scripts/passage-a-blanc-echeances.ts --etablissement <id>
//   pnpm tsx --env-file=.env scripts/passage-a-blanc-echeances.ts --json passage.json
//
// SORTIE. Par établissement : la table catégorie → nombre, le nombre de lignes
// que la régénération créerait, puis une ligne par écart hors `identique` et
// `meme_jour_civil` (identifiant de ligne, obligation, date en base → date du
// moteur, statut en base → statut du moteur, source). Ensuite l'IDEMPOTENCE
// TEMPORELLE : le plan est appliqué en mémoire et replanifié à J+400 — le
// second plan doit être vide. Code de sortie 1 s'il reste un `inexplique`
// quelque part ; c'était le critère de l'ADR-036 § 9, il reste celui d'un
// dossier sain.
//
// Le mode d'emploi complet : docs/revues/passage-a-blanc-adr036.md.

import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { ajouterJours, cleJourCivil, formaterDateHeureFr } from "@/lib/dates";
import { lireEntrees, type LecturePasse } from "@/lib/calendrier/passe";
import {
  CATEGORIES,
  comparerAuMoteur,
  planVide,
  projeterLigne,
  projeterPlan,
  rejouerPlusTard,
  type Categorie,
  type Comparaison,
} from "@/lib/calendrier/passage-a-blanc";

/** L'hôte lu, sans son mot de passe. */
function hoteMasque(url: string | undefined): string {
  if (!url) return "(DATABASE_URL absente)";
  try {
    const u = new URL(url);
    const utilisateur = u.username ? `${u.username}@` : "";
    return `${u.protocol}//${utilisateur}${u.host}${u.pathname}`;
  } catch {
    return "(DATABASE_URL illisible)";
  }
}

/**
 * La valeur d'une option, refusée si elle manque ou si c'en est une autre.
 *
 * `--json --etablissement x` écrivait un fichier nommé `--etablissement` et
 * perdait l'identifiant en silence (relecture neutre du 2026-09-18). Une option
 * sans valeur est une faute de frappe, pas une intention : on s'arrête.
 */
function argument(nom: string): string | undefined {
  const i = process.argv.indexOf(nom);
  if (i === -1) return undefined;
  const valeur = process.argv[i + 1];
  if (valeur === undefined || valeur.startsWith("--")) {
    console.error(
      `${nom} attend une valeur` +
        (valeur === undefined ? " et n'en a pas reçu." : `, et a reçu l'option « ${valeur} ».`),
    );
    process.exit(2);
  }
  return valeur;
}

const jour = (d: Date) => cleJourCivil(d);

type ResultatEtablissement = {
  etablissementId: string;
  lignes: number;
  comparaison: Comparaison;
  planJ400: ReturnType<typeof rejouerPlusTard>;
  avant: LecturePasse["existantes"];
};

function imprimerEtablissement(r: ResultatEtablissement): void {
  const { comparaison, planJ400 } = r;
  console.log(`\n== Établissement ${r.etablissementId} — ${r.lignes} ligne(s) en base ==`);
  for (const c of CATEGORIES) {
    const n = comparaison.comptes[c];
    if (n > 0) console.log(`  ${c.padEnd(20)} ${String(n).padStart(4)}`);
  }
  if (comparaison.aCreer > 0) {
    console.log(`  ${"à créer".padEnd(20)} ${String(comparaison.aCreer).padStart(4)}`);
  }
  const aDetailler = comparaison.ecarts.filter(
    (e) => e.categorie !== "identique" && e.categorie !== "meme_jour_civil",
  );
  if (aDetailler.length > 0) {
    console.log("  --");
    for (const e of aDetailler) {
      console.log(
        `  [${e.categorie}] ${e.ligne} ${e.obligationId}` +
          (e.equipementId ? ` eq=${e.equipementId}` : "") +
          (e.salarieId ? ` sal=${e.salarieId}` : "") +
          ` : ${jour(e.avant.datePrevue)} → ${jour(e.apres.datePrevue)}` +
          ` ; ${e.avant.statut} → ${e.apres.statut}` +
          ` ; source=${e.apres.source ?? "—"}`,
      );
    }
  }
  if (planVide(planJ400)) {
    console.log("  idempotence à J+400 : plan vide ✓");
  } else {
    console.log("  idempotence à J+400 : LE PLAN N'EST PAS VIDE");
    for (const m of planJ400.aMettreAJour) {
      console.log(
        `    à mettre à jour ${m.id} ${m.obligationId} → ${jour(m.datePrevue)} ${m.statut}` +
          ` ; source=${m.source ?? "—"}`,
      );
    }
    for (const c of planJ400.aCreer) console.log(`    à créer ${c.cleUnique}`);
    for (const id of planJ400.aSupprimer) console.log(`    à supprimer ${id}`);
    for (const a of planJ400.aArchiver) console.log(`    à archiver ${a.id}`);
    for (const d of planJ400.aDesarchiver) console.log(`    à désarchiver ${d.id}`);
    console.log(
      "    (une prescription dont `dateFin` tombe dans les 400 jours change" +
        " légitimement ses lignes ; tout le reste est un défaut d'idempotence)",
    );
  }
}

async function main() {
  const etablissementDemande = argument("--etablissement");
  const fichierJson = argument("--json");
  const now = new Date();
  const plusTard = ajouterJours(now, 400);

  console.log(`Contrôle de santé du calendrier (ADR-036) — lecture seule`);
  console.log(`Base : ${hoteMasque(process.env.DATABASE_URL)}`);
  console.log(`Horloge : ${formaterDateHeureFr(now)} ; rejeu à J+400 : ${jour(plusTard)}`);

  const prisma = new PrismaClient();
  const resultats: ResultatEtablissement[] = [];
  try {
    await prisma.$transaction(
      async (tx) => {
        // PREMIÈRE INSTRUCTION de la transaction : à partir d'ici, PostgreSQL
        // refuse toute écriture jusqu'au COMMIT.
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;

        const etablissements = etablissementDemande
          ? [{ id: etablissementDemande }]
          : await tx.etablissement.findMany({ select: { id: true }, orderBy: { id: "asc" } });

        for (const { id } of etablissements) {
          const lecture = await lireEntrees(tx, id);
          const comparaison = comparerAuMoteur(lecture, now);
          const planJ400 = rejouerPlusTard(lecture, comparaison.plan, now, plusTard);
          resultats.push({
            etablissementId: id,
            lignes: lecture.existantes.length,
            comparaison,
            planJ400,
            avant: lecture.existantes,
          });
        }
      },
      // Quatre établissements en production ; la marge est large.
      { timeout: 120_000, maxWait: 10_000 },
    );
  } finally {
    await prisma.$disconnect();
  }

  const total = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Categorie, number>;
  for (const r of resultats) {
    imprimerEtablissement(r);
    for (const c of CATEGORIES) total[c] += r.comparaison.comptes[c];
  }

  console.log(`\n== Total — ${resultats.length} établissement(s) ==`);
  for (const c of CATEGORIES) {
    console.log(`  ${c.padEnd(20)} ${String(total[c]).padStart(4)}`);
  }
  const nonIdempotents = resultats.filter((r) => !planVide(r.planJ400)).length;
  console.log(`  rejeu à J+400 non vide : ${nonIdempotents} établissement(s)`);

  if (fichierJson) {
    // L'état en base et le plan, pour garder une trace de ce que la
    // régénération réécrira — l'ADR-036 § 10 s'y réfère pour le retour arrière.
    writeFileSync(
      fichierJson,
      JSON.stringify(
        {
          base: hoteMasque(process.env.DATABASE_URL),
          horloge: now.toISOString(),
          rejeu: plusTard.toISOString(),
          // PROJETÉS, jamais sérialisés en entier : un plan porte des noms de
          // personnes (`raisons: ["titre détenu par …"]`) et des libellés de
          // prescription, qui nomment l'assureur. Voir `projeterPlan`.
          etablissements: resultats.map((r) => ({
            etablissementId: r.etablissementId,
            avant: r.avant.map(projeterLigne),
            plan: projeterPlan(r.comparaison.plan),
            ecarts: r.comparaison.ecarts,
            comptes: r.comparaison.comptes,
            planJ400: projeterPlan(r.planJ400),
          })),
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\nExport : ${fichierJson}`);
  }

  if (total.inexplique > 0) {
    console.error(
      `\n${total.inexplique} écart(s) « inexplique » : le classement ne sait pas les nommer.` +
        " Un dossier sain n'en porte aucun (ADR-036 § 9).",
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
