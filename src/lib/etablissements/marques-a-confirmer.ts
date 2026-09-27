// Les marques « à confirmer » d'un dossier, pour les surfaces qui lisent des
// lignes PERSISTÉES — calendrier, fiche d'une vérification, dossier PDF (donc
// le ZIP qui l'embarque), MCP.
//
// POURQUOI UN APPEL DU MOTEUR ET PAS UNE COLONNE. La marque dépend de la fiche
// (une réponse donnée la lève sans que la ligne bouge) ; la persister sur
// `Verification` ferait une seconde vérité à tenir à jour par le
// réconciliateur, et une migration. L'écran des états permanents fait déjà
// ainsi : c'est le même calcul, par la même traduction (`matching/marques.ts`).
//
// Le client est reçu, pas importé : le MCP a le sien (`mcp/prisma.ts`, qui
// n'écrit rien sur la sortie standard). La portée l'est aussi — l'appelant
// passe le prédicat d'appartenance qu'il a établi, et la lecture le porte.

import type { Prisma, PrismaClient } from "@prisma/client";
import { determineObligationsApplicables } from "@/lib/matching";
import {
  marquesParObligation,
  type MarqueAConfirmer,
} from "@/lib/matching/marques";
import { projeterEtablissement } from "@/lib/matching/projection";

export type MarquesDuDossier = {
  parObligation: Map<string, MarqueAConfirmer>;
  /** Pour le lien « effectif de l'entreprise » ; `null` si le dossier est introuvable. */
  entrepriseId: string | null;
};

export async function marquesAConfirmerDuDossier(
  client: Pick<PrismaClient, "etablissement">,
  where: Prisma.EtablissementWhereInput,
): Promise<MarquesDuDossier> {
  const etab = await client.etablissement.findFirst({
    where,
    // Les seuls champs que lit le moteur, écrits en clair : ce module sert
    // aussi le MCP, dont la garde relit ce qui sort de la base.
    select: {
      id: true,
      entrepriseId: true,
      effectifSurSite: true,
      estEtablissementTravail: true,
      estERP: true,
      estIGH: true,
      estHabitation: true,
      typeErp: true,
      categorieErp: true,
      classeIgh: true,
      familleHabitation: true,
      personnesPresentesHabituellement: true,
      manipuleMatieresR422722: true,
      comporteLocauxSommeilPublic: true,
      chiffonsImpregnes: true,
      entreprise: { select: { effectif: true } },
      equipements: {
        where: { actif: true },
        select: {
          id: true,
          libelle: true,
          categorie: true,
          caracteristiques: true,
        },
      },
    },
  });
  if (!etab) return { parObligation: new Map(), entrepriseId: null };

  const { equipements, entrepriseId, ...source } = etab;
  const parObligation = marquesParObligation(
    determineObligationsApplicables(
      projeterEtablissement(source),
      equipements.map((eq) => ({
        id: eq.id,
        libelle: eq.libelle,
        categorie: eq.categorie,
        caracteristiques: (eq.caracteristiques ?? null) as Record<
          string,
          unknown
        > | null,
      })),
    ),
  );
  return { parObligation, entrepriseId };
}
