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

import {
  obligationsConformite,
  type Obligation,
  type ObligationPorteeParSalarie,
} from "@/lib/referentiels/conformite";
import {
  FAITS_ACTIVITE,
  intituleDuFait,
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
  /**
   * Les FORMATIONS que l'établissement organise pour les travailleurs exposés
   * au fait — gestes et postures (R. 4541-8), formation écran (R. 4542-16).
   * Ce ne sont pas des titres nominatifs : l'obligation est portée par
   * l'établissement et suivie dans « Ce qui doit être en place ». Elles
   * s'affichent quand même sur la fiche, parce qu'un salarié concerné doit les
   * recevoir et que ce qu'on ne voit pas ne sert à rien (la propriétaire, le
   * 2026-10-08).
   *
   * Dérivées du référentiel, jamais listées : les obligations du domaine
   * formation que le même fait conditionne (`typologies.activite`).
   */
  formations: Obligation[];
  /** Les autres fondements des mêmes titres, à dire quelle que soit la réponse. */
  autresFondements: string | null;
};

/** Les formations d'établissement qu'un fait d'activité conditionne. */
export function formationsDuFait(champ: ChampFaitActivite): Obligation[] {
  return obligationsConformite.filter(
    (o) => o.typologies.activite === champ && o.domaine === "formation_securite",
  );
}

/**
 * Les faits d'activité qui rendent dû au moins un titre ou une formation, avec
 * la réponse de l'établissement et les titres de la personne.
 */
export function titresDuDuerpPourUnePersonne(
  faits: ReponsesFaitsActivite,
  titres: readonly TitreLu[],
): QuestionDeLaFiche[] {
  return FAITS_ACTIVITE.filter(
    (f) => f.declencheTitres.length > 0 || formationsDuFait(f.champ).length > 0,
  ).map((f) => ({
    champ: f.champ,
    intitule: intituleDuFait(f),
    reponse: reponseDuFait(faits[f.champ]),
    formations: formationsDuFait(f.champ),
    autresFondements: f.autresFondements ?? null,
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
