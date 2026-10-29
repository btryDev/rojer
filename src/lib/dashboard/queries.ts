import "server-only";
// Lectures du tableau de bord.
//
// Une règle traverse ce fichier : **aucune définition du retard n'est écrite
// ici**. Elles vivent toutes dans `@/lib/dates/retard` (ADR-011), et ce
// module se contente de les appliquer. Il en hébergeait trois différentes —
// une par fonction — avec des conséquences visibles à l'écran : la pastille
// rouge « en retard » apparaissait sur la carte de l'équipement et la barre
// rouge dans le graphe mensuel le matin même de l'échéance, pendant que le
// bandeau du calendrier disait « rien en retard ».
//
// Deuxième règle : **les compteurs affichés se calculent sur l'ensemble
// complet**, jamais sur la liste tronquée envoyée au moteur de
// recommandations (même réflexe que `statsActionsEnRetard`, qui refuse de
// moyenner un retard sur une liste coupée).

import { appareilDeLAction, cheminAction } from "@/lib/navigation/chemins";
import { marquesAConfirmerDuRendu } from "@/lib/etablissements/marques-du-rendu";
import { registrePrudent, retenueParPrudence } from "@/lib/calendrier/prudence";
import { couvertureDuDossier } from "@/lib/perimetre/faits";
import { cache } from "react";
import { comptesModulesDuRendu } from "@/lib/etablissements/modules";
import { prestatairesDuRendu } from "@/lib/prestataires/queries";
import { JOURS_APRES } from "./frise";
import { instantDuRendu } from "@/lib/dates/instant-du-rendu";
import { comptesParcDuRendu } from "@/lib/equipements/queries";
import { compterRapportsDuDossier } from "@/lib/rapports/queries";
import { duerpDuRendu } from "@/lib/duerps/queries";
import { etablissementDuCompteDuRendu } from "@/lib/etablissements/queries";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { compterActions } from "@/lib/actions/queries";
import { computeVigilance } from "@/lib/prestataires/vigilance";
import { chargerTransmissions, titresDusEnRetard } from "./transmissions";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import {
  MOIS_FENETRE_HISTORIQUE,
  ajouterJours,
  ajouterMois,
  composantesCiviles,
  debutDuJour,
  instantCivil,
  joursCivilsEntre,
} from "@/lib/dates";
import { estActionEnRetard } from "@/lib/dates/retard";
import { releveAncien } from "@/lib/carnet-sanitaire/etat-releve";
import { eauChaudeSuivieParLeCalendrier } from "@/lib/carnet-sanitaire/suivi-calendrier";
import {
  aUnRendezVous,
  classerVerification,
  TON_REGISTRE,
  lecturesCalendrier,
} from "@/lib/calendrier/etats";
import { prochaineEcheanceConnue } from "@/lib/calendrier/prochaine-echeance";
import { repartirParMois, type BarMois, type BarresAnnee } from "./barres-mois";
import { WHERE_RAPPORT_REALISE } from "@/lib/rapports/derniere-realisation";
import {
  dernieresRealisationsDeLEtablissement,
  joindreDernieresRealisations,
} from "@/lib/rapports/joindre-realisations";
import { projeterDernieresRealisations } from "@/lib/rapports/projeter-realisations";
import {
  typeDeVerification,
  type BatimentEcheance,
  type TypeVerification,
} from "@/lib/calendrier/echeances";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";
import type { ModulesMatrice } from "./obligations";
import { evaluerEtatDuerp, type EtatDuerp } from "./duerp";
import { calculerScoreDepuisEtat, type Score } from "./score";
import { compterEtatsPermanents } from "@/lib/etats-permanents/queries";
import {
  porteeBatiment,
  toutesLesConditions,
  echeanceAttendue,
  urgenceSeule,
} from "@/lib/calendrier/portee";
import { libellePorteur } from "@/lib/calendrier/labels";
import { estEcheanceContractuelle } from "@/lib/prescriptions/sources";
import { estLignePourInformation } from "@/lib/referentiels/conformite/initiative";
import { mentionRythmeDeVerification } from "@/lib/referentiels/conformite/mention-de-ligne";
import type { MentionRythme } from "@/lib/referentiels/conformite/mention-rythme";
import {
  genererRecommandations,
  type Recommandation,
} from "./recommandations";

/**
 * Statuts d'une occurrence **ouverte** : elle attend encore sa réalisation.
 * Le pendant des statuts « réalisées », qui restent en base à vie (le
 * registre de sécurité en dépend) et qu'aucune requête d'échéances ne doit
 * ramener.
 */

// Le type vit avec la répartition pure (`barres-mois.ts`) ; réexporté ici pour
// les widgets qui le prenaient à ce module.
export type { BarMois, BarresAnnee };

/**
 * Raccourcit les libellés d'obligation verbeux pour les cartes
 * compactes de la frise.
 * « Vérification périodique annuelle installation électrique »
 *    → « Installation électrique »
 */
function libelleCourt(libelle: string): string {
  return libelle
    .replace(/^V[ée]rification\s+(p[ée]riodique\s+)?(annuelle|semestrielle|trimestrielle|mensuelle|hebdomadaire|biennale|triennale|quinquennale|d[ée]cennale)?\s*(des?\s+|de\s+|du\s+|d['’]\s*)?/i, "")
    .replace(/^Entretien\s+(annuel|semestriel|trimestriel)?\s*(des?\s+|de\s+|du\s+)?/i, "")
    .replace(/^Maintien\s+en\s+bon\s+[ée]tat\s+/i, "")
    .replace(/^Exercice\s+(d['’]\s*)?/i, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export type EvenementFenetre = {
  id: string;
  libelle: string;
  date: Date;
  tone: "alerte" | "warn" | "ok";
  /**
   * `true` quand `date` n'est PAS une échéance connue (`aUnRendezVous`) : une
   * ligne « à planifier », en retard ou non. L'événement compte — le ton le
   * dit —, mais ne se pose sur aucun jour : la grille et la frise l'écartent
   * (`fusionnerEvenements`). Sans ce drapeau, une « à planifier » en retard
   * (ton `alerte`) passait le filtre qui n'écartait que le ton `warn`, et la
   * frise la plaçait sur sa date de génération (relecture du lot C).
   */
  sansEcheance: boolean;
  /** Ce que la ligne **est** (ADR-016), et donc la famille qui s'en déduit.
   *  Ce flux en porte deux depuis l'ADR-023 : la vérification d'un
   *  équipement et l'échéance du titre d'une personne. Requis — l'oublier
   *  rangerait de nouveau une attestation médicale dans « Contrôles ». */
  type: TypeVerification;
  /** `true` quand la ligne naît d'un engagement contractuel — une demande
   *  d'assureur — et non d'un texte (ADR-032). Les vues calendrier du board
   *  affichent des libellés d'échéance comme les autres surfaces : sans ce
   *  drapeau, elles présentent une exigence d'assurance comme du droit. */
  contractuelle: boolean;
  /** D'où vient le rythme quand Rojer le retient (ADR-039), `null` sinon.
   *  Requis, comme `contractuelle` : l'ADR-039 § 5 interdit un rythme retenu
   *  sans marquage « sur quelque surface que ce soit », et le board est la
   *  plus lue. Lu au référentiel par `obligationId` — aucune requête. */
  rythmeRetenu: MentionRythme | null;
  /**
   * La visite de la commission de sécurité, à l'initiative de l'administration
   * (C64) : le widget la marque « Pour information ». Requis, comme
   * `contractuelle` : un événement qui l'omettrait la montrerait comme une
   * échéance de l'exploitant.
   */
  pourInformation: boolean;
  /** Les phrases « à confirmer » de la ligne, vide sinon (revue du lot 1). */
  aConfirmer: readonly string[];
  /** L'appareil, ou « Tout l'établissement » (ADR-022). */
  equipement: string;
  /** Le bâtiment de l'équipement (ADR-019). `null` quand l'échéance porte sur
   *  l'établissement : elle n'est dans aucun bâtiment, et reste donc visible
   *  sous tous les filtres (ADR-010). */
  batiment: BatimentEcheance | null;
};

// `marquesAConfirmerDuRendu` vit dans `etablissements/marques-du-rendu.ts`
// depuis le 2026-09-28 (D1 (a)) ; réexportée pour les appelants existants.
export { marquesAConfirmerDuRendu };

/**
 * Les lignes que lisent les fenêtres d'événements (`listerEvenementsFenetre`),
 * bornées à la frise, mémoïsées sur le rendu (`cache()`, clés primitives).
 */
export const lignesEvenementsDuRendu = cache(async function lignesEvenementsDuRendu(
  etablissementId: string,
  debutDuJourMs: number,
  batimentId: string | null,
  urgentsSeulement: boolean,
) {
  const user = await requireUser();
  // La borne de la plus longue fenêtre (la frise, `JOURS_APRES`) reste dans la requête : les
  // fenêtres plus courtes se coupent en mémoire, mais rien au-delà de la frise
  // n'est lu (revue du lot 1).
  const finMax = ajouterJours(new Date(debutDuJourMs), JOURS_APRES);
  return prisma.verification.findMany({
    // Composées et non diffusées, comme `listerVerifications` : la portée par
    // bâtiment pose un `OR`, et ce site n'échappait à l'écrasement que parce
    // que sa condition d'urgence porte `statut` et non `OR` — un accident, pas
    // une garantie (cf. `toutesLesConditions`).
    where: toutesLesConditions(
      {
        etablissementId,
        etablissement: { entreprise: { userId: user.id } },
        datePrevue: { lte: finMax },
      },
      porteeBatiment(batimentId ?? undefined),
      // La même clause que `listerVerifications`, prise au même endroit : la
      // liste locale `a_planifier + depassee` datait d'avant le N2 et manquait
      // toute ligne roulée — « planifiée » à date passée — c'est-à-dire la
      // forme normale du retard depuis l'ADR-034.
      urgentsSeulement ? urgenceSeule(new Date(debutDuJourMs)) : {},
    ),
    include: {
      equipement: {
        select: {
          libelle: true,
          batiment: { select: { id: true, nom: true } },
        },
      },
      // Le porteur salarié (ADR-023) : sans cette sélection, la ligne
      // d'une personne s'afficherait « Tout l'établissement ».
      salarie: { select: { nom: true, prenom: true } },
      // La source de la prescription : les vues calendrier du board affichent
      // des libellés d'échéance comme les autres surfaces, et doivent donc
      // pouvoir dire lesquelles sont contractuelles (ADR-032).
      prescription: { select: { source: true } },
    },
    orderBy: { datePrevue: "asc" },
  });
});

/**
 * Liste tous les événements de vérification sur une fenêtre glissante
 * de `joursHorizon` jours à partir d'aujourd'hui. Utilisé par les
 * widgets « Semaine » (7 j) et « 30 prochains jours », et par le flux calendrier.
 *
 * Le classement passe par `lecturesCalendrier` — LA règle, partagée avec
 * la page calendrier : l'échéance ouverte de chaque ligne (ADR-034) entre
 * dans la fenêtre comme n'importe quel futur. Le RETARD se lit sur la date ;
 * le statut ne dit que si cette date est une échéance connue (`sansEcheance`,
 * ton `warn` d'une « à planifier » à venir). Les lectures « realisation » (le
 * fait, daté au passé) sont écartées : la fenêtre montre la charge, pas
 * l'historique.
 *
 * Tons : `TON_REGISTRE` (alerte = en retard, warn = à planifier, ok = le
 * reste). L'id reste celui de la ligne — une ligne n'émet qu'un événement
 * ici, sa lecture courante, et les appelants s'en servent pour la porte
 * `/verifications/{id}`.
 */
export async function listerEvenementsFenetre(
  etablissementId: string,
  joursHorizon: number,
  filtres?: {
    domaine?: DomaineObligation;
    /** Même sémantique que `listerVerifications` : échéance attendue, date passée. */
    urgentsSeulement?: boolean;
    /** Ne garder que les équipements de ce bâtiment (ADR-019). */
    batimentId?: string;
  },
): Promise<EvenementFenetre[]> {
  if (joursHorizon > JOURS_APRES) {
    throw new Error(`Fenêtre de ${joursHorizon} jours : au-delà de la frise (${JOURS_APRES}).`);
  }
  // L'instant du rendu, partagé : les lectures mémoïsées par jour civil
  // tombent sur la même clé (revue du lot 1).
  const now = instantDuRendu();
  // Borne haute prise en jours civils : la fenêtre « 30 jours » couvre le
  // trentième jour en entier, changements d'heure compris.
  const fin = ajouterJours(debutDuJour(now), joursHorizon);

  // Une lecture par rendu pour toutes les fenêtres (7 j, 30 j, frise) : la
  // borne de l'horizon se pose ici, en mémoire, sur la même condition que la
  // requête portait (`datePrevue <= fin`). [2026-10-27, plan performance,
  // lot 1 : trois lectures des mêmes lignes à chaque tableau de bord.] La
  // lecture partagée est bornée à la frise (`JOURS_APRES`).
  // Les marques « à confirmer » (revue du lot 1), lues en même temps.
  const [toutes, marques] = await Promise.all([
    lignesEvenementsDuRendu(
      etablissementId,
      debutDuJour(now).getTime(),
      filtres?.batimentId ?? null,
      filtres?.urgentsSeulement ?? false,
    ),
    marquesAConfirmerDuRendu(etablissementId),
  ]);
  const verifs = toutes.filter((v) => v.datePrevue.getTime() <= fin.getTime());

  // Filtre par domaine côté TS, comme `listerVerifications` : le domaine
  // est porté par l'obligation en référentiel, pas en base.
  const retenues = filtres?.domaine
    ? verifs.filter(
        (v) => obligationParId(v.obligationId)?.domaine === filtres.domaine,
      )
    : verifs;

  const prudence = retenueParPrudence(marques.parObligation);
  return retenues.flatMap((v) =>
    // `derniereRealisation: null` est un choix, pas un oubli : cette fenêtre
    // n'annonce que des échéances et écarte les réalisations juste en
    // dessous. Les lire coûterait une requête pour les jeter.
    lecturesCalendrier({ ...v, derniereRealisation: null }, now)
      .filter(
        (lec) =>
          lec.lecture !== "realisation" && lec.date.getTime() <= fin.getTime(),
      )
      .map((lec) => ({
        id: v.id,
        libelle: libelleCourt(v.libelleObligation),
        date: lec.date,
        // D1 (a) : une échéance passée que seul le silence de la fiche
        // retient n'est pas une alerte — l'attention, comme « à planifier ».
        // Lu sur le registre prudent (D26), plus redit ici.
        tone: TON_REGISTRE[registrePrudent(lec.registre, v, prudence)],
        sansEcheance: !aUnRendezVous(v, now),
        type: typeDeVerification(v),
        contractuelle: estEcheanceContractuelle(v),
        rythmeRetenu: mentionRythmeDeVerification(v),
        pourInformation: estLignePourInformation(v),
        aConfirmer: marques.parObligation.get(v.obligationId)?.phrases ?? [],
        equipement: libellePorteur(v),
        // Pas d'équipement, pas de bâtiment : la ligne reste visible sous
        // tous les filtres par bâtiment (ADR-010, ADR-019).
        batiment: v.equipement?.batiment ?? null,
      })),
  );
}

export type StatsEquipement = {
  enRetard: number;
  aPlanifier: number;
  sous30j: number;
  derniereRealisee: Date | null;
  /** `prochaineEcheanceConnue` : la plus ancienne échéance connue en attente,
   *  retard daté compris — la même que la vue du parc. */
  prochaineDate: Date | null;
};

/**
 * Compte les vérifications par équipement — pour afficher des pastilles
 * de statut sur les cartes du widget « Équipements déclarés ».
 * Retourne une map `equipementId → stats`. Les équipements sans aucune
 * vérification n'apparaissent pas dans la map (l'appelant traite ça
 * comme « aucune vérification »).
 *
 * `enRetard` et `aPlanifier` sont **disjoints** (prédicats partagés) : une
 * occurrence `a_planifier` dont la date est passée compte une fois, comme
 * retard. Elle était auparavant comptée dans les deux pastilles.
 */
export async function compterVerifsParEquipement(
  etablissementId: string,
): Promise<Map<string, StatsEquipement>> {
  const user = await requireUser();
  // L'instant du rendu, partagé : les lectures mémoïsées par jour civil
  // tombent sur la même clé (revue du lot 1).
  const now = instantDuRendu();
  const debutFenetreHistorique = debutDuJour(
    ajouterMois(now, -MOIS_FENETRE_HISTORIQUE),
  );

  const [lignes, marques, dernieres] = await Promise.all([
    prisma.verification.findMany({
      where: {
        etablissementId,
        etablissement: { entreprise: { userId: user.id } },
      },
      select: {
        id: true,
        equipementId: true,
        // L'obligation, pour la prudence (D1 (a)) : la pastille rouge d'un
        // appareil ne compte pas une ligne que seul le silence retient.
        obligationId: true,
        // … sauf si une prescription la rythme (revue indépendante, lot 3).
        prescriptionId: true,
        statut: true,
        datePrevue: true,
        periodicite: true,
        // Sans lui, une ligne dont l'obligation ne s'applique plus (ADR-034)
        // pèse encore sur les pastilles de son appareil, avec le statut gelé
        // où l'archivage l'a laissée. Le fait se lisait dans le libellé, il a
        // maintenant sa colonne — et son absence du `select` ne compile plus.
        archiveLe: true,
        graceJusquAu: true,
        libelleObligation: true,
      },
    }),
    marquesAConfirmerDuRendu(etablissementId),
    dernieresRealisationsDeLEtablissement(etablissementId),
  ]);
  const verifs = projeterDernieresRealisations(lignes, dernieres);
  const prudence = retenueParPrudence(marques.parObligation);

  const map = new Map<string, StatsEquipement>();
  const getStats = (id: string): StatsEquipement => {
    let s = map.get(id);
    if (!s) {
      s = {
        enRetard: 0,
        aPlanifier: 0,
        sous30j: 0,
        derniereRealisee: null,
        prochaineDate: null,
      };
      map.set(id, s);
    }
    return s;
  };
  const lignesParEquipement = new Map<string, typeof verifs>();

  for (const v of verifs) {
    // Statistiques **par équipement** : une échéance portée par
    // l'établissement (ADR-022) n'appartient à aucun appareil. La compter
    // ici ferait apparaître une entrée sous une clé qui n'est l'id d'aucun
    // équipement, et les écrans qui joignent sur cette Map afficheraient un
    // appareil fantôme.
    if (v.equipementId === null) continue;
    const s = getStats(v.equipementId);
    // UNE LIGNE, UNE ÉCHÉANCE (ADR-034, N4) : plus de dépli. La ligne portait
    // le fait passé et le rendez-vous suivant ; elle ne porte plus que ce
    // dernier, et les contrôles faits se comptent sur les rapports, juste en
    // dessous.
    const etat = classerVerification(v, now);
    // D1 (a) : retenue par prudence, la ligne ne rougit pas l'appareil.
    if (etat === "enRetard" && !prudence(v)) s.enRetard += 1;
    else if (etat === "aPlanifier") s.aPlanifier += 1;
    else if (etat === "proche") s.sous30j += 1;

    const lignes = lignesParEquipement.get(v.equipementId) ?? [];
    lignes.push(v);
    lignesParEquipement.set(v.equipementId, lignes);

    // Lue sur les rapports (ADR-034), et nulle part ailleurs (N5).
    const faite = v.derniereRealisation;
    if (faite && faite.getTime() >= debutFenetreHistorique.getTime()) {
      if (!s.derniereRealisee || faite > s.derniereRealisee) {
        s.derniereRealisee = faite;
      }
    }
  }

  // LA PROCHAINE ÉCHÉANCE, PAR LA DÉFINITION PARTAGÉE (`prochaineEcheanceConnue`).
  // Elle ne retenait ici que `proche` et `lointain` — « une ligne en retard n'a
  // pas de prochaine échéance » —, quand la vue du parc retenait le retard :
  // même appareil, deux réponses (relecture système du 2026-09-14). Le retard
  // DATÉ passe désormais devant une échéance à venir ; une ligne sans échéance
  // connue ne fournit toujours aucune date.
  for (const [equipementId, lignes] of lignesParEquipement) {
    map.get(equipementId)!.prochaineDate =
      prochaineEcheanceConnue(lignes, now)?.date ?? null;
  }

  return map;
}

/**
 * Agrège les vérifications de l'année civile courante par mois, pour les
 * barres du dashboard. Utilisé par `BarsObligations`. Scoping par user
 * via la chaîne etablissement.entreprise.userId.
 *
 * Classification (`repartirParMois`, où elle est testée) :
 *  - `couvert`  : CHAQUE rapport réalisé daté dans le mois (ADR-034) — pas
 *    seulement le dernier, qui faisait retomber mars à 0 au dépôt de juin
 *  - `retard`   : échéance ouverte en retard au sens des prédicats partagés
 *  - `aVenir`   : le reste des échéances ouvertes
 *
 * On bucket la couverture sur la date du rapport — un rapport réalisé en mai
 * apparaît bien dans le mois de mai, même si la datePrevue était ailleurs.
 * Le mois est lu en heure de Paris, comme partout ailleurs : sur un serveur
 * en UTC, une échéance du 1er du mois à minuit basculait dans le mois
 * précédent.
 *
 * ~~UNE SEULE LECTURE : les rapports réalisés viennent avec leurs lignes, par la
 * relation, et non par une requête par ligne ni par la jointure « dernière
 * réalisation » — qui ne rend que le plus récent, et coûtait un second
 * aller-retour.~~ [2026-10-27, plan performance, lot 1a : DEUX lectures — les
 * lignes avec leurs rapports de l'année, et, en parallèle, la dernière
 * réalisation de chaque ligne de l'établissement. Une requête de plus contre
 * dix ans d'historique de moins.]
 */
export async function compterObligationsParMois(
  etablissementId: string,
  annee: number = composantesCiviles(new Date()).annee,
): Promise<BarresAnnee> {
  const user = await requireUser();
  const debut = instantCivil(annee, 1, 1);
  const fin = instantCivil(annee + 1, 1, 1);

  const [verifs, marques, dernieres] = await Promise.all([prisma.verification.findMany({
    where: {
      etablissementId,
      etablissement: { entreprise: { userId: user.id } },
      // UN SUR-ENSEMBLE, et il doit le rester : la répartition ne garde que
      // les événements datés dans l'année. Ce qui compte est de ne rien
      // exclure qu'un événement poserait dans l'année.
      OR: [
        { datePrevue: { gte: debut, lt: fin } },
        // Un RETARD d'une année passée, daté ou non : `repartirParMois` le
        // compte dans l'année en cours, où il est dû. Sans cette branche, la
        // requête l'écartait avant qu'on puisse le compter — et l'anneau
        // taisait ce que le bandeau annonçait. La clause partagée « attendue,
        // ouverte, datée avant » (`urgenceSeule`), composée et non recopiée ;
        // un sur-ensemble, que `repartirParMois` trie.
        // La grâce (ADR-040) se juge AUJOURD'HUI, pas au 1er janvier de
        // l'année affichée : sinon une ligne dont la grâce a expiré en cours
        // d'année est écartée ici et comptée par le bandeau.
        urgenceSeule(debut, debutDuJour(new Date())),
        // Une ligne couverte dans l'année : un rapport réalisé y est daté
        // (ADR-034 — la réalisation vit sur le rapport, plus sur la ligne).
        {
          rapports: {
            some: {
              dateRapport: { gte: debut, lt: fin },
              ...WHERE_RAPPORT_REALISE,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      datePrevue: true,
      statut: true,
      periodicite: true,
      // Cf. ci-dessus : l'archivage est un champ (ADR-034). Sans lui, une
      // obligation éteinte continue de peindre des barres.
      archiveLe: true,
      graceJusquAu: true,
      libelleObligation: true,
      obligationId: true,
      prescriptionId: true,
      // Les rapports réalisés DE L'ANNÉE seulement : ce sont eux que la barre
      // pose. [2026-10-27, plan performance, lot 1a : la clause lisait tous
      // les rapports de la ligne — dix ans d'historique pour douze mois — afin
      // de savoir si un rapport existait hors de l'année. La dernière
      // réalisation, lue en parallèle en une ligne par échéance, le dit.]
      rapports: {
        where: { ...WHERE_RAPPORT_REALISE, dateRapport: { gte: debut, lt: fin } },
        select: { dateRapport: true },
      },
    },
  }),
    // D1 (a) : les barres et l'anneau lisent la même prudence que le bandeau
    // (contre-lecture du lot 3 — ils comptaient encore la ligne en retard).
    marquesAConfirmerDuRendu(etablissementId),
    // En parallèle de la lecture des lignes, et non après : indexée par ligne,
    // pour tout l'établissement (revue du lot 1a).
    dernieresRealisationsDeLEtablissement(etablissementId),
  ]);

  // Les mêmes lectures que le calendrier (`lecturesCalendrier`) pour
  // l'échéance ouverte ; les rapports de l'année pour les barres.
  return repartirParMois(
    verifs.map(({ rapports, ...v }) => ({
      ...v,
      rapportsRealises: rapports,
      derniereRealisation: dernieres.get(v.id)?.dateRapport ?? null,
    })),
    annee,
    new Date(),
    retenueParPrudence(marques.parObligation),
  );
}

/**
 * Alimente les lignes « modules complémentaires » de la matrice
 * « Vos documents, en un coup d'œil » (voir `ModulesMatrice` pour les
 * règles d'apparition de chaque ligne). Uniquement des comptages et
 * des dates — les faits sont interprétés par `construireMatrice`.
 */
export async function getModulesMatrice(
  etablissementId: string,
  estERP: boolean,
): Promise<ModulesMatrice> {
  const user = await requireUser();
  const scope = {
    etablissementId,
    etablissement: { entreprise: { userId: user.id } },
  } as const;
  // L'instant du rendu, partagé : les lectures mémoïsées par jour civil
  // tombent sur la même clé (revue du lot 1).
  const now = instantDuRendu();

  const [accessibilite, comptes, prestataires, suiviParLeCalendrier] = await Promise.all([
    prisma.registreAccessibilite.findFirst({
      where: scope,
      select: { publie: true },
    }),
    // Permis, plans et carnet : partagés avec la barre latérale, lus une fois
    // par rendu (plan performance, lot 1). Échu = la date de fin est
    // **antérieure au jour courant** : comparer à l'instant brut faisait passer
    // « échu » un permis qui court encore jusqu'à ce soir.
    comptesModulesDuRendu(etablissementId, debutDuJour(now).getTime()),
    prestatairesDuRendu(etablissementId),
    eauChaudeSuivieParLeCalendrier(scope),
  ]);
  const carnet = comptes.carnet;

  // Fraîcheur du carnet sanitaire : mesurée **point par point**.
  //
  // La mesure portait auparavant sur le dernier relevé toutes sondes
  // confondues — un seul point relevé cette semaine suffisait à faire
  // passer la ligne au vert alors que dix autres n'avaient pas été mesurés
  // depuis un an. La pastille n'établissait pas le fait qu'elle prétendait
  // établir. On compte donc les points dont le dernier relevé est ANCIEN
  // (un seul suffit à refuser la pastille — c'est juger sur le point le plus
  // en retard), et à part ceux qui n'ont jamais été relevés (leur ancienneté
  // n'est pas mesurable : elle ne peut entrer dans aucun des deux comptes).
  let nbPointsReleveAncien = 0;
  let nbPointsJamaisReleves = 0;
  let nbPoints = 0;
  if (carnet) {
    const points = await prisma.pointReleve.findMany({
      // `carnet.id` sort du `findFirst` scopé ci-dessus, donc la portée est
      // déjà établie — le prédicat est porté quand même, pour que cette
      // lecture ne dépende pas de la provenance de son argument (cf.
      // `docs/rgpd.md` § 7.1, forme A).
      where: {
        carnetId: carnet.id,
        actif: true,
        carnet: { etablissement: { entreprise: { userId: user.id } } },
      },
      select: {
        id: true,
        releves: {
          orderBy: { dateReleve: "desc" },
          take: 1,
          select: { dateReleve: true },
        },
      },
    });
    nbPoints = points.length;
    for (const p of points) {
      const dernier = p.releves[0]?.dateReleve ?? null;
      if (dernier === null) {
        nbPointsJamaisReleves += 1;
        continue;
      }
      // Le même prédicat que la carte du point : au-delà d'un mois, le
      // rythme écrit (2026-10-13 — la ligne lisait 7 jours).
      if (releveAncien(dernier, now)) nbPointsReleveAncien += 1;
    }
  }
  const derniereAnalyse = carnet?.analyses[0]?.dateAnalyse ?? null;

  return {
    estERP,
    accessibilite: {
      existe: accessibilite !== null,
      publie: accessibilite?.publie ?? false,
    },
    permisFeu: comptes.permisFeu,
    plansPrevention: comptes.plansPrevention,
    carnetSanitaire: {
      existe: carnet !== null,
      nbPoints,
      nbPointsJamaisReleves,
      nbPointsReleveAncien,
      jourDerniereAnalyse: derniereAnalyse
        ? Math.max(0, joursCivilsEntre(derniereAnalyse, now))
        : null,
      suiviParLeCalendrier,
    },
    prestataires: {
      total: prestataires.length,
      enAlerte: prestataires.filter(
        // Sur la gravité, comme l'annuaire et « Préparer un contrôle »
        // (`countAlertesVigilance`) : une attestation dont une date du texte
        // n'est pas renseignée y compte, elle n'est jamais « à jour ».
        (p) => computeVigilance(p, now).etatLePlusGrave !== null,
      ).length,
    },
  };
}

export type DashboardData = {
  score: Score;
  recommandations: Recommandation[];
  compteurs: {
    verifsEnRetard: number;
    verifsAPlanifier: number;
    verifsSous30j: number;
    /** Lignes dont le dernier contrôle tombe dans les douze mois ET dont
     *  l'échéance ouverte n'est ni dépassée ni proche — le quatrième ensemble
     *  de `repartirVerifications`, celui qui complète le dénominateur du
     *  score (ADR-034). Ce n'est PAS un compte de rapports. */
    verifsRealisees12m: number;
    /** Les RAPPORTS réalisés déposés sur les douze derniers mois. C'est ce que
     *  les cartes « Rapports 12 m » annoncent, et ce que le registre montre :
     *  une ligne contrôlée quatre fois dans l'année en compte quatre. */
    rapports12m: number;
    actionsOuvertes: number;
    actionsEnCours: number;
    actionsEnRetard: number;
    actionsLeveesRecemment: number;
    /** Toutes les actions jamais créées, quel que soit leur statut — y
     *  compris levées il y a plus de trente jours et abandonnées. Sans lui,
     *  un établissement ayant clôturé ses vingt actions il y a trois mois
     *  s'entendait dire « Plan d'actions : rien en place ». */
    actionsTotal: number;
  };
  /**
   * Les titres dus à l'entrée qui manquent EN RETARD (ADR-043, décision (d)),
   * lus sur les comptes des cartes (`titresDusEnRetard`). Hors des compteurs
   * et du score (ADR-043 § 3 (a)) : le bandeau les NOMME à côté de
   * « Dépassées », pour ne pas dire « rien de dépassé » au-dessus d'une carte
   * en retard (audit du 2026-10-12).
   */
  titresDusEnRetard: number;
  duerp: {
    existe: boolean;
    duerpId: string | null;
    derniereVersionAu: Date | null;
    ageJours: number | null;
    /** Aucune échéance de mise à jour dépassée — cf. `EtatDuerp.estAJour`.
     *  Faux tant qu'aucune version n'a été validée. */
    estAJour: boolean;
    /** L'état détaillé, seule source des libellés et du score. */
    etat: EtatDuerp;
  };
};

/**
 * Nombre maximal de vérifications ouvertes transmises au moteur de
 * recommandations. Le moteur n'en retient que cinq ; le plafond n'est là
 * que pour borner la charge d'un dossier très fourni.
 *
 * Il ne s'applique **qu'à la file de propositions** : les compteurs
 * (`verifsEnRetard`…) et le score sont calculés plus haut, sur l'ensemble
 * complet des occurrences. La requête historique, elle, prenait les
 * 30 premières `datePrevue` **sans filtrer les réalisées** : au bout de deux
 * ans d'usage, ces trente lignes étaient toutes des vérifications archivées,
 * le moteur ne voyait plus aucun retard, et le board annonçait « rien à
 * traiter » à côté d'un compteur affichant douze retards.
 */
const MAX_VERIFS_RECOS = 40;

/**
 * Mémoïsé par `cache()` : le layout d'établissement s'en sert pour les badges
 * de la sidebar et la page pour ses widgets, sur le même identifiant et dans le
 * même rendu. Les six requêtes ci-dessous partaient donc en double à chaque
 * chargement du tableau de bord. La portée est celle de la requête HTTP, jamais
 * plus : deux visiteurs ne partagent rien.
 */
export const getDashboardData = cache(async function getDashboardData(
  etablissementId: string,
): Promise<DashboardData> {
  const user = await requireUser();
  const scope = {
    etablissementId,
    etablissement: { entreprise: { userId: user.id } },
  } as const;
  // L'instant du rendu, partagé : les lectures mémoïsées par jour civil
  // tombent sur la même clé (revue du lot 1).
  const now = instantDuRendu();
  const debutFenetreHistorique = debutDuJour(
    ajouterMois(now, -MOIS_FENETRE_HISTORIQUE),
  );

  const [
    verifications,
    actionsOuvertes,
    compteursActions,
    compteursMesures,
    actionsTotal,
    duerp,
    nbEquipements,
    transmissions,
    nbRapports,
    etatsPermanents,
    rapports12m,
    marquesDossier,
    couverture,
    etablissement,
  ] = await Promise.all([
    // Un seul passage sur les vérifications qui comptent : les occurrences
    // ouvertes (toutes, sans plafond — leur nombre est borné par le
    // calendrier généré) et celles réalisées sur la fenêtre d'historique.
    // Les compteurs, le score et la file de propositions décrivent ainsi le
    // même ensemble, comme le fait déjà le dossier de conformité PDF.
    prisma.verification.findMany({
      where: {
        ...scope,
        OR: [
          // Tout ce qui ATTEND encore — statut ouvert, ou statut réalisé sur
          // une obligation périodique (la migration du N5 les a remises
          // « planifiée », la clause reste la même que `estVerificationRealisee`).
          // Depuis l'ADR-034 une ligne roulée est ouverte ET porte un rapport
          // réalisé : cette clause et la suivante se recouvrent, et c'est juste
          // — l'une compte l'échéance, l'autre le fait.
          echeanceAttendue(),
          {
            rapports: {
              some: {
                dateRapport: { gte: debutFenetreHistorique },
                ...WHERE_RAPPORT_REALISE,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        statut: true,
        datePrevue: true,
        // Le rythme : c'est lui qui dit si un statut réalisé purge l'échéance
        // (`estVerificationRealisee`) — sur une obligation périodique, non.
        periodicite: true,
        // L'archivage (ADR-034). Il décide des quatre compteurs, du score et
        // de la file de propositions : une ligne éteinte gelée sur `depassee`
        // les faussait tous les trois d'un coup.
        archiveLe: true,
        graceJusquAu: true,
        libelleObligation: true,
        // L'obligation, pour le prédicat « retenue par prudence » (D1 (a)) :
        // une ligne que seul le silence de la fiche retient ne compte ni en
        // retard ni dans l'indice.
        obligationId: true,
        // … sauf si une prescription la rythme (revue indépendante, lot 3).
        prescriptionId: true,
        // La source de la prescription, pour que le board dise ce qu'une
        // ligne contractuelle est (ADR-032). Le tableau de bord est l'écran
        // le plus lu du produit : une échéance d'assureur qui s'y présente
        // comme les autres est présentée comme du droit.
        prescription: { select: { source: true } },
        equipement: { select: { libelle: true } },
        salarie: { select: { nom: true, prenom: true } },
      },
      orderBy: { datePrevue: "asc" },
    }),
    // Toutes les actions encore à traiter. Le compteur « en retard » est
    // recalculé dessus avec le prédicat partagé plutôt que repris de
    // l'agrégat SQL : les deux appliquent la même règle, mais le compteur
    // affiché et la file de propositions décrivent ainsi, par construction,
    // le même ensemble de lignes.
    prisma.action.findMany({
      where: {
        ...scope,
        statut: { in: ["ouverte", "en_cours"] },
      },
      select: {
        id: true,
        // La fiche d'un point vit sous son appareil (ADR-048) ; le plan
        // d'actions ne compte que les mesures du DUERP (lot 3).
        risqueId: true,
        verificationId: true,
        equipementId: true,
        verification: { select: { equipementId: true } },
        statut: true,
        echeance: true,
        libelle: true,
      },
      orderBy: { echeance: "asc" },
    }),
    compterActions(etablissementId),
    // Le plan d'actions, ce sont les mesures du DUERP (ADR-048, lot 3) : ses
    // compteurs à l'écran ; le score, lui, garde toutes les actions.
    compterActions(etablissementId, now, { origine: "duerp" }),
    prisma.action.count({ where: { ...scope, risqueId: { not: null } } }),
    // Le DUERP du rendu, partagé avec l'échéance annuelle de la barre
    // latérale, la couverture et la page (plan performance, 2026-10-29).
    duerpDuRendu(etablissementId, user.id),
    // Le parc compté une fois par rendu, partagé avec la barre latérale.
    comptesParcDuRendu(etablissementId).then((c) => c.total),
    // Dans le `Promise.all` et non derrière lui : le rapprochement ne dépend
    // que de `etablissementId` et `user.id`, tous deux disponibles avant.
    // Placé après, il ajoutait trois requêtes sérialisées derrière tout le
    // reste du tableau de bord (ADR-024).
    chargerTransmissions(etablissementId, user.id, now),
    // Le même nombre que la carte du tableau de bord, lu une fois par rendu.
    compterRapportsDuDossier(etablissementId),
    // Le score ne peut pas conclure « satisfaisante » en ignorant ce que
    // l'écran « Ce qui doit être en place » affiche : un bureau de six
    // personnes sortait à 100 avec treize états non renseignés. Lu par la même
    // entrée que cet écran — deux comptes finiraient par diverger, et c'est le
    // chiffre du tableau de bord qui porterait la version fausse.
    compterEtatsPermanents(etablissementId, user.id),
    // Les rapports RÉALISÉS de la fenêtre, comptés en base : les cartes
    // « Rapports 12 m » parlent de pièces déposées, pas de lignes couvertes,
    // et depuis l'ADR-034 les deux ne coïncident plus.
    prisma.rapportVerification.count({
      where: {
        verification: scope,
        dateRapport: { gte: debutFenetreHistorique },
        ...WHERE_RAPPORT_REALISE,
      },
    }),
    // Les marques « à confirmer » : mémoïsées sur le rendu, partagées avec les
    // fenêtres d'événements et le compteur de retards de la même page.
    marquesAConfirmerDuRendu(etablissementId),
    // D2 (a) : les questions de couverture ouvertes. Par la même entrée que
    // l'écran « Périmètre » et le dossier PDF : deux lectures finiraient par
    // dire deux choses.
    couvertureDuDossier(etablissementId),
    // L'effectif de l'entreprise et du site conditionne la mise à jour
    // annuelle du DUERP (art. R. 4121-2) — cf. `./duerp`. La lecture de la
    // garde d'appartenance, partagée sur le rendu.
    etablissementDuCompteDuRendu(etablissementId, user.id),
  ]);

  // Répartition unique, partagée avec les documents générés : quatre
  // ensembles disjoints, dont la somme sert de dénominateur au score. Les
  // lignes retenues par prudence en sortent (D1 (a)).
  const etatVerifs = repartirVerifications(
    await joindreDernieresRealisations(etablissementId, verifications),
    now,
    retenueParPrudence(marquesDossier.parObligation),
  );
  const actionsEnRetard = actionsOuvertes.filter((a) =>
    estActionEnRetard(a, now),
  ).length;

  const derniereVersion = duerp?.versions[0] ?? null;
  const etatDuerp = evaluerEtatDuerp(
    {
      ouvert: duerp !== null,
      dateDerniereVersion: derniereVersion?.createdAt ?? null,
      // Sans DUERP, rien n'est ouvert et l'effectif ne décide de rien :
      // `ouvert: false` tranche avant lui.
      effectifs: {
        entreprise: etablissement?.entreprise.effectif ?? 0,
        site: etablissement?.effectifSurSite ?? 0,
      },
    },
    now,
  );

  const score = calculerScoreDepuisEtat({
    verifs: { total: etatVerifs.total, enRetard: etatVerifs.enRetard.length },
    actions: {
      ouvertesTotal: compteursActions.totalACouvrir,
      enRetard: actionsEnRetard,
    },
    duerp: etatDuerp.ouvert ? etatDuerp : null,
    etatsPermanents,
    couverture: { indeterminations: couverture?.indeterminations.length ?? 0 },
  });

  const recommandations = genererRecommandations(
    {
      etablissementId,
      transmissions,
      // Ordre d'urgence réelle : les retards d'abord (échéance croissante,
      // la plus ancienne en tête), puis ce qui arrive, puis les occurrences
      // sans date arrêtée — dont aucune règle ne tire de proposition, mais
      // dont la seule présence déclenche l'amorçage « premier rapport ».
      // Le plafond ne peut donc jamais faire disparaître un retard.
      verifications: [...etatVerifs.enRetard, ...etatVerifs.aVenir, ...etatVerifs.aPlanifier]
        .slice(0, MAX_VERIFS_RECOS)
        .map((v) => ({
          id: v.id,
          statut: v.statut,
          datePrevue: v.datePrevue,
          periodicite: v.periodicite,
          archiveLe: v.archiveLe,
          graceJusquAu: v.graceJusquAu,
          libelleObligation: v.libelleObligation,
          equipementLibelle: libellePorteur(v),
        })),
      actions: actionsOuvertes.map((a) => ({
        id: a.id,
        statut: a.statut,
        echeance: a.echeance,
        libelle: a.libelle,
        point: a.verificationId !== null,
        href: cheminAction(etablissementId, { id: a.id, appareilId: appareilDeLAction(a) }),
      })),
      duerp: etatDuerp,
      duerpId: duerp?.id,
      nbEquipements,
      duerpSecteurChoisi: duerp?.referentielSecteurId != null,
      nbRapports,
    },
    { now },
  );

  return {
    score,
    recommandations,
    compteurs: {
      verifsEnRetard: etatVerifs.enRetard.length,
      verifsAPlanifier: etatVerifs.aPlanifier.length,
      verifsSous30j: etatVerifs.aVenir.length,
      verifsRealisees12m: etatVerifs.realisees12m.length,
      rapports12m,
      actionsOuvertes: compteursMesures.ouvertes,
      actionsEnCours: compteursMesures.enCours,
      // Recalculé sur la liste, comme le reste (même prédicat que la file de
      // propositions) — mesures du DUERP seules.
      actionsEnRetard: actionsOuvertes.filter((a) => a.risqueId !== null && estActionEnRetard(a, now)).length,
      actionsLeveesRecemment: compteursMesures.leveesRecemment,
      actionsTotal,
    },
    titresDusEnRetard: titresDusEnRetard(transmissions),
    duerp: {
      existe: etatDuerp.ouvert,
      duerpId: duerp?.id ?? null,
      derniereVersionAu: derniereVersion?.createdAt ?? null,
      ageJours: etatDuerp.ageJours,
      estAJour: etatDuerp.estAJour,
      etat: etatDuerp,
    },
  };
});
