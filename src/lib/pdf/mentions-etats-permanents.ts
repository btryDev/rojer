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
import { comparerLignes } from "@/lib/etats-permanents/ordre";
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
  /**
   * Les états établis d'après les titres qui ne sont pas en place — lus par la
   * page de garde (`phraseIndetermines`), pour ne pas les dire « sans
   * déclaration » (2026-10-16).
   */
  nonEnPlaceParLesTitres: number;
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
function chapeau(auMoinsUnEcritAttendu: boolean, auMoinsUneParLesTitres = false): string {
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
  // Mesurée comme la suivante : seulement si une ligne l'est (2026-10-16).
  if (auMoinsUneParLesTitres) {
    phrases.push(
      "Une ligne « établie d'après les titres déclarés » ne se déclare pas : " +
        "son état se lit dans les titres nominatifs que l'employeur a déclarés " +
        "pour chaque personne, et dans leurs échéances. Elle ne porte donc pas " +
        "de date de déclaration.",
    );
  }
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
function compteur(enPlace: number, total: number, parLesTitres = 0): string | null {
  if (total === 0) return null;
  // Une part d'`enPlace` établie d'après les titres (2026-10-16) : l'employeur
  // ne l'a pas déclarée, « déclarés en place par l'employeur » serait faux.
  if (parLesTitres > 0) {
    const declares = enPlace - parLesTitres;
    const parTitres =
      parLesTitres === 1
        ? "1 établi d'après les titres qu'il a déclarés"
        : `${parLesTitres} établis d'après les titres qu'il a déclarés`;
    const detail =
      declares <= 0
        ? parTitres
        : `${declares === 1 ? "1 déclaré" : `${declares} déclarés`} par l'employeur, ${parTitres}`;
    if (total === 1) {
      return "Le seul état applicable à ce dossier est en place, établi d'après les titres que l'employeur a déclarés.";
    }
    if (enPlace === total) {
      return `Les ${total} états applicables sont tous en place : ${detail}.`;
    }
    if (enPlace === 1) {
      return `1 des ${total} états applicables est en place : ${detail}.`;
    }
    return `${enPlace} des ${total} états applicables sont en place : ${detail}.`;
  }
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
export function phraseIndetermines(
  indetermines: number,
  /**
   * La part établie d'après les titres déclarés (2026-10-16). Elle n'est pas
   * « sans déclaration, rien constaté » : aucun titre n'y est déclaré, ou
   * leurs échéances sont dépassées. Elle se dit à part.
   */
  parLesTitres = 0,
): string | null {
  const titres =
    parLesTitres <= 0
      ? null
      : parLesTitres === 1
        ? "Un état établi d'après les titres déclarés n'est pas en place : " +
          "aucun titre n'y est déclaré, ou leurs échéances sont dépassées. Il " +
          "empêche la note de conclure."
        : `${parLesTitres} états établis d'après les titres déclarés ne sont ` +
          "pas en place : aucun titre n'y est déclaré, ou leurs échéances sont " +
          "dépassées. Ils empêchent la note de conclure.";
  // Composée sans retouche de chaîne : chaque partie est une phrase entière,
  // et « Le détail figure plus loin. » n'est écrit qu'une fois, à la fin.
  const declares = phraseIndeterminesDeclares(indetermines - Math.max(parLesTitres, 0));
  const parties = [declares, titres].filter((p): p is string => p !== null);
  return parties.length === 0 ? null : `${parties.join(" ")} Le détail figure plus loin.`;
}

/** La part sans déclaration, sans la phrase de renvoi (ajoutée par l'appelant). */
function phraseIndeterminesDeclares(indetermines: number): string | null {
  if (indetermines <= 0) return null;
  if (indetermines === 1) {
    return (
      "Un état permanent ne porte pas encore de déclaration. Il ne pénalise " +
      "pas la note — l'outil n'a rien constaté à son sujet —, il l'empêche de " +
      "conclure."
    );
  }
  return (
    `${indetermines} états permanents ne portent pas encore de déclaration. ` +
    "Ils ne pénalisent pas la note — l'outil n'a rien constaté à leur sujet —, " +
    "ils l'empêchent de conclure."
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
  parLesTitres: { phraseSansNom: string } | null;
}): LigneEtatPermanentPdf {
  return {
    libelle: l.obligation.libelle,
    domaine: LABEL_DOMAINE[l.obligation.domaine],
    ecritAttendu: l.pieceAttendue,
    // Établie d'après les titres : la phrase le dit, jamais « déclaré en
    // place » (2026-10-16). Celle SANS NOM : ce document sort du produit
    // (`docs/rgpd.md` § 6) — l'écran nomme, le PDF date.
    declaration: l.parLesTitres
      ? l.parLesTitres.phraseSansNom
      : l.declareLe
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
 * **L'ordre est refait ici, par domaine** (décision de la propriétaire, du
 * 2026-10-17). L'écran range ses lignes par usage (`familles.ts`) ; le
 * document, lu par un tiers qui cherche un texte, garde l'ordre du
 * référentiel : les domaines par libellé, puis dans chacun l'ordre de
 * `comparerLignes` — celui de l'écran avant les familles, et qui ne lit pas
 * `declareLe`. Ce tri-là ne doit pas migrer vers `queries.ts`, qui n'en a plus
 * (`ordre.test.ts`).
 */
export function blocEtatsPermanents(
  d: EtatsPermanentsDuDossier,
): BlocEtatsPermanents {
  // Les lignes déclarées sous une question d'activité (`parLesRisques`,
  // 2026-10-21) quittent l'écran, pas le document : chacune y reprend sa
  // place selon son verbe.
  const etats = [
    ...d.familles.flatMap((f) => f.blocs.flatMap((b) => b.lignes)),
    ...d.parLesRisques.filter((l) => l.mode !== "fait"),
  ]
    .sort(
      (a, b) =>
        LABEL_DOMAINE[a.obligation.domaine].localeCompare(
          LABEL_DOMAINE[b.obligation.domaine],
          "fr",
        ) || comparerLignes(a, b),
    )
    .map(ligne);
  const faits = [...d.faits, ...d.parLesRisques.filter((l) => l.mode === "fait")].map(ligne);

  if (etats.length === 0 && faits.length === 0) {
    return {
      chapeau: null,
      compteur: null,
      etats: [],
      faits: [],
      noteFaits: null,
      // Le silence complet ne se distinguerait pas d'un sujet que le produit
      // ne traiterait pas. La phrase dit d'où vient l'absence, et de quand.
      nonEnPlaceParLesTitres: 0,
      vide:
        "Aucune obligation de ce type ne s'applique à cet établissement " +
        "d'après le référentiel de Rojer, à la date d'édition : celles qu'il " +
        "déclenche ont toutes une échéance et figurent au calendrier.",
    };
  }

  return {
    chapeau: chapeau(
      [...etats, ...faits].some((l) => l.ecritAttendu !== null),
      d.parLesTitres.total > 0,
    ),
    compteur: compteur(d.enPlace, d.total, d.parLesTitres.enPlace),
    nonEnPlaceParLesTitres: d.parLesTitres.total - d.parLesTitres.enPlace,
    etats,
    faits,
    // La phrase de l'écran, telle quelle : elle ne s'adresse à personne en
    // particulier, et elle porte déjà la distinction des deux verbes.
    noteFaits: phraseFaitsDates(d.faitsDates, d.faitsDatesRenseignes),
    vide: null,
  };
}
