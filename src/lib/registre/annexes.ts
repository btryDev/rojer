// Ce que la fiche « Annexes » du registre porte : les écrits que le règlement
// de sécurité fait annexer au registre (2026-11-05).
//
// Ces écrits sont déjà des lignes de « Ce qui doit être en place » — le
// schéma d'organisation de la sécurité, le contrat d'entretien du SSI, la
// notice de l'éclairage de sécurité, le registre technique des ascenseurs.
// Le dirigeant les y déclare en place. La fiche les relit : elle ne pose
// aucune question à elle, sans quoi le même fait se saisirait à deux endroits
// et finirait par se contredire.
//
// Elle reprend la déclaration telle qu'elle est — une date et une note du
// dirigeant —, jamais comme une pièce vérifiée (ADR-027). Le fichier
// lui-même n'est pas dans Rojer : l'écran des états permanents n'ouvre aucune
// surface de dépôt.
//
// Module **pur** : ni Prisma, ni React.

import { formaterDateCourteFr } from "@/lib/dates";
import { matchTypologie, type EtablissementMatching } from "@/lib/matching";
import type { TypologieApplication } from "@/lib/referentiels/types-communs";
import { ancreEtatPermanent } from "@/lib/etats-permanents/ancre";
import { phraseDeclaration } from "@/lib/etats-permanents/phrases";
import type { ContenuAilleurs } from "./contenu-ailleurs";

/** L'identifiant de la fiche « Annexes » au catalogue (`sections.ts`). */
export const ID_FICHE_ANNEXES = "annexes";

export type AnnexeDuRegistre = {
  /** La ligne de « Ce qui doit être en place » qui porte l'écrit. */
  obligationId: string;
  /** Le nom de l'écrit, tel qu'il s'imprime à la fiche. */
  titre: string;
  /** L'article qui le fait annexer au registre. */
  article: string;
  /**
   * Quand l'annexion est plus étroite que la ligne elle-même. Le carnet
   * d'entretien de l'ascenseur est dû partout (CCH) ; seul AS 11, livre II,
   * le fait annexer au registre de sécurité, donc en catégories 1 à 4.
   */
  seulementSi?: TypologieApplication;
};

/**
 * Les écrits que le texte fait annexer au registre, et qu'une ligne d'état
 * permanent porte déjà. Relevé le 2026-11-05 sur le référentiel (description
 * et références de chaque ligne).
 *
 * Écartés à dessein :
 * - le dossier technique des moyens de secours (MS 75) et les éléments d'une
 *   solution d'effet équivalent (R. 143-44) : ils sont l'acte de la ligne
 *   « Tenue du registre de sécurité », le registre lui-même ;
 * - la notice de l'éclairage de sécurité hors ERP (arrêté du 14 décembre
 *   2011, art. 11) : elle n'a pas de ligne propre, elle est dite dans la
 *   description d'une vérification semestrielle.
 */
export const ANNEXES_DU_REGISTRE: readonly AnnexeDuRegistre[] = [
  {
    obligationId: "incendie-erp-schema-organisation-securite",
    titre: "Schéma d'organisation globale de la sécurité",
    article: "M 31",
  },
  {
    obligationId: "incendie-erp-ssi-contrat-entretien",
    titre: "Contrat d'entretien du système de sécurité incendie et notice de la détection",
    article: "MS 58 § 4",
  },
  {
    obligationId: "incendie-erp-eclairage-securite-notice-registre",
    titre: "Notice de maintenance de l'éclairage de sécurité",
    article: "EC 13",
  },
  {
    obligationId: "ascenseur-carnet-entretien",
    titre: "Registre technique des ascenseurs",
    article: "AS 11",
    seulementSi: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
  },
];

/** Une ligne de « Ce qui doit être en place », réduite à ce que la fiche lit. */
export type EtatPourAnnexe = {
  obligationId: string;
  declareLe: Date | null;
  note: string | null;
};

/**
 * Le contenu de la fiche « Annexes » : un écrit par ligne applicable, avec ce
 * que le dirigeant en a déclaré.
 *
 * `etats` est la sortie de `listerEtatsPermanents`, à plat : seule une ligne
 * que le moteur rend applicable peut faire naître une annexe. La fiche n'a
 * donc pas d'avis propre sur ce qui est dû.
 */
export function annexesDuRegistre(
  etablissementId: string,
  etats: readonly EtatPourAnnexe[],
  etab: EtablissementMatching,
): ContenuAilleurs {
  const base = `/etablissements/${etablissementId}`;
  const hrefEcran = `${base}/etats-permanents`;
  const parObligation = new Map(etats.map((e) => [e.obligationId, e]));

  const lignes = ANNEXES_DU_REGISTRE.flatMap((annexe) => {
    const etat = parObligation.get(annexe.obligationId);
    if (!etat) return [];
    if (annexe.seulementSi && !matchTypologie(annexe.seulementSi, etab).ok) {
      return [];
    }
    const declaration = etat.declareLe
      ? phraseDeclaration("etat", formaterDateCourteFr(etat.declareLe))
      : "Pas encore déclaré en place";
    const note = etat.note?.trim();
    return [
      {
        id: annexe.obligationId,
        titre: annexe.titre,
        meta: [annexe.article, declaration, note ? `« ${note} »` : null]
          .filter(Boolean)
          .join(" · "),
        href: `${hrefEcran}#${ancreEtatPermanent(annexe.obligationId)}`,
      },
    ];
  });

  return {
    lignes,
    source: { libelle: "« Ce qui doit être en place »", href: hrefEcran },
    vide: "Aucun écrit à annexer au registre ne vous est demandé par les lignes que Rojer suit. Les procès-verbaux de la commission de sécurité et les plans que vous y joignez se tiennent avec le registre, hors de l'outil.",
  };
}
