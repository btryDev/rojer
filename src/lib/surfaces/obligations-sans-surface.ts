// Toute obligation atteint une surface, ou elle est inscrite ici — datée.
//
// POURQUOI CE MODULE EXISTE. Le 2026-09-04, dix des cent quarante-six
// obligations du référentiel n'atteignaient AUCUN écran. Elles portaient
// `periodicite: "autre"` — le générateur de calendrier les saute
// (`estSansRendezVous`) — et une nature que l'écran « Ce qui doit être en
// place » ne retient pas (`modeDeclaration` rend `null`). Elles existaient au
// référentiel, elles étaient exactes, elles étaient dépouillées, et le
// dirigeant ne les voyait jamais.
//
// Deux d'entre elles n'avaient rien à faire là, et la lecture l'a montré :
// `stockage-dangereux-fiches-donnees` était rangée `evenementielle` sur un
// alinéa qui appartient à l'obligation voisine ; elle est passée en
// `etat_permanent` le 2026-09-04 et a rejoint l'écran. Les huit autres sont
// légitimement sans surface — mais RIEN NE LE DISAIT, et rien n'empêchait une
// onzième de les rejoindre en silence. C'est ce silence que ce module retire.
//
// CE QUE CE MODULE FAIT. Il ne tient pas une liste d'obligations sans surface :
// il DÉRIVE cette liste des deux fonctions dont les surfaces se servent
// elles-mêmes — `estSansRendezVous`, que `calendrier/generateur.ts` appelle
// pour sauter une ligne, et `modeDeclaration`, que `etats-permanents/queries.ts`
// appelle pour en montrer une. Rien n'est recopié : le jour où une nature
// change, où une périodicité est posée, où une nouvelle surface est branchée sur
// une de ces deux règles, la dérivation suit sans qu'aucune ligne ne bouge ici.
//
// C'est le geste de `corpus/citations-ecran.ts` (dériver du corpus au lieu de
// recopier un article), de `perimetre/non-couverture.ts` (confronter la phrase
// au référentiel au lieu de la relire) et de `perimetre/porteurs-comptes.ts`
// (obtenir le périmètre d'un compteur en le faisant tourner). Ici, ce qui est
// dérivé n'est pas une phrase montrée au dirigeant : c'est la garantie qu'il
// n'existe pas d'obligation que personne ne lui montre et que personne ne sait.
//
// LE REGISTRE `SANS_SURFACE` EST L'AUTRE MOITIÉ, et il n'est pas une liste de
// dispense. Il est CONFRONTÉ dans les deux sens par `obligations-sans-surface.test.ts` :
//
//  - une obligation sans surface qui n'y figure pas fait échouer le test, en la
//    nommant — c'est la garde ;
//  - une inscription dont l'obligation a RETROUVÉ une surface fait échouer le
//    test aussi — c'est ce qui empêche le registre de survivre à sa raison
//    d'être, et ce qui le fait rétrécir ;
//  - une inscription qui nomme un id inexistant fait échouer le test — un
//    registre qui garde des fantômes cesse d'être lu.
//
// D'où « dérivée, datée, et qui ne peut que rétrécir » : la dérivation empêche
// la recopie, `inscriteLe` empêche la dette anonyme, et `PLAFOND_SANS_SURFACE`
// empêche l'ajout silencieux — une onzième obligation orpheline oblige à
// relever un nombre dont la ligne d'à côté dit qu'il ne se relève pas.
//
// CE QUE CE MODULE NE FAIT PAS. Il ne crée aucune surface, et il ne dit pas
// qu'une nature est juste. Une nature fausse qui atteint la mauvaise surface le
// traverse sans bruit : ce module ne mesure que l'ATTEINTE, jamais la justesse.
// La justesse repose sur la lecture du texte, et c'est la même limite que celle
// que l'ADR-026 écrit pour le champ `nature` lui-même.
//
// POURQUOI CE MODULE N'EST PAS DANS `src/lib/perimetre/`, où il aurait eu sa
// place par le sujet. Ce répertoire est balayé par `non-couverture-balayage.ts`
// comme un TEXTE DE COUVERTURE : toute `pieceAttendue` du référentiel qui y
// apparaît hors d'un `nonPorte()` ou d'un `porte()` fait échouer son test, et
// c'est la règle qui a fermé le défaut du 2026-09-03. Les motifs ci-dessous
// nomment des obligations et leurs pièces — ils y auraient levé une alerte à
// chaque inscription. Le choix était d'excepter ce fichier de ce balayage ou de
// le sortir du répertoire ; excepter un fichier d'une garde pour y ranger une
// autre garde est le geste qui vide les deux. Il vit donc ici, sous le nom de ce
// qu'il mesure : quelle surface une obligation atteint.
//
// SA SECONDE LIMITE EST LE DÉNOMINATEUR DES SURFACES. Il en connaît ~~deux~~
// TROIS depuis le 2026-09-21 (`faits`, ADR-037), parce
// que ce sont celles qui décident du sort d'une obligation à partir du
// référentiel seul. Le PDF du DUERP, le registre de sécurité et l'écran de
// périmètre en citent d'autres, mais ils affichent ce que ces deux-là ont
// produit, ou de la prose que `non-couverture.ts` couvre déjà. Une troisième
// surface qui trierait les obligations autrement devrait être branchée ici, et
// tant qu'elle ne l'est pas ce module sous-estime la couverture — il alerte
// donc trop, jamais trop peu, ce qui est le bon sens de l'erreur.

import {
  obligationsConformite,
  type Obligation,
} from "@/lib/referentiels/conformite";
import {
  estDeclencheeParUnFait,
  estSansRendezVous,
  modeDeclaration,
} from "@/lib/etats-permanents/regle";

/**
 * `faits` est entrée le 2026-09-21 (ADR-037), et elle RATTRAPE un angle mort de
 * ce module autant qu'elle ajoute une surface. Une obligation déclenchée par
 * un fait se montre sur la fiche de son sujet : celle du salarié
 * (`salaries/obligations-evenementielles.ts`) et celle de l'appareil
 * (`equipements/fiche.ts`) le faisaient déjà, et ce module ne savait pas les
 * compter — trois inscriptions de `SANS_SURFACE` disaient « aucune surface »
 * d'obligations qui en avaient une. Le troisième porteur n'avait pas de fiche ;
 * la page « Quand ça arrive » (`quand-ca-arrive/lignes.ts`) est la sienne.
 */
export const SURFACES = ["calendrier", "etats_permanents", "faits"] as const;

export type Surface = (typeof SURFACES)[number];

/**
 * Les surfaces que cette obligation atteint — obtenues des règles elles-mêmes.
 *
 * `estSansRendezVous` est la condition que `generateur.ts` évalue pour SAUTER
 * une ligne ; `modeDeclaration` est celle que `etats-permanents/queries.ts`
 * évalue pour en montrer une. Les appeler plutôt que les redire est tout
 * l'intérêt : une règle lue deux fois finit par diverger, et le jour où elle
 * diverge, cette garde certifie une couverture qui n'existe plus.
 *
 * La périodicité prise est celle du référentiel, sans surcharge de prescription
 * particulière (ADR-035). C'est le bon choix ici : une surcharge ne peut
 * qu'AJOUTER un rendez-vous à un dossier donné, donc qu'ajouter une surface. Ce
 * module mesure le plancher — ce que l'obligation atteint chez tout le monde.
 */
export function surfacesDe(o: Obligation): Surface[] {
  const atteintes: Surface[] = [];
  if (!estSansRendezVous(o.periodicite)) atteintes.push("calendrier");
  if (modeDeclaration(o) !== null) atteintes.push("etats_permanents");
  // Le MÊME prédicat que les trois fiches appellent — jamais sa paraphrase.
  if (estDeclencheeParUnFait(o)) atteintes.push("faits");
  return atteintes;
}

/** Les obligations qu'aucune surface ne montre, dérivées du référentiel. */
export function obligationsSansSurface(
  obligations: readonly Obligation[] = obligationsConformite,
): Obligation[] {
  return obligations.filter((o) => surfacesDe(o).length === 0);
}

/**
 * Ce qu'on sait d'une obligation sans surface, et depuis quand.
 *
 * `inscriteLe` n'est pas décoratif : sans date, une inscription devient un état
 * de fait dont personne ne sait s'il a trois jours ou six mois. Avec elle, la
 * question « celle-ci attend depuis quand ? » se pose sans ouvrir l'historique.
 */
export type InscriptionSansSurface = {
  /** Date ISO du jour où l'absence de surface a été constatée et acceptée. */
  inscriteLe: string;
  /**
   * Pourquoi elle n'atteint aucune surface, et à qui revient la décision.
   * Le motif dit la NATURE en cause et ce qui manque — jamais « à voir ».
   */
  motif: string;
};

/**
 * Le plafond du registre, et il ne se relève pas.
 *
 * Dix au constat du 2026-09-04, neuf après la correction de
 * `stockage-dangereux-fiches-donnees` le même jour. Le nombre est écrit à côté
 * du registre pour qu'un ajout coûte DEUX gestes visibles au lieu d'un : une
 * inscription datée, et la modification d'une constante dont cette phrase dit
 * qu'elle ne se modifie que vers le bas.
 *
 * Le desserrer serait exactement la rustine que ce module existe pour rendre
 * impossible : la limite ne corrige rien, elle nomme un état, et cet état est
 * censé se vider.
 */
// ~~9~~ → 3 le 2026-09-21 : les six obligations ÉVÉNEMENTIELLES ont une
// surface (ADR-037). Restent les trois PONCTUELLES, qui se SOLDENT et
// appellent un autre mécanisme — question Q2 de l'ADR, non tranchée.
export const PLAFOND_SANS_SURFACE = 3;

/**
 * Les obligations dont l'absence de surface est constatée, datée et assumée.
 *
 * **Ce n'est pas une liste de dispense.** Chaque entrée est confrontée au
 * référentiel dans les deux sens par le test : une obligation orpheline absente
 * d'ici fait échouer, une entrée dont l'obligation a retrouvé une surface fait
 * échouer aussi. Le registre ne peut donc ni oublier une ligne, ni en garder
 * une de trop.
 *
 * ~~Les huit qui restent après le 2026-09-04 partagent une cause et une seule :
 * les natures `evenementielle` et `ponctuelle` n'ont AUCUNE surface.~~
 * [2026-09-21 : l'événementielle en a une — la fiche de son sujet, et la page
 * « Quand ça arrive » pour l'établissement (ADR-037). Restent TROIS
 * inscriptions, toutes `ponctuelle` ; la suite de ce paragraphe vaut pour
 * elles seules.] L'ADR-022
 * nomme l'axe « événement » sans mécanisme, et l'écran « Ce qui doit être en
 * place » ne sert que `etat_permanent` et `echeance_recurrente` (ADR-026,
 * `etats-permanents/regle.ts`). Leur donner une surface est une décision de
 * conception, pas une correction ; ce registre la rend visible au lieu de la
 * laisser se perdre.
 */
export const SANS_SURFACE: Readonly<Record<string, InscriptionSansSurface>> = {
  "stockage-dangereux-declaration-icpe": {
    inscriteLe: "2026-09-04",
    motif:
      "Nature `ponctuelle` : la qualification ICPE est faite une fois, avant exploitation, et ne se refait qu'au changement des quantités stockées — fait que le produit n'observe pas. Aucune surface ne sert les obligations ponctuelles : l'écran des états permanents les écarte parce qu'une case cochée à vie y serait juste mais sans rappel de la pièce, et le calendrier n'a pas de rendez-vous à leur donner. Décision de conception, non tranchée.",
  },
  "formation-securite-salarie-designe-competent": {
    inscriteLe: "2026-09-04",
    motif:
      "Nature `ponctuelle` : aucun texte ne date le renouvellement de cette formation — `L. 2315-17` court sur quatre ans de mandat, qu'un salarié désigné ne détient pas. Elle est due une fois, à la désignation. Aucune surface ne sert les obligations ponctuelles.",
  },
  "secours-salarie-secouriste": {
    inscriteLe: "2026-09-04",
    motif:
      "Nature `ponctuelle` : le Code ne donne aucune durée de validité à la formation, le titre est acquis une fois. Aucune surface ne sert cette nature. Réserve portée par la ligne elle-même et non comblée : le départ du salarié formé rend l'obligation à nouveau due, et ce fait EST observable (`Salarie.actif`) sans que rien ne s'en serve — ce n'est pas un défaut de nature, c'est un rapprochement qui n'est pas fait.",
  },
};

/**
 * Les obligations sans surface que le registre n'inscrit pas.
 *
 * C'est la garde elle-même. Le paramètre existe pour qu'on puisse l'ÉPROUVER en
 * la cassant : le test lui passe le référentiel augmenté d'une obligation
 * orpheline fabriquée et vérifie qu'elle la nomme. Une garde qu'on ne peut pas
 * mettre en défaut sur commande est une décoration.
 */
export function orphelinesNonInscrites(
  obligations: readonly Obligation[] = obligationsConformite,
): string[] {
  return obligationsSansSurface(obligations)
    .map((o) => o.id)
    .filter((id) => !(id in SANS_SURFACE))
    .sort();
}

/**
 * Les inscriptions dont l'obligation atteint désormais une surface.
 *
 * C'est ce qui fait RÉTRÉCIR le registre au lieu de le laisser vieillir. Sans
 * cette moitié, une obligation corrigée garderait son inscription, et le
 * registre finirait par décrire un état qui n'existe plus — exactement le
 * défaut que `perimetre/non-couverture.ts` a été écrit pour retirer d'une page
 * de couverture.
 */
export function inscriptionsPerimees(
  obligations: readonly Obligation[] = obligationsConformite,
): string[] {
  const orphelines = new Set(obligationsSansSurface(obligations).map((o) => o.id));
  const vivantes = new Set(obligations.map((o) => o.id));
  return Object.keys(SANS_SURFACE)
    .filter((id) => vivantes.has(id) && !orphelines.has(id))
    .sort();
}

/** Les inscriptions qui nomment un id qu'aucune obligation ne porte. */
export function inscriptionsFantomes(
  obligations: readonly Obligation[] = obligationsConformite,
): string[] {
  const vivantes = new Set(obligations.map((o) => o.id));
  return Object.keys(SANS_SURFACE)
    .filter((id) => !vivantes.has(id))
    .sort();
}
