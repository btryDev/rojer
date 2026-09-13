#!/usr/bin/env tsx
//
// Reprise des robinets d'incendie armés (RIA) vers leur catégorie propre.
//
// Jusqu'au 2026-08-25, les RIA n'avaient pas de catégorie d'équipement : la
// vérification annuelle (arrêté du 25 juin 1980, art. MS 73 § 2) était
// rattachée aux EXTINCTEUR portant la propriété opt-out
// `aRobinetsIncendieArmes`. La catégorie `RIA` existe désormais (migration
// 20260825130000). Ce script fait la reprise des données existantes, dans
// l'esprit de l'ADR-012 — jamais de perte silencieuse :
//
//   - extincteur `aRobinetsIncendieArmes: true`  → un équipement RIA est créé
//     dans le même établissement, et la ligne de calendrier
//     `incendie-erp-ria-annuelle` existante (rapports, actions)
//     est RÉAFFECTÉE au nouvel équipement — identifiants conservés ;
//   - extincteur sans réponse (clé absente)      → même reprise : la forme
//     `non_infirmee` maintenait l'obligation ; le dirigeant pourra désactiver
//     le RIA créé, ce qui est un « non » explicite et visible ;
//   - extincteur `aRobinetsIncendieArmes: false` → rien n'est créé ; la clé
//     est retirée des caractéristiques.
//
// Idempotent : un RIA déjà issu d'un extincteur (`caracteristiques.origine =
// "reprise-ria"`, `depuisEquipementId`) n'est pas recréé.
//
// La base pointée par `.env` est la PRODUCTION. Le script tourne en
// `--dry-run` par défaut et n'écrit qu'avec `--appliquer`. Faire un snapshot
// Supabase avant. Une fois qu'aucun extincteur ne porte plus la clé, retirer
// la branche EXTINCTEUR de l'obligation (cf. notesInternes de
// `incendie-erp-ria-annuelle`) et la question du formulaire.
//
// ORDRE CONTRAINT — le script ne peut pas servir de pré-contrôle avant
// déploiement. Tant que la migration n'est pas appliquée, PostgreSQL rejette
// toute requête citant `RIA`, y compris en lecture. Il faut donc déployer
// d'abord, reprendre ensuite, et la fenêtre entre les deux est couverte par la
// branche EXTINCTEUR transitoire de l'obligation.
//
//   pnpm tsx scripts/reprise-ria.ts            # dry-run
//   pnpm tsx scripts/reprise-ria.ts --appliquer

import { PrismaClient, type Prisma } from "@prisma/client";

const OBLIGATION_RIA = "incendie-erp-ria-annuelle";
const CLE = "aRobinetsIncendieArmes";

/**
 * La valeur `RIA` de l'enum `CategorieEquipement` existe-t-elle en base ?
 *
 * Le script ne peut pas servir de pré-contrôle avant déploiement : tant que la
 * migration `20260825130000_categorie_equipement_ria` n'est pas appliquée,
 * toute requête mentionnant `RIA` est rejetée par PostgreSQL (22P02) — y
 * compris en lecture, y compris en dry-run. L'ordre est donc contraint :
 * migrer d'abord, reprendre ensuite.
 *
 * Sans cette vérification, l'utilisateur reçoit une trace Prisma de vingt
 * lignes au lieu de la seule information utile.
 */
async function enumRiaDisponible(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ ok: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'CategorieEquipement' AND e.enumlabel = 'RIA'
    ) AS ok
  `;
  return rows[0]?.ok === true;
}

async function main() {
  const appliquer = process.argv.includes("--appliquer");
  const prisma = new PrismaClient();

  if (!(await enumRiaDisponible(prisma))) {
    console.error(
      [
        "",
        "La base ne connaît pas encore la catégorie RIA.",
        "",
        "La migration `20260825130000_categorie_equipement_ria` n'y est pas",
        "appliquée. Ce script ne peut pas s'exécuter avant — même en dry-run :",
        "PostgreSQL rejette toute requête citant une valeur d'enum inexistante.",
        "",
        "Ordre à respecter :",
        "  1. déployer (le build joue `prisma migrate deploy`) ;",
        "  2. snapshot de la base ;",
        "  3. `pnpm tsx scripts/reprise-ria.ts` (dry-run) ;",
        "  4. `pnpm tsx scripts/reprise-ria.ts --appliquer` ;",
        "  5. retirer la branche EXTINCTEUR de `incendie-erp-ria-annuelle`.",
        "",
      ].join("\n"),
    );
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  const extincteurs = await prisma.equipement.findMany({
    where: { categorie: "EXTINCTEUR" },
    select: {
      id: true,
      etablissementId: true,
      libelle: true,
      localisation: true,
      batimentId: true,
      caracteristiques: true,
    },
  });

  const riaExistants = await prisma.equipement.findMany({
    where: { categorie: "RIA" },
    select: { id: true, caracteristiques: true },
  });
  const dejaRepris = new Map<string, string>();
  for (const r of riaExistants) {
    const c = (r.caracteristiques ?? {}) as Record<string, unknown>;
    if (c.origine === "reprise-ria" && typeof c.depuisEquipementId === "string") {
      dejaRepris.set(c.depuisEquipementId, r.id);
    }
  }

  let aCreer = 0;
  let aReaffecter = 0;
  let aNettoyer = 0;
  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const ext of extincteurs) {
    const carac = (ext.caracteristiques ?? {}) as Record<string, unknown>;
    // Clé absente = jamais répondu : reprise aussi (opt-out ⇒ l'obligation
    // était maintenue).
    const reponse = carac[CLE];
    const { [CLE]: _retiree, ...sansCle } = carac;
    void _retiree;

    if (reponse === false) {
      aNettoyer += 1;
      console.log(`[non]   ${ext.id} « ${ext.libelle} » — clé retirée, rien créé`);
      operations.push(
        prisma.equipement.update({
          where: { id: ext.id },
          data: { caracteristiques: sansCle as Prisma.InputJsonValue },
        }),
      );
      continue;
    }

    let riaId = dejaRepris.get(ext.id);
    if (!riaId) {
      aCreer += 1;
      riaId = `ria_${ext.id}`;
      console.log(
        `[${reponse === true ? "oui" : "?"}]   ${ext.id} « ${ext.libelle} » → RIA ${riaId}`,
      );
      operations.push(
        prisma.equipement.create({
          data: {
            id: riaId,
            etablissementId: ext.etablissementId,
            // Le RIA naît dans le bâtiment de l'extincteur dont il est issu :
            // `batimentId` est requis depuis l'ADR-019, et un équipement repris
            // n'a pas de raison de changer de lieu.
            batimentId: ext.batimentId,
            categorie: "RIA",
            libelle: "Robinets d'incendie armés",
            localisation: ext.localisation,
            caracteristiques: {
              origine: "reprise-ria",
              depuisEquipementId: ext.id,
              reponseInitiale: reponse === true ? "oui" : "non renseignée",
            },
          },
        }),
      );
    }

    const lignes = await prisma.verification.findMany({
      where: { equipementId: ext.id, obligationId: OBLIGATION_RIA },
      select: { id: true },
    });
    for (const l of lignes) {
      aReaffecter += 1;
      operations.push(
        prisma.verification.update({
          where: { id: l.id },
          data: { equipementId: riaId },
        }),
      );
    }
    operations.push(
      prisma.equipement.update({
        where: { id: ext.id },
        data: { caracteristiques: sansCle as Prisma.InputJsonValue },
      }),
    );
  }

  console.log(
    `\n${extincteurs.length} extincteur(s) lus — ${aCreer} RIA à créer, ${aReaffecter} ligne(s) de calendrier à réaffecter, ${aNettoyer} clé(s) « non » à retirer.`,
  );

  try {
    if (!appliquer) {
      console.log("Dry-run : aucune écriture. Relancer avec --appliquer.");
    } else {
      await prisma.$transaction(operations);
      console.log("Appliqué. Régénérer les calendriers au prochain affichage.");
    }
  } finally {
    // `finally` et non appel en fin de bloc : une transaction qui échoue
    // laissait sinon la connexion ouverte, et le script pendait au lieu de
    // rendre la main avec son code d'erreur.
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
