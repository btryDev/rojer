import { prisma } from "@/lib/prisma";
import type { ObjetSignable } from "@prisma/client";

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
 * Un lien émis mais pas encore signé ne verrouille rien : la signature porte
 * sur le contenu tel qu'il est au moment de signer, et la page du lien le
 * montre en entier.
 */
export async function compterSignatures(
  objetType: ObjetSignable,
  objetId: string,
  etablissementId: string,
): Promise<number> {
  return prisma.signature.count({ where: { objetType, objetId, etablissementId } });
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
): string | null {
  if (nbSignatures === 0) return null;
  const sujet = document === "plan" ? "Ce plan" : "Ce permis";
  const signatures =
    nbSignatures > 1 ? `${nbSignatures} signatures` : "une signature";
  return (
    `${sujet} porte déjà ${signatures}. Son contenu ne se modifie plus : ` +
    "le changer rendrait la signature invalide. Seule la zone reste modifiable."
  );
}
