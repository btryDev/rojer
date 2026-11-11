"use server";

import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { SELECT_FAITS_ACTIVITE } from "@/lib/etablissements/faits-activite";
import { reprendreFaitsDansDuerp } from "@/lib/etablissements/faits-activite-ecriture";
import { assertEtablissementDuCompte, assertEtablissementOwnership } from "@/lib/auth/scope";
import { construireEcrituresImport } from "./ecritures";
import { avecValidations } from "../etapes-validees";
import {
  LIBELLE_CHAMP_IMPORT,
  erreurDeFichier,
  parserFichierDuerp,
  planifierImport,
  type ColonneAttendue,
} from "./parser";
import { validerFichierImport } from "./format";
import { constaterEpiDuCompte } from "@/lib/etablissements/epi-constate";
import { verifierSaisie } from "@/lib/abonnements/saisie";
import { prendreQuota, refusQuota, RefusQuota } from "@/lib/abonnements/quotas";

/**
 * Import d'un DUERP Excel ou CSV.
 *
 * Le fichier est parsé côté serveur (xlsx gère les deux formats). Chaque
 * ligne devient :
 *   - une `UniteTravail` (créée ou réutilisée par nom),
 *   - un `Risque` avec cotation gravité/probabilité/maîtrise,
 *   - une `Action` par mesure listée (statut « levee » — déjà en place) ;
 *   - une `Action` ouverte par mesure listée dans une colonne de mesures
 *     prévues ou à mettre en œuvre (depuis le 2026-10-12).
 *
 * L'import est transactionnel : en cas d'erreur, rien n'est créé. Une
 * étape de preview (sans écriture) précède l'import pour que l'utilisateur
 * corrige le mapping de colonnes si la détection automatique a raté.
 */

export type PreviewImportState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "preview";
      nomFichier: string;
      nbLignes: number;
      nbRisques: number;
      nbMesures: number;
      nbMesuresPrevues: number;
      nbUnites: number;
      /** La colonne retenue pour chaque champ, `null` si aucune. */
      colonnes: Array<{ champ: string; colonne: string | null }>;
      nbErreurs: number;
      resume: Array<{ unite: string; nbRisques: number; exemples: string[] }>;
    };

/**
 * Étape 1 : upload + parsing + preview (pas d'écriture).
 * Côté UI, l'action est appelée depuis un form multipart.
 */
export async function previewImport(
  etablissementId: string,
  _prev: PreviewImportState,
  formData: FormData,
): Promise<PreviewImportState> {
  await assertEtablissementOwnership(etablissementId);

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { status: "error", message: "Aucun fichier fourni." };
  }
  const check = validerFichierImport(fichier);
  if (!check.ok) return { status: "error", message: check.erreur };

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const res = parserFichierDuerp(buffer);
  const refus = erreurDeFichier(res);
  if (refus) return { status: "error", message: refus };
  const plan = planifierImport(res.lignes);

  return {
    status: "preview",
    nomFichier: fichier.name,
    nbLignes: res.totalLignes,
    nbRisques: plan.nbRisques,
    nbMesures: plan.nbMesures,
    nbMesuresPrevues: plan.nbMesuresPrevues,
    nbUnites: plan.unites.length,
    colonnes: (Object.keys(LIBELLE_CHAMP_IMPORT) as ColonneAttendue[]).map(
      (c) => ({
        champ: LIBELLE_CHAMP_IMPORT[c],
        colonne: res.mappingDetecte[c] ?? null,
      }),
    ),
    nbErreurs: res.erreurs.length,
    resume: plan.unites.slice(0, 30).map((u) => ({
      unite: u.nom,
      nbRisques: u.risques.length,
      exemples: u.risques
        .slice(0, 3)
        .map((r) => r.libelleRisque)
        .filter(Boolean),
    })),
  };
}

export type CommitImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; duerpId: string; nbRisques: number };

/**
 * Étape 2 : commit transactionnel. Relit le fichier, ré-applique le parsing,
 * puis écrit en base. On ne stocke pas le fichier entre les deux étapes
 * pour garder l'action stateless — au prix d'un re-parse.
 */
export async function commitImport(
  etablissementId: string,
  _prev: CommitImportState,
  formData: FormData,
): Promise<CommitImportState> {
  await verifierSaisie();
  const { compte, db } = await assertEtablissementDuCompte(etablissementId);

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { status: "error", message: "Fichier manquant." };
  }
  const check = validerFichierImport(fichier);
  if (!check.ok) return { status: "error", message: check.erreur };

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const res = parserFichierDuerp(buffer);
  const refus = erreurDeFichier(res);
  if (refus) return { status: "error", message: refus };
  if (res.lignes.length === 0) {
    return {
      status: "error",
      message:
        res.erreurs.length > 0
          ? "Toutes les lignes sont invalides. Corrigez le fichier avant d'importer."
          : "Fichier sans donnée exploitable.",
    };
  }
  const plan = planifierImport(res.lignes);

  // Le DUERP actif de l'établissement, s'il y en a un — on ne le crée pas
  // encore.
  const duerpExistant = await db.duerp.findFirst({
    where: { etablissementId },
    orderBy: { updatedAt: "desc" },
  });

  // Unités déjà en base, lues **avant** la transaction et en une fois. La
  // version précédente les cherchait une par une depuis l'intérieur de la
  // transaction, ce qui forçait celle-ci à rester interactive et à payer un
  // aller-retour réseau par ligne du fichier.
  //
  // ~~Le plafond de l'ADR-033 se comptait ici~~ [2026-11-11 : levé, ADR-033
  // amendée] ; elles servent au rattachement par nom et au compte des unités
  // à naître pour la limite de l'essai.
  const unitesExistantes = duerpExistant
    ? await db.uniteTravail.findMany({
        where: { duerpId: duerpExistant.id },
        select: { id: true, nom: true, estTransverse: true },
      })
    : [];

  // Plafond d'imports, puis limite d'unités de l'essai (ADR-053 § 14), même
  // règle de comptage : refusés ici, AVANT la création du DUERP ; la
  // transaction les reprend sous verrou.
  const reutilisables = new Set(unitesExistantes.filter((u) => !u.estTransverse).map((u) => u.nom));
  const aNaitre = new Set(plan.unites.map((u) => u.nom).filter((n) => !reutilisables.has(n))).size;
  const refusPlafond =
    (await refusQuota(db, compte.compteId, "importsDuerp")) ??
    (aNaitre > 0 ? await refusQuota(db, compte.compteId, "unitesTravail", aNaitre) : null);
  if (refusPlafond) return { status: "error", message: `${refusPlafond} Rien n'a été importé.` };

  const duerpId =
    duerpExistant?.id ??
    (await db.duerp.create({ data: { etablissementId } })).id;

  // Les identifiants sont générés ici, donc plus aucune écriture n'attend le
  // résultat d'une autre : les trois listes partent en autant de `createMany`,
  // dans une transaction séquentielle envoyée en un seul lot.
  const ecritures = construireEcrituresImport({
    plan,
    unitesExistantes,
    duerpId,
    etablissementId,
    genererId: (prefixe) => `${prefixe}_${randomUUID()}`,
    maintenant: new Date(),
  });

  const nbRisquesCrees = ecritures.risques.length;

  // Un DUERP NÉ de l'import reprend les faits d'activité déjà déclarés, comme
  // `creerDuerp` (ADR-041). Lus avant la transaction, écrits DANS elle : un
  // échec de la reprise annule aussi le fichier, sinon le dirigeant
  // réimporterait sur un DUERP déjà rempli (contre-relecture du 2026-10-08).
  const faits = duerpExistant
    ? null
    : await db.etablissement.findUnique({
        where: { id: etablissementId },
        select: SELECT_FAITS_ACTIVITE,
      });

  // Transaction unique : toutes les écritures ou rien. L'ordre est celui de
  // l'exécution — les unités avant les risques qui les référencent, les
  // risques avant leurs actions, puis la reprise, qui crée l'unité
  // transverse que le fichier ne porte jamais.
  try {
    await db.$transaction(async (tx) => {
      // `creerEnLotVerifie` (ADR-051) : les parents de chaque lot sont lus par
      // la transaction — les unités créées juste avant y sont vues.
      if (ecritures.unitesACreer.length > 0) {
        // Limite d'unités de l'essai gratuit (ADR-053 § 14) : refus en bloc —
        // tronquer un document apporté ferait perdre des risques évalués. Avant la création des unités, qu'elle compte : le
        // verrou du compte est alors tenu jusqu'à la fin de l'import — pendant
        // l'essai seulement, où un import ne crée que quelques unités.
        await prendreQuota(tx, compte.compteId, "unitesTravail", ecritures.unitesACreer.length);
        await creerEnLotVerifie(tx, "UniteTravail", ecritures.unitesACreer);
      }
      if (ecritures.risques.length > 0) {
        await creerEnLotVerifie(tx, "Risque", ecritures.risques);
      }
      if (ecritures.actions.length > 0) {
        await creerEnLotVerifie(tx, "Action", ecritures.actions);
      }
      if (faits) await reprendreFaitsDansDuerp(tx, duerpId, faits);
      // Des unités et des risques arrivent : leurs étapes sont à revalider
      // (« si pas validé, pas fait », 2026-11-11).
      if (duerpExistant?.etapesValidees) {
        await tx.duerp.update({
          where: { id: duerpId },
          data: {
            etapesValidees: avecValidations(duerpExistant.etapesValidees, {
              unites: null,
              risques: null,
            }),
          },
        });
      }
      // Le plafond annuel d'imports (ADR-053 § 14), en DERNIER : le verrou du
      // compte n'est tenu que jusqu'à la validation, pas pendant tout l'import.
      await prendreQuota(tx, compte.compteId, "importsDuerp");
    },
    // Une transaction interactive a 5 s par défaut ; un DUERP importé peut
    // porter des centaines de risques et d'actions (relecture du 2026-10-08).
    { timeout: 30_000 });
  } catch (e) {
    if (e instanceof RefusQuota) return { status: "error", message: `${e.motif} Rien n'a été importé.` };
    throw e;
  }
  await constaterEpiDuCompte(db, etablissementId);

  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/duerp/${duerpId}/risques`);
  revalidatePath(`/duerp/${duerpId}/synthese`);

  return { status: "success", duerpId, nbRisques: nbRisquesCrees };
}
