/**
 * Ce que les faits d'activité de l'établissement rendent dû à une partie de
 * l'effectif, lu depuis la fiche d'une personne (ADR-038, ADR-041).
 *
 * L'ADR-023 § 1 bis tient toujours : le moteur ne DÉDUIT rien d'un porteur
 * salarié, ni d'un intitulé de poste. Ce module lit une DÉCLARATION — « des
 * travailleurs conduisent des engins » — posée une fois sur l'établissement,
 * depuis Équipe, la fiche ou le DUERP (`etablissements/faits-activite.ts`). La
 * fiche demande ensuite « cette personne en fait-elle partie ? », et la
 * réponse est le titre déclaré.
 *
 * Les trois réponses se montrent toutes :
 * - « oui » : les titres, avec ce que le dossier de la personne en porte ;
 * - « non » : la déclaration elle-même, visible et corrigeable par qui la subit ;
 * - sans réponse : la question, et le chemin pour y répondre.
 *
 * Rien n'est daté et rien n'est en retard : le produit ne sait pas QUI est
 * concerné, il ne peut donc pas dire que quelqu'un l'est sans son titre.
 */

import type { ObligationPorteeParSalarie } from "@/lib/referentiels/conformite";
import { questionsDetectionTransverses } from "@/lib/referentiels";
import {
  FAITS_ACTIVITE,
  type ChampFaitActivite,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";
import { reponseDuFait, type ReponseTransverse } from "@/lib/transverses/etat";
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
  champ: ChampFaitActivite;
  /** La question, telle que l'écran Équipe et le DUERP la posent. */
  intitule: string;
  reponse: ReponseTransverse;
  titres: TitreDuDuerp[];
};

/** L'intitulé d'un fait : celui de sa question transverse, sinon le sien. */
export function intituleDuFait(f: (typeof FAITS_ACTIVITE)[number]): string {
  const q = f.questionTransverse
    ? questionsDetectionTransverses.find((x) => x.id === f.questionTransverse)
    : undefined;
  const intitule = q?.intitule ?? f.question;
  if (!intitule) throw new Error(`Fait sans intitulé : ${f.champ}`);
  return intitule;
}

/**
 * Les faits d'activité qui déclenchent au moins un titre, avec la réponse de
 * l'établissement et les titres de la personne.
 */
export function titresDuDuerpPourUnePersonne(
  faits: ReponsesFaitsActivite,
  titres: readonly TitreLu[],
): QuestionDeLaFiche[] {
  return FAITS_ACTIVITE.filter((f) => f.declencheTitres.length > 0).map((f) => ({
    champ: f.champ,
    intitule: intituleDuFait(f),
    reponse: reponseDuFait(faits[f.champ]),
    titres: f.declencheTitres.flatMap((id) => {
      const obligation = titreParId(id);
      // Un identifiant mort est interdit au registre par
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
