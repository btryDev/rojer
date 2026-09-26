// Les trois cas où l'art. R. 4121-2 impose de mettre à jour le document
// unique — dits au titulaire du dossier, sur son dossier.
//
// POURQUOI CE MODULE EXISTE. `evaluerEtatDuerp` (`lib/dashboard/duerp.ts`)
// répond à une question et une seule : « l'échéance annuelle est-elle
// dépassée ? ». C'est le 1° de l'article, et c'est le seul des trois qui se
// date. La page de synthèse n'affichait que lui : un dossier de quatre
// salariés dont la dernière version avait dix-neuf mois n'y lisait rien du
// tout, ce qui est exact au regard du 1° et trompeur au regard de l'article.
// Les 2° et 3° ne connaissent pas de seuil d'effectif — sous onze salariés,
// ce sont les SEULES règles de mise à jour, donc celles qui gouvernent la
// majeure partie de la cible du produit.
//
// Le sens de l'erreur était le mauvais : le dirigeant à qui l'outil ne disait
// rien était celui qui en avait le plus besoin.
//
// CE QUE CE MODULE NE FAIT PAS, ET NE DOIT PAS FAIRE. Il ne rend aucune date.
// Les 2° et 3° ne sont pas datables : aucune donnée du dossier ne dit quand un
// aménagement important survient, ni quand une information nouvelle est portée
// à la connaissance de l'employeur. En fabriquer une échéance produirait un
// rendez-vous que le texte n'écrit pas, sur un calendrier qui porte de vraies
// dates à côté. C'est un énoncé, pas un rendez-vous — et le champ `datable` le
// dit à l'appelant plutôt que de le laisser deviner.
//
// Il ne conclut pas non plus sur le droit. « Ce cas ne s'applique pas à votre
// effectif » restitue la condition écrite dans l'article ; ce n'est ni « vous
// êtes en règle » ni « vous n'avez rien à faire » — la phrase qui suit dit
// justement ce qui reste dû.
//
// Module **pur** : l'écran n'a plus qu'à le rendre dans l'ordre.

import { EFFECTIF_MAJ_ANNUELLE } from "@/lib/dashboard/duerp";
import {
  MAJ_DUERP_AMENAGEMENT_IMPORTANT,
  MAJ_DUERP_INFORMATION_NOUVELLE,
} from "@/lib/referentiels/conformite/organisation-prevention";

export type DeclencheurMaj = {
  /** Le rang dans l'article, tel qu'il s'y lit. */
  rang: "1°" | "2°" | "3°";
  /** Ce qui déclenche la mise à jour. */
  quand: string;
  /** Ce que cela veut dire pour CE dossier — effectif compris. */
  portee: string;
  /**
   * Le dossier peut poser une date sur ce déclencheur. Faux pour les 2° et
   * 3°, et c'est structurel : ils surviennent, ils ne s'échéancient pas.
   */
  datable: boolean;
  /** Ce déclencheur joue pour cet établissement. */
  applicable: boolean;
};

const salaries = (n: number) => `${n} salarié${n > 1 ? "s" : ""}`;

/**
 * La phrase de tête. Elle ne dépend pas de l'effectif : les trois cas sont
 * toujours énoncés, y compris celui qui ne s'applique pas. Ne montrer que les
 * cas applicables ferait de l'écran un résumé de la situation ; on veut qu'il
 * soit une lecture de l'article, où le dirigeant retrouve les trois et voit
 * lequel le concerne.
 */
export const CHAPEAU_MISE_A_JOUR =
  "L'art. R. 4121-2 fixe trois cas de mise à jour du document unique. Un seul " +
  "dépend de votre effectif. Les deux autres s'appliquent quel que soit le " +
  "nombre de salariés, et ne se planifient pas : ils surviennent.";

/**
 * La phrase de pied. Elle dit pourquoi deux des trois cas n'apparaissent
 * nulle part dans le calendrier — sans quoi leur absence se lirait comme leur
 * inexistence (charte, interdit 15 : le silence ne doit jamais ressembler à
 * une réponse).
 */
export const PIED_MISE_A_JOUR =
  "Les deux derniers cas n'ont pas de date : aucune échéance ne peut les " +
  "annoncer, et aucune n'est fabriquée ici. C'est à vous de rouvrir le " +
  "dossier quand ils surviennent, puis de valider une version en indiquant " +
  "le motif.";

/**
 * Les trois déclencheurs, dans l'ordre de l'article, quel que soit
 * l'effectif.
 */
export function declencheursMiseAJour(effectif: number): DeclencheurMaj[] {
  const soumisAnnuel = effectif >= EFFECTIF_MAJ_ANNUELLE;
  return [
    {
      rang: "1°",
      quand: "Au moins une fois par an",
      portee: soumisAnnuel
        ? `Vous déclarez ${salaries(effectif)} : ce cas s'applique. ` +
          "L'échéance court à partir de la date de votre dernière version " +
          "validée — c'est le seul des trois cas que ce dossier peut suivre."
        : `Vous déclarez ${salaries(effectif)} : ce cas ne s'applique pas, ` +
          `il vise les entreprises d'au moins ${EFFECTIF_MAJ_ANNUELLE} ` +
          "salariés. Aucune échéance annuelle n'est donc suivie ici — mais " +
          "les deux cas suivants, eux, restent dus.",
      datable: true,
      applicable: soumisAnnuel,
    },
    {
      rang: "2°",
      quand: MAJ_DUERP_AMENAGEMENT_IMPORTANT,
      portee:
        "Quel que soit l'effectif. Un nouveau poste, un nouvel équipement, " +
        "un changement de locaux ou d'organisation du travail. Rien dans ce " +
        "dossier ne peut le voir venir.",
      datable: false,
      applicable: true,
    },
    {
      rang: "3°",
      quand: MAJ_DUERP_INFORMATION_NOUVELLE,
      portee:
        "Quel que soit l'effectif. Un accident du travail, une maladie " +
        "professionnelle, un signalement de salarié, un résultat de mesure. " +
        "Rien dans ce dossier ne peut le savoir.",
      datable: false,
      applicable: true,
    },
  ];
}
