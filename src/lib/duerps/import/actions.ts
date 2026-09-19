"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { construireEcrituresImport } from "./ecritures";
import { verifierPlafondImport } from "../plafond-unites";
import { parserFichierDuerp, planifierImport } from "./parser";
import { validerFichierImport } from "./format";

/**
 * Import d'un DUERP Excel ou CSV.
 *
 * Le fichier est parsé côté serveur (xlsx gère les deux formats). Chaque
 * ligne devient :
 *   - une `UniteTravail` (créée ou réutilisée par nom),
 *   - un `Risque` avec cotation gravité/probabilité/maîtrise,
 *   - une `Action` par mesure listée (statut « levee » — déjà en place).
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
      nbUnites: number;
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
  const plan = planifierImport(res.lignes);

  return {
    status: "preview",
    nomFichier: fichier.name,
    nbLignes: res.totalLignes,
    nbRisques: plan.nbRisques,
    nbMesures: plan.nbMesures,
    nbUnites: plan.unites.length,
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
  await assertEtablissementOwnership(etablissementId);

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { status: "error", message: "Fichier manquant." };
  }
  const check = validerFichierImport(fichier);
  if (!check.ok) return { status: "error", message: check.erreur };

  const buffer = Buffer.from(await fichier.arrayBuffer());
  const res = parserFichierDuerp(buffer);
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
  const duerpExistant = await prisma.duerp.findFirst({
    where: { etablissementId },
    orderBy: { updatedAt: "desc" },
  });

  // Unités déjà en base, lues **avant** la transaction et en une fois. La
  // version précédente les cherchait une par une depuis l'intérieur de la
  // transaction, ce qui forçait celle-ci à rester interactive et à payer un
  // aller-retour réseau par ligne du fichier.
  //
  // Elles sont désormais lues **toutes**, et non plus les seules dont le nom
  // figure dans le fichier : le plafond de l'ADR-033 se compte sur ce que le
  // DUERP porte déjà, pas sur ce que l'import y reconnaît. Un filtre par nom
  // aurait rendu la borne aveugle aux unités que le fichier ne mentionne pas
  // — c'est-à-dire au cas courant.
  const unitesExistantes = duerpExistant
    ? await prisma.uniteTravail.findMany({
        where: { duerpId: duerpExistant.id },
        select: { id: true, nom: true, estTransverse: true },
      })
    : [];

  // Le plafond est vérifié **avant** la création du DUERP : un import refusé
  // laisserait sinon derrière lui un document vide que personne n'a demandé,
  // et que la prochaine ouverture réutiliserait en silence.
  const borne = verifierPlafondImport(
    unitesExistantes,
    plan.unites.map((u) => u.nom),
  );
  if (!borne.ok) return { status: "error", message: borne.message };

  const duerpId =
    duerpExistant?.id ??
    (await prisma.duerp.create({ data: { etablissementId } })).id;

  // Les identifiants sont générés ici, donc plus aucune écriture n'attend le
  // résultat d'une autre : les trois listes partent en autant de `createMany`,
  // dans une transaction séquentielle envoyée en un seul lot.
  const resultat = construireEcrituresImport({
    plan,
    unitesExistantes,
    duerpId,
    etablissementId,
    genererId: (prefixe) => `${prefixe}_${randomUUID()}`,
    maintenant: new Date(),
  });

  // Un refus arrive avant toute écriture, et il porte sa raison : le fichier
  // reste au dirigeant, à lui de regrouper ses unités et de le redéposer.
  if (!resultat.ok) return { status: "error", message: resultat.message };
  const ecritures = resultat.ecritures;

  const nbRisquesCrees = ecritures.risques.length;

  // Transaction unique : toutes les écritures ou rien. L'ordre du tableau est
  // celui de l'exécution — les unités avant les risques qui les référencent,
  // les risques avant leurs actions.
  const operations: Prisma.PrismaPromise<unknown>[] = [];
  if (ecritures.unitesACreer.length > 0) {
    operations.push(
      prisma.uniteTravail.createMany({ data: ecritures.unitesACreer }),
    );
  }
  if (ecritures.risques.length > 0) {
    operations.push(prisma.risque.createMany({ data: ecritures.risques }));
  }
  if (ecritures.actions.length > 0) {
    operations.push(prisma.action.createMany({ data: ecritures.actions }));
  }
  await prisma.$transaction(operations);

  revalidatePath(`/etablissements/${etablissementId}`);
  revalidatePath(`/duerp/${duerpId}/risques`);
  revalidatePath(`/duerp/${duerpId}/synthese`);

  return { status: "success", duerpId, nbRisques: nbRisquesCrees };
}
