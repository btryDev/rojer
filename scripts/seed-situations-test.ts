#!/usr/bin/env tsx
//
// Seed des situations de test du préventeur dans UN compte existant —
// **additif, idempotent, réversible**, comme `seed-demo.ts`.
//
// POURQUOI. Julien a décrit des établissements dans un classeur
// (`scripts/situations-test/julien-2026-10.ts`, règles de transcription en
// tête) ; on les ouvre dans un compte à lui pour qu'il vérifie ce que Rojer en
// tire. Le compte est créé à la main dans Supabase, le script reçoit son UID.
//
// PAR LE CODE DE L'APP, PAS À CÔTÉ :
//   · la saisie passe `onboardingSchema`, et l'écriture
//     `creerEtablissementOnboarding` — la fonction même du parcours ;
//   · chaque équipement passe `normaliserFormDataEquipement`,
//     `equipementSchema` et `serialiserCaracteristiques`, comme le formulaire.
//     Deux portes sont volontairement sautées, et seulement là où la fiche
//     est muette : le nombre de personnes présentes exigé à l'onboarding
//     (`nombreDePersonnesNonDonne`), et les réponses d'équipement EXIGÉES
//     (`reponsesExigeesManquantes`). Julien ne les a pas données ; l'app relance
//     ces appareils à l'ouverture (option 1 de la propriétaire, 2026-10-27).
//   · le calendrier n'est PAS généré ici — la régénération lit la session.
//     L'établissement naît avec un repère nul : « jamais généré », que
//     `assurerCalendrierAJour` rattrape au premier affichage. Le script affiche
//     le plan que cette première passe écrira (`lireEntrees` + `planifier`, en
//     lecture seule), pour qu'on sache avant ce que Julien verra.
//
// TROIS RÈGLES, parce qu'il peut écrire en production :
//   1. Il n'écrit que dans le compte nommé, et que ce qu'il crée.
//   2. Idempotent : une situation dont le SIREN est déjà suivi par le compte
//      est sautée.
//   3. Réversible : `--annuler` supprime les entreprises de ces SIREN dans ce
//      compte, et rien d'autre.
//
// Sans `--ecrire` (ou `--annuler`), il ne fait que valider et dire ce qu'il ferait.
// La base visée est affichée avant toute écriture : c'est `DATABASE_URL`.
//
//   pnpm seed:situations --user <uuid>              # à blanc
//   pnpm seed:situations --user <uuid> --ecrire
//   pnpm seed:situations --user <uuid> --annuler

import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { creerEtablissementOnboarding } from "@/lib/onboarding/creation";
import { sirenDuSiret } from "@/lib/etablissements/siret";
import { constaterEpi } from "@/lib/etablissements/epi-constate";
import {
  equipementSchema,
  normaliserFormDataEquipement,
  serialiserCaracteristiques,
} from "@/lib/equipements/schema";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { estCategorieEpi } from "@/lib/referentiels/types-communs";
import { lireEntrees, planifier } from "@/lib/calendrier/passe";
import type { Prisma } from "@prisma/client";
import { SITUATIONS, type EquipementSituation, type Situation } from "./situations-test/julien-2026-10";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function argument(nom: string): string | undefined {
  const i = process.argv.indexOf(nom);
  return i === -1 ? undefined : process.argv[i + 1];
}

function hoteDeLaBase(): string {
  const url = process.env.DATABASE_URL ?? "";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL illisible)";
  }
}

/** La saisie d'un équipement, par la même lecture que le formulaire. */
function saisieEquipement(e: EquipementSituation) {
  const fd = new FormData();
  fd.set("libelle", e.libelle ?? LABEL_CATEGORIE_EQUIPEMENT[e.categorie]);
  fd.set("categorie", e.categorie);
  if (e.nombre !== undefined) fd.set("nombre", String(e.nombre));
  return equipementSchema.safeParse(normaliserFormDataEquipement(fd));
}

/**
 * La saisie d'onboarding, validée par le schéma du parcours. Pour une
 * situation `nombreDePersonnesNonDonne`, le refus est accepté s'il ne porte
 * QUE sur ce champ : la saisie est alors relue avec un nombre factice pour
 * obtenir sa forme validée, et le nombre est retiré — la colonne reste `null`.
 */
function parserOnboarding(s: Situation) {
  const r = onboardingSchema.safeParse(s.onboarding);
  if (r.success || !s.nombreDePersonnesNonDonne) return r;
  const champs = Object.keys(r.error.flatten().fieldErrors);
  if (champs.length !== 1 || champs[0] !== "personnesPresentesHabituellement") return r;
  const relu = onboardingSchema.safeParse({
    ...s.onboarding,
    personnesPresentesHabituellement: 1,
  });
  if (relu.success) relu.data.personnesPresentesHabituellement = undefined;
  return relu;
}

/** Tout valider avant d'écrire quoi que ce soit : un refus arrête tout. */
function validerTout() {
  const erreurs: string[] = [];
  const valides = SITUATIONS.map((s) => {
    const onb = parserOnboarding(s);
    if (!onb.success) {
      erreurs.push(`Fiche ${s.fiche} : ${JSON.stringify(onb.error.flatten().fieldErrors)}`);
    }
    const equipements = s.equipements.map((e, i) => {
      const r = saisieEquipement(e);
      if (!r.success) {
        erreurs.push(
          `Fiche ${s.fiche}, équipement ${i + 1} : ${JSON.stringify(r.error.flatten().fieldErrors)}`,
        );
      }
      return r.success ? r.data : null;
    });
    return { situation: s, onboarding: onb.success ? onb.data : null, equipements };
  });
  if (erreurs.length > 0) {
    console.error("Saisie refusée — rien n'est écrit :\n  " + erreurs.join("\n  "));
    process.exit(1);
  }
  return valides;
}

async function apercuCalendrier(etablissementId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const plan = planifier(await lireEntrees(tx, etablissementId), new Date());
    return plan.aCreer.length;
  });
}

async function main() {
  const userId = argument("--user");
  const ecrire = process.argv.includes("--ecrire");
  const annuler = process.argv.includes("--annuler");
  if (!userId || !UUID.test(userId)) {
    console.error("--user <uuid> requis : l'UID Supabase du compte.");
    process.exit(1);
  }
  if (ecrire && annuler) {
    console.error("--ecrire et --annuler s'excluent.");
    process.exit(1);
  }

  console.log(`Base visée : ${hoteDeLaBase()}`);
  console.log(`Compte     : ${userId}`);
  const sirens = SITUATIONS.map((s) => sirenDuSiret(String(s.onboarding.siret)));

  if (annuler) {
    const { count } = await prisma.entreprise.deleteMany({
      where: { userId, siren: { in: sirens } },
    });
    console.log(`${count} entreprise(s) supprimée(s), avec leurs établissements.`);
    return;
  }

  const valides = validerTout();
  console.log(`${valides.length} situation(s) valides.\n`);

  for (const { situation: s, onboarding, equipements } of valides) {
    const siren = sirenDuSiret(onboarding!.siret);
    const titre = `Fiche ${s.fiche} — ${onboarding!.raisonSociale}`;
    const deja = await prisma.entreprise.findUnique({
      where: { userId_siren: { userId, siren } },
      select: { id: true },
    });
    if (deja) {
      console.log(`${titre} : déjà présente, sautée.`);
      continue;
    }
    if (!ecrire) {
      console.log(`${titre} : à créer, ${equipements.length} équipement(s).`);
      continue;
    }

    const etab = await creerEtablissementOnboarding(userId, onboarding!);
    const batiment = await prisma.batiment.findFirstOrThrow({
      where: { etablissementId: etab.id },
      orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    for (const e of equipements) {
      const caracs = serialiserCaracteristiques(e!);
      await prisma.equipement.create({
        data: {
          etablissementId: etab.id,
          batimentId: batiment.id,
          libelle: e!.libelle,
          categorie: e!.categorie,
          caracteristiques: (caracs ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    }
    // Comme `creerEquipement` : un EPI déclaré fait constater les EPI.
    if (equipements.some((e) => estCategorieEpi(e!.categorie))) {
      await constaterEpi(etab.id, { regenerer: false });
    }
    const lignes = await apercuCalendrier(etab.id);
    console.log(
      `${titre} : créée (${etab.id}), ${equipements.length} équipement(s), ` +
        `${lignes} ligne(s) au calendrier à la première ouverture.`,
    );
  }

  if (!ecrire) console.log("\nÀ blanc : rien n'est écrit. Relancer avec --ecrire.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
