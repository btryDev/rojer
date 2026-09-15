// Le vocabulaire d'état d'une échéance, et les champs qui le portent.
//
// Trois écrans le disent : la règle annuelle (barres), la ligne de la
// liste mensuelle (tuile-date) et la vue par équipement (cases de mois).
// Chacun l'avait redéclaré avec sa propre table de couleurs — trois
// copies d'une même règle, qui dérivent au premier ajustement. Un mois
// « à venir » rendu rose dans un seul des trois suffit à faire lire un
// futur comme un retard.
//
// La règle, tenue ici une fois : la couleur dit l'ÉTAT, jamais le volume.
//
// Le classement lui-même vit ici aussi, bâti sur les prédicats de
// `lib/dates/retard` — la page calendrier le redérivait à la main, et
// c'est le genre de doublon qui a déjà produit deux compteurs
// contradictoires sur le même écran.

import {
  estDansLesProchainsJours,
  estEnRetard,
  estVerificationAPlanifier,
  estVerificationArchivee,
  estVerificationEnRetard,
  estVerificationRealisee,
  type VerificationDatee,
} from "@/lib/dates/retard";
import { JOURS_HORIZON_PROCHE } from "@/lib/dates";
import { statutDepuisResultat } from "@/lib/rapports/schema";
// Type seul : effacé à la compilation, donc ce module reste utilisable côté
// client, comme le dit l'en-tête de `VerificationDatee`.
import type { StatutVerification } from "@prisma/client";

/**
 * Les quatre états qu'une occurrence datée peut prendre. Exclusifs entre
 * eux, et ordonnés par urgence décroissante dans `PRIORITE_ETAT`.
 *
 * `lointain` — planifié au-delà de l'horizon proche — et non « aVenir » :
 * `estVerificationAVenir` (lib/dates) désigne déjà l'inverse, une
 * échéance **dans** les 30 jours, et c'est elle qui nourrit la pilule
 * « sous 30 jours » de l'en-tête. Deux `aVenir` aux fenêtres opposées,
 * c'est le bug de la prochaine personne qui branche l'un sur l'autre.
 */
export type EtatEcheance = "enRetard" | "proche" | "lointain" | "faite";

/**
 * Ce que porte une ligne de liste : les quatre états, plus « à planifier ».
 *
 * `aPlanifier` n'est pas un cinquième état de la même famille — c'est
 * l'absence de date convenue. Il n'entre donc dans aucun graphique
 * (la date qu'il porte est une date de génération, pas un rendez-vous),
 * mais une ligne de liste doit bien l'afficher.
 */
export type RegistreLigne = EtatEcheance | "aPlanifier" | "archivee";

/**
 * Urgence relative, pour trancher quand une case ne peut porter qu'un
 * état — un mois qui mêle du retard et du lointain se lit rouge.
 */
export const PRIORITE_ETAT: Record<EtatEcheance, number> = {
  enRetard: 3,
  proche: 2,
  lointain: 1,
  faite: 0,
};

/**
 * Passerelle vers le vocabulaire de la fenêtre du board (`tone` des
 * `EvenementFenetre`) : trois tons là où le registre a cinq états. La
 * correspondance vivait en dur dans `listerEvenementsFenetre` — la tenir
 * ici, à côté du classement, empêche les deux vocabulaires de dériver.
 */
export const TON_REGISTRE: Record<RegistreLigne, "alerte" | "warn" | "ok"> = {
  enRetard: "alerte",
  aPlanifier: "warn",
  // Archivée : rien à signaler. Ni alerte — l'obligation ne s'applique plus —,
  // ni warn — il n'y a rien à planifier.
  archivee: "ok",
  proche: "ok",
  lointain: "ok",
  faite: "ok",
};

/** Champ (fond) de chaque état, en jetons du board. */
export const CHAMP_ETAT: Record<RegistreLigne, string> = {
  enRetard: "var(--board-signal)",
  proche: "var(--board-amber)",
  lointain: "var(--board-blue-soft)",
  faite: "var(--board-green)",
  aPlanifier: "var(--board-slate-pale)",
  // L'ardoise éteinte, comme « à planifier » : ni vert (ce serait
  // s'attribuer une conformité), ni rose (ce serait annoncer un retard sur
  // ce qui n'est plus dû).
  archivee: "var(--board-slate-pale)",
};

/** Encre lisible sur le champ correspondant. Jamais de blanc sur le rose. */
export const ENCRE_ETAT: Record<RegistreLigne, string> = {
  enRetard: "var(--board-signal-ink)",
  proche: "var(--board-amber-ink)",
  lointain: "var(--board-blue-ink)",
  faite: "var(--board-green-ink)",
  aPlanifier: "var(--board-slate-mid)",
  archivee: "var(--board-slate-mid)",
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LE MOT DE CHAQUE ÉTAT — UN SEUL, ET IL VIT ICI
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Le 2026-09-04, à un clic d'écart, le MÊME état s'écrivait de quatre façons :
 * « DÉPASSÉES » sur le relevé du hero, « à traiter » sur la pastille d'une
 * zone, « EN RETARD » sur le bandeau du parc, « 5 dépassées » sur la carte d'un
 * appareil. Aucune n'était fausse ; ensemble elles faisaient croire à quatre
 * mesures. Ce module tenait déjà la COULEUR de chaque état pour cette raison
 * exacte — « trois copies d'une même règle, qui dérivent au premier
 * ajustement ». Il ne tenait pas le MOT, et le mot a dérivé quatre fois.
 *
 * POURQUOI « DÉPASSÉE » ET PAS « À TRAITER » NI « EN RETARD ». « Dépassée » dit
 * un fait sur une date : elle est passée, et c'est vérifiable. « À traiter » est
 * une consigne, et elle vise plus large que l'état — une occurrence à planifier
 * est elle aussi à traiter, sans avoir dépassé quoi que ce soit ; le mot ne
 * pouvait donc pas nommer CET état-là sans en recouvrir un autre. « En retard »
 * se rapproche du jugement sur celui qui lit, quand le produit ne dit que des
 * faits datés. Le reste du produit disait d'ailleurs déjà « dépassée » dans la
 * moitié des cas — la vue par équipement, le brief, la page de vente.
 *
 * DEUX FORMES DU MÊME MOT, JAMAIS DEUX MOTS. Une pastille de zone n'a pas la
 * largeur d'un bandeau pleine page : c'est la forme COURTE qui l'y remplace,
 * pas un synonyme. `LIBELLE_ETAT_COURT` n'est donc pas un second vocabulaire —
 * c'est le même, abrégé, et la garde vérifie qu'aucun mot n'y nomme deux états.
 *
 * CE QUE CETTE TABLE NE COUVRE PAS, ET IL FAUT LE SAVOIR : un compteur qui
 * agrège DEUX états n'a pas de mot ici, et ne doit pas en emprunter un. La
 * carte d'un appareil comptait « N à venir » sur `proche` + `lointain` réunis
 * pendant que le bandeau du parc comptait « N sous 30 j » sur `proche` seul :
 * les deux mots se ressemblaient parce que les deux nombres ne comptaient pas
 * la même chose. Le remède est de séparer le compte, pas d'unifier le mot.
 *
 * SÉPARER LE COMPTE N'A PAS SUFFI, ET LE MOT RESTANT DISAIT ENCORE LE CONTRAIRE
 * (2026-09-04, seconde passe). Les comptes séparés, la carte d'un appareil
 * affichait « 2 sous 30 jours » et « 1 à venir » côte à côte — deux nombres
 * justes, et pourtant illisibles ensemble : « à venir » est le terme générique
 * qui CONTIENT « sous 30 jours », et rien ne disait au lecteur si le 1
 * s'ajoutait aux 2 ou les incluait. La table venait de se donner la règle « un
 * mot par état » ; elle l'avait respectée à la lettre — deux mots distincts —
 * en manquant ce qu'elle protégeait, car deux mots distincts dont l'un englobe
 * l'autre nomment toujours mal deux ensembles disjoints.
 *
 * `proche` et `lointain` PARTAGENT UNE BORNE : ils partitionnent l'avenir en
 * deux, de part et d'autre de `JOURS_HORIZON_PROCHE`. Leurs deux mots la
 * nomment donc tous les deux — « sous 30 jours » / « au-delà de 30 jours » —
 * et l'un ne peut plus se lire comme contenant l'autre : la disjonction est
 * dans les mots, pas seulement dans le calcul. C'est aussi pourquoi le nombre
 * n'y est plus écrit à la main : la borne affichée EST la constante, et
 * l'ancien « sous 30 jours » littéral serait devenu faux le jour où quelqu'un
 * aurait porté l'horizon à 45.
 *
 * Le type, lui, refusait déjà « aVenir » comme IDENTIFIANT de `lointain` (voir
 * `EtatEcheance`, qui explique pourquoi) — et l'affichait quand même comme
 * MOT. Les deux moitiés disent enfin la même chose.
 */
export const LIBELLE_ETAT: Record<
  RegistreLigne,
  { readonly un: string; readonly plusieurs: string }
> = {
  enRetard: { un: "dépassée", plusieurs: "dépassées" },
  proche: {
    un: `sous ${JOURS_HORIZON_PROCHE} jours`,
    plusieurs: `sous ${JOURS_HORIZON_PROCHE} jours`,
  },
  lointain: {
    un: `au-delà de ${JOURS_HORIZON_PROCHE} jours`,
    plusieurs: `au-delà de ${JOURS_HORIZON_PROCHE} jours`,
  },
  faite: { un: "faite", plusieurs: "faites" },
  aPlanifier: { un: "à planifier", plusieurs: "à planifier" },
  archivee: {
    un: "ne s'applique plus",
    plusieurs: "ne s'appliquent plus",
  },
};

/**
 * Le même mot, dans la largeur d'une pastille.
 *
 * Identique au pluriel long partout où celui-ci tient déjà : n'abrège que ce
 * qui déborde. Une entrée qui s'écarterait du mot long sans l'abréger serait un
 * second vocabulaire, et la garde la refuse.
 */
export const LIBELLE_ETAT_COURT: Record<RegistreLigne, string> = {
  enRetard: "dépassées",
  proche: `sous ${JOURS_HORIZON_PROCHE} j`,
  lointain: "au-delà",
  faite: "faites",
  aPlanifier: "à planif.",
  archivee: "sans objet",
};

/** « 1 dépassée », « 5 dépassées » — le compte et son mot, accordés. */
export function compteEtat(n: number, etat: RegistreLigne): string {
  const { un, plusieurs } = LIBELLE_ETAT[etat];
  return `${n} ${n > 1 ? plusieurs : un}`;
}

/**
 * Le mot court avec sa capitale — pour un relevé, ou pour une phrase qui cite
 * un relevé entre guillemets.
 *
 * Une fonction et non une sixième table : une variante capitalisée écrite à la
 * main serait exactement le second dictionnaire que ce module existe pour
 * empêcher, et elle survivrait au changement du mot d'origine.
 */
export function libelleEtatCourtCapitale(etat: RegistreLigne): string {
  const mot = LIBELLE_ETAT_COURT[etat];
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}

/**
 * Classe une date nue — une échéance qui n'a ni statut ni réalisation,
 * comme les attestations ou les travaux du plan d'actions.
 */
export function classerDate(
  date: Date,
  now: Date,
): Extract<EtatEcheance, "enRetard" | "proche" | "lointain"> {
  if (estEnRetard(date, now)) return "enRetard";
  return estDansLesProchainsJours(date, now, JOURS_HORIZON_PROCHE)
    ? "proche"
    : "lointain";
}

/**
 * L'état d'une échéance du registre des AUTRES modules (ADR-010) — attestation,
 * action, permis de feu, plan de prévention, DUERP, carnet sanitaire.
 *
 * LE RETARD SE LIT SUR SON TON, JAMAIS SUR SA DATE SEULE. Le ton porte déjà la
 * règle de sa source (`echeances.ts`). Reclassée sur la date, une opération EN
 * COURS — permis ou plan démarré, inspection faite, fin non échue — se
 * peignait « dépassée » parce que sa date de DÉBUT était passée : la règle du
 * calendrier annonçait « 10 dépassées » au-dessus de cartes qui en comptaient
 * 9, et la tuile du 12 septembre était rose sans pastille « En retard »
 * (contrôle visuel en production, 2026-09-14).
 *
 * Une date passée sans alerte n'est atteinte que par ces opérations : les
 * closes ne viennent pas au calendrier, et les autres sources passent en
 * alerte dès leur date dépassée. L'opération se classe alors sur ce qui reste
 * à tenir, sa FIN (`dateEnJeuAutre`) — et non « sous 30 jours » d'office : un
 * premier jet le faisait, et une opération démarrée depuis deux mois, finissant
 * dans six, s'annonçait « Dans 60 jours » et gonflait le « sous 30 j » de la
 * règle sans celui du tableau de bord (relecture, 2026-09-14).
 */
export function etatAutreEcheance(
  e: { date: Date; dateFin?: Date; tone: "alerte" | "ok" },
  now: Date,
): Extract<EtatEcheance, "enRetard" | "proche" | "lointain"> {
  if (e.tone === "alerte") return "enRetard";
  const enJeu = dateEnJeuAutre(e, now);
  // Sans fin connue, une date passée sans alerte n'a pas de chemin connu ;
  // si elle en trouvait un, elle ne se dirait pas « dépassée » pour autant.
  return estEnRetard(enJeu, now) ? "proche" : classerDate(enJeu, now);
}

/**
 * La date qu'une échéance hors vérification tient ENCORE : son début tant
 * qu'il est à venir ou en alerte, sa fin une fois l'opération démarrée sans
 * alerte. Lue partout où l'on classe, compte à rebours ou « sous 30 jours » —
 * la règle et la vue par équipement du calendrier, le « sous 30 j » du tableau
 * de bord —, pour qu'aucun des trois ne lise un début passé comme un retard.
 */
export function dateEnJeuAutre(
  e: { date: Date; dateFin?: Date; tone: "alerte" | "ok" },
  now: Date,
): Date {
  if (!e.dateFin || !estEnRetard(e.date, now)) return e.date;
  // Démarrée : la fin reste à tenir. En alerte, la fin n'est la date en jeu
  // que si c'est ELLE qui est dépassée — « Dépassée de 90 j » comptait le
  // début d'une opération dont la fin n'avait que cinq jours de retard. Une
  // alerte sur un début manqué, fin à venir, garde le début.
  if (e.tone === "ok" || estEnRetard(e.dateFin, now)) return e.dateFin;
  return e.date;
}

/**
 * `dateEnJeuAutre` pour un événement de grille ou de frise, dont le ton compte
 * aussi `warn` — celui d'une vérification, qui n'a pas de fin. Un adaptateur,
 * écrit une fois : la grille et la frise le recopiaient (relecture, 2026-09-15).
 */
export function dateEnJeuEvenement(
  e: { date: Date; dateFin?: Date; tone: "alerte" | "warn" | "ok" },
  now: Date,
): Date {
  return dateEnJeuAutre(
    {
      date: e.date,
      dateFin: e.dateFin,
      tone: e.tone === "alerte" ? "alerte" : "ok",
    },
    now,
  );
}

/**
 * La mention d'une échéance posée sur la FIN de son opération plutôt que sur
 * sa date : « Fin · … ». Elle se place EN TÊTE du texte qui accompagne la date,
 * jamais au bout : ces textes sont tronqués, et une tuile « 25 SEPT. » sans
 * elle se relit comme le début des travaux (relecture, 2026-09-15). Une
 * fonction et non un gabarit recopié : il l'était trois fois.
 */
export function avecMentionFin(texte: string, fin: boolean): string {
  return fin ? `Fin · ${texte}` : texte;
}

// `estStatutRealise` — « ce contrôle a eu lieu », le FAIT — vit dans
// `lib/dates/retard.ts` avec la liste des statuts réalisés : une seule
// définition, que les clauses SQL lisent aussi. Réexporté ici pour les
// surfaces qui classent déjà par ce module.
export { estStatutRealise } from "@/lib/dates/retard";

/**
 * Classe une vérification périodique. Même forme structurelle que les
 * prédicats de `lib/dates/retard` : utilisable côté client et en test,
 * sans `@prisma/client`.
 *
 * L'ordre des tests est celui de `retard.ts`, et il n'est pas négociable :
 * l'archivé, puis le réalisé — au sens d'`estVerificationRealisee` : un
 * statut réalisé ne purge que sur une obligation sans rendez-vous suivant —,
 * puis le retard, puis seulement « à planifier ». Une `a_planifier` dont la
 * date est passée est donc **en retard**, pas « à planifier » : le contrôle
 * n'a pas été fait dans les temps, rendez-vous pris ou non, et prétendre le
 * contraire minorerait la non-conformité. C'est la convention de
 * `estVerificationEnRetard`, de l'en-tête, du PDF et du serveur MCP — une
 * première version de ce classifieur court-circuitait `a_planifier` avant le
 * retard, et la page calendrier contredisait les trois autres surfaces.
 */
export function classerVerification(
  v: VerificationDatee,
  now: Date,
): RegistreLigne {
  // EN PREMIER, avant même le réalisé. Une ligne archivée ne réclame plus
  // rien : son obligation ne s'applique plus, on ne la garde que pour la
  // preuve qu'elle porte. Son statut, lui, reste gelé dans son dernier état
  // connu (ADR-012), si bien qu'une ligne gelée sur `depassee` se lisait
  // « en retard » à perpétuité — sur la fiche de la ligne, dans le serveur
  // MCP, et dans le registre de sécurité remis en contrôle.
  if (estVerificationArchivee(v)) return "archivee";
  if (estVerificationRealisee(v)) return "faite";
  if (estVerificationEnRetard(v, now)) return "enRetard";
  // Le prédicat, pas le statut brut : une lecture recopiée ici a déjà divergé
  // de lui une fois (retrait de `depassee`, phase A).
  if (estVerificationAPlanifier(v, now)) return "aPlanifier";
  return classerDate(v.datePrevue, now);
}

/**
 * Ce qu'une pastille PEINT : un statut stocké, ou « en retard ».
 *
 * Deux types et non un, depuis le retrait de `depassee` (2026-09-14). Le type
 * stocké (`StatutVerification`) servait aussi à peindre, si bien que la valeur
 * « dépassée » devait exister en base pour exister à l'écran — et le tampon
 * qui la posait était une seconde source du retard. Le retard est un ÉTAT du
 * jour, calculé sur la date : il n'a sa valeur qu'ici.
 */
export type StatutPeint = StatutVerification | "en_retard";

/**
 * Le statut à PEINDRE pour un état — une table, et une seule.
 *
 * Trois surfaces peignaient le statut STOCKÉ (le registre PDF, la ligne du
 * calendrier, la fiche de vérification) : « Conforme » à côté d'une tuile
 * rouge sur une rangée périodique gelée, « Planifiée » sur une ligne roulée
 * dont la date est passée. Le statut en base est un fait d'écriture, pas l'état
 * du jour ; la pastille dit l'état du jour (relecture du 2026-09-13).
 *
 *  · `archivee` — rien : le statut y est gelé, le fait « ne s'applique plus »
 *    se dit ailleurs ;
 *  · `enRetard` — « en retard », une valeur d'AFFICHAGE (`StatutPeint`) : le
 *    retard n'est pas un statut stocké depuis le retrait de `depassee` ;
 *  · `aPlanifier` — « à planifier » ;
 *  · `proche` / `lointain` — « planifiée » : un rendez-vous arrêté ;
 *  · `faite` — le statut de la ligne, qui porte alors le résultat.
 */
function statutDuRegistre(
  registre: RegistreLigne,
  statut: string,
): StatutPeint | undefined {
  switch (registre) {
    case "archivee":
      return undefined;
    case "enRetard":
      return "en_retard";
    case "aPlanifier":
      return "a_planifier";
    case "proche":
    case "lointain":
      return "planifiee";
    case "faite":
      return statut as StatutVerification;
  }
}

/**
 * Les cinq lignes aux échéances les plus proches, triées après projection.
 *
 * Le tri et la coupe se font sur la projection, et non en SQL : la borne ne
 * doit dépendre d'aucune lecture que la base ferait autrement que le code (un
 * `take` en base avait chassé une vraie échéance proche, relecture externe du
 * 2026-09-13).
 *
 * LES ÉCHÉANCES CONNUES D'ABORD, puis les lignes sans échéance pour compléter.
 * Triées sur `datePrevue` brute, les « à planifier » d'un dossier neuf, datées
 * de leur génération, occupaient les cinq places et cachaient les vraies
 * échéances du widget « Prochaines échéances » (2026-09-15). Leur retard reste
 * dit ailleurs — bloc « À faire », notes de la frise, compteurs.
 */
export function cinqProchaines<T extends VerificationDatee>(
  lignes: T[],
  now: Date,
): T[] {
  const connue = (l: T) => aUnRendezVous(l, now);
  return [...lignes]
    .sort((a, b) =>
      connue(a) !== connue(b)
        ? connue(a)
          ? -1
          : 1
        : a.datePrevue.getTime() - b.datePrevue.getTime(),
    )
    .slice(0, 5);
}

/** Le statut à peindre pour une ligne, à l'instant `now` — voir la table. */
export function statutAffiche(
  v: VerificationDatee,
  now: Date,
): StatutPeint | undefined {
  return statutDuRegistre(classerVerification(v, now), v.statut);
}

// `etatDuRendezVous` A DISPARU AU LOT N4 (ADR-034). Elle distinguait l'état
// d'une LIGNE de celui de sa DATE quand la première portait deux vies : « faite
// le 22/01/2026 » et « prochaine le 22/01/2027 » — sur une ligne classée faite
// ET cyclique, elle classait la date.
//
// LE N4 A D'ABORD PRÉTENDU qu'elle rendait « exactement `classerVerification` »
// parce qu'un statut réalisé ne subsisterait plus que sur une obligation sans
// rendez-vous suivant. C'était vrai des lignes écrites après le N2, et FAUX de
// toutes celles d'avant — la relecture l'a démontré en exécutant les deux sur
// la même rangée : « lointain » contre « faite ». Depuis les corrections du
// 2026-09-13, la règle qu'elle appliquait à la main vit dans
// `estVerificationRealisee` : sur une obligation périodique, la date décide.
// C'est SEULEMENT à cette condition que sa suppression est juste.
//
// Une ligne, une date, un état. Les appelants classent la ligne.

/**
 * La pastille à peindre à côté d'une LECTURE de calendrier.
 *
 * Deux lectures, deux réponses (ADR-034) :
 *  · `realisation` — le contrôle fait : il porte le RÉSULTAT de son rapport.
 *    Depuis que la ligne roule au dépôt, son statut est celui de l'échéance
 *    ouverte : une tuile verte « fait le 1er juin » affichait donc « En
 *    retard » dès que l'échéance suivante était passée ;
 *  · `courante` — l'échéance ouverte : le statut de l'état qu'elle PORTE
 *    (`statutDuRegistre`), plus le statut stocké. Sur une rangée périodique
 *    gelée, celui-ci disait « Conforme » à côté d'une tuile rouge.
 */
export function statutDeLaLecture(
  lecture: Pick<LectureCalendrier, "lecture" | "registre">,
  v: { statut: string; dernierResultat?: string | null },
): StatutPeint {
  if (lecture.lecture !== "realisation") {
    // `registre` d'une lecture n'est jamais `archivee` (voir le type) : la
    // table rend donc toujours un statut.
    return statutDuRegistre(lecture.registre, v.statut) as StatutPeint;
  }
  // Résultat inconnu : une ponctuelle consommée sans rapport (seed), dont le
  // statut porte lui-même le résultat.
  return (
    statutDepuisResultat(v.dernierResultat) ?? (v.statut as StatutVerification)
  );
}

/**
 * Les deux phrases d'une ligne sans échéance connue — deux, et pas cinq.
 *
 * La relecture du lot C en a compté cinq pour la même ligne : « aucune
 * vérification enregistrée », « à planifier », « aucune connue », « aucune
 * échéance connue », « sans date convenue ». Chacune vraie à peu près, aucune
 * identique : un dirigeant qui passe du PDF à l'écran croit lire deux faits.
 *
 *  · `LIBELLE_SANS_ECHEANCE` — là où une DATE s'afficherait ;
 *  · `LIBELLE_AUCUNE_VERIFICATION` — pour dire POURQUOI la ligne est en
 *    retard sans date. Vraie : une ligne « à planifier » ne porte aucun
 *    rapport réalisé (`statutCycleOuvert` la passe « planifiée » sinon), et
 *    un rapport « non vérifiable » atteste justement qu'aucun contrôle n'a eu
 *    lieu.
 */
export const LIBELLE_SANS_ECHEANCE = "Sans échéance connue";
export const LIBELLE_AUCUNE_VERIFICATION = "Aucune vérification enregistrée";

/**
 * La `datePrevue` de la ligne est-elle une ÉCHÉANCE CONNUE — et donc une date
 * qu'un écran peut montrer, poser sur un jour, ou décompter ?
 *
 * `datePrevue` est non nulle en base pour toute ligne. Sur une ligne
 * « à planifier », elle n'est pas une échéance : c'est la date de génération,
 * la mise en service d'un contrôle unique, ou l'échéance que la suppression
 * du dernier rapport a rendue sans savoir si elle était réelle. Lue comme un
 * rendez-vous, elle fait dire « échéance aujourd'hui » ou « en retard de 13 j »
 * sur l'âge du dossier.
 *
 * TOUTE surface qui affiche, place ou décompte une date de vérification passe
 * par ce prédicat — liste, barres et vue par équipement du calendrier, frise,
 * widgets, fiches, registre, PDF, assistant. Une ligne sans échéance reste EN
 * RETARD dans les comptes (`classerVerification`) ; elle n'occupe simplement
 * aucune date.
 */
export function aUnRendezVous(v: VerificationDatee, now: Date): boolean {
  // Une ligne archivée n'a pas de rendez-vous non plus : ce qu'elle porte est
  // un passé conservé, pas un engagement à venir.
  if (classerVerification(v, now) === "archivee") return false;
  // LE STATUT, ET NON LE CLASSEMENT. Il dit ce que la date EST : `a_planifier`
  // — aucune échéance connue, la date est celle de la génération ; tout le
  // reste — une échéance connue, passée ou non (retrait de `depassee`).
  //
  // Lue sur le classement, une ligne « à planifier » dont la date de
  // génération était passée se classait « en retard » et gagnait un
  // rendez-vous : six surfaces — cette fiche, le widget des échéances, la
  // fiche équipement, le registre, le PDF, l'assistant — annonçaient
  // « échéance le 01/09, en retard de 13 j » sur la date où la ligne avait
  // été créée, pendant que le calendrier et la carte du tableau de bord
  // disaient « à dater ». Relecture système du 2026-09-14. La ligne reste EN
  // RETARD — c'est un contrôle dû et jamais fait — ; elle n'a simplement pas
  // de date à montrer.
  return v.statut !== "a_planifier";
}

/**
 * Une lecture calendrier d'une ligne de suivi : un événement posable sur
 * un mois, avec son état.
 */
export type LectureCalendrier = {
  date: Date;
  /**
   * `archivee` en est exclu, et le type le dit plutôt que de le laisser
   * deviner : une lecture est un événement à POSER sur un calendrier, et une
   * ligne archivée n'en produit aucun — `lecturesCalendrier` rend une liste
   * vide. Sans cette exclusion, cinq écrans devraient traiter un cas qui ne
   * peut pas leur arriver.
   */
  registre: Exclude<RegistreLigne, "archivee">;
  /**
   * `courante` — l'échéance ouverte de la ligne, la seule qu'elle porte ;
   * `realisation` — le contrôle fait, lu sur son dernier rapport et posé au
   * jour où il a eu lieu.
   *
   * `prochaine` a disparu au N4 : il désignait « le rendez-vous suivant d'un
   * cycle soldé », c'est-à-dire la seconde vie d'une rangée qui n'en a plus
   * qu'une. Depuis que le dépôt fait rouler la ligne, son échéance ouverte EST
   * le rendez-vous suivant, et elle se lit `courante`.
   */
  lecture: "courante" | "realisation";
};

/**
 * Les lectures de calendrier d'une ligne de suivi : au plus deux.
 *
 * Une `Verification` est la ligne de suivi d'une obligation sur un porteur
 * (cf. generateur.ts), et elle ne porte que son échéance OUVERTE (ADR-034) :
 * le contrôle fait vit sur son dernier rapport. D'où deux lectures au plus —
 * le fait au jour du fait, l'échéance au jour de l'échéance, classée comme
 * n'importe quelle date, en retard si elle est passée.
 *
 * Un contrôle sans périodicité (mise en service, « autre ») n'a pas de
 * rendez-vous suivant : sa `datePrevue` est l'ancienne échéance, pas un
 * engagement, et il n'a que son fait à poser.
 */
export function lecturesCalendrier(
  v: VerificationDatee & {
    /**
     * La date du dernier rapport RÉALISÉ de la ligne (ADR-034), ou `null`.
     * **Requise** : depuis que la ligne roule au dépôt, c'est la seule source
     * du « fait le … » — la ligne ne porte plus que l'échéance ouverte. Un
     * lecteur qui l'omettrait ferait disparaître tous les contrôles faits de
     * son écran ; requise, l'oubli ne compile pas. Se lit avec
     * `derniereRealisation` ou `joindreDernieresRealisations`
     * (`lib/rapports/`).
     */
    derniereRealisation: Date | null;
  },
  now: Date,
): LectureCalendrier[] {
  // La réalisation connue : le dernier rapport réalisé, et lui seul (ADR-034,
  // N5 : la ligne ne porte plus de date de réalisation).
  const realisation = v.derniereRealisation;
  // Une ligne archivée n'annonce plus rien. Son statut est **gelé** dans son
  // dernier état connu (ADR-012 : l'enum Prisma n'a pas de valeur
  // `archivee`), donc un cycle soldé continuait d'en tirer un « prochain
  // rendez-vous » : l'appareil dont le désenfumage ne s'applique plus —
  // l'établissement a cessé d'être ERP — affichait « une vérification est
  // attendue dans 120 jours », et la ligne « Ne s'applique plus — » se
  // rangeait sous « À faire ». Le fait passé, lui, reste : c'est une preuve.
  // Le test d'archivage vit désormais dans `classerVerification`, avec les
  // autres. Il était ici, et il y était SEUL : les six autres surfaces qui
  // classent une ligne ne le faisaient pas, et le champ dont il dépend était
  // optionnel — donc silencieusement absent chez qui ne le sélectionnait pas.
  const classe = classerVerification(v, now);
  const archivee = classe === "archivee";

  // UNE LIGNE ARCHIVÉE GARDE SON FAIT PASSÉ, et lui seul. Sans réalisation,
  // elle n'a rien à montrer ; avec, ce qu'elle montre est une PREUVE, et une
  // preuve ne s'efface pas parce que l'obligation a cessé de s'appliquer.
  // C'est le seul point où l'archivage ne se contente pas de taire la ligne.
  if (archivee) {
    if (realisation === null) return [];
    return [{ date: realisation, registre: "faite", lecture: "realisation" }];
  }

  if (classe !== "faite") {
    // LE CAS GÉNÉRAL DEPUIS L'ADR-034 : la ligne roulée ne porte que son
    // échéance ouverte, classée comme telle — en retard si elle est passée,
    // ce que l'ancien modèle ne savait pas dire d'une ligne réalisée. Le
    // contrôle fait qui l'a ouverte se lit sur son rapport, et se pose au jour
    // où il a eu lieu.
    const courante: LectureCalendrier = {
      // L'échéance OUVERTE : `datePrevue`, et rien d'autre (N5).
      date: v.datePrevue,
      registre: classe,
      lecture: "courante",
    };
    return realisation === null
      ? [courante]
      : [
          { date: realisation, registre: "faite", lecture: "realisation" },
          courante,
        ];
  }

  // CLASSÉE « FAITE » : depuis le N3, cela ne peut plus vouloir dire qu'une
  // chose — une obligation SANS rendez-vous suivant, consommée. Elle n'a pas
  // d'échéance à annoncer, seulement son fait. La branche qui ajoutait ici un
  // « rendez-vous suivant » exigeait une périodicité cyclique, contradictoire
  // avec ce classement : elle est partie au N4 avec la lecture `prochaine`.
  return [
    { date: realisation ?? v.datePrevue, registre: "faite", lecture: "realisation" },
  ];
}
