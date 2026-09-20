// La fraîcheur du calendrier, dite plutôt que réparée.
//
// LE DÉFAUT QU'ELLE FERME. Sur vingt-quatre points où le produit restitue un
// état de conformité, DEUX appellent `assurerCalendrierAJour` : le tableau de
// bord et la page calendrier. Les vingt-deux autres rendent ce que la base
// porte, sans rien dire de son âge — dont le ZIP remis à un contrôleur, les
// trois PDF qu'il contient, l'écran « Préparer un contrôle » qu'on ouvre devant
// lui, et les quatre outils du serveur MCP.
//
// Le pire cas n'est pas « périmé », c'est « jamais généré » : `listerVerifications`
// rend une liste vide, et l'écran en tire « À jour ». **Le silence est rendu
// comme une conformité**, à un lecteur qui n'a aucun moyen de le recouper.
//
// POURQUOI UN FAIT ET NON UNE GARDE. Poser `assurerCalendrierAJour` partout
// était la première idée ; `regeneration-sure.ts` l'interdit, et pour des
// raisons qui tiennent toujours : jamais dans un layout — Next rend le layout
// et la page EN PARALLÈLE, la page lirait les anciennes lignes pendant la
// régénération —, ni dans chaque page, où les lectures parallèles
// déclencheraient chacune la leur (revue du 2026-09-14). S'y ajoute qu'une
// route PDF ou un outil MCP n'a rien à faire d'une écriture : ce sont des
// lecteurs.
//
// Ce module ne régénère donc RIEN. Il lit un repère déjà posé et rend un état
// fermé, que l'appelant affiche. La réparation reste là où elle est : aux deux
// pages d'entrée, qui la font pour tout le monde.
//
// LE REPÈRE SUFFIT À TROIS CAS SUR QUATRE. `referentielVersionCalendrier`
// (`prisma/schema.prisma`) vaut le sceau du moteur qui a réconcilié pour la
// dernière fois. Il est vide à la création, effacé par `marquerCalendrierPerime`
// quand une régénération a échoué, et différent du sceau courant quand le
// référentiel ou le moteur ont bougé depuis. Ce que le vide ne dit pas, c'est
// LEQUEL des deux premiers cas on tient — et la différence compte pour
// l'utilisateur : « votre dossier n'a pas encore de calendrier » n'est pas
// « le calcul a échoué ». Le comptage des lignes tranche, et il ne coûte qu'un
// `count` : aucune ligne et aucun repère, c'est un dossier neuf.

// CE QUE CE MODULE NE COUVRE PAS, ET QU'IL NE FAUT PAS LUI FAIRE DIRE.
//
// Un calendrier À JOUR qui rend zéro ligne ne dit rien, par construction : ce
// module se tait sur `a_jour`. La contre-lecture du 2026-09-20 y a vu la
// prémisse du lot restée intacte — « une liste vide se lit comme rien à
// signaler » — pour le cas le plus fréquent en début de dossier.
//
// L'OBJECTION EST JUSTE SUR LE FAIT, ET LA CORRECTION N'EST PAS ICI. Zéro
// ligne sur un calendrier à jour est VRAI quand l'établissement a tout déclaré
// et n'a rien de périodique à suivre — un bureau sans aucun appareil est dans
// ce cas, et lui annoncer un doute serait un faux rouge. Ce qui manque est un
// AUTRE fait : « vous n'avez encore rien déclaré », qui ne se lit pas sur le
// sceau du calendrier mais sur l'inventaire. Les deux se ressemblent à
// l'écran et n'ont ni la même cause, ni le même geste de réparation : l'un se
// répare en ouvrant le tableau de bord, l'autre en déclarant ses équipements.
//
// Les fondre dans cette union rendrait la phrase fausse une fois sur deux, et
// c'est exactement la faute que l'union à quatre états corrige. Le manque est
// donc NOMMÉ ici et inscrit à `docs/chantiers-ouverts.md`, pas comblé de
// travers. `perimetre/couverture.ts` porte déjà l'axe qui l'accueillerait —
// il ne couvre aujourd'hui que « des équipements déclarés ne déclenchent
// rien », pas « rien n'est déclaré ».

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { SCEAU_CALENDRIER } from "./version-moteur";

/**
 * Ce qu'on sait de l'âge du calendrier d'un dossier.
 *
 * Union fermée, sur le patron de `EtatCharge` (`src/lib/batiments/etat-charge.ts`) :
 * un `switch` exhaustif casse à la compilation le jour où un cas s'ajoute, là
 * où un booléen « à jour ? » aurait forcé à ranger « jamais généré » avec l'un
 * des deux autres — c'est exactement l'amalgame qui a produit le défaut.
 */
export type FraicheurCalendrier =
  /** Aucune ligne, aucun repère : le dossier n'a jamais eu de calendrier.
   *  Une liste vide ne veut alors PAS dire « rien à faire ». */
  | { etat: "jamais_genere" }
  /** Le repère a été effacé par `marquerCalendrierPerime` : une régénération a
   *  échoué. Des lignes existent, elles peuvent être fausses. */
  | { etat: "echec_regeneration" }
  /** Le repère diffère du sceau courant : le référentiel ou le moteur ont
   *  changé depuis le dernier calcul. Les lignes sont celles d'avant. */
  | { etat: "perime"; sceauPose: string; sceauAttendu: string }
  /** Le repère vaut le sceau courant. */
  | { etat: "a_jour" };

/**
 * La DÉCISION, sans base ni session : deux faits entrent, un état sort.
 *
 * Elle est séparée de la lecture parce que le dépôt a DEUX disciplines de
 * portée, et qu'aucune ne peut servir l'autre. L'application lit sa portée
 * dans la session (`requireUser`, qui lit les cookies) ; le serveur MCP n'a ni
 * requête ni cookies et porte l'`etablissementId` dans chaque `where`
 * (`src/lib/mcp/queries.ts`). Faire dépendre la règle de l'une des deux la
 * rendait inutilisable de l'autre côté — le serveur MCP tombait sur
 * « `cookies` was called outside a request scope ». La règle ne connaît donc
 * ni l'une ni l'autre, et les deux lecteurs l'appellent.
 *
 * `nbLignes` n'est lu que lorsque le repère est absent : c'est le seul cas où
 * il départage un dossier neuf d'une régénération qui a échoué. Les appelants
 * ne le comptent donc pas d'avance — ils passent une fonction.
 */
export async function fraicheurDepuisRepere(
  repere: string | null | undefined,
  nbLignes: () => Promise<number>,
): Promise<FraicheurCalendrier> {
  if (repere === SCEAU_CALENDRIER) return { etat: "a_jour" };
  // `== null` ET NON `=== null`, et ce n'est pas du laxisme. Un `select`
  // partiel, un objet de test, une relation non chargée rendent `undefined` là
  // où la base rend `null` ; avec l'égalité stricte, `undefined` tombait dans
  // la branche finale et ressortait « périmé », avec un sceau posé valant
  // `undefined`. Relevé en branchant le serveur MCP : ses vingt-et-un tests
  // passaient au vert avec un avertissement de péremption en tête de chaque
  // réponse, qu'aucune assertion `toContain` ne voyait.
  if (repere == null) {
    return (await nbLignes()) === 0
      ? { etat: "jamais_genere" }
      : { etat: "echec_regeneration" };
  }
  return { etat: "perime", sceauPose: repere, sceauAttendu: SCEAU_CALENDRIER };
}

/**
 * Lit la fraîcheur du calendrier d'un établissement, **dans une session**.
 * N'écrit rien.
 *
 * Porte la garde de session et le filtre de tenancy, comme
 * `calendrierDesynchronise` dont elle reprend la lecture en la détaillant. Un
 * établissement qui n'appartient pas à l'utilisateur est traité comme absent —
 * et un dossier absent n'a pas de calendrier : `jamais_genere` est la réponse
 * la moins affirmative, celle qui ne fait pas passer un vide pour un état sain.
 *
 * Hors session (serveur MCP), voir `getFraicheurCalendrier`.
 */
export async function fraicheurCalendrier(
  etablissementId: string,
): Promise<FraicheurCalendrier> {
  const user = await requireUser();
  const etab = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    select: { referentielVersionCalendrier: true },
  });
  if (!etab) return { etat: "jamais_genere" };

  return fraicheurDepuisRepere(etab.referentielVersionCalendrier, () =>
    // Le comptage ne sert QUE sur cette branche, donc il n'est pas payé par
    // les dossiers sains — qui sont le cas courant.
    prisma.verification.count({ where: { etablissementId } }),
  );
}

/**
 * Vrai quand ce que le dossier montre ne peut pas être présenté comme un état
 * établi. Les trois cas non sains y tombent — c'est le prédicat que les
 * sorties utilisent pour décider d'AJOUTER une phrase, jamais pour masquer ce
 * qu'elles rendent : les lignes existantes restent vraies, c'est leur
 * complétude qui ne l'est pas.
 */
export function calendrierIncertain(f: FraicheurCalendrier): boolean {
  return f.etat !== "a_jour";
}

/**
 * La phrase à montrer, ou `null` si le calendrier est à jour.
 *
 * Elle dit CE QUI EST, jamais ce qu'il faut en conclure : aucun de ces états
 * n'est une non-conformité, et le produit ne qualifie rien en droit (ADR-025).
 * Le verbe est au constat, et chaque phrase nomme le geste qui la lève, parce
 * qu'un avertissement sans issue ne fait qu'inquiéter.
 */
export function phraseFraicheur(f: FraicheurCalendrier): string | null {
  switch (f.etat) {
    case "a_jour":
      return null;
    case "jamais_genere":
      return (
        "Le calendrier des vérifications n'a pas encore été calculé pour ce " +
        "dossier : ce qui suit ne recense aucune échéance, ce qui ne veut pas " +
        "dire qu'il n'y en a pas. Ouvrez le tableau de bord ou le calendrier " +
        "pour le calculer."
      );
    case "echec_regeneration":
      return (
        "Le dernier calcul du calendrier des vérifications n'a pas abouti : " +
        "les échéances ci-dessous peuvent être incomplètes ou dépassées. " +
        "Ouvrez le tableau de bord ou le calendrier pour le reprendre."
      );
    case "perime":
      return (
        "Le référentiel a évolué depuis le dernier calcul du calendrier : les " +
        "échéances ci-dessous sont celles d'avant cette évolution. Ouvrez le " +
        "tableau de bord ou le calendrier pour les recalculer."
      );
  }
}
