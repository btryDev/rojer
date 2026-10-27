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
// QUATRE RÈGLES, parce qu'il peut écrire en production :
//   1. Il n'écrit que dans un compte qui existe (`auth.users`, vérifié avant
//      toute écriture), et que ce qu'il crée.
//   2. Idempotent : une situation dont le SIREN est déjà suivi par le compte
//      est sautée. Une création interrompue est défaite (l'entreprise et sa
//      cascade), pour qu'une relance ne saute pas un établissement incomplet.
//   3. Réversible, sans fard : `--annuler` supprime les entreprises de ces SIREN
//      dans ce compte AVEC TOUT CE QU'ELLES CONTIENNENT — y compris ce que le
//      compte y a ajouté depuis. Il montre d'abord ce qui partirait, ligne par
//      modèle, refuse si un DUERP validé (conservation de quarante ans) l'en
//      empêche, et libère les fichiers stockés comme le fait l'app.
//   4. À blanc par défaut : sans `--ecrire`, il ne fait que dire ce qu'il ferait,
//      création comme annulation. La base visée est affichée d'abord
//      (`DATABASE_URL`).
//
//   pnpm seed:situations --user <uuid>                     # création, à blanc
//   pnpm seed:situations --user <uuid> --ecrire
//   pnpm seed:situations --user <uuid> --annuler           # annulation, à blanc
//   pnpm seed:situations --user <uuid> --annuler --ecrire

import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { creerEtablissementOnboarding } from "@/lib/onboarding/creation";
import { normaliserSiret, sirenDuSiret } from "@/lib/etablissements/siret";
import { constaterEpi } from "@/lib/etablissements/epi-constate";
import {
  equipementSchema,
  normaliserFormDataEquipement,
  serialiserCaracteristiques,
} from "@/lib/equipements/schema";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { estCategorieEpi } from "@/lib/referentiels/types-communs";
import { lireEntrees, planifier } from "@/lib/calendrier/passe";
import { bloqueraient, cascadeDepuis } from "@/lib/suppression/cascade";
import { clesDesEtablissements, libererFichiers } from "@/lib/suppression/fichiers";
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
  // Seulement si la fiche est MUETTE sur ce champ : un nombre présent mais
  // invalide (0, par exemple) reste refusé, il ne s'efface pas en silence.
  if (
    r.success ||
    !s.nombreDePersonnesNonDonne ||
    s.onboarding.personnesPresentesHabituellement !== undefined
  ) {
    return r;
  }
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

/** Le nombre de lignes que la première régénération écrira — affichage seul :
 *  un échec ne doit ni défaire la création ni couper les situations suivantes. */
async function apercuCalendrier(etablissementId: string): Promise<string> {
  try {
    const n = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return planifier(await lireEntrees(tx, etablissementId), new Date()).aCreer.length;
    });
    return `${n} ligne(s) au calendrier à la première ouverture`;
  } catch (err) {
    console.error(`  aperçu du calendrier indisponible pour ${etablissementId}`, err);
    return "aperçu du calendrier indisponible";
  }
}

/**
 * Le compte existe-t-il ? Un UUID bien formé mais faux rattacherait les
 * entreprises à personne. `auth.users` n'existe que sur une base Supabase :
 * ailleurs (base locale de test), on le dit et on continue.
 */
async function compteExiste(userId: string): Promise<boolean | "inverifiable"> {
  try {
    const r = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM auth.users WHERE id = ${userId}::uuid`;
    return Number(r[0].n) > 0;
  } catch (err) {
    const code = (err as { meta?: { code?: string } }).meta?.code;
    if (code === "42P01" || code === "3F000") return "inverifiable";
    throw err;
  }
}

async function annuler(userId: string, sirens: string[], ecrire: boolean) {
  const entreprises = await prisma.entreprise.findMany({
    where: { userId, siren: { in: sirens } },
    select: { id: true, raisonSociale: true, etablissements: { select: { id: true } } },
  });
  if (entreprises.length === 0) {
    console.log("Aucune entreprise de ces SIREN dans ce compte : rien à supprimer.");
    return;
  }
  const emporte = await cascadeDepuis(prisma, "Entreprise", entreprises.map((e) => e.id));
  const etabIds = entreprises.flatMap((e) => e.etablissements.map((x) => x.id));
  const cles = await clesDesEtablissements(prisma, etabIds);
  console.log(`Partiraient : ${entreprises.map((e) => e.raisonSociale).join(", ")}`);
  for (const [modele, ids] of emporte) {
    if (ids.size > 0) console.log(`  ${modele.padEnd(28)} ${ids.size}`);
  }
  console.log(`  fichiers stockés             ${cles.length}`);

  const bloquants = await bloqueraient(prisma, emporte);
  if (bloquants.length > 0) {
    console.error(
      "Suppression refusée — des lignes conservées l'en empêchent : " +
        bloquants.map((b) => `${b.relation.enfant} (${b.nombre})`).join(", ") +
        ". Supprimer depuis l'app.",
    );
    process.exitCode = 1;
    return;
  }
  if (!ecrire) {
    console.log("\nÀ blanc : rien n'est supprimé. Relancer avec --annuler --ecrire.");
    return;
  }
  const { count } = await prisma.entreprise.deleteMany({
    where: { id: { in: entreprises.map((e) => e.id) } },
  });
  const f = await libererFichiers(cles, "seed-situations/annuler");
  console.log(
    `${count} entreprise(s) supprimée(s) avec tout leur contenu ; ` +
      `${f.liberes} fichier(s) libéré(s), ${f.echecs} échec(s).`,
  );
}

async function main() {
  const userId = argument("--user");
  const ecrire = process.argv.includes("--ecrire");
  const modeAnnuler = process.argv.includes("--annuler");
  if (!userId || !UUID.test(userId)) {
    console.error("--user <uuid> requis : l'UID Supabase du compte.");
    process.exit(1);
  }

  console.log(`Base visée : ${hoteDeLaBase()}`);
  console.log(`Compte     : ${userId}`);
  // Le SIREN du SIRET NORMALISÉ, comme à la création (`siretSchema`).
  const sirens = SITUATIONS.map((s) =>
    sirenDuSiret(normaliserSiret(String(s.onboarding.siret))),
  );

  if (modeAnnuler) {
    await annuler(userId, sirens, ecrire);
    return;
  }

  const existe = await compteExiste(userId);
  if (existe === false) {
    console.error("Aucun compte Supabase avec cet UID : rien n'est écrit.");
    process.exit(1);
  }
  if (existe === "inverifiable") {
    console.log("(pas de schéma auth sur cette base : compte non vérifié)");
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
    try {
      await completer(etab.id, equipements);
    } catch (err) {
      // Défaire la création : sans quoi la relance la dirait « déjà présente »
      // et laisserait un établissement sans ses équipements.
      await prisma.entreprise.delete({ where: { id: etab.entrepriseId } });
      console.error(`${titre} : création interrompue, défaite.`);
      throw err;
    }
    console.log(
      `${titre} : créée (${etab.id}), ${equipements.length} équipement(s), ` +
        `${await apercuCalendrier(etab.id)}.`,
    );
  }

  if (!ecrire) console.log("\nÀ blanc : rien n'est écrit. Relancer avec --ecrire.");
}

/** Les équipements d'un établissement tout juste créé, comme le formulaire. */
async function completer(
  etablissementId: string,
  equipements: ReturnType<typeof validerTout>[number]["equipements"],
) {
  const batiment = await prisma.batiment.findFirstOrThrow({
    where: { etablissementId },
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  for (const e of equipements) {
    const caracs = serialiserCaracteristiques(e!);
    await prisma.equipement.create({
      data: {
        etablissementId,
        batimentId: batiment.id,
        libelle: e!.libelle,
        categorie: e!.categorie,
        caracteristiques: (caracs ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
  // Comme `creerEquipement` : un EPI déclaré fait constater les EPI.
  if (equipements.some((e) => estCategorieEpi(e!.categorie))) {
    await constaterEpi(etablissementId, { regenerer: false });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
