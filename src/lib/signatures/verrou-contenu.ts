import { prisma } from "@/lib/prisma";
import type { ObjetSignable, Prisma } from "@prisma/client";

/**
 * Ce qu'une signature scelle ne se modifie plus (audit du 2026-10-12,
 * constats 1 et 4).
 *
 * **Ce module n'est volontairement pas `"use server"`** : ses appelants ont
 * établi le périmètre.
 *
 * La règle, une fois pour le plan et le permis : un champ HORS de l'empreinte
 * (`hash-objet.ts`) se modifie toujours ; un champ COUVERT ne se modifie que
 * tant qu'aucune signature n'existe. Le modifier ensuite rendrait la signature
 * « document modifié » à la page publique de vérification, sans que personne
 * l'ait décidé. Révoquer les signatures en datant la révocation est l'autre
 * issue — c'est la contre-signature du § 10 de `chantiers-ouverts.md`, une
 * décision qui n'est pas prise ici.
 *
 * ~~Un lien émis mais pas encore signé ne verrouille rien : la signature porte
 * sur le contenu tel qu'il est au moment de signer, et la page du lien le
 * montre en entier.~~ [2026-10-12, relecture indépendante : vrai du contenu,
 * faux de ce que le signataire a vu — l'empreinte est calculée au moment du
 * code, la page a été lue avant. Un lien émis ne verrouille toujours rien,
 * mais une modification qui change l'empreinte le RÉVOQUE
 * (`revoquerLiensEnVol`, dans la transaction de l'écriture), et l'écran
 * « Modifier » le dit avant l'envoi.]
 *
 * COMPTER PUIS ÉCRIRE, SOUS LE MÊME VERROU. Le compte et l'écriture se
 * faisaient en deux requêtes libres : une signature posée entre les deux
 * laissait réécrire un contenu qu'elle venait de sceller. Les deux
 * `modifier*` et la pose d'une signature (`poserSignatureAvecToken`) prennent
 * d'abord le verrou de la ligne (`verrouillerObjetSigne`) : l'un attend que
 * l'autre ait fini, et le second relit ce que le premier a écrit.
 */
export async function compterSignatures(
  objetType: ObjetSignable,
  objetId: string,
  etablissementId: string,
  db: Prisma.TransactionClient = prisma,
): Promise<number> {
  return db.signature.count({ where: { objetType, objetId, etablissementId } });
}

/**
 * Le verrou de ligne (`SELECT … FOR UPDATE`) de l'objet dont une signature
 * scelle le contenu — le plan et le permis, dont le contenu se corrige. Les
 * autres objets signables ne se modifient pas : rien à verrouiller.
 */
export async function verrouillerObjetSigne(
  tx: Prisma.TransactionClient,
  objetType: ObjetSignable,
  objetId: string,
): Promise<void> {
  if (objetType === "plan_prevention") {
    await tx.$queryRaw`SELECT 1 FROM "PlanPrevention" WHERE "id" = ${objetId} FOR UPDATE`;
  } else if (objetType === "permis_feu") {
    await tx.$queryRaw`SELECT 1 FROM "PermisFeu" WHERE "id" = ${objetId} FOR UPDATE`;
  }
}

/**
 * Une saisie porte-t-elle un champ que l'empreinte couvre ? Sur le plan comme
 * sur le permis, le seul champ du formulaire hors empreinte est la zone
 * (`batimentId`). Les clés internes de Next (`$ACTION_…`) n'en sont pas.
 */
export function porteUnChampScelle(formData: FormData): boolean {
  for (const cle of formData.keys()) {
    if (cle.startsWith("$")) continue;
    if (cle !== "batimentId") return true;
  }
  return false;
}

/**
 * La phrase que l'écran « Modifier » affiche, et que le serveur rend s'il
 * reçoit malgré tout une modification — la même. `null` : rien n'est scellé.
 */
export function motifContenuScelle(
  document: "plan" | "permis",
  nbSignatures: number,
  /** Plan seulement : la date de l'inspection commune manque-t-elle ? */
  sansInspection = false,
): string | null {
  if (nbSignatures === 0) return null;
  const sujet = document === "plan" ? "Ce plan" : "Ce permis";
  const signatures =
    nbSignatures > 1 ? `${nbSignatures} signatures` : "une signature";
  const motif =
    `${sujet} porte déjà ${signatures}. Son contenu ne se modifie plus : ` +
    "le changer rendrait la signature invalide. Seule la zone reste modifiable.";
  return document === "plan" && sansInspection
    ? `${motif} ${INSPECTION_SUR_PLAN_SIGNE}`
    : motif;
}

/**
 * L'issue réelle d'un plan signé sans date d'inspection commune (audit B5,
 * relecture indépendante du 2026-10-12). `inspectionDate` est dans l'empreinte
 * (`hash-objet.ts`) : la date ne s'ajoute plus, et « Seule la zone reste
 * modifiable » laissait le dirigeant chercher où l'enregistrer. Aucun champ
 * hors empreinte ne la porte : la seule voie est un nouveau plan. La règle
 * d'empreinte n'est pas changée ici.
 */
export const INSPECTION_SUR_PLAN_SIGNE =
  "Signé, ce plan ne peut plus recevoir la date de l'inspection commune : pour " +
  "l'enregistrer, supprimez-le — il passe alors « annulé » et reste au " +
  "dossier — puis établissez-en un nouveau, à faire signer.";

/**
 * Le motif écrit sur un lien révoqué parce que le contenu a changé — celui
 * que le signataire lit s'il ouvre le lien ensuite (« Ce lien a été révoqué :
 * … »).
 */
export const MOTIF_CONTENU_MODIFIE = {
  plan: "le plan de prévention a été modifié depuis l'envoi de ce lien",
  permis: "le permis de feu a été modifié depuis l'envoi de ce lien",
} as const;

/**
 * Ce que l'écran « Modifier » dit avant l'envoi quand des liens attendent une
 * signature et que rien n'est encore scellé. `null` : aucun lien en vol.
 */
export function avisLiensEnVol(nbLiens: number): string | null {
  if (nbLiens === 0) return null;
  const envoyes =
    nbLiens > 1
      ? `${nbLiens} liens de signature attendent une réponse.`
      : "Un lien de signature attend une réponse.";
  return (
    `${envoyes} Si vous changez le contenu, les liens de signature envoyés ` +
    "sont annulés : renvoyez-les."
  );
}
