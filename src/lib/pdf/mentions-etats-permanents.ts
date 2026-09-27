// Ce que le dossier remis à un tiers dit des états permanents déclarés.
//
// ## Le point que ce module tranche
//
// L'ADR-027 laissait une question ouverte, en toutes lettres : « Le ton devant
// un contrôle. Rien ne dit encore ce que devient une déclaration dans le
// dossier remis à un tiers. La décision 2 dit ce qu'elle **ne fait pas** ; ce
// qu'elle pourrait faire, nommée comme déclaration, reste ouvert. »
//
// Tant qu'elle est restée ouverte, le document n'a rien porté du tout : trente
// obligations sans échéance vivaient sur un seul écran, et un dirigeant qui
// avait passé ses douze états en revue ne pouvait le montrer à personne. C'est
// le silence que ce module retire.
//
// ## Ce qu'il imprime, et pourquoi les deux moitiés
//
// **Les lignes déclarées ET celles qui ne le sont pas.** N'imprimer que les
// premières ferait du document une sélection avantageuse : douze cases cochées
// sans rien dire des dix-huit autres. Le précédent est écrit dans le même
// dossier — le registre porte ses quarante-neuf fiches « y compris celles que
// l'application ne recueille pas », parce que « les taire au PDF ferait
// exactement ce que l'écran a cessé de faire : laisser croire le document
// complet » (`builders.ts`).
//
// ## Ce qui est plus difficile que la plomberie : le dire sans mentir
//
// Le lecteur n'est plus le dirigeant. Une ligne sans déclaration se lit
// « manquement » sous l'œil d'un contrôleur, là où l'écran la présente comme
// une question sans réponse ; et une ligne déclarée se lit « conforme », là où
// elle n'est qu'une affirmation de l'employeur que Rojer n'a pas vérifiée. Les
// deux lectures sont fausses, et elles sont fausses **en sens contraires** :
// une seule mise en garde, écrite pour l'une, laisserait l'autre intacte.
//
// Le chapeau porte donc les deux, et il est rendu **au-dessus du tableau**,
// jamais en pied de page : le contrôle visuel du 2026-08-31 a montré qu'une
// explication placée après la liste arrive une fois qu'on a fini de la lire.
//
// ## Ce qui n'est pas réécrit ici
//
// Le verbe de chaque ligne (« Déclaré en place le … » / « Fait le … ») et
// l'explication du second verbe viennent de `etats-permanents/phrases.ts`,
// c'est-à-dire des phrases mêmes que l'écran affiche. Les recopier au format
// document aurait donné deux rédactions d'une même chose, qui divergent à la
// première correction — et c'est précisément la question posée à ce lot : le
// ZIP et l'écran doivent-ils dire la même chose ? Ils la disent, littéralement.
//
// Seul le compteur est réécrit, et pour une raison qui se nomme : celui de
// l'écran dit « déclarés en place **par vous** ». Le destinataire change, le
// « vous » aussi — c'est la seule phrase de cet ensemble dont l'énonciation
// dépend du lecteur.
//
// Module **pur**.

import type { EtatsPermanentsDuDossier } from "@/lib/etats-permanents/queries";
import { phraseDeclaration, phraseFaitsDates } from "@/lib/etats-permanents/phrases";
import { LABEL_DOMAINE } from "@/lib/calendrier/labels";
import { formatDateCourte } from "./styles";

/**
 * Une ligne du tableau imprimé. **Contrat fermé à quatre champs**, et un test
 * le vérifie.
 *
 * `mentions-perimetre.ts` porte la même fermeture, et raconte ce qu'elle a
 * évité : une donnée de travail rédigée pour un relecteur interne remontée
 * jusqu'au document remis à un tiers. Ici la donnée qui ne doit pas passer est
 * la **note libre** de la déclaration — du texte écrit par un dirigeant sur sa
 * propre conformité, pour lui-même. Elle n'a pas été prévue pour être lue par
 * un inspecteur, et le contrat l'arrête sans qu'on ait à y repenser.
 */
export type LigneEtatPermanentPdf = {
  libelle: string;
  domaine: string;
  /** L'écrit que le texte attend, quand il en attend un. */
  ecritAttendu: string | null;
  /** Ce que l'employeur a déclaré, ou son absence. Jamais vide. */
  declaration: string;
  /**
   * Les phrases « à confirmer » que l'écran porte déjà (C45, M1), vide si
   * rien ne retient la ligne par prudence. Cinquième champ, ajouté le
   * 2026-09-27 : ces phrases sont calculées par le moteur, jamais écrites par
   * le dirigeant — la fermeture du contrat, qui arrête la note libre, tient.
   */
  aConfirmer: string[];
};

export type BlocEtatsPermanents = {
  /** Ce que le tableau est et n'est pas. `null` si rien ne s'applique. */
  chapeau: string | null;
  /** Le compte, sous la forme d'une phrase. `null` si aucun état applicable. */
  compteur: string | null;
  /** Les états à déclarer en place. */
  etats: LigneEtatPermanentPdf[];
  /** Ce qui revient sans rythme écrit — jamais mêlé aux états, ni au compte. */
  faits: LigneEtatPermanentPdf[];
  /** L'explication du second verbe, rendue à côté de ses lignes. */
  noteFaits: string | null;
  /** Ce qui s'écrit quand rien ne s'applique, et rien d'autre alors. */
  vide: string | null;
};

/**
 * Le chapeau, monté selon ce que le tableau contient réellement.
 *
 * La dernière phrase — celle des écrits attendus — n'apparaît que si une ligne
 * en nomme un. Écrite systématiquement, elle promettrait une colonne vide ;
 * elle est donc **mesurée**, comme le compteur, et pour la même raison : ce
 * dépôt s'est fait prendre par des phrases rédigées à la main sous des listes
 * qui se calculent, et qui vieillissent toutes seules.
 */
function chapeau(auMoinsUnEcritAttendu: boolean): string {
  const phrases = [
    "Ces obligations n'ont pas d'échéance : le texte demande un état à " +
      "constituer puis à maintenir, sans écrire à quel rythme le revoir. " +
      "Rojer ne peut donc pas les dater.",
    "Le tableau ci-dessous rapporte ce que l'employeur a déclaré dans " +
      "l'outil, et à quelle date il l'a déclaré. Une déclaration n'est ni " +
      "une vérification, ni une pièce justificative : Rojer l'enregistre, il " +
      "ne l'a pas constatée et ne l'atteste pas.",
    "Une ligne sans déclaration n'est pas un manquement constaté : c'est une " +
      "question à laquelle l'employeur n'a pas encore répondu dans l'outil.",
  ];
  if (auMoinsUnEcritAttendu) {
    phrases.push(
      "Quand le texte attend un écrit, il est nommé en regard. Rojer ne le " +
        "détient pas : la pièce est à demander à l'employeur.",
    );
  }
  return phrases.join(" ");
}

/**
 * Le compte, en toutes lettres, branche par branche.
 *
 * **Chaque branche est une phrase entière**, et ce n'est pas de la
 * verbosité : `etats-permanents/phrases.ts` porte la trace du défaut inverse —
 * une locution coupée par un ternaire s'était cassée au rendu (« Elles
 * n'entrepas dans le compte »), et une branche interpolée avait perdu son
 * accord parce qu'un nombre s'y insérait. Le sujet du verbe est ici `enPlace`,
 * pas `total` : « 1 des 12 états applicables **est** déclaré ».
 *
 * « déclarés en place par l'employeur », jamais « conformes » : le produit
 * assiste, il ne certifie pas (`CLAUDE.md`, règle 8).
 */
function compteur(enPlace: number, total: number): string | null {
  if (total === 0) return null;
  if (total === 1) {
    return enPlace === 1
      ? "Le seul état applicable à ce dossier est déclaré en place par l'employeur."
      : "Le seul état applicable à ce dossier ne porte aucune déclaration.";
  }
  if (enPlace === 0) {
    return `Aucun des ${total} états applicables ne porte de déclaration.`;
  }
  if (enPlace === total) {
    return `Les ${total} états applicables sont tous déclarés en place par l'employeur.`;
  }
  if (enPlace === 1) {
    return `1 des ${total} états applicables est déclaré en place par l'employeur.`;
  }
  return `${enPlace} des ${total} états applicables sont déclarés en place par l'employeur.`;
}

/**
 * Ce que la page de garde ajoute sous la note, quand le score ne conclut pas.
 *
 * `score.ts` rend `indetermines` à part de `valeur` « pour que l'interface le
 * dise à tous les niveaux » ; le document est une interface, et il ne le disait
 * pas. Sans cette phrase, la page de garde imprime « 100/100 · Reste à
 * renseigner » sans que rien n'explique ce qui reste.
 *
 * Elle ne renvoie pas au nom d'un écran, à la différence de la même phrase au
 * tableau de bord : le lecteur de ce document n'a pas accès à l'application.
 */
export function phraseIndetermines(indetermines: number): string | null {
  if (indetermines <= 0) return null;
  if (indetermines === 1) {
    return (
      "Un état permanent ne porte pas encore de déclaration. Il ne pénalise " +
      "pas la note — l'outil n'a rien constaté à son sujet —, il l'empêche de " +
      "conclure. Le détail figure plus loin."
    );
  }
  return (
    `${indetermines} états permanents ne portent pas encore de déclaration. ` +
    "Ils ne pénalisent pas la note — l'outil n'a rien constaté à leur sujet —, " +
    "ils l'empêchent de conclure. Le détail figure plus loin."
  );
}

/**
 * Ce que porte la case « Déclaration » quand il n'y a rien.
 *
 * Le mot change avec le verbe : un état se déclare, un fait se date. « Aucune
 * déclaration » sur une ligne « fait le » dirait que l'employeur n'a pas
 * affirmé un état — or il n'y a pas d'état à affirmer, seulement une date qui
 * manque.
 */
function sansDeclaration(mode: "etat" | "fait"): string {
  return mode === "etat" ? "Aucune déclaration" : "Aucune date";
}

function ligne(l: {
  obligation: { libelle: string; domaine: keyof typeof LABEL_DOMAINE };
  mode: "etat" | "fait";
  pieceAttendue: string | null;
  declareLe: Date | null;
  aConfirmer: string | null;
  questionsSansReponse: readonly string[];
}): LigneEtatPermanentPdf {
  return {
    libelle: l.obligation.libelle,
    domaine: LABEL_DOMAINE[l.obligation.domaine],
    ecritAttendu: l.pieceAttendue,
    declaration: l.declareLe
      ? phraseDeclaration(l.mode, formatDateCourte(l.declareLe))
      : sansDeclaration(l.mode),
    aConfirmer: [
      ...(l.aConfirmer ? [l.aConfirmer] : []),
      ...l.questionsSansReponse,
    ],
  };
}

/**
 * Le bloc à imprimer, prêt à rendre.
 *
 * **L'ordre n'est pas refait ici.** Il vient de `listerEtatsPermanents`, qui
 * range les domaines puis, dans chacun, ce qui n'est pas encore déclaré en
 * premier. Le retrier au format document donnerait un second classement à
 * maintenir, et le lecteur qui compare l'écran et le PDF verrait deux ordres
 * pour un même ensemble.
 */
export function blocEtatsPermanents(
  d: EtatsPermanentsDuDossier,
): BlocEtatsPermanents {
  const etats = d.groupes.flatMap((g) => g.lignes.map(ligne));
  const faits = d.faits.map(ligne);

  if (etats.length === 0 && faits.length === 0) {
    return {
      chapeau: null,
      compteur: null,
      etats: [],
      faits: [],
      noteFaits: null,
      // Le silence complet ne se distinguerait pas d'un sujet que le produit
      // ne traiterait pas. La phrase dit d'où vient l'absence, et de quand.
      vide:
        "Aucune obligation de ce type ne s'applique à cet établissement " +
        "d'après le référentiel de Rojer, à la date d'édition : celles qu'il " +
        "déclenche ont toutes une échéance et figurent au calendrier.",
    };
  }

  return {
    chapeau: chapeau([...etats, ...faits].some((l) => l.ecritAttendu !== null)),
    compteur: compteur(d.enPlace, d.total),
    etats,
    faits,
    // La phrase de l'écran, telle quelle : elle ne s'adresse à personne en
    // particulier, et elle porte déjà la distinction des deux verbes.
    noteFaits: phraseFaitsDates(d.faitsDates, d.faitsDatesRenseignes),
    vide: null,
  };
}
