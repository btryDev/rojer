/**
 * Ce qui n'a pas de rendez-vous, et qu'un écran doit pourtant montrer.
 *
 * L'ADR-022 nomme quatre natures d'obligation. La première — l'échéance
 * récurrente — a un écran depuis le début : le calendrier. Les trois autres
 * n'en avaient aucun, et le contrôle visuel du 2026-08-31 l'a mesuré : sur un
 * dossier né de l'onboarding, le moteur calculait dix-huit obligations et
 * l'application en affichait deux.
 *
 * Ce module tient la règle qui décide **quelles obligations relèvent de l'écran
 * « Ce qui doit être en place »**, et **sous quel verbe**. Il ne rend rien : la
 * garde tracée le 2026-08-31 après trois défauts nés de deux widgets jumeaux
 * dit « partage la règle, pas la mise en page ». C'est la règle, elle vit ici,
 * et le générateur de calendrier s'en sert aussi.
 *
 * Depuis le 2026-09-04 il tient une règle de plus, et le mot « quelles » du
 * paragraphe précédent devient donc « lesquelles vont où » : `estDeclenchee-
 * ParUnFait` nomme les obligations événementielles sans rendez-vous, celles
 * que cet écran-ci doit refuser et que la fiche de leur sujet doit prendre.
 * Elle est ici et non ailleurs pour une raison unique : `estSansRendezVous`
 * ne doit avoir qu'une seule lecture.
 *
 * ## Le critère n'est pas « pas de périodicité »
 *
 * Une première rédaction du brief dimensionnait cet écran sur les quarante-trois
 * obligations à `periodicite: "autre"`. Ce critère mélange quatre natures :
 * mesuré sur le référentiel du 2026-08-31, il rassemble 29 états permanents,
 * 4 échéances récurrentes à rythme inconnu, 7 événementielles et 3 ponctuelles.
 * Une case « déclaré en place » ment aux trois dernières familles — une
 * obligation événementielle redevient due au fait suivant, et rien dans le
 * produit n'observe ce fait.
 *
 * Le critère est donc la **nature**, et elle est un champ du référentiel depuis
 * l'ADR-026.
 *
 * ## Mais la nature seule ne suffit pas non plus
 *
 * `nature === "etat_permanent"` compte **cinquante** obligations au 2026-09-20
 * (~~quarante-huit au 2026-09-13, sur 154~~ : le lot chaleur intense en ajoute
 * deux) — remesuré en appelant `obligationsConformite`, jamais au grep, sur un
 * total de 156 qui concorde avec le préfixe de l'empreinte ; le « quarante-cinq » du
 * 2026-09-04 avait été dépassé par trois lots sans que la phrase bouge —, et l'une d'elles
 * produit bel et bien une ligne de calendrier : `porte-auto-portail-piete-coulissant`
 * est un état permanent porté par un équipement, avec
 * `periodicite: "mise_en_service_uniquement"` — que le générateur date de la
 * mise en service au lieu de la sauter. La retenir ici lui donnerait **deux
 * surfaces** : une ligne au calendrier et une case sur cet écran, deux états qui
 * divergeraient à la première correction. C'est exactement le défaut que la
 * journée du 2026-08-31 a passé à retirer.
 *
 * D'où `estSansRendezVous()` : la condition n'est pas « pas de périodicité »
 * mais **« le générateur n'en produit aucune ligne »**. Les deux se ressemblent
 * et ne coïncident pas.
 *
 * ## La périodicité effective, pas celle du référentiel
 *
 * `generateur.ts` lit la périodicité **après surcharge** d'une prescription
 * particulière (ADR-035) : un arrêté préfectoral peut donner un rythme à une
 * obligation qui n'en avait pas. Ce jour-là, l'obligation quitte cet écran pour
 * le calendrier — elle a un rendez-vous. La règle prend donc la périodicité
 * effective en paramètre plutôt que de la lire sur l'obligation.
 */

import type { ObligationApplicable } from "@/lib/matching";
import type { Obligation } from "../referentiels/conformite";
import type { Periodicite } from "../referentiels/types-communs";

/**
 * Le générateur produit-il une ligne de calendrier pour cette périodicité ?
 *
 * **Source unique de la règle**, appelée par `generateur.ts` et par cet écran.
 * Écrite ici plutôt que dupliquée des deux côtés : deux lectures d'une même
 * règle finissent par diverger, et le jour où elles divergent une obligation
 * apparaît aux deux endroits ou à aucun.
 *
 * `mise_en_service_uniquement` produit bien une ligne — le générateur la date de
 * la mise en service quand il la connaît. Seule `autre` n'en produit aucune.
 */
export function estSansRendezVous(periodicite: Periodicite): boolean {
  return periodicite === "autre";
}

/**
 * L'obligation se déclare-t-elle « en place » ?
 *
 * Un état à constituer puis à maintenir, dont le produit ne peut tenir aucune
 * date : soit il est là, soit il ne l'est pas.
 */
export function estEtatADeclarer(
  o: Obligation,
  periodiciteEffective: Periodicite = o.periodicite,
): boolean {
  return o.nature === "etat_permanent" && estSansRendezVous(periodiciteEffective);
}

/**
 * Les obligations que le texte fait revenir sans dire à quel rythme.
 *
 * Elles tiennent sur cet écran **sous un autre verbe** — « fait le », jamais
 * « en place ». Un fait daté vieillit ; un état ne vieillit pas. Et elles
 * n'entrent pas au compteur d'en-tête, qui porte une affirmation et non un
 * décompte : « 6 sur 12 en place » ne peut pas compter une obligation qui
 * reviendra.
 */
export function estFaitADater(
  o: Obligation,
  periodiciteEffective: Periodicite = o.periodicite,
): boolean {
  if (o.nature !== "echeance_recurrente") return false;
  if (!estSansRendezVous(periodiciteEffective)) return false;
  return !EXCLUES_DU_FAIT_DATE.has(o.id);
}

/**
 * Ce qui revient sans rythme écrit et que l'employeur ne déclenche pourtant
 * pas.
 *
 * `incendie-erp-5-visite-commission` : la visite périodique de la commission de
 * sécurité est **initiée par l'administration**. « En place » lui ment — elle
 * reviendra ; « fait le » aussi — ce n'est pas l'employeur qui la fait. Ce qui
 * se trace est la visite quand elle a eu lieu, et le registre de sécurité le
 * fait déjà. Deux surfaces pour un même acte, c'est ce qu'on évite.
 *
 * **Cette entrée est DORMANTE depuis le 2026-08-31 au soir, et elle reste.** La
 * relecture de `PE 37` a donné sa quinquennale à cette obligation : elle a
 * désormais un rendez-vous, donc `estSansRendezVous` la rejette avant même que
 * ce `Set` soit consulté. Le garde ne sert plus — aujourd'hui.
 *
 * Le retirer coûterait le jour où une périodicité serait retirée, ce qui est
 * arrivé à cette obligation même, deux fois en une semaine : `quinquennale` →
 * `autre` le 2026-08-26, puis retour le 2026-08-31. Un garde qu'on enlève parce
 * que les données du moment le rendent inatteignable est un garde qu'on perd.
 * Le test qui l'éprouve le fait donc sur un cas **fabriqué** — la même
 * obligation ramenée à `periodicite: "autre"` — plutôt que sur l'obligation
 * livrée, sans quoi il passerait au vert pour la mauvaise raison.
 */
const EXCLUES_DU_FAIT_DATE: ReadonlySet<string> = new Set([
  "incendie-erp-5-visite-commission",
]);

/**
 * Ce qu'un **fait** rend dû, et qu'aucun écran daté ne peut porter.
 *
 * Le pendant des deux prédicats ci-dessus, pour la troisième des quatre
 * natures. Il vit ici parce que c'est le module qui répartit les natures entre
 * les surfaces, et parce que `estSansRendezVous` ne doit exister qu'une fois :
 * une seconde lecture de « le générateur n'en produit aucune ligne », écrite
 * ailleurs, finirait par diverger de celle-ci.
 *
 * **Il n'entre PAS dans `modeDeclaration`, et c'est tout son intérêt.** Une
 * case « en place » ment à une obligation événementielle — elle redevient due
 * au fait suivant —, et « fait le » lui ment aussi : le fait qui la déclenche
 * n'est pas l'acte de l'employeur, c'est une embauche, un changement de poste,
 * une modification de circuit. Rien à cocher, donc, et rien à dater. Ce qui se
 * montre est l'obligation elle-même, **sur la fiche de son sujet** (ADR-022) :
 * la personne pour un porteur `salarie`, l'appareil pour un porteur
 * `equipement`. Les afficher ailleurs, c'était les afficher nulle part.
 */
export function estDeclencheeParUnFait(
  o: Obligation,
  periodiciteEffective: Periodicite = o.periodicite,
): boolean {
  return (
    o.nature === "evenementielle" && estSansRendezVous(periodiciteEffective)
  );
}

/** Le verbe sous lequel une ligne se déclare, et ce qu'il entraîne. */
export type ModeDeclaration =
  | {
      /** « Déclaré en place le … ». Entre au compteur d'en-tête. */
      mode: "etat";
      compteDansLEnTete: true;
    }
  | {
      /** « Fait le … ». N'entre pas au compteur : la ligne reviendra. */
      mode: "fait";
      compteDansLEnTete: false;
    };

/**
 * Le mode d'une obligation, ou `null` si elle n'a rien à faire sur cet écran.
 *
 * **Le mode n'est jamais persisté.** Il se déduit de la nature, qui vit au
 * référentiel : le stocker dupliquerait une règle qui existe déjà, et c'est la
 * seconde moitié de « partage la règle, pas la mise en page ». Une obligation
 * dont la nature change au prochain dépouillement change de verbe sans
 * migration.
 */
export function modeDeclaration(
  o: Obligation,
  periodiciteEffective: Periodicite = o.periodicite,
): ModeDeclaration | null {
  if (estEtatADeclarer(o, periodiciteEffective)) {
    return { mode: "etat", compteDansLEnTete: true };
  }
  if (estFaitADater(o, periodiciteEffective)) {
    return { mode: "fait", compteDansLEnTete: false };
  }
  return null;
}

/**
 * L'obligation figure-t-elle sur l'écran « Ce qui doit être en place » ?
 *
 * Écrite pour les liens qui y MÈNENT (2026-09-15) : la fiche équipement et la
 * fiche de vérification renvoyaient à cet écran des obligations qu'il ne liste
 * pas — une événementielle (« après modification »), une ponctuelle (la
 * déclaration ICPE), et tous les titres de salarié, que le moteur ne rend pas
 * à l'écran (ADR-023, `listerEtatsPermanents`). Même règle que l'écran : un
 * mode de déclaration, et un porteur qui n'est pas un salarié. Sans surcharge :
 * un lien n'est posé que sur une ligne sans rendez-vous, donc sans surcharge
 * en vigueur.
 */
export function figureSurLEcranEnPlace(o: Obligation): boolean {
  return modeSurLEcranEnPlace(o) !== null;
}

/**
 * Sous quel verbe l'écran la liste — « en place » ou « fait le » —, ou `null`.
 * PAR LE CODE DE L'ÉCRAN (`modeDeclarationApplique`), et non par une copie de
 * sa règle (relecture d'intégration, 2026-09-15). Le salarié est écarté en
 * amont, comme à l'écran : le moteur ne le rend pas.
 */
export function modeSurLEcranEnPlace(
  o: Obligation,
): ModeDeclaration["mode"] | null {
  if (o.porteur === "salarie") return null;
  return (
    modeDeclarationApplique({
      obligation: o,
      porteur: o.porteur ?? "equipement",
      equipementsConcernes: [],
      raisons: [],
    })?.mode ?? null
  );
}

/**
 * Le mode de déclaration d'une obligation **telle qu'elle s'applique à CE
 * dossier** — surcharge de prescription comprise.
 *
 * ## Pourquoi cette fonction existe, et pourquoi elle est ici
 *
 * `modeDeclaration` prend une périodicité en second argument et retombe sur
 * celle du référentiel quand on ne lui en donne pas. C'est commode, et c'est
 * un piège : l'écran calculait la périodicité effective avant d'appeler, la
 * garde de l'action ne le faisait pas. Deux lectures de la même règle, dont une
 * fausse.
 *
 * Le scénario, sans franchissement de compte : une prescription particulière
 * donne un rythme à une obligation `etat_permanent` restée en `autre`. Elle
 * quitte cet écran pour le calendrier — c'est ce que ce module documente. Mais
 * un POST forgé `declarerEnPlace(monEtabId, cetteObligationId)` passait la
 * garde et écrivait **une ligne que l'écran n'affichera jamais**. C'est la
 * double surface que le commentaire de l'action prétend empêcher, atteignable
 * par requête directe.
 *
 * La surcharge n'est pas un détail d'implémentation qu'on peut oublier : elle
 * fait partie de la règle. Elle est donc DANS la règle, et l'appelant ne peut
 * plus l'omettre par distraction — il n'a plus de second argument à ne pas
 * passer.
 */
export function modeDeclarationApplique(
  app: ObligationApplicable,
): ModeDeclaration | null {
  const o = app.obligation;
  // `surcharges` est indexé par équipement ; une obligation portée par
  // l'établissement n'en reçoit jamais, et la recherche rend alors `undefined`
  // — donc la périodicité du référentiel, ce qui est juste.
  const surcharge = app.equipementsConcernes
    .map((eq) => app.surcharges?.[eq.id])
    .find((s) => s !== undefined);
  return modeDeclaration(o, surcharge?.periodicite ?? o.periodicite);
}

/**
 * Ce que le produit demande **en plus** de la case, quand le texte attend un
 * écrit.
 *
 * L'écran ne collecte aucune pièce — c'est une décision du brief, et elle est
 * juste pour une affiche au mur ou de l'eau potable. Mais cocher « en place »
 * sur un registre de sécurité est une déclaration qui ressemble à une preuve.
 * `pieceAttendue` nomme l'écrit ; l'écran l'affiche pour que le dirigeant sache
 * ce qu'il affirme détenir. **Dix-huit** des quarante-sept lignes de cet écran en
 * portent un au 2026-09-04, remesuré en appelant `modeDeclaration` sur le
 * référentiel entier. La dix-huitième est `stockage-dangereux-fiches-donnees`,
 * entrée ce jour-là avec la correction de sa nature.
 */
export function pieceAttendue(o: Obligation): string | null {
  return o.pieceAttendue;
}
