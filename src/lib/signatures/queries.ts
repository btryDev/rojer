import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
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
export async function listSignatures(objetType: ObjetSignable, objetId: string) {
  return prisma.signature.findMany({
    where: { objetType, objetId },
    orderBy: { horodatageIso: "asc" },
  });
}

/** Champs d'une signature qui constituent la preuve, et rien d'autre. */
const SELECT_PREUVE = {
  id: true,
  signataireNom: true,
  signataireEmail: true,
  signataireRole: true,
  horodatageIso: true,
  methode: true,
  hashDocument: true,
  nomDocument: true,
} as const;

/**
 * Les signatures de plusieurs objets d'un même type, en UNE requête, rangées
 * par objet dans l'ordre de dépôt — seulement les champs de la preuve
 * (`SELECT_PREUVE`), ceux qu'affiche `SignatureBlock`. La portée au
 * propriétaire est dans la requête — la doctrine du module, que
 * `listSignatures` porte encore en dette (`tenancy-lectures.test.ts`).
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
  const user = await requireUser();
  const signatures = await prisma.signature.findMany({
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

/**
 * Lit une signature par son identifiant, **sans authentification**.
 *
 * C'est délibéré : l'identifiant `sig_…` est communiqué avec le document
 * pour permettre à un tiers (inspecteur, assureur, acquéreur) de contrôler
 * la signature sans compte — c'est tout l'objet de la page publique
 * `/verifier/[signatureId]`. L'identifiant est un UUID aléatoire, donc non
 * énumérable.
 *
 * En contrepartie, la projection est limitée à ce qui sert la preuve.
 * L'adresse IP, le user-agent, l'identifiant d'établissement et l'objet
 * signé ne sortent pas d'ici : ils ne participent pas à la vérification et
 * exposeraient la structure interne du compte.
 */
export async function getSignature(id: string) {
  return prisma.signature.findUnique({
    where: { id },
    select: SELECT_PREUVE,
  });
}
