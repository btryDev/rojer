// Construction des écritures d'un import de DUERP.
//
// Séparé de l'action (`./actions.ts`) pour une raison précise : tant que la
// résolution des unités, le calcul des cotations et l'assemblage des lignes
// vivaient dans une boucle de transaction, rien de tout cela n'était testable
// sans mocker Prisma ni fabriquer un classeur Excel. Ici, c'est une fonction
// pure — on lui donne le plan du parseur et les unités déjà en base, elle rend
// trois listes prêtes pour autant de `createMany`.
//
// C'est aussi ce qui rend l'écriture groupée possible. L'ancienne version
// obtenait l'identifiant d'une unité en la créant, donc chaque risque devait
// attendre sa création, et chaque mesure celle de son risque : une requête par
// ligne du fichier, dans une transaction interactive. En générant les
// identifiants en amont, plus aucune écriture ne dépend du résultat d'une
// autre, et le tout part en un lot.

import type { PlanImport } from "./parser";
import { verifierPlafondImport } from "../plafond-unites";

export type UniteExistante = {
  id: string;
  nom: string;
  /** L'unité « Risques transverses » ne compte pas dans le plafond, et ne
   *  sert jamais de point de rattachement à une unité importée (ADR-033). */
  estTransverse: boolean;
};

export type EcrituresImport = {
  unitesACreer: Array<{ id: string; duerpId: string; nom: string }>;
  risques: Array<{
    id: string;
    uniteId: string;
    libelle: string;
    description: string | null;
    gravite: number;
    probabilite: number;
    maitrise: number;
    criticite: number;
    cotationSaisie: boolean;
  }>;
  actions: Array<{
    id: string;
    etablissementId: string;
    risqueId: string;
    libelle: string;
    type: "organisationnelle";
    /** « levee » : mesure en place ; « ouverte » : mesure à mettre en œuvre. */
    statut: "levee" | "ouverte";
    leveeLe: Date | null;
    leveeCommentaire: string | null;
  }>;
};

/**
 * Cotation d'un risque importé, bornée à l'échelle du produit.
 *
 * La division par la maîtrise reprend la convention du fichier source : une
 * mesure de maîtrise déjà en place abaisse la criticité. Les bornes évitent
 * qu'une ligne mal remplie (maîtrise à 4 sur une gravité à 1) ne produise un
 * 0 hors échelle.
 */
export function criticiteImportee(
  gravite: number,
  probabilite: number,
  maitrise: number,
): number {
  return Math.max(1, Math.min(16, Math.round((gravite * probabilite) / maitrise)));
}

/**
 * Ce que rend la construction : les écritures, ou un refus motivé.
 *
 * Un type somme et non une exception, pour que l'appelant **doive** traiter le
 * refus : `commitImport` doit le rendre à l'écran, pas le laisser remonter en
 * erreur 500 sur un dirigeant qui vient de déposer son document.
 */
export type ResultatEcritures =
  | { ok: true; ecritures: EcrituresImport }
  | { ok: false; message: string };

export function construireEcrituresImport({
  plan,
  unitesExistantes,
  duerpId,
  etablissementId,
  genererId,
  maintenant,
}: {
  plan: PlanImport;
  /** Unités déjà présentes sur ce DUERP, lues avant la transaction. */
  unitesExistantes: readonly UniteExistante[];
  duerpId: string;
  etablissementId: string;
  /** Injecté pour que les tests soient déterministes. */
  genererId: (prefixe: string) => string;
  maintenant: Date;
}): ResultatEcritures {
  // Réutilisation par nom exact, comme le faisait le `findFirst` d'origine.
  // Première occurrence gagnante si le DUERP porte déjà deux unités homonymes.
  //
  // L'unité transverse est écartée de la table de rattachement : un fichier
  // qui porterait une unité nommée « Risques transverses » y verserait ses
  // risques, et l'écran des unités la masque — ils y deviendraient invisibles.
  const parNom = new Map<string, string>();
  for (const u of unitesExistantes) {
    if (u.estTransverse) continue;
    if (!parNom.has(u.nom)) parNom.set(u.nom, u.id);
  }

  // Le plafond se vérifie avant d'assembler quoi que ce soit (ADR-033).
  // L'import est le point d'entrée qui peut faire entrer douze unités d'un
  // coup, et c'est celui où l'on refuse en bloc : tronquer un document que le
  // dirigeant a apporté lui ferait perdre des risques déjà évalués sans qu'il
  // le sache.
  const borne = verifierPlafondImport(
    unitesExistantes,
    plan.unites.map((u) => u.nom),
  );
  if (!borne.ok) return { ok: false, message: borne.message };

  const ecritures: EcrituresImport = {
    unitesACreer: [],
    risques: [],
    actions: [],
  };

  for (const u of plan.unites) {
    let uniteId = parNom.get(u.nom);
    if (!uniteId) {
      uniteId = genererId("unit");
      // Mémorisé : deux unités du plan peuvent porter le même nom une fois
      // celui-ci normalisé par le parseur, et elles doivent alors converger
      // vers une seule ligne en base plutôt que d'en créer deux.
      parNom.set(u.nom, uniteId);
      ecritures.unitesACreer.push({ id: uniteId, duerpId, nom: u.nom });
    }

    for (const r of u.risques) {
      const risqueId = genererId("risq");
      ecritures.risques.push({
        id: risqueId,
        uniteId,
        libelle: r.libelleRisque,
        description: r.description,
        gravite: r.gravite,
        probabilite: r.probabilite,
        maitrise: r.maitrise,
        criticite: criticiteImportee(r.gravite, r.probabilite, r.maitrise),
        cotationSaisie: true,
      });

      // Chaque mesure listée → Action au statut « levee » : la convention
      // d'import d'un DUERP existant est que ces mesures sont déjà en place.
      for (const libelle of r.mesuresExistantes) {
        ecritures.actions.push({
          id: genererId("act"),
          etablissementId,
          risqueId,
          libelle,
          // Défaut prudent — l'utilisateur peut retyper ensuite.
          type: "organisationnelle",
          statut: "levee",
          leveeLe: maintenant,
          leveeCommentaire: "Importé depuis le DUERP initial",
        });
      }

      // Une colonne de mesures prévues ou à mettre en œuvre → actions
      // OUVERTES, sans échéance : le fichier ne dit pas quand (audit du
      // 2026-10-12 — elles devenaient des mesures en place).
      for (const libelle of r.mesuresPrevues) {
        ecritures.actions.push({
          id: genererId("act"),
          etablissementId,
          risqueId,
          libelle,
          type: "organisationnelle",
          statut: "ouverte",
          leveeLe: null,
          leveeCommentaire: null,
        });
      }
    }
  }

  return { ok: true, ecritures };
}
