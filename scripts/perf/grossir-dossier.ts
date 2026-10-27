#!/usr/bin/env tsx
/**
 * Grossit le dossier de démo jusqu'à la limite de la cible, avec dix ans
 * d'historique — le « gros dossier » du plan performance (lot 0,
 * `docs/plan-performance.md`).
 *
 * À lancer APRÈS `seed:complet`, sur une base de mesure locale qui ne porte
 * que ce dossier. Le script refuse toute base qui n'est pas sur la machine.
 *
 * Ce qu'il ajoute :
 *   - le parc porté à ≈ 100 équipements (copies des appareils de la démo,
 *     réparties sur les trois zones — caractéristiques déjà validées) ;
 *   - l'effectif porté à 50 salariés, avec les titres des salariés de la démo ;
 *   - le calendrier régénéré par la vraie fonction du produit ;
 *   - dix ans d'historique : rapports au rythme de chaque ligne, actions
 *     levées, relevés de température hebdomadaires, une version de DUERP
 *     par an.
 *
 * Les fichiers des rapports n'existent pas (`fichierCle` factice) : les écrans
 * mesurés listent les rapports, ils n'ouvrent pas les fichiers.
 */
import { Prisma, type Periodicite } from "@prisma/client";

import { prisma } from "../../src/lib/prisma";
import { regenererSansControleDeSession } from "../../src/lib/calendrier/actions";

const CIBLE_EQUIPEMENTS = 100;
const CIBLE_SALARIES = 50;
const ANNEES = 10;
const JOUR = 86_400_000;
const MAINTENANT = Date.now();

/** Intervalle entre deux rapports, en jours ; null = pas d'historique. */
const PAS_EN_JOURS: Record<Periodicite, number | null> = {
  hebdomadaire: 7,
  bimensuelle: 15,
  mensuelle: 30,
  six_semaines: 42,
  trimestrielle: 91,
  semestrielle: 182,
  annuelle: 365,
  biennale: 730,
  triennale: 1095,
  quadriennale: 1460,
  quinquennale: 1826,
  decennale: 3652,
  mise_en_service_uniquement: null,
  autre: null,
};

function baseLocaleOuRefus(): void {
  const url = process.env.DATABASE_URL ?? "";
  let hote = "";
  try {
    hote = new URL(url).hostname;
  } catch {
    /* illisible : refusé plus bas */
  }
  if (hote !== "localhost" && hote !== "127.0.0.1") {
    console.error(`REFUS : DATABASE_URL ne pointe pas une base locale (« ${hote || "illisible"} »).`);
    process.exit(1);
  }
}

async function lots<T>(ops: Prisma.PrismaPromise<T>[], taille = 500): Promise<void> {
  for (let i = 0; i < ops.length; i += taille) {
    await prisma.$transaction(ops.slice(i, i + taille));
  }
}

async function main(): Promise<void> {
  baseLocaleOuRefus();

  const etabs = await prisma.etablissement.findMany({
    select: { id: true, entrepriseId: true },
  });
  if (etabs.length !== 1) {
    console.error(`REFUS : la base porte ${etabs.length} établissements, le script en attend un seul (celui de seed:complet).`);
    process.exit(1);
  }
  const { id: etablissementId, entrepriseId } = etabs[0];

  // 1. Parc — copies des appareils de la démo, réparties sur les zones.
  const zones = await prisma.batiment.findMany({
    where: { etablissementId },
    select: { id: true },
    orderBy: { ordre: "asc" },
  });
  const modeles = await prisma.equipement.findMany({
    where: { etablissementId, actif: true },
    orderBy: { createdAt: "asc" },
  });
  const manquants = CIBLE_EQUIPEMENTS - modeles.length;
  const copies: Prisma.PrismaPromise<unknown>[] = [];
  for (let i = 0; i < manquants; i++) {
    const m = modeles[i % modeles.length];
    copies.push(
      prisma.equipement.create({
        data: {
          etablissementId,
          batimentId: zones[i % zones.length].id,
          categorie: m.categorie,
          libelle: `${m.libelle} n° ${Math.floor(i / modeles.length) + 2}`,
          localisation: m.localisation,
          dateMiseEnService: m.dateMiseEnService,
          caracteristiques: (m.caracteristiques ?? Prisma.DbNull) as Prisma.InputJsonValue,
        },
      }),
    );
  }
  await lots(copies);
  console.log(`  parc : ${modeles.length} + ${Math.max(0, manquants)} équipements`);

  // 2. Effectif — 50 salariés, avec les titres des salariés de la démo.
  await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { effectif: CIBLE_SALARIES },
  });
  await prisma.etablissement.update({
    where: { id: etablissementId },
    data: { effectifSurSite: CIBLE_SALARIES },
  });
  const salaries = await prisma.salarie.findMany({
    where: { etablissementId, actif: true },
    include: { titres: true },
    orderBy: { createdAt: "asc" },
  });
  const nouveaux: Prisma.PrismaPromise<unknown>[] = [];
  for (let i = salaries.length; i < CIBLE_SALARIES; i++) {
    const m = salaries[i % salaries.length];
    nouveaux.push(
      prisma.salarie.create({
        data: {
          etablissementId,
          nom: `${m.nom}-${i}`,
          prenom: m.prenom,
          poste: m.poste,
          entreLe: m.entreLe,
          titres: {
            create: m.titres.map((t) => ({
              obligationId: t.obligationId,
              delivreLe: t.delivreLe,
              echeanceLe: t.echeanceLe,
              note: t.note,
            })),
          },
        },
      }),
    );
  }
  await lots(nouveaux, 50);
  console.log(`  effectif : ${salaries.length} + ${Math.max(0, CIBLE_SALARIES - salaries.length)} salariés`);

  // 3. Calendrier — par la fonction du produit.
  const r = await regenererSansControleDeSession(etablissementId);
  console.log(`  calendrier régénéré : ${JSON.stringify(r)}`);

  // 4. Historique — rapports au rythme de chaque ligne, sur dix ans.
  const lignes = await prisma.verification.findMany({
    where: { etablissementId, archiveLe: null },
    select: { id: true, periodicite: true, libelleObligation: true },
  });
  const debut = MAINTENANT - ANNEES * 365 * JOUR;
  const rapports: Prisma.PrismaPromise<unknown>[] = [];
  for (const l of lignes) {
    const pas = PAS_EN_JOURS[l.periodicite];
    if (pas === null) continue;
    let n = 0;
    for (let t = debut; t < MAINTENANT - pas * JOUR; t += pas * JOUR, n++) {
      rapports.push(
        prisma.rapportVerification.create({
          data: {
            etablissementId,
            verificationId: l.id,
            dateRapport: new Date(t),
            echeanceHonoree: new Date(t),
            organismeVerif: pas >= 365 ? "Organisme de démonstration" : null,
            resultat: n % 11 === 0 ? "observations_mineures" : "conforme",
            fichierCle: `perf/factice/${l.id}/${n}.pdf`,
            fichierNomOriginal: `rapport-${n}.pdf`,
            fichierMime: "application/pdf",
            fichierTaille: 250_000,
          },
        }),
      );
    }
  }
  await lots(rapports);
  console.log(`  ${rapports.length} rapports sur ${ANNEES} ans`);

  // 5. Actions levées — trente par an.
  const actions: Prisma.PrismaPromise<unknown>[] = [];
  for (let i = 0; i < ANNEES * 30; i++) {
    const quand = new Date(debut + i * 12 * JOUR);
    actions.push(
      prisma.action.create({
        data: {
          etablissementId,
          verificationId: lignes[i % lignes.length].id,
          libelle: `Point corrigé n° ${i + 1}`,
          type: "organisationnelle",
          statut: "levee",
          criticite: (i % 5) + 1,
          echeance: quand,
          leveeLe: new Date(quand.getTime() + 10 * JOUR),
          responsable: "Gérant",
        },
      }),
    );
  }
  await lots(actions);
  console.log(`  ${actions.length} actions levées`);

  // 6. Relevés de température — hebdomadaires, sur dix ans.
  const points = await prisma.pointReleve.findMany({
    where: { carnet: { etablissementId } },
    select: { id: true, seuilMinCelsius: true },
  });
  const releves: Prisma.PrismaPromise<unknown>[] = [];
  for (const p of points) {
    for (let t = debut; t < MAINTENANT; t += 7 * JOUR) {
      const temperature = (p.seuilMinCelsius ?? 50) + ((t / JOUR) % 7) - 2;
      releves.push(
        prisma.releveTemperature.create({
          data: {
            pointReleveId: p.id,
            dateReleve: new Date(t),
            temperatureCelsius: temperature,
            conforme: temperature >= (p.seuilMinCelsius ?? 50),
            operateur: "Gérant",
          },
        }),
      );
    }
  }
  await lots(releves);
  console.log(`  ${releves.length} relevés de température`);

  // 7. DUERP — une version par an, copie de la version de la démo.
  const duerp = await prisma.duerp.findFirst({
    where: { etablissementId },
    include: { versions: { orderBy: { numero: "desc" }, take: 1 } },
  });
  if (duerp && duerp.versions[0]) {
    const v = duerp.versions[0];
    const versions: Prisma.PrismaPromise<unknown>[] = [];
    for (let i = 1; i <= ANNEES; i++) {
      versions.push(
        prisma.duerpVersion.create({
          data: {
            duerpId: duerp.id,
            numero: v.numero + i,
            motif: "Mise à jour annuelle",
            snapshot: v.snapshot as Prisma.InputJsonValue,
          },
        }),
      );
    }
    await lots(versions);
    console.log(`  ${ANNEES} versions de DUERP`);
  }

  console.log(`\nGros dossier prêt — établissement ${etablissementId}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
