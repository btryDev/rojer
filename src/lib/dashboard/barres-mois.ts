// Les barres de l'année du tableau de bord, sans la base : la partie testable
// de `compterObligationsParMois`.
//
// Module PUR : aucun client Prisma. La lecture vit dans `queries.ts`.

import { composantesCiviles } from "@/lib/dates";
import { aUnRendezVous, lecturesCalendrier } from "@/lib/calendrier/etats";
import type { VerificationDatee } from "@/lib/dates/retard";

export type BarMois = {
  mois: number; // 0-11
  annee: number;
  /** Contrôles FAITS dans le mois : un par rapport réalisé daté du mois. */
  couvert: number;
  /** Échéances CONNUES du mois, non dépassées. Une « à planifier » n'y est
   *  pas : sa date est une date de génération (`aUnRendezVous`). */
  aVenir: number;
  /** Échéances ouvertes du mois, dépassées (la date seule, ADR-011). */
  retard: number;
};

/**
 * Les douze mois, et ce qu'aucun mois ne porte : les lignes SANS ÉCHÉANCE
 * CONNUE de l'année (`aUnRendezVous`), rangées comme elles l'auraient été sur
 * une barre. Elles ne se dessinent pas ; elles se comptent — un retard ne
 * sort pas d'un compte faute de mois.
 */
export type BarresAnnee = {
  mois: BarMois[];
  sansEcheance: { aVenir: number; retard: number };
};

/**
 * Répartit sur les douze mois de `annee` ce que chaque ligne pose sur le
 * calendrier.
 *
 * DEUX SORTES D'ÉVÉNEMENTS, ET AUCUN N'EST COMPTÉ DEUX FOIS :
 *  · `couvert` — un CONTRÔLE FAIT, au mois de la `dateRapport` de chaque
 *    rapport réalisé de la ligne ;
 *  · `retard` / `aVenir` — l'ÉCHÉANCE OUVERTE de la ligne (ADR-034), au mois
 *    de sa `datePrevue`, classée par `lecturesCalendrier` comme au calendrier.
 * Une ligne en porte au plus une ouverte, et autant de faits que de rapports :
 * la somme d'une barre se lit « contrôles faits + échéances dues dans le
 * mois ».
 *
 * TOUS LES RAPPORTS, PAS LE DERNIER. La barre lisait la lecture `realisation`
 * de `lecturesCalendrier`, qui ne pose QUE le dernier rapport — c'est son rôle
 * au calendrier, où la tuile dit « fait le … ». Sur un historique, c'était
 * faux : une ligne trimestrielle contrôlée en mars puis en juin voyait sa barre
 * de mars retomber à 0 au dépôt de juin, comme si le contrôle de mars n'avait
 * jamais eu lieu (relecture système du 2026-09-14). L'historique d'une ligne,
 * ce sont ses rapports (ADR-034) : chacun compte au mois où il a eu lieu.
 *
 * LE REPLI. Une ponctuelle consommée SANS rapport (seed, import) n'a d'autre
 * trace de son contrôle que son statut : `lecturesCalendrier` pose alors son
 * fait sur `datePrevue`, et la barre le garde tel quel. Dès qu'un rapport
 * existe, ce sont les rapports qui parlent, et eux seuls.
 *
 * Une ligne archivée garde ses faits — une preuve ne s'efface pas — et ne pose
 * aucune échéance, comme au calendrier.
 */
export function repartirParMois(
  lignes: ReadonlyArray<
    VerificationDatee & {
      /** Les dates de TOUS les rapports réalisés de la ligne, pas seulement
       *  ceux de l'année : l'existence d'un rapport hors de l'année décide du
       *  repli ci-dessus. */
      rapportsRealises: ReadonlyArray<{ dateRapport: Date }>;
    }
  >,
  annee: number,
  now: Date,
): BarresAnnee {
  const buckets: BarMois[] = Array.from({ length: 12 }, (_, i) => ({
    mois: i,
    annee,
    couvert: 0,
    aVenir: 0,
    retard: 0,
  }));
  const sansEcheance = { aVenir: 0, retard: 0 };

  const poser = (date: Date, segment: "couvert" | "aVenir" | "retard") => {
    const c = composantesCiviles(date);
    if (c.annee !== annee) return;
    buckets[c.mois - 1][segment] += 1;
  };

  for (const v of lignes) {
    let derniere: Date | null = null;
    for (const r of v.rapportsRealises) {
      if (derniere === null || r.dateRapport.getTime() > derniere.getTime()) {
        derniere = r.dateRapport;
      }
    }

    for (const lec of lecturesCalendrier({ ...v, derniereRealisation: derniere }, now)) {
      if (lec.lecture === "realisation") {
        // La lecture ne pose que le DERNIER fait ; la barre les pose tous. Sans
        // rapport, c'est le repli d'une ponctuelle consommée : la date de la
        // lecture est la seule trace.
        if (v.rapportsRealises.length === 0) poser(lec.date, "couvert");
        else for (const r of v.rapportsRealises) poser(r.dateRapport, "couvert");
        continue;
      }
      const segment = lec.registre === "enRetard" ? "retard" : "aVenir";
      // UNE ÉCHÉANCE CONNUE, ET ELLE SEULE, SE POSE SUR UN MOIS. Une ligne
      // « à planifier » posait sa date de GÉNÉRATION : le mois de création du
      // dossier portait une barre d'« à venir » ou de « retard » que rien ne
      // datait — la barre du calendrier, elle, l'écartait déjà (`datable`,
      // lot C). Elle n'occupe plus aucun mois, MAIS ELLE RESTE COMPTÉE : le
      // premier jet la retirait de tout, et l'anneau passait de « 12 en
      // retard » à l'état vide « Le calendrier se remplit… » sur un dossier
      // neuf, sous un bandeau qui annonçait 12 retards (relecture,
      // 2026-09-14). Même année que si elle avait été posée.
      if (!aUnRendezVous(v, now)) {
        // Son année est celle de sa génération… sauf pour un RETARD vu depuis
        // l'année en cours : sans date, il n'a aucun mois où rester, et il est
        // dû MAINTENANT. Généré l'an dernier, il n'était compté nulle part —
        // ni sur les barres d'une année que le widget ne montre pas, ni dans
        // l'anneau de cette année (relecture système, 2026-09-14). Un retard
        // DATÉ de l'an dernier, lui, garde son mois.
        const anneeLue = composantesCiviles(lec.date).annee;
        const retardReporte =
          segment === "retard" &&
          anneeLue < annee &&
          annee === composantesCiviles(now).annee;
        if (anneeLue === annee || retardReporte) {
          sansEcheance[segment] += 1;
        }
        continue;
      }
      poser(lec.date, segment);
    }
  }

  return { mois: buckets, sansEcheance };
}
