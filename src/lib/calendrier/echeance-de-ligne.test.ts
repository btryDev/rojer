import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleJourCivil, depuisCleJourCivil, instantCivil } from "@/lib/dates";
import { joursDeRetard } from "@/lib/dates/retard";
import type { ResultatRealise } from "@/lib/rapports/schema";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import { echeanceDuTitre } from "@/lib/salaries/echeance";
import {
  echeanceDeLigne,
  premierPas,
  type FaitsDeLigne,
  type SourceEcheance,
  type StatutDeLigne,
} from "./echeance-de-ligne";

// ============================================================================
// La table de vérité de l'ADR-036 — lot 1, sans branchement (2026-09-17).
//
// CE QUE CE FICHIER EST. La spécification exécutable de `echeanceDeLigne` : une
// rangée par cas, et chaque rangée porte le RÉCIT de la régression qu'elle
// garde — celui que les commentaires de branche de `reconcilierCalendrier`
// racontent aujourd'hui, et qui disparaîtront avec elles à la bascule. Le récit
// est passé en message d'assertion : une rangée rouge dit pourquoi elle existe.
//
// D'OÙ VIENNENT LES RANGÉES. Les sept scénarios S1 à S7 de l'audit du
// 2026-09-17, avec ses dates ; la revue des cas du plan ; et TOUS les scénarios
// de date de `generateur.test.ts`, reportés avec leurs dates — ceux-là gardent
// la mention « (generateur.test) ». Quatre d'entre eux ne se reportent pas tels
// quels ; ils sont marqués INVERSÉ ou AMENDÉ, et l'ADR-036 § 5 les nomme.
//
// COMMENT LES DATES SONT ÉCRITES. « AAAA-MM-JJ » seul = minuit de Paris, la
// forme canonique de l'ADR-011. Une chaîne ISO complète (« …T00:00:00Z ») = cet
// instant-là, pour les rangées reprises de `generateur.test.ts`, dont les
// fixtures sont à minuit UTC. L'attendu se dit en JOUR CIVIL de Paris, et en
// instant exact quand c'est l'instant que la rangée prouve.
// ============================================================================

/** « AAAA-MM-JJ » → minuit de Paris ; toute autre chaîne → cet instant. */
function date(valeur: string | Date): Date {
  if (valeur instanceof Date) return valeur;
  return /^\d{4}-\d{2}-\d{2}$/.test(valeur)
    ? depuisCleJourCivil(valeur)
    : new Date(valeur);
}

type Declaration = {
  /** Le rythme EFFECTIF. */
  rythme: Periodicite;
  /** Le rythme du référentiel, s'il diffère — c'est-à-dire sous prescription. */
  referentiel?: Periodicite;
  premierDelai?: Periodicite;
  origine: string | Date;
  miseEnService?: string | Date;
  rapport?: { le: string | Date; resultat?: string };
  heritee?: string | Date;
  titre?: Date | null;
};

/**
 * Des faits, depuis une déclaration lisible. `premierPas` passe par la VRAIE
 * fonction : une rangée sous prescription prouve donc aussi le câblage de D1.
 */
function ligne(d: Declaration): FaitsDeLigne {
  return {
    periodicite: d.rythme,
    // Sous prescription, le rythme effectif EST la surcharge ; sinon `null`.
    premierPas: premierPas(
      d.premierDelai,
      d.referentiel ?? d.rythme,
      d.referentiel === undefined ? null : d.rythme,
    ),
    dateDuTitre: d.titre ?? null,
    realisation: d.rapport
      ? {
          date: date(d.rapport.le),
          // Le `as` est celui de l'appelant réel, qui lit une chaîne en base :
          // c'est par lui qu'un « non vérifiable » peut arriver malgré le type,
          // et deux rangées le font exprès.
          resultat: (d.rapport.resultat ?? "conforme") as ResultatRealise,
        }
      : null,
    realisationHeritee: d.heritee === undefined ? null : date(d.heritee),
    miseEnService: d.miseEnService === undefined ? null : date(d.miseEnService),
    origine: date(d.origine),
  };
}

type Rangee = {
  cas: string;
  recit: string;
  faits: FaitsDeLigne;
  attendu: {
    /** Jour civil de Paris de la date rendue. */
    jour: string;
    statut: StatutDeLigne;
    source: SourceEcheance;
    /** L'instant exact, quand c'est lui que la rangée prouve. */
    instant?: Date;
  };
  /** Le retard LU sur la date rendue, à un jour donné (`joursDeRetard`). */
  retard?: { au: string | Date; jours: number };
};

/** Le jour des tests de réconciliation de `generateur.test.ts`. */
const NOW_RECONCILIATION = "2026-08-11T09:00:00Z";

const TABLE: Rangee[] = [
  // --------------------------------------------------------------------------
  // Les sept scénarios de l'audit du 2026-09-17, rejoués au 17/09/2026
  // --------------------------------------------------------------------------
  {
    cas: "S1 — obligation d'établissement sans aucune source, suivie depuis le 15/06",
    recit:
      "Le cas qui interdit d'« écraser » avec le générateur actuel : sans source il répond « aujourd'hui », et 94 jours de retard repasseraient à 0, puis glisseraient chaque jour. La date en base ne protégeait qu'une information, l'origine du suivi. Devenue un fait, elle rend la même date quel que soit le jour du calcul.",
    faits: ligne({ rythme: "annuelle", origine: instantCivil(2026, 6, 15, 10, 12) }),
    attendu: { jour: "2026-06-15", statut: "a_planifier", source: "origine" },
    retard: { au: "2026-09-17", jours: 94 },
  },
  {
    cas: "S2 — mise en service 01/06/2025, annuel, échéance du 01/06/2026 manquée",
    recit:
      "L'autre moitié de « ne pas écraser » : au 17/09 la règle 4 bis du générateur, évaluée AU JOUR DU CALCUL, rendait « à planifier » aujourd'hui et blanchissait 108 jours. Évaluée au jour de l'origine, l'échéance est née pendant le suivi : elle est réelle, et son retard se garde.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2025-06-01", origine: "2025-09-10" }),
    attendu: { jour: "2026-06-01", statut: "planifiee", source: "mise_en_service" },
    retard: { au: "2026-09-17", jours: 108 },
  },
  {
    cas: "S2 bis — le même appareil, déclaré APRÈS sa première échéance",
    recit:
      "Origine postérieure au 01/06/2026 : l'échéance appartient à un passé que le dossier ne connaît pas. On ne conclut rien — « à planifier », daté de l'origine, en retard dès le lendemain (ADR-011 § 5), jamais « 30 jours de retard » sur un mois où Rojer ne suivait rien.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2025-06-01", origine: "2026-07-01" }),
    attendu: { jour: "2026-07-01", statut: "a_planifier", source: "origine" },
  },
  {
    cas: "S3a, avant — annuel, mise en service 01/06/2026, pas de rapport",
    recit: "Le témoin de S3a : sous le rythme annuel, la première échéance est au 01/06/2027.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2026-06-01", origine: "2026-06-01" }),
    attendu: { jour: "2027-06-01", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "S3a — LE CONSTAT B : annuel → semestriel sans rapport",
    recit:
      "La branche de ré-ancrage de `reconcilierCalendrier` exigeait une réalisation : sans rapport, la ligne gardait le 01/06/2027 sous l'étiquette « semestrielle ». « Si on met à jour un calcul, c'est pour qu'il soit appliqué » : le rythme est un fait, la date le suit.",
    faits: ligne({
      rythme: "semestrielle",
      referentiel: "annuelle",
      miseEnService: "2026-06-01",
      origine: "2026-06-01",
    }),
    attendu: { jour: "2026-12-01", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "S3b — le même, régénéré le 20/12/2026, après la nouvelle première échéance",
    recit:
      "Le sous-cas que la rustine « reprendre la date du temps 1 » laissait faux : au 20/12 le générateur rendait « à planifier » au 20/12, puis au 20/01… une date glissante au lieu de 19 jours de retard. Sans horloge, les faits de S3a rendent la date de S3a, et le retard se LIT dessus.",
    faits: ligne({
      rythme: "semestrielle",
      referentiel: "annuelle",
      miseEnService: "2026-06-01",
      origine: "2026-06-01",
    }),
    attendu: { jour: "2026-12-01", statut: "planifiee", source: "mise_en_service" },
    retard: { au: "2026-12-20", jours: 19 },
  },
  {
    cas: "S4, avant — mise en service saisie au 15/03/2026 (la faute de frappe)",
    recit: "Le témoin de S4 : la date saisie par erreur donne le 15/03/2027.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2026-03-15", origine: "2026-03-15" }),
    attendu: { jour: "2027-03-15", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "S4 — la mise en service corrigée (15/03/2026 → 15/11/2025), rythme inchangé",
    recit:
      "Le constat B dépasse le « rythme qui change » : la correction était ignorée, la ligne restait au 15/03/2027 et le plan la comptait « inchangée ». La date se recalcule à chaque passe, donc la correction s'applique.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2025-11-15", origine: "2026-03-15" }),
    attendu: { jour: "2026-11-15", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "S5 — mise en service (01/09/2026) saisie le LENDEMAIN de la création (16/09)",
    recit:
      "La ligne naissait « à planifier » au 16/09, et la garde « date pas passée » du placeholder refusait ensuite la date calculée : « en retard » pour toujours, quand la même saisie faite le jour même donnait le 01/09/2027. Le calendrier dépendait de l'ordre des saisies ; il ne dépend plus que des faits.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2026-09-01", origine: "2026-09-16" }),
    attendu: { jour: "2027-09-01", statut: "planifiee", source: "mise_en_service" },
    retard: { au: "2026-09-17", jours: 0 },
  },
  {
    cas: "S6 — une ligne qui porte un rapport",
    recit:
      "Le témoin que recalculer est inoffensif là où un rapport existe : rapport + rythme, exactement ce que `rouler` écrivait au dépôt. La mise en service et l'origine ne sont plus lues.",
    faits: ligne({
      rythme: "annuelle",
      miseEnService: "2024-01-10",
      origine: "2024-02-01",
      rapport: { le: "2026-03-01" },
    }),
    attendu: { jour: "2027-03-01", statut: "planifiee", source: "rapport" },
  },
  {
    cas: "S7 — appareil neuf sous prescription semestrielle",
    recit:
      "`generateur.ts` lisait `o.periodicite`, le rythme du RÉFÉRENTIEL, pour le premier cycle : la ligne naissait étiquetée semestrielle avec une première échéance à un an. Ni test ni commentaire ne le justifiait. `premierPas` rend le rythme effectif (D1).",
    faits: ligne({
      rythme: "semestrielle",
      referentiel: "annuelle",
      miseEnService: "2026-09-01",
      origine: "2026-09-01",
    }),
    attendu: { jour: "2027-03-01", statut: "planifiee", source: "mise_en_service" },
  },

  // --------------------------------------------------------------------------
  // Le rythme allongé — l'erreur dans l'autre sens : un retard inventé
  // --------------------------------------------------------------------------
  {
    cas: "rythme allongé, avant — annuel, première échéance du 01/03/2026 manquée",
    recit: "Le témoin : sous le rythme annuel, 200 jours de retard au 17/09/2026.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2025-03-01", origine: "2025-03-10" }),
    attendu: { jour: "2026-03-01", statut: "planifiee", source: "mise_en_service" },
    retard: { au: "2026-09-17", jours: 200 },
  },
  {
    cas: "rythme allongé — le référentiel corrige l'annuel en biennal, sans rapport",
    recit:
      "La date figée annonçait 200 jours de retard sur une obligation que le texte ne rend due qu'au 01/03/2027. Le constat B invente des retards aussi bien qu'il en cache.",
    faits: ligne({ rythme: "biennale", miseEnService: "2025-03-01", origine: "2025-03-10" }),
    attendu: { jour: "2027-03-01", statut: "planifiee", source: "mise_en_service" },
    retard: { au: "2026-09-17", jours: 0 },
  },

  // --------------------------------------------------------------------------
  // Règle 2 — le ponctuel
  // --------------------------------------------------------------------------
  {
    cas: "ponctuel ouvert — mise en service à venir (generateur.test)",
    recit:
      "« mise en service à venir → planifiée à cette date ». Le contrôle unique est daté de l'événement ; à venir au jour de l'origine, c'est un rendez-vous.",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: "2026-01-15T00:00:00Z",
      miseEnService: "2026-02-14T00:00:00Z",
    }),
    attendu: {
      jour: "2026-02-14",
      statut: "planifiee",
      source: "ponctuel_ouvert",
      instant: new Date("2026-02-14T00:00:00Z"),
    },
  },
  {
    cas: "ponctuel ouvert — mise en service LE JOUR MÊME de l'origine",
    recit:
      "Règle civile (ADR-011 § 4) : une mise en service datée d'aujourd'hui est encore « à venir » toute la journée — ici l'origine est à 18 h, la mise en service à minuit du même jour.",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: instantCivil(2026, 1, 15, 18, 0),
      miseEnService: "2026-01-15",
    }),
    attendu: { jour: "2026-01-15", statut: "planifiee", source: "ponctuel_ouvert" },
  },
  {
    cas: "ponctuel ouvert — mise en service passée (generateur.test)",
    recit:
      "« datée de l'événement, pas d'aujourd'hui ». Datée de `now`, l'occurrence se redatait à chaque régénération : une chambre froide de 2015 était réputée due aujourd'hui, dix ans plus tard, et le resterait indéfiniment. Ce qui manque est une pièce, pas un rendez-vous : « à planifier ».",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: "2026-01-15T00:00:00Z",
      miseEnService: "2015-03-01T00:00:00Z",
    }),
    attendu: {
      jour: "2015-03-01",
      statut: "a_planifier",
      source: "ponctuel_ouvert",
      instant: new Date("2015-03-01T00:00:00Z"),
    },
  },
  {
    cas: "ponctuel ouvert — aucune mise en service connue (generateur.test)",
    recit:
      "« aucune vérif ni mise en service connue → à planifier ». Une ligne d'établissement n'a pas d'appareil dont dater l'installation : elle est datée du début du jour de l'origine, et non plus de l'horloge.",
    faits: ligne({ rythme: "mise_en_service_uniquement", origine: "2026-01-15T00:00:00Z" }),
    attendu: {
      jour: "2026-01-15",
      statut: "a_planifier",
      source: "ponctuel_ouvert",
      instant: depuisCleJourCivil("2026-01-15"),
    },
  },
  {
    cas: "ponctuel soldé, conforme (generateur.test)",
    recit:
      "« une obligation one-shot déjà réalisée n'est ni archivée ni replanifiée ». Le seul cas où un statut réalisé reste sur la ligne : il n'y a pas d'échéance suivante à ouvrir.",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: "2025-04-25",
      miseEnService: "2025-04-20",
      rapport: { le: "2025-05-01T00:00:00Z", resultat: "conforme" },
    }),
    attendu: { jour: "2025-04-20", statut: "realisee_conforme", source: "ponctuel_solde" },
  },
  {
    cas: "ponctuel soldé avec réserves — la périodicité DEVENUE ponctuelle (generateur.test, AMENDÉ)",
    recit:
      "RÉGRESSION DE N2 : une ligne roulée par son dépôt porte « planifiée » ; le jour où son rythme devient `mise_en_service_uniquement`, elle gardait une échéance que plus rien n'attend et passait « en retard » sur un contrôle fait. Son statut se relit sur le résultat du dernier rapport. AMENDÉ : l'ancien test gardait aussi la date roulée (2027-03-01) ; le ponctuel soldé est désormais daté de sa mise en service, à défaut de l'origine. Aucun lecteur ne lit la date d'un ponctuel soldé.",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: "2025-02-10",
      rapport: { le: "2026-03-01T00:00:00Z", resultat: "observations_mineures" },
    }),
    attendu: { jour: "2025-02-10", statut: "realisee_observations", source: "ponctuel_solde" },
  },
  {
    cas: "ponctuel soldé sur un écart majeur",
    recit:
      "Le contrôle a eu lieu, son résultat est mauvais : le one-shot est consommé quand même, et c'est l'action corrective qui porte la suite — pas un second rendez-vous que le texte ne prévoit pas.",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: "2026-01-15",
      miseEnService: "2026-01-10",
      rapport: { le: "2026-02-01", resultat: "ecart_majeur" },
    }),
    attendu: { jour: "2026-01-10", statut: "realisee_ecart_majeur", source: "ponctuel_solde" },
  },
  {
    cas: "ponctuel — un héritage ne le solde pas",
    recit:
      "Comme aujourd'hui : la réalisation héritée date une échéance, elle n'atteste pas que CE contrôle unique a eu lieu sur cette ligne. Une ligne ne doit jamais attester d'un acte dont elle ne porte pas la preuve.",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: "2026-01-15",
      heritee: "2025-06-01",
    }),
    attendu: { jour: "2026-01-15", statut: "a_planifier", source: "ponctuel_ouvert" },
  },
  {
    cas: "ponctuel — un résultat qui ne vaut pas réalisation, passé par erreur",
    recit:
      "L'appelant ne doit passer qu'un rapport RÉALISÉ. S'il se trompe, le ponctuel reste ouvert : `statutDepuisResultat` ne connaît que trois résultats, et l'incertitude ne réduit jamais la couverture.",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: "2026-01-15",
      miseEnService: "2026-01-10",
      rapport: { le: "2026-02-01", resultat: "non_verifiable" },
    }),
    attendu: { jour: "2026-01-10", statut: "a_planifier", source: "ponctuel_ouvert" },
  },
  {
    cas: "ponctuel — la suppression du rapport qui le soldait le rouvre",
    recit:
      "Le pendant, pour le contrôle unique, de la suppression du dernier rapport : plus aucune réalisation, donc plus de statut réalisé — la ligne redevient un ponctuel ouvert, datée de sa mise en service. `supprimerRapport` y arrivait par une branche « one-shot » à part ; ici ce sont les mêmes faits que ceux d'un ponctuel jamais contrôlé, donc la même réponse.",
    faits: ligne({
      rythme: "mise_en_service_uniquement",
      origine: "2026-01-15",
      miseEnService: "2026-01-10",
    }),
    attendu: { jour: "2026-01-10", statut: "a_planifier", source: "ponctuel_ouvert" },
  },
  {
    cas: "cyclique — un « non vérifiable » passé par erreur ne fait PAS rouler la ligne",
    recit:
      "Le symétrique de la rangée du ponctuel, relevé par la relecture du 2026-09-17 : `resultat` était typé `string`, le ponctuel s'en défendait et le cyclique non — la règle 3 rendait « planifiée » au 01/06/2027, une période entière gagnée sur un contrôle qui n'a pas eu lieu. C'est le mensonge que `STATUT_DEPUIS_RESULTAT` raconte avoir retiré du dépôt. La ligne reste sur ses autres faits : la mise en service.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-01-10",
      miseEnService: "2026-01-10",
      rapport: { le: "2026-06-01", resultat: "non_verifiable" },
    }),
    attendu: { jour: "2027-01-10", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "cyclique — un « non vérifiable » passé par erreur ne masque pas l'héritage",
    recit:
      "Et il ne vaut pas non plus « réalisation propre » : la réalisation héritée reste la seule connue, et la source le dit.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-01-10",
      heritee: "2025-06-01",
      rapport: { le: "2026-06-01", resultat: "non_verifiable" },
    }),
    attendu: { jour: "2026-06-01", statut: "planifiee", source: "heritage" },
  },

  // --------------------------------------------------------------------------
  // « Non vérifiable », antidaté, suppression — ce que l'appelant ne passe pas
  // --------------------------------------------------------------------------
  {
    cas: "rapport « non vérifiable » seul, mise en service connue",
    recit:
      "Le contrôle n'a pas eu lieu : ce n'est pas une réalisation, et l'appelant passe `realisation: null`. L'ancienne table le mappait sur une réalisation et repoussait l'échéance d'une période entière — deux mensonges pour un contrôle qui n'a pas pu se faire. L'échéance qui courait court toujours.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2026-06-12", origine: "2026-06-12" }),
    attendu: { jour: "2027-06-12", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "rapport « non vérifiable » seul, sans mise en service",
    recit:
      "Même règle, sans source : la ligne reste « à planifier » à son origine. La pièce, elle, empêche toujours la suppression de la ligne (`porteUnePreuve`) — ce n'est pas l'affaire de cette fonction.",
    faits: ligne({ rythme: "annuelle", origine: "2026-06-12" }),
    attendu: { jour: "2026-06-12", statut: "a_planifier", source: "origine" },
  },
  {
    cas: "un « non vérifiable » déposé APRÈS un contrôle (generateur.test)",
    recit:
      "RÉGRESSION DE N2 : le « non vérifiable » repassait la ligne « à planifier », la branche du placeholder prenait la main et réécrivait « mise en service + une période » (2027-06-12), oubliant le contrôle réel du 2026-08-01. Le dernier rapport RÉALISÉ prime sur la mise en service, par l'ordre des règles.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-06-12T00:00:00Z",
      miseEnService: "2026-06-12T00:00:00Z",
      rapport: { le: "2026-08-01T00:00:00Z" },
    }),
    attendu: {
      jour: "2027-08-01",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2027-08-01T00:00:00Z"),
    },
  },
  {
    cas: "rapport antidaté — un rapport de 2024 déposé après celui du 01/03/2026",
    recit:
      "ADR-034 § 3 : la ligne ne recule pas vers un passé qu'un rapport plus récent a déjà dépassé. `rouler` le gardait par une branche « antidaté » ; ici seul le plus récent arrive (`indexerDernieresRealisations`), donc le rapport de 2024 n'a aucun effet — sans branche.",
    faits: ligne({ rythme: "annuelle", origine: "2023-05-01", rapport: { le: "2026-03-01" } }),
    attendu: { jour: "2027-03-01", statut: "planifiee", source: "rapport" },
  },
  {
    cas: "suppression du dernier rapport — il en reste un de 2025",
    recit:
      "La ligne recule d'un cycle : elle revient à l'échéance qu'engendre le dernier contrôle ENCORE PROUVÉ. Le recul vivait dans `supprimerRapport`, avec quatre-vingts lignes de transmission d'`echeanceHonoree` ; c'est la règle 3 sur le rapport restant.",
    faits: ligne({ rythme: "annuelle", origine: "2024-02-01", rapport: { le: "2025-03-01" } }),
    attendu: { jour: "2026-03-01", statut: "planifiee", source: "rapport" },
    retard: { au: "2026-09-17", jours: 200 },
  },
  {
    cas: "suppression du dernier rapport — plus aucun, mise en service connue",
    recit:
      "Retour à la règle 4. `supprimerRapport` rendait l'échéance honorée en « à planifier », faute de savoir si elle était réelle — date masquée à l'écran, et la garde du placeholder bloquait ensuite toute correction. Les faits le savent : née pendant le suivi, c'est une vraie échéance, elle revient « planifiée », donc visible.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2025-06-01", origine: "2025-09-10" }),
    attendu: { jour: "2026-06-01", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "suppression du dernier rapport — plus aucun, aucune source",
    recit:
      "Retour à la règle 5 : la date de génération qui avait roulé revient à l'origine — même date et même statut qu'aujourd'hui, sans lire `echeanceHonoree`.",
    faits: ligne({ rythme: "annuelle", origine: "2026-02-01" }),
    attendu: { jour: "2026-02-01", statut: "a_planifier", source: "origine" },
  },

  // --------------------------------------------------------------------------
  // Règle 3 — la réalisation, propre puis héritée
  // --------------------------------------------------------------------------
  {
    cas: "la vérification connue prime sur la mise en service (generateur.test)",
    recit:
      "2025-06-10 + 1 an, et non 2025-12-01 + 1 an : un contrôle réalisé est une preuve, une mise en service n'est qu'un point de départ par défaut.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-01-15T00:00:00Z",
      miseEnService: "2025-12-01T00:00:00Z",
      rapport: { le: "2025-06-10T00:00:00Z" },
    }),
    attendu: {
      jour: "2026-06-10",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2026-06-10T00:00:00Z"),
    },
  },
  {
    cas: "dernière vérif + un an (generateur.test)",
    recit: "« datePrevue = dernière date + 365 j pour annuelle » — en calendrier : le même jour, un an plus tard.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2025-01-01",
      rapport: { le: "2026-01-10T00:00:00Z" },
    }),
    attendu: {
      jour: "2027-01-10",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2027-01-10T00:00:00Z"),
    },
  },
  {
    cas: "dernière vérif ancienne → date arrêtée, passée, donc en retard (generateur.test)",
    recit:
      "Plus de statut « dépassée » (phase A) : la date calculée depuis le contrôle réel est arrêtée — « planifiée » —, et c'est elle qui dit le retard. Un contrôle annuel fait il y a deux ans a une échéance ouverte vieille d'un an.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2023-06-01",
      rapport: { le: "2024-01-01T00:00:00Z" },
    }),
    attendu: { jour: "2025-01-01", statut: "planifiee", source: "rapport" },
    retard: { au: "2026-03-01T00:00:00Z", jours: 424 },
  },
  {
    cas: "une ligne déjà roulée par son dépôt ne bouge plus (generateur.test)",
    recit:
      "« ne fait plus rouler une ligne déjà roulée » : dépôt du 2026-03-01, ligne au 2027-03-01. Recalculée depuis le même rapport, elle rend la même date — la confluence dépôt / régénération que le lot 4 prouvera de bout en bout.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2025-03-01",
      rapport: { le: "2026-03-01T00:00:00Z" },
    }),
    attendu: {
      jour: "2027-03-01",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2027-03-01T00:00:00Z"),
    },
  },
  {
    cas: "une ligne « à planifier » qui porte un contrôle réel est « planifiée » (generateur.test)",
    recit:
      "Relecture du lot C (2026-09-14) : héritée d'avant la phase A, la ligne s'affichait « aucune vérification enregistrée » au-dessus d'un rapport conforme, sa vraie échéance masquée. Un contrôle réel derrière la ligne, c'est une échéance connue — `statutCycleOuvert` le rattrapait ; ici le statut sort du même calcul que la date.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2024-06-01",
      rapport: { le: "2025-02-01T00:00:00Z" },
    }),
    attendu: {
      jour: "2026-02-01",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2026-02-01T00:00:00Z"),
    },
  },
  {
    cas: "ré-ancrage — une prescription ramène l'annuelle au semestre (generateur.test)",
    recit:
      "Roulée par un dépôt du 2026-03-01 au 2027-03-01, la ligne doit passer au 2026-09-01 : sans ré-ancrage la prescription n'aurait d'effet qu'au dépôt suivant. C'était une branche, bornée à « s'il existe un rapport » ; c'est un cas particulier de « dernier rapport + rythme effectif ».",
    faits: ligne({
      rythme: "semestrielle",
      referentiel: "annuelle",
      origine: "2025-03-01",
      rapport: { le: "2026-03-01T00:00:00Z" },
    }),
    attendu: { jour: "2026-09-01", statut: "planifiee", source: "rapport" },
  },
  {
    cas: "ré-ancrage, avant — GE 4 § 1, visite de 2025, triennale (continuite-identite)",
    recit: "Le témoin : sous trois ans, la visite du 2025-06-01 donne 2028.",
    faits: ligne({
      rythme: "triennale",
      origine: "2025-01-01",
      rapport: { le: "2025-06-01T00:00:00Z" },
    }),
    attendu: {
      jour: "2028-06-01",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2028-06-01T00:00:00Z"),
    },
  },
  {
    cas: "ré-ancrage 2028 → 2030 — la colonne R de GE 4 § 1 se dédouble (continuite-identite)",
    recit:
      "Un centre de formation visité en 2025 qui passe de trois à cinq ans doit voir sa ligne reculer à 2030, pas garder 2028. `continuite-identite.test.ts` doit rester vert sans retouche à la bascule.",
    faits: ligne({
      rythme: "quinquennale",
      origine: "2025-01-01",
      rapport: { le: "2025-06-01T00:00:00Z" },
    }),
    attendu: {
      jour: "2030-06-01",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2030-06-01T00:00:00Z"),
    },
  },
  {
    cas: "héritée seule — la ligne absorbante naît datée, pas « à planifier » (generateur.test)",
    recit:
      "Sans cela, l'exploitant qui a fait faire son contrôle voit apparaître une ligne « à planifier », urgente, pour un acte accompli. Le fragment a été réalisé le 2025-06-01 : l'absorbante annuelle est due au 2026-06-01, en retard au 2026-08-11. De N fragments c'est la réalisation LA PLUS ANCIENNE qui arrive ici (`reprendreLaRealisation`, chez l'appelant) ; un fragment sans réalisation ne lègue rien.",
    faits: ligne({
      rythme: "annuelle",
      origine: NOW_RECONCILIATION,
      heritee: "2025-06-01T00:00:00Z",
    }),
    attendu: {
      jour: "2026-06-01",
      statut: "planifiee",
      source: "heritage",
      instant: new Date("2026-06-01T00:00:00Z"),
    },
    retard: { au: NOW_RECONCILIATION, jours: 71 },
  },
  {
    cas: "héritée À VENIR — une absorbante déjà en base passe « planifiée » (generateur.test)",
    recit:
      "Revue du 2026-09-14 : la branche lisait `ex.statut`, et une absorbante existante recevait sa date héritée en gardant « à planifier, aucune date convenue ». Le statut ne se lit plus sur la ligne : une échéance calculée depuis un contrôle réel est « planifiée ».",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-01-05",
      heritee: "2026-03-01T00:00:00Z",
    }),
    attendu: {
      jour: "2027-03-01",
      statut: "planifiee",
      source: "heritage",
      instant: new Date("2027-03-01T00:00:00Z"),
    },
  },
  {
    cas: "une réalisation SOUS LE NOUVEL IDENTIFIANT prime sur l'héritage (generateur.test)",
    recit:
      "L'exploitant a fait son contrôle après le changement de référentiel : la reprise ne doit pas faire reculer sa ligne du 2027-07-01 vers le 2026-06-01.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-01-05",
      rapport: { le: "2026-07-01T00:00:00Z" },
      heritee: "2025-06-01T00:00:00Z",
    }),
    attendu: {
      jour: "2027-07-01",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2027-07-01T00:00:00Z"),
    },
  },
  {
    cas: "l'héritage ne se rejoue JAMAIS sur une ligne qui a sa propre histoire (generateur.test)",
    recit:
      "LE DÉFAUT LE PLUS GRAVE du lot des successions : le fragment archivé garde pour toujours sa réalisation de 2021, et l'héritage se rejouait à chaque passe suivant un roulement — mesuré : une ligne au 2029-02-01 repartait au 2024-01-10, cinq ans de retard sur un contrôle fait trois ans plus tôt. La garde `!porteUnePreuve` le fermait ; « propre, sinon héritée » ne peut pas se rejouer, par construction.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2021-02-01",
      rapport: { le: "2026-02-01T00:00:00Z" },
      heritee: "2021-01-10T00:00:00Z",
    }),
    attendu: {
      jour: "2027-02-01",
      statut: "planifiee",
      source: "rapport",
      instant: new Date("2027-02-01T00:00:00Z"),
    },
  },
  {
    cas: "LIMITE ÉCRITE — une réalisation antérieure à la mise en service commande quand même",
    recit:
      "Contrôle du 01/05/2024, mise en service corrigée ensuite au 01/08/2026 : l'échéance reste le 01/05/2025, en retard. La fonction ne juge pas de la cohérence entre deux faits déclarés — un rapport daté d'avant l'appareil est peut-être celui de l'appareil remplacé, peut-être une coquille, et elle ne sait pas lequel. Identique à aujourd'hui ; le sens d'erreur est « à refaire », jamais « rien à faire » (ADR-036 § 8).",
    faits: ligne({
      rythme: "annuelle",
      origine: "2024-01-01",
      miseEnService: "2026-08-01",
      rapport: { le: "2024-05-01" },
    }),
    attendu: { jour: "2025-05-01", statut: "planifiee", source: "rapport" },
    retard: { au: "2026-09-17", jours: 504 },
  },
  {
    cas: "l'héritage prime sur la mise en service",
    recit:
      "Un contrôle réel, même hérité, vaut mieux qu'un point de départ par défaut : la règle 3 passe avant la règle 4, pour l'héritée comme pour la propre.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-01-01",
      miseEnService: "2026-01-01",
      heritee: "2025-06-01",
    }),
    attendu: { jour: "2026-06-01", statut: "planifiee", source: "heritage" },
  },

  // --------------------------------------------------------------------------
  // La ligne sur mesure d'une prescription (ADR-035) — jamais de mise en service
  // --------------------------------------------------------------------------
  {
    cas: "ligne sur mesure — à sa naissance",
    recit:
      "`genererVerificationsSurMesure` la datait de `now` : « à planifier », et la date glissait tant que la ligne n'existait pas. Elle est datée de son origine.",
    faits: ligne({ rythme: "semestrielle", origine: "2026-09-01" }),
    attendu: { jour: "2026-09-01", statut: "a_planifier", source: "origine" },
  },
  {
    cas: "ligne sur mesure — après son premier rapport",
    recit: "Puis rapport + rythme, comme toute ligne : une prescription n'a pas de régime de date à elle.",
    faits: ligne({ rythme: "semestrielle", origine: "2026-09-01", rapport: { le: "2026-09-20" } }),
    attendu: { jour: "2027-03-20", statut: "planifiee", source: "rapport" },
  },

  // --------------------------------------------------------------------------
  // Règle 1 — le titre de salarié
  // --------------------------------------------------------------------------
  {
    cas: "titre renouvelé — l'échéance saisie est adoptée (generateur.test)",
    recit:
      "La ligne d'un titre était écrite à sa création et JAMAIS réécrite : le calendrier annonçait l'attestation dépassée à perpétuité, et la rectification promise par docs/rgpd.md § 5.2 (art. 16) restait invisible.",
    faits: ligne({
      rythme: "quinquennale",
      origine: "2021-01-10",
      titre: echeanceDuTitre(
        { delivreLe: date("2026-01-10"), echeanceLe: new Date("2031-01-10T00:00:00Z") },
        "quinquennale",
      ),
    }),
    attendu: {
      jour: "2031-01-10",
      statut: "planifiee",
      source: "titre",
      instant: new Date("2031-01-10T00:00:00Z"),
    },
  },
  {
    cas: "titre — la coquille corrigée fait apparaître le retard (generateur.test)",
    recit:
      "L'autre sens, et il compte autant : une échéance saisie 2036 par erreur, corrigée en 2024, doit faire ressortir le retard. Une correction qui ne corrige que dans un sens n'est pas une correction.",
    faits: ligne({
      rythme: "quinquennale",
      origine: "2021-01-10",
      titre: new Date("2024-01-10T00:00:00Z"),
    }),
    attendu: { jour: "2024-01-10", statut: "planifiee", source: "titre" },
    retard: { au: NOW_RECONCILIATION, jours: 944 },
  },
  {
    cas: "titre — il prime même quand la ligne porte une réalisation (generateur.test, AMENDÉ)",
    recit:
      "« Le correctif du correctif » : placée après la branche de réalisation, la date du titre était perdue dès qu'un rapport avait été déposé — le renouvellement disparaissait sur un chemin sur deux. D'où la règle 1 EN PREMIER. AMENDÉ : l'ancien test conservait aussi un statut réalisé d'avant l'ADR-034 sur ce rythme cyclique ; la règle 1 rend « planifiée », ce que les lecteurs lisaient déjà (`statutLu`).",
    faits: ligne({
      rythme: "quinquennale",
      origine: "2021-01-10",
      rapport: { le: "2026-03-01" },
      titre: new Date("2031-06-01T00:00:00Z"),
    }),
    attendu: {
      jour: "2031-06-01",
      statut: "planifiee",
      source: "titre",
      instant: new Date("2031-06-01T00:00:00Z"),
    },
  },
  {
    cas: "titre sur un rythme `autre`, échéance saisie",
    recit:
      "L'habilitation électrique (`R. 4544-10`) n'a aucune durée écrite : `autre`. Si l'employeur saisit un « valable jusqu'au », c'est une vraie date, portée par la pièce — elle reste en retard quand elle passe (`lignePortantSansRendezVous`). C'est le seul chemin par lequel un rythme `autre` entre ici.",
    faits: ligne({
      rythme: "autre",
      origine: "2024-05-02",
      titre: echeanceDuTitre(
        { delivreLe: date("2024-05-01"), echeanceLe: date("2027-05-01") },
        "autre",
      ),
    }),
    attendu: { jour: "2027-05-01", statut: "planifiee", source: "titre" },
  },
  {
    cas: "titre sans « valable jusqu'au » — délivrance + rythme",
    recit:
      "Relecture système du 2026-09-14 : une VIP quinquennale délivrée le 1er juin 2020 sans date de fin était en retard au calendrier et « sans terme écrit » sur la fiche de la personne. UNE définition, `echeanceDuTitre` ; cette fonction ne la refait pas, elle en reçoit le résultat.",
    faits: ligne({
      rythme: "quinquennale",
      origine: "2026-03-01",
      titre: echeanceDuTitre({ delivreLe: date("2020-06-01"), echeanceLe: null }, "quinquennale"),
    }),
    attendu: { jour: "2025-06-01", statut: "planifiee", source: "titre" },
  },

  // --------------------------------------------------------------------------
  // Règle 4 — la règle 4 bis, évaluée au JOUR DE L'ORIGINE
  // --------------------------------------------------------------------------
  {
    cas: "équipement neuf — premier cycle daté, planifié (generateur.test)",
    recit:
      "Un extincteur posé le 1er décembre se vérifie le 1er décembre suivant : l'outil sait le déduire, il n'a pas à réclamer la date.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-01-15T00:00:00Z",
      miseEnService: "2025-12-01T00:00:00Z",
    }),
    attendu: {
      jour: "2026-12-01",
      statut: "planifiee",
      source: "mise_en_service",
      instant: new Date("2026-12-01T00:00:00Z"),
    },
  },
  {
    cas: "premier cycle déjà écoulé — on ne conclut rien (generateur.test)",
    recit:
      "Mise en service en 2018 et aucune vérification connue : l'équipement a vécu sans que le dossier le sache. Afficher « en retard depuis 2019 » serait inventer un passé — « à planifier ». L'ancien test le datait de `now` ; il est daté de l'origine, et ne glisse plus.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-01-15T00:00:00Z",
      miseEnService: "2018-03-01T00:00:00Z",
    }),
    attendu: { jour: "2026-01-15", statut: "a_planifier", source: "origine" },
  },
  {
    cas: "4 bis — première échéance le LENDEMAIN de l'origine",
    recit: "Née pendant le suivi : réelle.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2025-08-11", origine: "2026-08-10" }),
    attendu: { jour: "2026-08-11", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "4 bis — première échéance LE JOUR MÊME de l'origine, à 23 h 30",
    recit:
      "Règle civile (ADR-011 § 4) : une première échéance datée d'aujourd'hui est encore à venir toute la journée. Comparer des instants la ferait basculer « avant l'origine » dès 00 h 01.",
    faits: ligne({
      rythme: "annuelle",
      miseEnService: "2025-08-11",
      origine: instantCivil(2026, 8, 11, 23, 30),
    }),
    attendu: { jour: "2026-08-11", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "4 bis — première échéance LA VEILLE de l'origine",
    recit:
      "Un jour trop tard : l'échéance est antérieure au suivi, on ne conclut rien. La frontière est au jour civil près, et elle ne bouge plus avec l'horloge.",
    faits: ligne({ rythme: "annuelle", miseEnService: "2025-08-11", origine: "2026-08-12" }),
    attendu: { jour: "2026-08-12", statut: "a_planifier", source: "origine" },
  },

  // --------------------------------------------------------------------------
  // D3 — la conséquence acceptée (ADR-036 § 6)
  // --------------------------------------------------------------------------
  {
    cas: "D3, avant — mise en service 01/01/2026, ligne créée le 01/09/2026, annuel",
    recit: "Le témoin : première échéance au 01/01/2027, après l'origine — « planifiée ».",
    faits: ligne({ rythme: "annuelle", miseEnService: "2026-01-01", origine: "2026-09-01" }),
    attendu: { jour: "2027-01-01", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "D3 — une prescription semestrielle fait passer la première échéance AVANT l'origine",
    recit:
      "La première échéance devient le 01/07/2026, avant l'origine : la règle 4 ne conclut plus, et la ligne passe « à planifier » au 01/09/2026 — en retard dès le lendemain. C'est exactement ce qu'elle aurait affiché si la prescription avait existé à la création : le prix de l'indépendance à l'ordre des saisies, à confirmer par la propriétaire.",
    faits: ligne({
      rythme: "semestrielle",
      referentiel: "annuelle",
      miseEnService: "2026-01-01",
      origine: "2026-09-01",
    }),
    attendu: { jour: "2026-09-01", statut: "a_planifier", source: "origine" },
    retard: { au: "2026-09-02", jours: 1 },
  },

  // --------------------------------------------------------------------------
  // Le premier délai, dans la règle 4 — et nulle part ailleurs
  // --------------------------------------------------------------------------
  {
    cas: "`premierDelai` — sans historique, la première échéance le suit (generateur.test)",
    recit:
      "`esp-inspection-periodique` : trois ans pour la PREMIÈRE inspection, puis quatre (arrêté du 20 novembre 2017, art. 15). Corriger le rythme en quatre ans repoussait la première inspection d'un an — une sous-application que personne ne peut voir, sur une ligne de criticité 5.",
    faits: ligne({
      rythme: "quadriennale",
      premierDelai: "triennale",
      origine: "2026-01-15T00:00:00Z",
      miseEnService: "2025-12-01T00:00:00Z",
    }),
    attendu: { jour: "2028-12-01", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "`premierDelai` — un contrôle connu fait repartir le RYTHME, jamais le premier délai (generateur.test)",
    recit: "La portée à ne pas élargir : sans elle, le premier cycle se rejouerait après chaque rapport déposé.",
    faits: ligne({
      rythme: "quadriennale",
      premierDelai: "triennale",
      origine: "2026-01-15T00:00:00Z",
      rapport: { le: "2025-12-01T00:00:00Z" },
    }),
    attendu: { jour: "2029-12-01", statut: "planifiee", source: "rapport" },
  },
  {
    cas: "sans `premierDelai`, le rythme s'applique dès le premier cycle (generateur.test)",
    recit: "Le témoin des deux rangées précédentes : 2029, pas 2028.",
    faits: ligne({
      rythme: "quadriennale",
      origine: "2026-01-15T00:00:00Z",
      miseEnService: "2025-12-01T00:00:00Z",
    }),
    attendu: { jour: "2029-12-01", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "D1 — le récipient sous pression de 2025, sous prescription annuelle",
    recit:
      "Deux plafonds sur le même premier cycle : trois ans (le texte) et un an (l'assureur). Le plus bas lie — « première inspection à trois ans, puis chaque année » serait absurde.",
    faits: ligne({
      rythme: "annuelle",
      referentiel: "quadriennale",
      premierDelai: "triennale",
      origine: "2025-12-01",
      miseEnService: "2025-12-01",
    }),
    attendu: { jour: "2026-12-01", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "D1 — une prescription MOINS stricte que le premier délai ne le desserre pas",
    recit:
      "Rythme quinquennal ramené à quatre ans par une prescription, premier délai de trois ans : la ligne est quadriennale, mais sa première échéance reste à trois ans. La prescription resserre le rythme, elle ne repousse pas un plafond que le texte pose plus bas qu'elle.",
    faits: ligne({
      rythme: "quadriennale",
      referentiel: "quinquennale",
      premierDelai: "triennale",
      origine: "2025-12-01",
      miseEnService: "2025-12-01",
    }),
    attendu: { jour: "2028-12-01", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "D1 — un premier délai PLUS LONG que le rythme, sans prescription",
    recit:
      "« Première vérification à deux ans, puis annuelle » : le premier délai n'est jamais comparé au rythme du référentiel — le même texte a voulu les deux. La formule du plan, écrite nue, rendait 2026 ; le générateur d'aujourd'hui rend 2027, et c'est lui qui a raison.",
    faits: ligne({
      rythme: "annuelle",
      premierDelai: "biennale",
      origine: "2025-12-01",
      miseEnService: "2025-12-01",
    }),
    attendu: { jour: "2027-12-01", statut: "planifiee", source: "mise_en_service" },
  },

  // --------------------------------------------------------------------------
  // L'arithmétique — celle de `prochaineEcheance`, jamais une autre
  // --------------------------------------------------------------------------
  {
    cas: "fin de mois — 31 août + 6 mois = 28 février",
    recit: "Écrêtage en fin de mois : ni le 2 ni le 3 mars, comme le ferait `setMonth`.",
    faits: ligne({ rythme: "semestrielle", origine: "2025-01-01", rapport: { le: "2025-08-31" } }),
    attendu: { jour: "2026-02-28", statut: "planifiee", source: "rapport" },
  },
  {
    cas: "fin de mois — 31 janvier + 1 mois, depuis une mise en service",
    recit: "La règle 4 passe par la même arithmétique que la règle 3.",
    faits: ligne({ rythme: "mensuelle", miseEnService: "2025-01-31", origine: "2025-01-31" }),
    attendu: { jour: "2025-02-28", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "29 février 2028 + 1 an = 28 février 2029",
    recit: "Un contrôle fait un 29 février n'a pas d'anniversaire : il est dû le 28.",
    faits: ligne({ rythme: "annuelle", origine: "2027-01-01", rapport: { le: "2028-02-29" } }),
    attendu: { jour: "2029-02-28", statut: "planifiee", source: "rapport" },
  },
  {
    cas: "29 février 2024 + 4 ans = 29 février 2028",
    recit: "Et quand l'anniversaire existe, il est rendu.",
    faits: ligne({ rythme: "quadriennale", miseEnService: "2024-02-29", origine: "2024-03-01" }),
    attendu: { jour: "2028-02-29", statut: "planifiee", source: "mise_en_service" },
  },
  {
    cas: "quinquennale — le même jour, cinq ans plus tard (generateur.test)",
    recit:
      "Ce test figeait « + 1825 jours », c'est-à-dire le 31 mai 2029 : il asserterait la dérive qu'il fallait corriger. Cinq ans après le 1er juin, c'est le 1er juin — 2028 est bissextile, et le texte compte en années (lot 4 du § 11).",
    faits: ligne({
      rythme: "quinquennale",
      origine: "2024-01-01",
      rapport: { le: "2024-06-01T00:00:00Z" },
    }),
    attendu: { jour: "2029-06-01", statut: "planifiee", source: "rapport" },
  },
  {
    cas: "hebdomadaire à travers le changement d'heure du 29 mars 2026",
    recit:
      "Sept jours civils, pas 7 × 86 400 000 ms : minuit de Paris reste minuit de Paris, et l'échéance ne glisse pas à 23 h la veille (`garde-fuseau.test.ts`).",
    faits: ligne({ rythme: "hebdomadaire", origine: "2026-03-01", rapport: { le: "2026-03-27" } }),
    attendu: {
      jour: "2026-04-03",
      statut: "planifiee",
      source: "rapport",
      instant: depuisCleJourCivil("2026-04-03"),
    },
  },

  // --------------------------------------------------------------------------
  // Règle 5 — le début du jour CIVIL de Paris de l'origine
  // --------------------------------------------------------------------------
  {
    cas: "origine à 23 h 30 à Paris → minuit du MÊME jour civil",
    recit:
      "Le 15 juin à 23 h 30, c'est 21 h 30 UTC : un début de jour pris en UTC rendrait le 15 à 02 h de Paris, et un arrondi naïf le 16. La forme canonique de l'ADR-011 est minuit de Paris.",
    faits: ligne({ rythme: "annuelle", origine: instantCivil(2026, 6, 15, 23, 30) }),
    attendu: {
      jour: "2026-06-15",
      statut: "a_planifier",
      source: "origine",
      instant: new Date("2026-06-14T22:00:00Z"),
    },
  },
  {
    cas: "origine à 00 h 30 à Paris → le jour de PARIS, pas celui d'UTC",
    recit:
      "Le 16 juin à 00 h 30, il est encore le 15 à 22 h 30 en UTC — le serveur. Une ligne créée après minuit est suivie depuis le 16, et son retard commence le 17.",
    faits: ligne({ rythme: "annuelle", origine: instantCivil(2026, 6, 16, 0, 30) }),
    attendu: {
      jour: "2026-06-16",
      statut: "a_planifier",
      source: "origine",
      instant: new Date("2026-06-15T22:00:00Z"),
    },
  },
  {
    cas: "aucune source — « à planifier », datée du jour (generateur.test, AMENDÉ)",
    recit:
      "« crée une occurrence à planifier, datée du jour ». AMENDÉ : l'ancien test attendait l'instant exact de `now` (minuit UTC, soit 01 h à Paris) ; la règle 5 rend minuit de Paris du même jour. Conséquence écrite dans l'ADR-036 : chaque « à planifier » est réécrit une fois, vers la forme canonique — le passage à blanc les range sous `meme_jour_civil`.",
    faits: ligne({ rythme: "annuelle", origine: "2026-01-15T00:00:00Z" }),
    attendu: {
      jour: "2026-01-15",
      statut: "a_planifier",
      source: "origine",
      instant: new Date("2026-01-14T23:00:00Z"),
    },
  },

  // --------------------------------------------------------------------------
  // Les tests de `generateur.test.ts` qui figeaient « la date en base fait foi »
  // --------------------------------------------------------------------------
  {
    cas: "déclarer un extincteur de plus n'efface pas un retard (generateur.test)",
    recit:
      "« ne repousse jamais l'échéance d'un cycle encore ouvert », « ne supprime pas une vérification dépassée porteuse d'une action », « ne bouge pas l'échéance calculée d'un équipement » : le delete/create repoussait `datePrevue` à `now` à chaque régénération. Le scénario et l'assertion restent ; le retard s'exprime par un FAIT — la ligne est suivie depuis le 2026-02-01 — et non plus par une date qu'on s'interdit de toucher.",
    faits: ligne({ rythme: "annuelle", origine: "2026-02-01T00:00:00Z" }),
    attendu: { jour: "2026-02-01", statut: "a_planifier", source: "origine" },
    retard: { au: NOW_RECONCILIATION, jours: 191 },
  },
  {
    cas: "un placeholder cède devant une vraie date (generateur.test)",
    recit:
      "« À planifier » n'est pas un rendez-vous, c'est son absence : la remplacer par une date déduite de la mise en service n'efface rien. C'était une branche, gardée par trois conditions ; c'est la règle 4.",
    faits: ligne({
      rythme: "annuelle",
      origine: NOW_RECONCILIATION,
      miseEnService: "2026-03-01T00:00:00Z",
    }),
    attendu: {
      jour: "2027-03-01",
      statut: "planifiee",
      source: "mise_en_service",
      instant: new Date("2027-03-01T00:00:00Z"),
    },
  },
  {
    cas: "INVERSÉ — « n'efface pas un retard déjà constaté » (generateur.test)",
    recit:
      "Le test exigeait qu'une ligne « à planifier » au 2026-02-01 garde sa date passée quand le générateur sait calculer le 2027-03-01 : la garde « date pas passée », posée parce qu'on ne savait pas distinguer une date de génération d'un rendez-vous manqué. Sa date n'est justifiable par aucun fait — il encodait le défaut (c'est S5, et la « limite écrite » de la phase A). Par les faits : un appareil mis en service le 2026-03-01 doit son premier contrôle le 2027-03-01, et n'a manqué aucun rendez-vous. Nommé dans l'ADR-036 § 5.",
    faits: ligne({
      rythme: "annuelle",
      origine: "2026-02-01T00:00:00Z",
      miseEnService: "2026-03-01T00:00:00Z",
    }),
    attendu: {
      jour: "2027-03-01",
      statut: "planifiee",
      source: "mise_en_service",
      instant: new Date("2027-03-01T00:00:00Z"),
    },
    retard: { au: NOW_RECONCILIATION, jours: 0 },
  },
];

describe("echeanceDeLigne — la table de vérité (ADR-036)", () => {
  it("porte assez de rangées pour que la suite ne passe pas à vide", () => {
    // Garde-fou du test lui-même, comme dans `garde-fuseau.test.ts` : un
    // `TABLE` vidé par une mauvaise fusion rendrait le `it.each` muet.
    expect(TABLE.length).toBeGreaterThanOrEqual(60);
    expect(new Set(TABLE.map((r) => r.cas)).size).toBe(TABLE.length);
    // Les sept sources sont toutes atteintes par une rangée au moins.
    expect(new Set(TABLE.map((r) => r.attendu.source))).toEqual(
      new Set<SourceEcheance>([
        "titre",
        "ponctuel_solde",
        "ponctuel_ouvert",
        "rapport",
        "heritage",
        "mise_en_service",
        "origine",
      ]),
    );
  });

  it.each(TABLE)("$cas", ({ recit, faits, attendu, retard }) => {
    const rendu = echeanceDeLigne(faits);

    expect(cleJourCivil(rendu.datePrevue), recit).toBe(attendu.jour);
    expect(rendu.statut, recit).toBe(attendu.statut);
    expect(rendu.source, recit).toBe(attendu.source);
    if (attendu.instant !== undefined) {
      expect(rendu.datePrevue.toISOString(), recit).toBe(attendu.instant.toISOString());
    }
    if (retard !== undefined) {
      expect(joursDeRetard(rendu.datePrevue, date(retard.au)), recit).toBe(retard.jours);
    }
  });
});

describe("echeanceDeLigne — la précondition", () => {
  it("refuse un rythme `autre` sans date de titre", () => {
    // Le titre `autre` dont l'employeur n'a saisi aucune échéance :
    // `echeanceDuTitre` rend `null`, le générateur ne produit aucune ligne, et
    // cette fonction n'a rien à dater. Rendre une date ici peindrait en rouge
    // une non-conformité que le texte ne pose pas (l'habilitation électrique,
    // ADR-023 § 6).
    const titre = echeanceDuTitre({ delivreLe: date("2024-05-01"), echeanceLe: null }, "autre");
    expect(titre).toBeNull();
    expect(() =>
      echeanceDeLigne(ligne({ rythme: "autre", origine: "2024-05-02", titre })),
    ).toThrow(/précondition/);
  });

  it("le refuse AUSSI quand la ligne porte une réalisation : c'est à l'appelant de la solder", () => {
    // LE CAS EXISTE (relecture du 2026-09-17). Une prescription donne un rythme
    // à une obligation `autre` sur un appareil, un rapport y est déposé, la
    // prescription est levée : la ligne reste en base — elle porte une trace —
    // sous un rythme `autre`, et on peut encore y déposer un rapport. `rouler`
    // le sert aujourd'hui : date gardée, statut du résultat. `recalculerLigne`
    // (lot 4) fera de même HORS de cette fonction, comme la boucle NB4 du
    // réconciliateur — ce test tient la frontière : une réalisation ne fait
    // pas entrer un rythme sans rendez-vous dans le calcul des dates.
    expect(() =>
      echeanceDeLigne(
        ligne({
          rythme: "autre",
          origine: "2026-01-10",
          miseEnService: "2026-01-10",
          rapport: { le: "2026-06-01", resultat: "conforme" },
        }),
      ),
    ).toThrow(/précondition/);
  });

  it("et ne le refuse que lui : un ponctuel sans date de titre est servi", () => {
    expect(() =>
      echeanceDeLigne(ligne({ rythme: "mise_en_service_uniquement", origine: "2024-05-02" })),
    ).not.toThrow();
  });
});

describe("premierPas — D1 de l'ADR-036", () => {
  type Cas = {
    cas: string;
    recit: string;
    premierDelai: Periodicite | undefined;
    referentiel: Periodicite;
    surcharge: Periodicite | null;
    attendu: Periodicite;
  };
  const CAS: Cas[] = [
    {
      cas: "sans premier délai, sans prescription",
      recit: "Le rythme s'applique dès le premier cycle — le comportement d'avant.",
      premierDelai: undefined,
      referentiel: "annuelle",
      surcharge: null,
      attendu: "annuelle",
    },
    {
      cas: "premier délai plus COURT que le rythme (esp-inspection-periodique)",
      recit: "Trois ans, puis quatre : le seul `premierDelai` du référentiel livré.",
      premierDelai: "triennale",
      referentiel: "quadriennale",
      surcharge: null,
      attendu: "triennale",
    },
    {
      cas: "premier délai plus LONG que le rythme, sans prescription",
      recit:
        "« Première à deux ans, puis annuelle » : jamais comparé au rythme du référentiel. La formule nue du plan, qui prenait le rythme EFFECTIF en troisième argument, rendait `annuelle` ici — `null` dit « pas de prescription », et la base est rendue telle quelle.",
      premierDelai: "biennale",
      referentiel: "annuelle",
      surcharge: null,
      attendu: "biennale",
    },
    {
      cas: "LA PERMUTATION — référentiel et surcharge échangés",
      recit:
        "Relecture du 2026-09-17 : trois `Periodicite` voisins se permutent sans que le compilateur dise rien. `premierPas(triennale, quadriennale, annuelle)` rend `annuelle` (rangée suivante) ; permuté, il rend `triennale` — une surcharge moins stricte que la base ne desserre rien. Le résultat diffère, donc la table voit une permutation chez l'appelant ; et le sens d'erreur est le plafond du texte, jamais plus lâche que lui.",
      premierDelai: "triennale",
      referentiel: "annuelle",
      surcharge: "quadriennale",
      attendu: "triennale",
    },
    {
      cas: "prescription plus stricte que le premier délai",
      recit: "Deux plafonds sur le même cycle : le plus bas lie.",
      premierDelai: "triennale",
      referentiel: "quadriennale",
      surcharge: "annuelle",
      attendu: "annuelle",
    },
    {
      cas: "prescription MOINS stricte que le premier délai",
      recit:
        "Une prescription quadriennale sur un rythme quinquennal ne desserre pas un premier délai de trois ans : le texte reste le plafond le plus bas.",
      premierDelai: "triennale",
      referentiel: "quinquennale",
      surcharge: "quadriennale",
      attendu: "triennale",
    },
    {
      cas: "prescription ÉGALE au premier délai",
      recit: "« Strictement plus stricte » : à égalité la base reste — c'est la même valeur.",
      premierDelai: "triennale",
      referentiel: "quadriennale",
      surcharge: "triennale",
      attendu: "triennale",
    },
    {
      cas: "sans premier délai, sous prescription (S7)",
      recit: "La base est le rythme du référentiel, et la prescription le resserre.",
      premierDelai: undefined,
      referentiel: "annuelle",
      surcharge: "semestrielle",
      attendu: "semestrielle",
    },
    {
      cas: "premier délai plus long que le rythme ET prescription",
      recit: "La prescription resserre le rythme, donc a fortiori le premier délai.",
      premierDelai: "biennale",
      referentiel: "annuelle",
      surcharge: "semestrielle",
      attendu: "semestrielle",
    },
    {
      cas: "une prescription donne un rythme à une obligation `autre`",
      recit:
        "Une périodicité sans échéance est « infiniment longue » (`estPeriodicitePlusStricte`) : tout rythme daté la renforce, et devient le premier pas.",
      premierDelai: undefined,
      referentiel: "autre",
      surcharge: "semestrielle",
      attendu: "semestrielle",
    },
  ];

  it.each(CAS)("$cas", ({ recit, premierDelai, referentiel, surcharge, attendu }) => {
    expect(premierPas(premierDelai, referentiel, surcharge), recit).toBe(attendu);
  });
});

describe("echeanceDeLigne — propriétés", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("idempotence : aucune horloge n'est lue, deux appels rendent la même chose quel que soit le jour", () => {
    // La propriété que le générateur actuel ne peut pas tenir : il lit `now`,
    // donc S1 rendait une date différente chaque jour. Ici l'horloge du
    // processus est déplacée de vingt ans ; rien ne doit bouger.
    const reference = TABLE.map((r) => echeanceDeLigne(r.faits));
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const jour of ["2020-01-01T12:00:00Z", "2026-12-20T23:59:59Z", "2040-07-01T00:00:00Z"]) {
      vi.setSystemTime(new Date(jour));
      expect(TABLE.map((r) => echeanceDeLigne(r.faits))).toEqual(reference);
    }
  });

  it("ne modifie pas les faits qu'on lui passe", () => {
    for (const r of TABLE) {
      const avant = JSON.stringify(r.faits);
      const geles = Object.freeze({
        ...r.faits,
        realisation: r.faits.realisation ? Object.freeze({ ...r.faits.realisation }) : null,
      });
      echeanceDeLigne(geles);
      expect(JSON.stringify(r.faits), r.cas).toBe(avant);
    }
  });

  it("stabilité : remettre dans les faits la date rendue ne change rien, là où elle EST un fait", () => {
    // Applicable quand la date rendue est elle-même un fait d'entrée — la date
    // du titre, la mise en service d'un ponctuel, le début du jour de l'origine.
    // Aux règles 3 et 4 la date rendue est « un fait + un pas » : la remettre
    // dans les faits reviendrait à faire rouler la ligne, ce qui est une autre
    // question. Leur stabilité est la propriété suivante.
    let eprouvees = 0;
    for (const r of TABLE) {
      const rendu = echeanceDeLigne(r.faits);
      let rejoues: FaitsDeLigne | null = null;
      if (rendu.source === "titre") {
        rejoues = { ...r.faits, dateDuTitre: rendu.datePrevue };
      } else if (rendu.source === "origine") {
        rejoues = { ...r.faits, origine: rendu.datePrevue };
      } else if (rendu.source === "ponctuel_ouvert" || rendu.source === "ponctuel_solde") {
        rejoues =
          r.faits.miseEnService !== null
            ? { ...r.faits, miseEnService: rendu.datePrevue }
            : { ...r.faits, origine: rendu.datePrevue };
      }
      if (rejoues === null) continue;
      eprouvees += 1;
      expect(echeanceDeLigne(rejoues), r.cas).toEqual(rendu);
    }
    expect(eprouvees).toBeGreaterThanOrEqual(20);
  });

  it("indifférence : chaque règle ne lit que SES faits", () => {
    // Ce qui rend l'ordre des saisies sans effet. Une ligne datée par un rapport
    // ne dépend ni de l'origine, ni de la mise en service, ni du premier pas ;
    // une ligne datée par un titre ne dépend de rien d'autre.
    const ailleurs = {
      origine: date("1999-12-31"),
      miseEnService: date("2001-02-03"),
      premierPas: "decennale" as const,
    };
    let eprouvees = 0;
    for (const r of TABLE) {
      const rendu = echeanceDeLigne(r.faits);
      if (rendu.source === "rapport" || rendu.source === "heritage") {
        expect(echeanceDeLigne({ ...r.faits, ...ailleurs }), r.cas).toEqual(rendu);
        eprouvees += 1;
      }
      if (rendu.source === "titre") {
        expect(
          echeanceDeLigne({
            ...r.faits,
            ...ailleurs,
            realisation: { date: date("2003-04-05"), resultat: "ecart_majeur" },
            realisationHeritee: date("2002-01-01"),
          }),
          r.cas,
        ).toEqual(rendu);
        eprouvees += 1;
      }
    }
    expect(eprouvees).toBeGreaterThanOrEqual(20);
  });
});

// ============================================================================
// Deux gardes statiques, sur le modèle de `lib/dates/garde-fuseau.test.ts`
// ============================================================================

const RACINE_SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CE_MODULE = "lib/calendrier/echeance-de-ligne.ts";
const CE_TEST = "lib/calendrier/echeance-de-ligne.test.ts";

/**
 * Neutralise les commentaires : ce dépôt commente densément le motif fautif
 * lui-même, et ce module plus que les autres.
 *
 * EN UNE PASSE, CHAÎNES PRÉSERVÉES (relecture du 2026-09-17). La première
 * rédaction — celle de `garde-fuseau.test.ts` — coupait chaque ligne au premier
 * `//`, y compris dans une chaîne : `import("https://…")`, ou un chemin
 * d'import écrit après un `//` de chaîne sur la même ligne, disparaissaient
 * avec le « commentaire ». Pour une garde qui CHERCHE des chaînes, c'est un
 * faux négatif. Ici une chaîne rencontrée avant un commentaire est rendue telle
 * quelle, et ce qu'elle contient n'ouvre aucun commentaire.
 *
 * Ce que ça ne sait toujours pas lire : une apostrophe de texte JSX ouvre une
 * fausse chaîne jusqu'à la prochaine apostrophe de la MÊME ligne, et un gabarit
 * imbriqué dans un `${…}` referme le sien trop tôt. Les deux avalent au pire un
 * bout de ligne ; le spécificateur d'un import, lui, est une chaîne entière et
 * reste lisible.
 */
function sansCommentaires(code: string): string {
  return code.replace(
    /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (tout: string, chaine: string | undefined) =>
      chaine ?? tout.replace(/[^\n]/g, " "),
  );
}

/** Tous les .ts/.tsx de src/, TESTS COMPRIS : un test qui importerait le module
 *  avant la bascule le brancherait tout autant dans la tête du lecteur. */
function listerSources(): { chemin: string; code: string }[] {
  const out: { chemin: string; code: string }[] = [];
  const parcourir = (dossier: string): void => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const complet = join(dossier, e.name);
      if (e.isDirectory()) parcourir(complet);
      else if (/\.tsx?$/.test(e.name)) {
        out.push({
          chemin: relative(RACINE_SRC, complet).split(sep).join("/"),
          code: readFileSync(complet, "utf8"),
        });
      }
    }
  };
  parcourir(RACINE_SRC);
  return out;
}

describe("echeance-de-ligne.ts — module pur", () => {
  const code = sansCommentaires(readFileSync(join(RACINE_SRC, CE_MODULE), "utf8"));

  it("ne lit aucune horloge", () => {
    // Pas même `new Date(x)` : le module ne FABRIQUE aucune date, il compose
    // celles que `lib/dates` et `periodicite.ts` lui rendent.
    expect(code).not.toMatch(/new Date\(/);
    expect(code).not.toMatch(/Date\.now\(/);
    expect(code).not.toMatch(/performance\.now\(/);
  });

  it("n'importe ni la base, ni la session, ni le cadre", () => {
    const imports = [...code.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    for (const i of imports) {
      expect(i).not.toMatch(/prisma|@\/lib\/auth|supabase|^next(\/|$)|^react/);
    }
  });
});

describe("ADR-036 — le module n'est PAS branché avant la bascule", () => {
  // ⚠ CE TEST EST À RETIRER À LA BASCULE (lot 4 de l'ADR-036), et dès le lot 2c
  // il faudra y inscrire la stratégie candidate `deciderParFaits` et le script
  // du passage à blanc. Il n'a pas vocation à durer : il tient le lot 1 à ce
  // qu'il annonce — une fonction posée À CÔTÉ du moteur, que rien n'appelle.
  //
  // Ce qu'il empêche : qu'un lot intermédiaire branche `echeanceDeLigne` sur un
  // seul des trois chemins (régénération, dépôt, suppression). Deux calculs de
  // date en production, c'est l'état que l'ADR-036 existe pour quitter — et
  // `version-moteur.test.ts` ne le verrait que si l'import passait par
  // `calendrier/actions.ts`.
  //
  // `scripts/` N'EST VOLONTAIREMENT PAS PARCOURU : le passage à blanc du lot 2c
  // y vit, et c'est justement l'endroit d'où le module doit pouvoir être appelé
  // avant la bascule — un script lancé à la main, en lecture seule, n'est pas
  // un chemin de production (ADR-036 § 9).
  const MOTIF_IMPORT = /echeance-de-ligne(\.[cm]?[jt]sx?)?["'`]/;

  it("le motif reconnaît les formes d'import, et le filtre ne lui cache rien", () => {
    // Le test de la garde elle-même : sans lui, un motif trop étroit passe à
    // vide et la garde est percée en silence.
    const branche = [
      'import { echeanceDeLigne } from "./echeance-de-ligne";',
      "import { premierPas } from '@/lib/calendrier/echeance-de-ligne.js';",
      'const m = await import("../calendrier/echeance-de-ligne.ts");',
      "const m = await import(`./echeance-de-ligne`);",
      'const vrai = await vi.importActual("./echeance-de-ligne");',
      'vi.mock("@/lib/calendrier/echeance-de-ligne", () => ({}));',
      'const url = "https://exemple.test//x"; import x from "./echeance-de-ligne";',
    ];
    for (const ligneDeCode of branche) {
      expect(MOTIF_IMPORT.test(sansCommentaires(ligneDeCode)), ligneDeCode).toBe(true);
    }
    const innocent = [
      '// import { echeanceDeLigne } from "./echeance-de-ligne";',
      '/* voir "./echeance-de-ligne" */ const x = 1;',
      "// `echeance-de-ligne.ts` n'est pas encore branché",
      'import { x } from "./echeance-de-ligne-autre";',
    ];
    for (const ligneDeCode of innocent) {
      expect(MOTIF_IMPORT.test(sansCommentaires(ligneDeCode)), ligneDeCode).toBe(false);
    }
  });

  it("aucun fichier de src/ ne l'importe, hors son propre test", () => {
    const sources = listerSources();
    // Un chemin faux ferait passer l'assertion à vide.
    expect(sources.length).toBeGreaterThan(100);
    expect(sources.some((s) => s.chemin === CE_MODULE)).toBe(true);

    const importateurs = sources
      .filter((s) => s.chemin !== CE_MODULE && s.chemin !== CE_TEST)
      // TOUTE CHAÎNE qui se termine par le nom du module, extension comprise,
      // quel que soit ce qui la précède : `from`, `import(`, `require(`,
      // `vi.mock(`, `vi.importActual(`, entre guillemets, apostrophes ou
      // backticks. La première rédaction énumérait les préfixes et ratait
      // « ./echeance-de-ligne.js », les gabarits et `importActual` (relecture
      // du 2026-09-17) ; chercher la chaîne plutôt que l'instruction n'a pas de
      // liste à tenir.
      .filter((s) => MOTIF_IMPORT.test(sansCommentaires(s.code)))
      .map((s) => s.chemin);

    expect(
      importateurs,
      "`echeance-de-ligne.ts` ne se branche pas avant la bascule : le passage à " +
        "blanc est le lot 2c de l'ADR-036 (stratégie candidate, que rien en " +
        "production n'importe), la bascule est le lot 4 (les trois chemins " +
        "ensemble, `VERSION_MOTEUR_CALENDRIER` = 3). Voir " +
        "docs/adr/036-echeance-calculee-depuis-les-faits.md § 9 — et retirer " +
        "ce test dans le lot qui branche.",
    ).toEqual([]);
  });
});
