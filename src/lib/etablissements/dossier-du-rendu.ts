import "server-only";

// L'établissement, son parc en service et ses obligations applicables, lus
// UNE FOIS par rendu.
//
// POURQUOI CE MODULE (audit Next.js du 2026-10-14, H2). Le tableau de bord
// relisait l'établissement et son parc dans cinq fonctions — transmissions,
// états permanents, marques « à confirmer », couverture, et par la barre
// latérale — et chacune repassait le moteur `determineObligationsApplicables`
// sur les mêmes entrées. Mesuré sur le dossier de démo complet : 10 lectures
// d'`Etablissement` et 146 requêtes SQL pour un seul affichage.
//
// `cache()` de React donne une mémoïsation PORTÉE À LA REQUÊTE : deux appels
// dans le même rendu RSC partagent la lecture, deux requêtes HTTP n'ont rien en
// commun (même justification que `requireUser`). Hors rendu — route PDF, action
// serveur, test —, React n'a pas de dispatcher de cache et la fonction
// s'exécute normalement : le résultat est le même, seule la mémoïsation tombe.
//
// LES CLÉS SONT DES PRIMITIVES. `cache()` compare ses arguments par identité :
// un objet reconstruit à chaque appel ne toucherait jamais l'entrée. On passe
// donc l'identifiant et le propriétaire, jamais l'établissement projeté.
//
// LE PROPRIÉTAIRE EST UN PARAMÈTRE, pas une lecture de session, sur le modèle
// de `chargerTransmissions` et `etatsPermanentsDuDossier` : leurs appelants
// bornent l'établissement par le `userId` qu'ils reçoivent, et ce module garde
// leur contrat. Le prédicat d'appartenance est porté par la requête.
//
// LE CLIENT BORNÉ AU COMPTE (ADR-051) EST REÇU DE MÊME, dans les variantes
// `…DuCompte`. Un par compte, gardé par `clientBorne`, il est une clé stable
// du cache. Les fonctions d'origine lisent par le client brut, pour les
// appelants qui ne le tiennent pas encore (isolation, lot 2b) : leur cache est
// distinct, et elles disparaissent quand ils passent aux variantes.
//
// RIEN ICI NE DÉPEND DES LIGNES DU CALENDRIER. Le layout et la page sont rendus
// EN PARALLÈLE (`regeneration-sure.ts`) : une lecture partagée entre les deux
// peut partir avant la réparation que fait la page. L'établissement et son
// parc ne sont pas touchés par cette réparation — elle n'écrit que les lignes
// et le sceau `referentielVersionCalendrier`, qu'aucun lecteur de ce module ne
// lit — et le partage est donc sans effet sur ce qui s'affiche.
//
// LE RÉSULTAT EST PARTAGÉ : un appelant ne le modifie pas.

import { cache } from "react";
import type { Equipement } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Db } from "@/lib/auth/compte";
import {
  determineObligationsApplicables,
  projeterEtablissement,
} from "@/lib/matching";
import type { EquipementMatching } from "@/lib/matching/types";

/**
 * L'établissement (toutes ses colonnes), l'effectif et le code NAF de son
 * entreprise, et ses équipements EN SERVICE — un appareil désactivé ne génère
 * plus rien. C'est l'union de ce que lisaient les cinq chargements qu'il
 * remplace ; aucun n'y perd un champ.
 */
export const chargerEtablissementEtParcDuCompte = cache(
  async function chargerEtablissementEtParcDuCompte(
    db: Db,
    etablissementId: string,
    userId: string,
  ) {
    return db.etablissement.findFirst({
      where: { id: etablissementId, entreprise: { userId } },
      include: {
        entreprise: { select: { effectif: true } },
        equipements: { where: { actif: true } },
      },
    });
  },
);

/** La même lecture par le client brut (voir l'en-tête). */
export const chargerEtablissementEtParc = cache(
  async function chargerEtablissementEtParc(
    etablissementId: string,
    userId: string,
  ) {
    return chargerEtablissementEtParcDuCompte(prisma, etablissementId, userId);
  },
);

export type EtablissementEtParc = NonNullable<
  Awaited<ReturnType<typeof chargerEtablissementEtParc>>
>;

/** Le parc tel que le moteur le lit. */
export function equipementsPourLeMoteur(
  equipements: Pick<
    Equipement,
    "id" | "libelle" | "categorie" | "caracteristiques"
  >[],
): EquipementMatching[] {
  return equipements.map((eq) => ({
    id: eq.id,
    libelle: eq.libelle,
    categorie: eq.categorie,
    caracteristiques: (eq.caracteristiques ?? null) as Record<
      string,
      unknown
    > | null,
  }));
}

/**
 * Le passage du moteur sur le dossier, une fois par rendu. `null` si le
 * dossier n'existe pas ou n'appartient pas à `userId`.
 */
export const obligationsApplicablesDuDossierDuCompte = cache(
  async function obligationsApplicablesDuDossierDuCompte(
    db: Db,
    etablissementId: string,
    userId: string,
  ) {
    const etab = await chargerEtablissementEtParcDuCompte(db, etablissementId, userId);
    if (!etab) return null;
    const equipements = equipementsPourLeMoteur(etab.equipements);
    return {
      etab,
      equipements,
      applicables: determineObligationsApplicables(
        projeterEtablissement(etab),
        equipements,
      ),
    };
  },
);

/** Le même passage, sur la lecture par le client brut (voir l'en-tête). */
export const obligationsApplicablesDuDossier = cache(
  async function obligationsApplicablesDuDossier(
    etablissementId: string,
    userId: string,
  ) {
    return obligationsApplicablesDuDossierDuCompte(prisma, etablissementId, userId);
  },
);
