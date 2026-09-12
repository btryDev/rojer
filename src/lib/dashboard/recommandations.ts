/**
 * Moteur de recommandations pour le tableau de bord (étape 9).
 *
 * Renvoie jusqu'à 5 actions à faire, triées par urgence réelle. Fonction
 * pure, pas d'accès DB, pas d'horloge implicite (horloge injectable).
 *
 * Règles de priorité :
 *   1. Vérifications en retard — la plus ancienne échéance d'abord
 *   2. Actions correctives en retard
 *   3. Vérifications planifiées dans les 7 jours
 *   4. Actions à venir sous 15 jours
 *   5. DUERP : première version à valider, ou mise à jour annuelle
 *   6. Amorçage : aucun équipement déclaré → « Déclarez vos équipements »
 *   7. Amorçage : équipements présents mais DUERP sans secteur choisi
 *      → « Ouvrez votre DUERP »
 *   8. Amorçage : vérifications planifiées mais aucun rapport déposé
 *      → « Déposez votre premier rapport »
 *   9. Transmission : un domaine d'obligation qu'aucun prestataire déclaré
 *      ne couvre (ADR-024)
 *  10. Transmission : une obligation qui suppose une personne nommée, alors
 *      qu'aucun titre n'est déclaré (ADR-024)
 *
 * Les huit premières règles sont fondées sur des DATES. Les deux dernières
 * sont fondées sur une **incohérence entre deux modules**, et c'est la
 * famille qui manquait à ce moteur : le produit savait faire naître une
 * obligation et ne savait jamais dire ce qu'elle exige ailleurs. Elles
 * héritent de la règle des amorçages — elles ne passent jamais devant une
 * urgence réelle.
 *
 * Les amorçages (6-8) sont des invitations neutres, jamais des alertes :
 * ils ne passent jamais devant une urgence réelle (priorités 1-5) et ne
 * s'affichent que sur un dossier en cours de mise en place.
 *
 * **Ce module ne définit plus ce qu'est un retard** : il applique les
 * prédicats canoniques de `@/lib/dates/retard` (ADR-011). Il en avait
 * inventé deux, tous les deux faux :
 *
 *  - une vérification `planifiee` dont la date était passée n'entrait dans
 *    aucune règle (la règle 1 ne regardait que `depassee` et `a_planifier`,
 *    la règle 3 excluait tout ce qui datait d'avant aujourd'hui). Or le
 *    statut `depassee` n'est écrit qu'à la génération du calendrier et
 *    n'est jamais réévalué : « planifiée puis oubliée » est l'état *normal*
 *    d'une vérification en retard. Le bandeau annonçait « deux échéances à
 *    traiter » et la file de travail ne proposait rien ;
 *  - une occurrence `a_planifier` datée du jour même était étiquetée
 *    « échéance dépassée » (comparaison `<= now`), alors que le reste du
 *    produit dit l'inverse : l'utilisateur a toute sa journée.
 *
 * Toutes les catégories contribuent à la liste ; le tri par priorité +
 * date (tie-breaker) fait remonter les items les plus urgents. Le total
 * est tronqué à 5 (paramétrable).
 */

import {
  estActionEnRetard,
  estActionOuverte,
  estDansLesProchainsJours,
  estVerificationAVenir,
  estVerificationEnRetard,
} from "@/lib/dates/retard";
import { ageEnMois, type EtatDuerp } from "./duerp";
import { TIERS_LUI_MEME_OBLIGATOIRE } from "@/lib/prestataires/domaines";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";

/** Fenêtre « ça arrive » pour une vérification déjà planifiée. Plus courte
 *  que l'horizon proche du produit (30 j) : la file de travail du board dit
 *  ce qu'il faut faire *cette semaine*. */
export const JOURS_VERIF_PROCHE = 7;
/** Même idée pour une action corrective, qui demande souvent un devis. */
export const JOURS_ACTION_PROCHE = 15;

export type Recommandation = {
  kind:
    | "verif_depassee"
    | "action_en_retard"
    | "verif_proche"
    | "action_proche"
    | "duerp_a_jour"
    | "amorce_equipements"
    | "amorce_duerp"
    | "amorce_rapport"
    | "transmission_prestataire"
    | "transmission_tiers_obligatoire"
    | "transmission_salarie";
  /**
   * L'identité de la recommandation — sa clé de rendu, et rien d'autre.
   *
   * Le tableau de bord employait `href` comme clé React. C'était juste tant
   * qu'une destination désignait une recommandation ; ça a cessé de l'être dès
   * que deux d'entre elles ont pu mener au même écran, ce qui est le cas
   * ordinaire des transmissions : TOUTES celles de domaine pointent l'annuaire
   * des prestataires, toutes celles de salarié pointent l'écran Équipe.
   *
   * React l'écrivait deux fois par chargement — « Encountered two children
   * with the same key » — sur un dossier qui comptait deux domaines sans
   * intervenant ; un autre en comptait quatre.
   *
   * ⚠ Ce n'est pas de la même nature qu'une clé absente. Une clé absente n'a
   * pas d'effet ; une clé en double en a un, et React le dit : des enfants
   * « dupliqués et/ou omis ». La liste est statique aujourd'hui et rien ne se
   * voit. Le jour où elle se réordonne, une des deux recommandations peut
   * disparaître SANS TRACE — un faux négatif muet, ce que l'ADR-022 existe
   * pour supprimer.
   *
   * `href` est une destination, pas une identité : plusieurs recommandations
   * mènent légitimement au même écran, et c'est même le but.
   */
  cle: string;
  titre: string;
  sousTitre?: string;
  href: string;
  /** Priorité numérique pour le tri (plus bas = plus urgent). */
  priorite: number;
  /** Date pertinente (datePrevue, echeance, ou lastMaj) pour l'affichage. */
  date?: Date;
};

export type EntreeRecos = {
  verifications: Array<{
    id: string;
    statut: "a_planifier" | "planifiee" | "depassee" | string;
    datePrevue: Date;
    /** COLONNE GELÉE (ADR-034) : plus écrite, et plus lue par aucun prédicat
     *  depuis le N3. Restée optionnelle le temps que ses porteurs la lâchent. */
    dateRealisee?: Date | null;
    /**
     * `null` = ligne ouverte (ADR-034). **Requis, à la différence de
     * `dateRealisee`**, et la différence est le tout de ce champ : une entrée
     * archivée que le moteur prendrait pour active produit une carte
     * « échéance dépassée » sur une obligation éteinte. Optionnel, il vaudrait
     * `null` par défaut — c'est-à-dire « pas archivée », le faux négatif muet
     * que l'ADR supprime. Requis, l'oubli ne compile pas.
     */
    archiveLe: Date | null;
    libelleObligation: string;
    equipementLibelle: string;
  }>;
  actions: Array<{
    id: string;
    statut: "ouverte" | "en_cours" | "levee" | "abandonnee" | string;
    echeance: Date | null;
    libelle: string;
  }>;
  /** État d'ancienneté du DUERP (cf. `./duerp`). Absent = pas de DUERP. */
  duerp?: EtatDuerp;
  etablissementId: string;
  /** DUERPs actifs : pour le lien "mettre à jour". */
  duerpId?: string;
  /** Nombre d'équipements déclarés (amorçage règle 6). */
  nbEquipements: number;
  /**
   * Le DUERP a un secteur choisi (`referentielSecteurId` non nul). Fait
   * observable fiable : l'existence d'un Duerp ne suffit pas, les pages
   * relais historiques en créaient silencieusement (amorçage règle 7).
   */
  duerpSecteurChoisi: boolean;
  /** Nombre de rapports de vérification déposés (amorçage règle 8). */
  nbRapports: number;
  /**
   * Les écarts entre deux déclarations de l'utilisateur (ADR-024, règles 9-10).
   *
   * Requis, comme `nbEquipements` et `duerpSecteurChoisi` : optionnel, un
   * appelant qui l'oublierait éteindrait la famille entière sans qu'aucun test
   * ne rougisse — le faux négatif muet que ce dépôt passe son temps à
   * supprimer.
   *
   * Le calcul n'est pas ici, et c'est délibéré : ce module est une fonction
   * pure de règles, sur des faits que l'appelant établit. Il en va de même de
   * `nbRapports`. Y faire entrer le rapprochement lui-même l'obligerait à
   * importer le référentiel et un enum Prisma, et il cesserait d'être testable
   * sans base.
   */
  transmissions: {
    /**
     * Domaines d'obligation applicables qu'aucun prestataire déclaré ne
     * couvre, avec leur nom lisible.
     */
    domainesSansPrestataire: Array<{ domaine: string; libelle: string }>;
    /**
     * Obligations applicables qui supposent une personne nommée, alors
     * qu'aucun titre n'est déclaré à l'équipe.
     */
    obligationsSupposantUnePersonne: Array<{ id: string; libelle: string }>;
  };
};

export type OptionsRecommandations = {
  /** Horloge injectable pour tests. */
  now?: Date;
  /** Limite totale d'items retournés (défaut 5). */
  limite?: number;
};

export function genererRecommandations(
  e: EntreeRecos,
  options: OptionsRecommandations = {},
): Recommandation[] {
  const now = options.now ?? new Date();
  const limite = options.limite ?? 5;

  const etab = e.etablissementId;
  const acc: Recommandation[] = [];

  // Les prédicats partagés raisonnent sur une occurrence complète : les
  // entrées qui ne portent pas `dateRealisee` sont, par construction de
  // l'appelant, des occurrences ouvertes. `archiveLe`, lui, n'a pas de repli —
  // il est requis à l'entrée, et arrive donc tel que l'appelant l'a lu.
  const verifs = e.verifications.map((v) => ({
    ...v,
    dateRealisee: v.dateRealisee ?? null,
  }));

  // 1. Vérifications en retard — quel que soit le statut porté en base
  //    (`depassee` n'est écrit qu'à la génération, il ne peut pas servir de
  //    seule preuve du retard).
  for (const v of verifs) {
    if (!estVerificationEnRetard(v, now)) continue;
    // Une occurrence restée `a_planifier` n'a jamais eu de rendez-vous : sa
    // `datePrevue` est la date de génération du calendrier. La transmettre
    // faisait afficher « dépassée depuis 107 j », où 107 mesurait l'âge du
    // dossier et non un retard réglementaire. Le fait est qu'aucune
    // vérification n'est enregistrée — on le dit, sans compter des jours
    // qui ne veulent rien dire.
    const jamaisPlanifiee = v.statut === "a_planifier";
    acc.push({
      kind: "verif_depassee",
      cle: `verif-depassee:${v.id}`,
      titre: v.libelleObligation,
      sousTitre: jamaisPlanifiee
        ? `${v.equipementLibelle} — aucune vérification enregistrée`
        : `${v.equipementLibelle} — échéance dépassée`,
      href: `/etablissements/${etab}/verifications/${v.id}`,
      priorite: 1,
      date: jamaisPlanifiee ? undefined : v.datePrevue,
    });
  }

  // 2. Actions en retard
  for (const a of e.actions) {
    if (!estActionEnRetard(a, now)) continue;
    acc.push({
      kind: "action_en_retard",
      cle: `action-en-retard:${a.id}`,
      titre: a.libelle,
      sousTitre: "Action corrective en retard",
      href: `/etablissements/${etab}/actions/${a.id}`,
      priorite: 2,
      date: a.echeance ?? undefined,
    });
  }

  // 3. Vérifications planifiées dans les 7 jours (aujourd'hui compris).
  for (const v of verifs) {
    if (!estVerificationAVenir(v, now, JOURS_VERIF_PROCHE)) continue;
    acc.push({
      kind: "verif_proche",
      cle: `verif-proche:${v.id}`,
      titre: v.libelleObligation,
      sousTitre: `${v.equipementLibelle} — dans les ${JOURS_VERIF_PROCHE} jours`,
      href: `/etablissements/${etab}/verifications/${v.id}`,
      priorite: 3,
      date: v.datePrevue,
    });
  }

  // 4. Actions à venir sous 15 jours. Disjoint de la règle 2 : une échéance
  //    passée est un retard, jamais un « à venir ».
  for (const a of e.actions) {
    if (!estActionOuverte(a)) continue;
    if (a.echeance === null) continue;
    if (!estDansLesProchainsJours(a.echeance, now, JOURS_ACTION_PROCHE)) continue;
    acc.push({
      kind: "action_proche",
      cle: `action-proche:${a.id}`,
      titre: a.libelle,
      sousTitre: `Action à réaliser sous ${JOURS_ACTION_PROCHE} jours`,
      href: `/etablissements/${etab}/actions/${a.id}`,
      priorite: 4,
      date: a.echeance,
    });
  }

  // 5. DUERP — deux situations distinctes, deux libellés distincts. Dire
  //    « à mettre à jour » d'un document dont aucune version n'a jamais été
  //    validée décrit une réalité qui n'existe pas.
  const duerp = e.duerp;
  if (duerp?.ouvert && e.duerpId) {
    const href = `/duerp/${e.duerpId}`;
    if (duerp.jamaisValide) {
      acc.push({
        kind: "duerp_a_jour",
        cle: "duerp:jamais-valide",
        titre: "Validez la première version de votre DUERP",
        sousTitre: "Aucune version n'a encore été figée",
        href,
        priorite: 5,
      });
    } else if (duerp.majEchue) {
      acc.push({
        kind: "duerp_a_jour",
        cle: "duerp:maj-echue",
        titre: "DUERP à mettre à jour",
        sousTitre: `Dernière version il y a ${ageEnMois(duerp.ageJours ?? 0)} mois`,
        href,
        priorite: 5,
        date: duerp.dateLimiteMaj ?? undefined,
      });
    } else if (duerp.rappelMajProche) {
      acc.push({
        kind: "duerp_a_jour",
        cle: "duerp:rappel-maj",
        titre: "DUERP à mettre à jour",
        sousTitre: "Mise à jour annuelle à prévoir",
        href,
        priorite: 5,
        date: duerp.dateLimiteMaj ?? undefined,
      });
    }
  }

  // 6-8. Amorçage — invitations neutres pour un dossier en mise en place.
  if (e.nbEquipements === 0) {
    acc.push({
      kind: "amorce_equipements",
      cle: "amorce:equipements",
      titre: "Déclarez vos équipements",
      sousTitre:
        "Le point de départ : ils déterminent vos vérifications obligatoires",
      href: `/etablissements/${etab}/equipements`,
      priorite: 6,
    });
  }
  if (e.nbEquipements > 0 && !e.duerpSecteurChoisi) {
    acc.push({
      kind: "amorce_duerp",
      cle: "amorce:duerp",
      titre: "Ouvrez votre DUERP",
      sousTitre: "L'évaluation des risques, guidée unité par unité",
      href: `/etablissements/${etab}/duerp`,
      priorite: 7,
    });
  }
  if (e.verifications.length > 0 && e.nbRapports === 0) {
    acc.push({
      kind: "amorce_rapport",
      cle: "amorce:rapport",
      titre: "Déposez votre premier rapport",
      sousTitre: "Chaque rapport reçu rejoint votre registre de sécurité",
      href: `/etablissements/${etab}/calendrier`,
      priorite: 8,
    });
  }

  // 9-10. Transmissions (ADR-024) — un écart entre deux déclarations de
  //       l'utilisateur, pas une date. C'est la seule famille de ce moteur qui
  //       ne soit pas fondée sur le temps, et c'est ce qui lui manquait : le
  //       produit savait faire naître une obligation, et jamais dire ce
  //       qu'elle exige ailleurs.
  //
  //       Priorités 9 et 10, donc DERRIÈRE les amorçages. Une transmission ne
  //       passe jamais devant une urgence réelle : un retard réglementaire est
  //       un fait, une transmission est une question.
  //
  //       Registre de la phrase : on nomme un écart, on ne porte aucun
  //       jugement. Ni « vous êtes en faute », ni « vous devez signer avec
  //       quelqu'un ». Le dirigeant a très probablement le prestataire et ne
  //       l'a pas saisi — c'est même le cas le plus probable, et la formule
  //       doit le permettre.
  //       « INTERVENANT » ET NON « PRESTATAIRE », depuis le 2026-08-31.
  //
  //       Cette règle a servi dix domaines techniques, où « prestataire » allait
  //       de soi : on choisit un organisme agréé, on le paie, on peut en
  //       changer. Le domaine « santé au travail » l'a fait sortir de son
  //       assiette. L'écran affichait « Aucun prestataire déclaré en santé au
  //       travail » là où l'obligation visée est l'ADHÉSION À UN SERVICE DE
  //       PRÉVENTION ET DE SANTÉ AU TRAVAIL — laquelle n'est pas un
  //       fournisseur qu'on retient, mais une obligation légale de l'employeur
  //       (`L. 4622-1`). Un dirigeant ne reconnaît pas son obligation sous ce
  //       mot-là.
  //
  //       Une seule phrase porte les deux cas, et c'est délibéré plutôt que
  //       faute de mieux : ce que la règle constate est identique dans les deux
  //       situations — une obligation suppose un tiers, l'annuaire n'en déclare
  //       aucun pour ce domaine. « Intervenant » dit cela sans rien présumer du
  //       lien : il vaut pour l'organisme agréé qui vient vérifier comme pour le
  //       service de santé auquel on adhère, et il n'implique ni choix, ni
  //       contrat, ni facture.
  //
  //       Ce que la phrase continue de NE PAS dire, et qui vaut pour les deux :
  //       que le dirigeant est en faute. La règle ne sait pas distinguer « il en
  //       a un et ne l'a pas saisi » — le cas le plus probable — de « il n'en a
  //       pas ». Le lien mène toujours à l'annuaire, dont c'est le nom.
  for (const d of e.transmissions.domainesSansPrestataire) {
    const du = TIERS_LUI_MEME_OBLIGATOIRE[d.domaine as DomaineObligation];
    acc.push(
      du
        ? {
            kind: "transmission_tiers_obligatoire",
            cle: `transmission-domaine:${d.domaine}`,
            titre: du.titre,
            sousTitre: du.sousTitre,
            href: `/etablissements/${etab}/prestataires`,
            // Un cran devant la transmission ordinaire : celle-ci peut
            // signaler une obligation non remplie, l'autre une saisie
            // manquante. Toujours derrière les retards constatés, qui sont
            // des faits.
            priorite: 8.5,
          }
        : {
            kind: "transmission_prestataire",
            cle: `transmission-domaine:${d.domaine}`,
            titre: `Aucun intervenant déclaré en ${d.libelle.toLowerCase()}`,
            sousTitre:
              "Une de vos obligations suppose un tiers qualifié — s'il intervient déjà chez vous, il reste à l'inscrire",
            href: `/etablissements/${etab}/prestataires`,
            priorite: 9,
          },
    );
  }
  for (const o of e.transmissions.obligationsSupposantUnePersonne) {
    acc.push({
      kind: "transmission_salarie",
      cle: `transmission-salarie:${o.id}`,
      titre: o.libelle,
      // « suppose » et pas « exige » : l'outil ne sait pas qui, dans
      // l'effectif, opère sur quoi — le dériver serait un faux positif de
      // masse (ADR-023).
      //
      // « un titre » et non « une personne » : ce qui manque est la
      // déclaration d'un TITRE, pas celle d'un salarié. Un employeur qui a
      // saisi douze personnes et zéro titre lisait « aucune n'est déclarée »
      // et pouvait comprendre que sa saisie n'avait pas été prise.
      //
      // ⚠ « AUCUN N'EST DÉCLARÉ » A ÉTÉ RETIRÉ, et l'histoire mérite d'être
      // gardée. La phrase était vraie par construction : `rapprocher()` ne
      // signalait une transmission `titre: null` que si le dossier ne portait
      // AUCUN titre. Le 2026-08-31, cette règle est passée au domaine — un
      // titre d'électricité fait taire le signal d'électricité, un certificat
      // de secourisme ne le fait plus. Correction juste, et le contrôle visuel
      // l'a confirmée en marche.
      //
      // Mais le libellé n'a pas suivi la règle qui venait de bouger sous lui :
      // dans un dossier où une salariée détenait un certificat SST déclaré et
      // visible, le tableau de bord affichait « aucun n'est déclaré » pour une
      // autre obligation. La phrase voulait dire « aucun DE CE TYPE » ; elle
      // disait « aucun ».
      //
      // Ce qu'elle ne peut PAS dire non plus : quel titre est attendu. C'est
      // tout l'objet du `titre: null` — la transmission ne sait pas le nommer,
      // et l'ADR-024 pose que le produit nomme le trou sans le dériver. La
      // formulation doit donc rester générique SANS être fausse, ce qui est
      // plus étroit qu'il n'y paraît : « rien de ce qui est déclaré n'y
      // répond » est vrai que le dossier porte zéro titre ou douze.
      sousTitre:
        "Suppose un titre nominatif — rien de ce qui est déclaré n'y répond",
      href: `/etablissements/${etab}/equipe`,
      priorite: 10,
    });
  }

  // Tri stable par priorité, puis par date
  acc.sort((a, b) => {
    if (a.priorite !== b.priorite) return a.priorite - b.priorite;
    const da = a.date?.getTime() ?? Infinity;
    const db = b.date?.getTime() ?? Infinity;
    return da - db;
  });

  return acc.slice(0, limite);
}
