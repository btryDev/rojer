import "server-only";
import { requireCompte } from "@/lib/auth/compte";
import { SELECT_PREUVE } from "./preuve";
import type { ObjetSignable, Prisma } from "@prisma/client";

/**
 * Lit les signatures posées sur un objet (rapport, permis de feu, plan de
 * prévention…). Utilisé par les pages détail pour afficher les
 * `SignatureBlock`.
 *
 * **Contrat d'appel** : la clé `(objetType, objetId)` n'est pas un secret,
 * cette fonction ne porte donc aucune autorisation. L'appelant doit avoir
 * déjà établi son droit sur l'objet — en pratique il vient de le charger
 * via une query scopée (`getPermisFeu`, `getPlanPrevention`,
 * `getVerification`) et passe l'identifiant qui en sort. Ne jamais
 * l'appeler avec un identifiant venu directement d'une URL ou d'un
 * formulaire sans avoir chargé l'objet au préalable.
 */
export async function listSignatures(
  /** Le client borné au compte, reçu de la garde de l'appelant (ADR-051). */
  db: Prisma.TransactionClient,
  etablissementId: string,
  objetType: ObjetSignable,
  objetId: string,
) {
  return db.signature.findMany({
    where: { etablissementId, objetType, objetId },
    orderBy: { horodatageIso: "asc" },
  });
}

/**
 * Les signatures de plusieurs objets d'un même type, en UNE requête, rangées
 * par objet dans l'ordre de dépôt — seulement les champs de la preuve
 * (`SELECT_PREUVE`), ceux qu'affiche `SignatureBlock`. La portée au
 * propriétaire est dans la requête — la doctrine du module, ~~que
 * `listSignatures` porte encore en dette (`tenancy-lectures.test.ts`)~~
 * [2026-10-31 : `listSignatures` porte l'établissement dans sa requête, son
 * exemption est retirée].
 *
 * [2026-10-27, plan performance, lot 1a] La fiche d'un contrôle appelait
 * `listSignatures` rapport par rapport, l'une après l'autre : 521 requêtes à la
 * suite pour un contrôle hebdomadaire tenu dix ans.
 */
export async function listSignaturesDesObjets(
  objetType: ObjetSignable,
  objetIds: readonly string[],
) {
  type Preuve = Prisma.SignatureGetPayload<{ select: typeof SELECT_PREUVE }>;
  const parObjet = new Map<string, Preuve[]>(objetIds.map((id) => [id, []]));
  if (objetIds.length === 0) return parObjet;
  const { user, db } = await requireCompte();
  const signatures = await db.signature.findMany({
    where: {
      objetType,
      objetId: { in: [...objetIds] },
      etablissement: { entreprise: { userId: user.id } },
    },
    select: { ...SELECT_PREUVE, objetId: true },
    orderBy: { horodatageIso: "asc" },
  });
  for (const { objetId, ...preuve } of signatures) parObjet.get(objetId)?.push(preuve);
  return parObjet;
}
