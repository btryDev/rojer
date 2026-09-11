// Ce qu'un compteur compte vraiment — mesuré en le faisant tourner.
//
// POURQUOI CE MODULE EXISTE. Le 2026-09-03, quatre écrans annonçaient quatre
// nombres pour la même question, et l'un d'eux affirmait un périmètre qu'il
// n'avait pas. Le bandeau du parc écrivait « Les chiffres ci-dessus et les
// familles ci-dessous portent sur tout l'établissement » : la phrase avait été
// écrite pour lever l'ambiguïté du filtre par zone — et « tout l'établissement »
// y voulait dire « toutes les zones ». Elle se lisait « toutes vos
// obligations ». Or `repartirParEquipement` saute les lignes dont
// l'`equipementId` est nul, c'est-à-dire tout ce que porte l'établissement
// lui-même ou un salarié : mesuré à l'appel de `obligationsConformite`, le
// référentiel porte 145 obligations, dont 86 seulement naissent d'un
// équipement. Un écran d'équipements a raison de ne compter que des
// équipements ; ce qui était faux est ce qu'il en disait.
//
// CE QUE CE MODULE FAIT. Il donne à un écran le moyen de ne plus se tromper sur
// lui-même : au lieu de RECOPIER dans une phrase le périmètre qu'il croit avoir,
// il l'OBTIENT en passant une ligne par porteur à sa propre agrégation et en
// regardant lesquelles ressortent. La phrase est ensuite dérivée du résultat.
// Personne ne peut donc écrire « tout » au-dessus d'un compteur qui ne compte
// qu'une part : la phrase n'est pas écrite, elle est calculée.
//
// C'est le geste de `citations-ecran.ts` (dériver du corpus au lieu de recopier
// un article) et de `perimetre/non-couverture.ts` (confronter la phrase au
// référentiel au lieu de la relire) : ce qui est affirmé au dirigeant se
// rapproche mécaniquement de ce qui est vrai.
//
// LA SONDE MESURE UNE FONCTION, PAS UN ÉCRAN. C'est sa limite, et elle doit être
// connue : un compteur dont la restriction vit dans un `where` Prisma plutôt que
// dans une fonction pure n'est pas sondable ici, et sonder à côté rendrait un
// faux apaisement. Les deux agrégations sondées aujourd'hui — le bandeau du parc
// et la charge par zone — portent toutes deux leur exclusion en TypeScript,
// et c'est la condition pour être branché là-dessus.

import {
  obligationsConformite,
  porteurDe,
  type PorteurObligation,
} from "@/lib/referentiels/conformite";
import type { Periodicite } from "@/lib/referentiels/types-communs";

/**
 * Les porteurs que le référentiel produit **réellement**.
 *
 * Mesuré sur `obligationsConformite`, jamais énuméré : le jour où un porteur
 * cesse d'être servi par une seule obligation, la phrase des écrans cesse de le
 * nommer, sans qu'aucune ligne ne bouge ici. Et le jour où il en naît un
 * quatrième, `LIBELLE_PORTEUR` ne compile plus tant que personne ne lui a donné
 * un mot.
 */
export function porteursDuReferentiel(): Set<PorteurObligation> {
  return new Set(obligationsConformite.map(porteurDe));
}

/**
 * Comment nommer un porteur au dirigeant, dans une phrase.
 *
 * Enregistrement exhaustif, comme `FAMILLE_DE_TYPE` : un porteur de plus ne
 * compile pas tant qu'il n'a pas son mot. Les libellés se lisent après « au
 * titre de » — c'est la seule tournure où les trois tiennent ensemble.
 */
export const LIBELLE_PORTEUR: Record<PorteurObligation, string> = {
  equipement: "vos équipements",
  // « l'établissement » nu se confondait avec le périmètre géographique, que
  // la même phrase porte parfois. « lui-même » est ce qui les sépare.
  etablissement: "l'établissement lui-même",
  salarie: "vos salariés",
};

/**
 * L'ordre de lecture des porteurs dans une énumération.
 *
 * Pas l'ordre d'un `Set`, qui dépend de l'ordre du référentiel et changerait la
 * phrase au premier lot qui réordonne un import. Du plus concret au plus
 * abstrait, comme les écrans les rencontrent.
 */
export const ORDRE_PORTEURS: readonly PorteurObligation[] = [
  "equipement",
  "etablissement",
  "salarie",
];

/**
 * Une ligne de calendrier telle que les agrégations la reçoivent — réduite aux
 * champs dont elles décident.
 *
 * `equipementId` et `salarieId` sont les deux seuls faits qui disent le porteur
 * d'une ligne écrite (la contrainte `porteur_xor`, ADR-023 § 3) : c'est par eux
 * qu'une agrégation la garde ou la jette.
 */
export type LigneSondee = {
  equipementId: string | null;
  salarieId: string | null;
  libelleObligation: string;
  statut: string;
  datePrevue: Date;
  dateRealisee: Date | null;
  derniereRealisation: Date | null;
  periodicite: Periodicite;
};

/**
 * Une ligne **en retard** par porteur : la situation la plus simple où un
 * compteur doit compter. Non réalisée, datée d'hier, cyclique.
 *
 * Le retard plutôt qu'un état plus doux : c'est celui que les quatre écrans
 * annoncent, et le seul que toutes leurs agrégations rendent visible.
 */
export function sondes(now: Date): {
  porteur: PorteurObligation;
  ligne: LigneSondee;
}[] {
  const hier = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const commun = {
    libelleObligation: "Sonde de périmètre",
    statut: "planifiee",
    datePrevue: hier,
    dateRealisee: null,
    derniereRealisation: null,
    periodicite: "annuelle" as Periodicite,
  };
  return [
    {
      porteur: "equipement",
      ligne: { ...commun, equipementId: "sonde-equipement", salarieId: null },
    },
    {
      porteur: "etablissement",
      ligne: { ...commun, equipementId: null, salarieId: null },
    },
    {
      porteur: "salarie",
      ligne: { ...commun, equipementId: null, salarieId: "sonde-salarie" },
    },
  ];
}

/**
 * Les porteurs qu'une agrégation compte vraiment.
 *
 * On lui passe une ligne en retard, une seule, et on regarde si elle en rend
 * quelque chose. Aucune connaissance de son fonctionnement interne : c'est
 * exactement ce qui empêche la mesure de vieillir avec le code qu'elle mesure.
 *
 * `compter` doit rendre un nombre de lignes retenues — zéro quand l'agrégation
 * a jeté la sonde.
 */
export function porteursComptesPar(
  compter: (lignes: LigneSondee[]) => number,
  now: Date = new Date(),
): Set<PorteurObligation> {
  const comptes = new Set<PorteurObligation>();
  for (const { porteur, ligne } of sondes(now)) {
    if (compter([ligne]) > 0) comptes.add(porteur);
  }
  return comptes;
}

/**
 * Ce qu'un compteur laisse dehors, dans l'ordre de lecture.
 *
 * La différence entre ce que le référentiel porte et ce que le compteur retient.
 * Vide = le compteur couvre tout ce qui existe, et la phrase n'a rien à
 * restreindre.
 */
export function porteursHorsCompte(
  comptes: Set<PorteurObligation>,
  porteursServis: Set<PorteurObligation> = porteursDuReferentiel(),
): PorteurObligation[] {
  return ORDRE_PORTEURS.filter((p) => porteursServis.has(p) && !comptes.has(p));
}

/** « A », « A ou B », « A, B ou C ». */
function enumerer(morceaux: string[]): string {
  if (morceaux.length <= 1) return morceaux[0] ?? "";
  return `${morceaux.slice(0, -1).join(", ")} ou ${morceaux[morceaux.length - 1]}`;
}

/**
 * La même énumération après « au titre de », où la préposition se répète.
 *
 * « au titre de l'établissement lui-même ou vos salariés » se lit de travers :
 * en français la préposition revient devant chaque terme d'une coordination
 * dès qu'ils ne partagent pas le même déterminant. Une fonction plutôt qu'un
 * `join`, pour que le mot de liaison ne se réinvente pas à chaque phrase.
 */
function enumererApresDe(morceaux: string[]): string {
  if (morceaux.length === 0) return "";
  if (morceaux.length === 1) return `de ${morceaux[0]}`;
  const tetes = morceaux.slice(0, -1).map((m) => `de ${m}`);
  return `${tetes.join(", ")} ou de ${morceaux[morceaux.length - 1]}`;
}

/**
 * La phrase qui nomme ce qu'un compteur ne compte pas — ou `null` quand il ne
 * laisse rien dehors.
 *
 * `null` et non une phrase vide : un compteur complet n'a pas de réserve à
 * énoncer, et une phrase qui dirait « rien n'est laissé de côté » serait
 * l'affirmation de complétude que ce module existe pour empêcher d'écrire à la
 * main.
 */
export function phraseHorsCompte(absents: PorteurObligation[]): string | null {
  if (absents.length === 0) return null;
  return `Ce qui est dû au titre ${enumererApresDe(
    absents.map((p) => LIBELLE_PORTEUR[p]),
  )} n'y figure pas.`;
}

/**
 * Le périmètre géographique d'un compteur d'écran (ADR-019).
 *
 * `sansObjet` quand l'établissement n'a qu'une zone : il n'y a alors pas de
 * périmètre à annoncer, et le dire quand même ferait porter au mono-zone la
 * complexité du multi.
 */
export type PerimetreZone = "sansObjet" | "toutes" | "cette";

/**
 * La légende du bandeau du parc, dérivée de ses deux axes.
 *
 * Deux phrases, et pas un ternaire à quatre branches : les deux axes sont
 * indépendants — la zone est un réglage de l'écran, la restriction par porteur
 * est la définition de l'écran — et les fondre produisait des variantes
 * illisibles dont trois sur quatre n'auraient jamais été relues.
 *
 * La seconde est `null` quand il n'y a rien à restreindre : c'est le jour où le
 * parc comptera tout, et il n'aura alors plus rien à avouer.
 */
export function legendeParc({
  zone,
  comptes,
  porteursServis,
}: {
  zone: PerimetreZone;
  comptes: Set<PorteurObligation>;
  porteursServis?: Set<PorteurObligation>;
}): { perimetre: string; horsCompte: string | null } {
  const absents = porteursHorsCompte(comptes, porteursServis);
  // Le sujet de la phrase est ce que le compteur retient, nommé par les mêmes
  // libellés que ce qu'il écarte : les deux moitiés se lisent l'une contre
  // l'autre.
  const retenus = ORDRE_PORTEURS.filter((p) => comptes.has(p)).map(
    (p) => LIBELLE_PORTEUR[p],
  );
  // Un compteur qui ne retient rien ne se décrit pas par une liste vide : la
  // phrase change de forme plutôt que de perdre son sujet. Le cas n'arrive pas
  // en production, mais c'est celui qu'on obtient en cassant la garde, et une
  // garde qu'on casse doit rendre une phrase lisible.
  const perimetre =
    retenus.length === 0
      ? "Ces chiffres et les familles ci-dessous ne comptent rien."
      : zone === "cette"
        ? `Ces chiffres et les familles ci-dessous ne comptent que ce que portent ${enumerer(retenus)} de cette zone.`
        : zone === "toutes"
          ? `Ces chiffres et les familles ci-dessous ne comptent que ce que portent ${enumerer(retenus)}, dans toutes vos zones.`
          : `Ces chiffres et les familles ci-dessous ne comptent que ce que portent ${enumerer(retenus)}.`;
  return { perimetre, horsCompte: phraseHorsCompte(absents) };
}

/**
 * La légende de la plaque des zones, sur le tableau de bord.
 *
 * Elle a un voisin que le bandeau du parc n'a pas : le relevé « Dépassées »,
 * à un empan de là, qui compte TOUT. Le dirigeant a donc les deux nombres sous
 * les yeux en même temps — c'est le seul endroit du produit où l'écart se
 * constate sans naviguer, et donc le seul où il doit s'expliquer sur place.
 */
export function legendePlaqueZones({
  comptes,
  libelleReleveComplet,
  porteursServis,
}: {
  comptes: Set<PorteurObligation>;
  /** Le mot exact du relevé voisin, pour que le renvoi désigne ce qu'on voit. */
  libelleReleveComplet: string;
  porteursServis?: Set<PorteurObligation>;
}): string {
  const absents = porteursHorsCompte(comptes, porteursServis);
  const retenus = ORDRE_PORTEURS.filter((p) => comptes.has(p)).map(
    (p) => LIBELLE_PORTEUR[p],
  );
  const premiere =
    retenus.length === 0
      ? "Aucune zone ne compte quoi que ce soit."
      : `Chaque zone ne compte que ce qui est en retard sur ${enumerer(retenus)}.`;
  if (absents.length === 0) return premiere;
  return `${premiere} Ce qui est dû au titre ${enumererApresDe(
    absents.map((p) => LIBELLE_PORTEUR[p]),
  )} n'a pas de zone : c'est compté dans « ${libelleReleveComplet} ».`;
}
