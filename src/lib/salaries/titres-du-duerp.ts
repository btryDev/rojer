/**
 * Ce que l'évaluation des risques rend dû à une partie de l'effectif, lu
 * depuis la fiche d'une personne (ADR-038).
 *
 * L'ADR-023 § 1 bis tient toujours : le moteur ne DÉDUIT rien d'un porteur
 * salarié, ni d'un intitulé de poste. Ce module ne déduit pas davantage. Il
 * lit une DÉCLARATION — la réponse du dirigeant à une question transverse du
 * DUERP, rédigée avec les mots de l'article qui fonde le titre — et la porte
 * sur la fiche. Le DUERP dit « des salariés conduisent des engins » ; la fiche
 * demande « cette personne en fait-elle partie ? », et la réponse est le titre
 * déclaré. Un seul questionnaire : celui du document unique.
 *
 * Les trois réponses se montrent toutes :
 * - « oui » : les titres, avec ce que le dossier de la personne en porte ;
 * - « non » : la déclaration elle-même, pour qu'elle reste visible — et
 *   corrigeable — par qui la subit ;
 * - sans réponse, ou pas de DUERP : la question, et le chemin pour y répondre.
 *
 * Rien n'est daté et rien n'est en retard : le produit ne sait pas QUI est
 * concerné, il ne peut donc pas dire que quelqu'un l'est sans son titre.
 */

import type { ObligationPorteeParSalarie } from "@/lib/referentiels/conformite";
import type { QuestionDetection } from "@/lib/referentiels/types";
import {
  repondreAuxQuestionsTransverses,
  type QuestionTransverseRepondue,
  type ReponseTransverse,
} from "@/lib/transverses/etat";
import { titreParId } from "./catalogue";
import { OBLIGATION_EMPLOYEUR } from "./obligation-employeur";
import { dateDuDernierTitre, type TitreLu } from "./obligations-evenementielles";

export type TitreDuDuerp = {
  obligation: ObligationPorteeParSalarie;
  /**
   * Ce qui, en plus du fait de la question, conditionne le titre — « il
   * détient une autorisation de conduite » pour l'attestation médicale. Lu
   * dans `OBLIGATION_EMPLOYEUR`, jamais réécrit ici.
   */
  condition: string | null;
  /** `null` = rien de déclaré pour cette personne ; jamais « en retard ». */
  dernierTitreLe: Date | null;
};

export type QuestionDeLaFiche = {
  question: QuestionDetection;
  reponse: ReponseTransverse;
  titres: TitreDuDuerp[];
};

/**
 * Les questions transverses qui déclenchent au moins un titre, avec la
 * réponse du DUERP et les titres de la personne.
 *
 * `repondues` vaut `null` quand l'établissement n'a pas de DUERP : toutes les
 * questions sont alors sans réponse, et la fiche le dit au lieu de se taire.
 */
export function titresDuDuerpPourUnePersonne(
  repondues: readonly QuestionTransverseRepondue[] | null,
  titres: readonly TitreLu[],
): QuestionDeLaFiche[] {
  const lues = repondues ?? repondreAuxQuestionsTransverses([], null);
  return lues
    .filter(({ question }) => (question.declencheTitres ?? []).length > 0)
    .map(({ question, reponse }) => ({
      question,
      reponse,
      titres: (question.declencheTitres ?? []).flatMap((id) => {
        const obligation = titreParId(id);
        // Un identifiant mort est interdit au référentiel par
        // `titres-du-duerp.test.ts` ; le taire ici vaut mieux qu'une fiche
        // qui ne s'affiche plus.
        if (!obligation) return [];
        return [
          {
            obligation,
            condition: OBLIGATION_EMPLOYEUR[id]?.condition ?? null,
            dernierTitreLe: dateDuDernierTitre(titres, id),
          },
        ];
      }),
    }));
}
