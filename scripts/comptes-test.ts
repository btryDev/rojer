#!/usr/bin/env tsx
//
// Comptes de test d'une base de recette (préprod) — sans inscription, sans
// e-mail, sans abonnement.
//
// POURQUOI. La préprod n'a pas encore de pilote d'e-mail : l'inscription par
// l'écran envoie un lien de confirmation qui ne part pas. Ce script crée la
// personne directement, adresse déjà confirmée, et lui pose un mot de passe.
// L'abonnement n'est pas en cause : tant que `ABONNEMENT_EXIGE` n'est pas posé
// (ou Stripe inactif), l'offre n'est pas lancée et rien n'est exigé
// (`abonnements/lancement.ts`).
//
// DEUX USAGES :
//   · une personne SANS compte : à sa première connexion, elle fait
//     l'onboarding comme un vrai client ;
//   · `--situations` : la personne reçoit un compte et les cinq fiches remplies
//     par le préventeur (`situations-test/julien-2026-10.ts`, règles de
//     transcription en tête), créées par l'ÉCRITURE MÊME du parcours
//     (`creerEtablissementOnboarding`) à travers le client borné au compte
//     (ADR-051). Deux portes sont volontairement sautées, et seulement là où
//     la fiche est muette : le nombre de personnes présentes exigé à
//     l'onboarding (`nombreDePersonnesNonDonne`) et les réponses d'équipement
//     EXIGÉES (`reponsesExigeesManquantes`) ; l'app relance ces appareils à
//     l'ouverture (option 1 de la propriétaire, 2026-10-27). Le calendrier
//     n'est pas généré ici : la régénération lit la session, et l'établissement
//     né sans calendrier est rattrapé au premier affichage.
//
// GARDE-FOUS :
//   1. Adresses `@rojer.invalid` seulement (RFC 2606) : aucune n'est réelle,
//      aucun e-mail ne peut partir, et les gardes des scripts de charge et de
//      recette, qui refusent une base portant une autre adresse, restent
//      ouvertes.
//   2. Le mot de passe vient de `COMPTE_TEST_MOT_DE_PASSE`, jamais du dépôt
//      (il est public). Relancer sur une personne existante le lui remet.
//   3. À blanc par défaut : sans `--ecrire`, il dit ce qu'il ferait. La base
//      visée est affichée d'abord.
//   4. Idempotent : une fiche dont le SIREN est déjà suivi par le compte est
//      sautée ; une création interrompue est défaite. `--annuler` supprime les
//      entreprises de ces SIREN dans le compte AVEC TOUT CE QU'ELLES
//      CONTIENNENT, montre d'abord ce qui partirait, et refuse si une ligne
//      conservée (DUERP validé) l'en empêche.
//
// Sur l'instance Clever Cloud, avec la base et les secrets du serveur :
//   COMPTE_TEST_MOT_DE_PASSE=… sh scripts/demarrer-cc.sh lancer \
//     pnpm comptes-test --email <x@rojer.invalid> [--situations] [--annuler] [--ecrire]

import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/better-auth";
import { prisma } from "@/lib/prisma";
import { clientBorne, type ClientBorne } from "@/lib/auth/portee/client";
import { compteDOnboarding } from "@/lib/auth/membres";
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/mot-de-passe";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { creerEtablissementOnboarding } from "@/lib/onboarding/creation";
import { normaliserSiret, sirenDuSiret } from "@/lib/etablissements/siret";
import { constaterEpiDuCompte } from "@/lib/etablissements/epi-constate";
import { equipementSchema, normaliserFormDataEquipement, serialiserCaracteristiques } from "@/lib/equipements/schema";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { estCategorieEpi } from "@/lib/referentiels/types-communs";
import { bloqueraient, cascadeDepuis } from "@/lib/suppression/cascade";
import { clesDesEtablissements, libererFichiers } from "@/lib/suppression/fichiers";
import { SITUATIONS, type EquipementSituation, type Situation } from "./situations-test/julien-2026-10";

const DOMAINE_DE_TEST = "@rojer.invalid";
const NOM_DU_COMPTE = "Situations de test du préventeur";

const argument = (nom: string): string | undefined => {
  const i = process.argv.indexOf(nom);
  return i === -1 ? undefined : process.argv[i + 1];
};

function hoteDeLaBase(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL illisible)";
  }
}

function motDePasse(): string {
  const mdp = process.env.COMPTE_TEST_MOT_DE_PASSE ?? "";
  if (mdp.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    throw new Error(`REFUS : COMPTE_TEST_MOT_DE_PASSE absent ou trop court (${LONGUEUR_MIN_MOT_DE_PASSE} caractères au moins).`);
  }
  return mdp;
}

// ---------------------------------------------------------------------------
// La personne
// ---------------------------------------------------------------------------

/**
 * La personne de cette adresse, créée si elle manque, adresse confirmée et
 * mot de passe posé (même geste que `scripts/recette/preparer.ts`), sans
 * passer par l'inscription, qui enverrait le lien de confirmation. La ligne
 * `User` est écrite directement : la configuration ne pose aucun crochet de
 * base à la création (`better-auth.ts`), le mot de passe passe, lui, par le
 * hachage de Better Auth.
 */
async function personne(email: string, mdp: string): Promise<{ userId: string; creee: boolean }> {
  const ctx = await auth.$context;
  const existante = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const { id: userId } = await prisma.user.upsert({
    where: { email },
    create: { email, name: email.split("@")[0], emailVerified: true },
    update: { emailVerified: true },
    select: { id: true },
  });
  const hash = await ctx.password.hash(mdp);
  const comptes = await ctx.internalAdapter.findAccounts(userId);
  if (comptes.some((c) => c.providerId === "credential")) await ctx.internalAdapter.updatePassword(userId, hash);
  else await ctx.internalAdapter.linkAccount({ userId, providerId: "credential", accountId: userId, password: hash });
  return { userId, creee: !existante };
}

/** Le compte dont la personne est propriétaire, créé s'il manque (comme l'onboarding). */
async function compteDe(userId: string): Promise<{ compteId: string; db: ClientBorne }> {
  const membre = await prisma.membre.findFirst({ where: { userId, role: "owner" }, select: { compteId: true } });
  const compteId = membre?.compteId ?? (await compteDOnboarding(userId, NOM_DU_COMPTE)).compteId;
  return { compteId, db: clientBorne({ type: "compte", compteId, userId, lectureSeule: false }) };
}

// ---------------------------------------------------------------------------
// Les situations
// ---------------------------------------------------------------------------

/** La saisie d'un équipement, par la même lecture que le formulaire. */
function saisieEquipement(e: EquipementSituation) {
  const fd = new FormData();
  fd.set("libelle", e.libelle ?? LABEL_CATEGORIE_EQUIPEMENT[e.categorie]);
  fd.set("categorie", e.categorie);
  if (e.nombre !== undefined) fd.set("nombre", String(e.nombre));
  if (e.typePorte) fd.set("typePorte", e.typePorte);
  if (e.typeEpi) fd.set("typeEpi", e.typeEpi);
  return equipementSchema.safeParse(normaliserFormDataEquipement(fd));
}

/**
 * La saisie d'onboarding, validée par le schéma du parcours. Pour une
 * situation `nombreDePersonnesNonDonne`, le refus est accepté s'il ne porte
 * QUE sur ce champ et que la fiche est muette : la saisie est relue avec un
 * nombre factice pour obtenir sa forme validée, puis le nombre est retiré.
 */
function parserOnboarding(s: Situation) {
  const r = onboardingSchema.safeParse(s.onboarding);
  if (r.success || !s.nombreDePersonnesNonDonne || s.onboarding.personnesPresentesHabituellement !== undefined) return r;
  const champs = Object.keys(r.error.flatten().fieldErrors);
  if (champs.length !== 1 || champs[0] !== "personnesPresentesHabituellement") return r;
  const relu = onboardingSchema.safeParse({ ...s.onboarding, personnesPresentesHabituellement: 1 });
  if (relu.success) relu.data.personnesPresentesHabituellement = undefined;
  return relu;
}

/** Tout valider avant d'écrire quoi que ce soit : un refus arrête tout. */
function validerTout() {
  const erreurs: string[] = [];
  const valides = SITUATIONS.map((s) => {
    const onb = parserOnboarding(s);
    if (!onb.success) erreurs.push(`Fiche ${s.fiche} : ${JSON.stringify(onb.error.flatten().fieldErrors)}`);
    const equipements = s.equipements.map((e, i) => {
      const r = saisieEquipement(e);
      if (!r.success) erreurs.push(`Fiche ${s.fiche}, équipement ${i + 1} : ${JSON.stringify(r.error.flatten().fieldErrors)}`);
      return r.success ? r.data : null;
    });
    return { situation: s, onboarding: onb.success ? onb.data : null, equipements };
  });
  if (erreurs.length > 0) throw new Error("Saisie refusée — rien n'est écrit :\n  " + erreurs.join("\n  "));
  return valides;
}
type Valide = ReturnType<typeof validerTout>[number];

/** Les équipements d'un établissement tout juste créé, comme le formulaire. */
async function completer(db: ClientBorne, etablissementId: string, equipements: Valide["equipements"]) {
  const batiment = await db.batiment.findFirstOrThrow({
    where: { etablissementId },
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  for (const e of equipements) {
    await db.equipement.create({
      data: {
        etablissementId,
        batimentId: batiment.id,
        libelle: e!.libelle,
        categorie: e!.categorie,
        caracteristiques: (serialiserCaracteristiques(e!) ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
  // Comme `creerEquipement` : un EPI déclaré fait constater les EPI.
  if (equipements.some((e) => estCategorieEpi(e!.categorie))) {
    await constaterEpiDuCompte(db, etablissementId, { regenerer: false });
  }
}

async function semer(compteId: string, db: ClientBorne, ecrire: boolean) {
  const valides = validerTout();
  for (const { situation: s, onboarding, equipements } of valides) {
    const siren = sirenDuSiret(onboarding!.siret);
    const titre = `Fiche ${s.fiche} — ${onboarding!.raisonSociale}`;
    const deja = await db.entreprise.findUnique({ where: { compteId_siren: { compteId, siren } }, select: { id: true } });
    if (deja) {
      console.log(`${titre} : déjà présente, sautée.`);
      continue;
    }
    if (!ecrire) {
      console.log(`${titre} : à créer, ${equipements.length} équipement(s).`);
      continue;
    }
    const etab = await creerEtablissementOnboarding(db, { compteId }, onboarding!);
    try {
      await completer(db, etab.id, equipements);
    } catch (err) {
      // Défaire : sans quoi la relance la dirait « déjà présente » et
      // laisserait un établissement sans ses équipements.
      await db.entreprise.delete({ where: { id: etab.entrepriseId } });
      console.error(`${titre} : création interrompue, défaite.`);
      throw err;
    }
    console.log(`${titre} : créée (${etab.id}), ${equipements.length} équipement(s).`);
  }
}

async function annuler(compteId: string, ecrire: boolean) {
  const sirens = SITUATIONS.map((s) => sirenDuSiret(normaliserSiret(String(s.onboarding.siret))));
  const entreprises = await prisma.entreprise.findMany({
    where: { compteId, siren: { in: sirens } },
    select: { id: true, raisonSociale: true, etablissements: { select: { id: true } } },
  });
  if (entreprises.length === 0) {
    console.log("Aucune entreprise de ces SIREN dans ce compte : rien à supprimer.");
    return;
  }
  const emporte = await cascadeDepuis(prisma, "Entreprise", entreprises.map((e) => e.id));
  const cles = await clesDesEtablissements(prisma, entreprises.flatMap((e) => e.etablissements.map((x) => x.id)));
  console.log(`Partiraient : ${entreprises.map((e) => e.raisonSociale).join(", ")}`);
  for (const [modele, ids] of emporte) if (ids.size > 0) console.log(`  ${modele.padEnd(28)} ${ids.size}`);
  console.log(`  fichiers stockés             ${cles.length}`);
  const bloquants = await bloqueraient(prisma, emporte);
  if (bloquants.length > 0) {
    throw new Error(
      "Suppression refusée — des lignes conservées l'en empêchent : " +
        bloquants.map((b) => `${b.relation.enfant} (${b.nombre})`).join(", ") +
        ". Supprimer depuis l'app.",
    );
  }
  if (!ecrire) return;
  const { count } = await prisma.entreprise.deleteMany({ where: { id: { in: entreprises.map((e) => e.id) } } });
  const f = await libererFichiers(cles, "comptes-test/annuler");
  console.log(`${count} entreprise(s) supprimée(s) ; ${f.liberes} fichier(s) libéré(s), ${f.echecs} échec(s).`);
}

// ---------------------------------------------------------------------------

async function main() {
  const email = argument("--email")?.trim().toLowerCase();
  const ecrire = process.argv.includes("--ecrire");
  const situations = process.argv.includes("--situations");
  const modeAnnuler = process.argv.includes("--annuler");
  if (!email || !email.endsWith(DOMAINE_DE_TEST) || email.length === DOMAINE_DE_TEST.length) {
    throw new Error(`--email <nom${DOMAINE_DE_TEST}> requis : seules les adresses de test sont acceptées.`);
  }

  console.log(`Base visée : ${hoteDeLaBase()}`);
  console.log(`Personne   : ${email}${ecrire ? "" : "  (à blanc)"}`);

  if (modeAnnuler) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const membre = user && (await prisma.membre.findFirst({ where: { userId: user.id, role: "owner" }, select: { compteId: true } }));
    if (!membre) return console.log("Aucun compte pour cette personne : rien à supprimer.");
    await annuler(membre.compteId, ecrire);
    if (!ecrire) console.log("\nÀ blanc : rien n'est supprimé. Relancer avec --ecrire.");
    return;
  }

  const mdp = motDePasse();
  if (situations) validerTout();
  if (!ecrire) {
    const existe = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    console.log(existe ? "Existe : mot de passe remis, adresse confirmée." : "À créer : adresse confirmée, mot de passe posé.");
    if (situations) console.log(`${SITUATIONS.length} fiche(s) valides, à semer dans le compte « ${NOM_DU_COMPTE} ».`);
    console.log("\nÀ blanc : rien n'est écrit. Relancer avec --ecrire.");
    return;
  }

  const { userId, creee } = await personne(email, mdp);
  console.log(`${creee ? "Créée" : "Retrouvée"} (${userId}) : adresse confirmée, mot de passe posé.`);
  if (!situations) return;
  const { compteId, db } = await compteDe(userId);
  console.log(`Compte     : ${compteId}`);
  await semer(compteId, db, true);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
