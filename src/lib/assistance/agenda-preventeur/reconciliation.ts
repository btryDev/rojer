// La réconciliation de l'agenda du préventeur avec les créneaux du rendez-vous
// annuel (ADR-064 § 4). Fonction pure : l'état reçu de l'agenda et l'état en
// base entrent, les opérations sur la base et les consignes à appliquer dans l'agenda
// sortent. Rien n'y lit l'horloge ni la base.
//
// Qui fait foi (§ 1) : l'agenda pour un créneau libre, Rojer pour un créneau
// réservé — jamais déplacé ni fermé par l'agenda ; son événement est remis en
// place, ou recréé.

import type { Fenetre } from "../creneaux";

const DUREE_CRENEAU_MS = 60 * 60 * 1000;
/** Un événement plus long se découpe en créneaux d'une heure, jusqu'à cette durée (décision du 2026-11-25). */
const HEURES_MAX = 10;

/** Les titres que Rojer pose dans l'agenda : tous fabriqués ici, aucun ne vient de l'agenda. */
export const TITRE = {
  dispo: "Dispo",
  reserve: "Réservé",
  duree: "⚠ Durée en heures pleines (10 h au plus)",
  doublon: "⚠ Doublon : un créneau commence déjà à cette heure",
} as const;

/** Un événement de l'agenda : son identifiant Google et ses heures, rien d'autre. */
export type EvenementRecu = { id: string; debut: Date; fin: Date };

export type CreneauConnu = {
  id: string;
  debut: Date;
  fin: Date;
  /** L'événement de l'agenda qui le porte ; `null` pour un créneau ouvert par script. */
  evenementId: string | null;
  reserve: boolean;
  /** « Réservé — <raison sociale> — visio », pour un créneau réservé. */
  titreReserve: string | null;
};

/**
 * Un créneau déplacé se FERME et se ROUVRE sous un nouvel identifiant (revue
 * du 2026-11-25) : la réservation prend un créneau par son identifiant, et un
 * client ne doit pas être inscrit à une heure qu'il n'a pas choisie. La
 * marque `deplacement` ne sert qu'au bilan et au plafond de dégâts.
 */
type Operations = {
  fermer: { creneauId: string; evenementId: string | null; deplacement?: true }[];
  rattacher: { creneauId: string; evenementId: string; ancien: string | null }[];
  /** `evenementId` nul : une heure découpée, dont l'événement est créé après coup (`tache.ts`). */
  ouvrir: { evenementId: string | null; debut: Date; fin: Date; deplacement?: true }[];
};

/** Ce que Rojer fait d'un événement de l'agenda : le retitrer, et le remettre à une heure s'il y en a une. */
type Consigne = { id: string; titre: string; remettre?: { debut: Date; fin: Date } };

export type Conflit = { creneauId: string; debut: Date; fin: Date; nature: "deplace" | "supprime"; titre: string };

export type Plan = {
  operations: Operations;
  consignes: Consigne[];
  /**
   * Les événements à recréer : ceux de créneaux réservés que l'agenda a
   * perdus. `ancien` : l'événement supprimé, que le nouveau remplace. Les
   * créneaux sans événement (heures découpées, script) se relisent après la
   * transaction (`tache.ts`), pas ici.
   */
  aCreer: { creneauId: string; ancien: string | null; debut: Date; fin: Date; titre: string }[];
  conflits: Conflit[];
};

const instant = (d: Date) => d.getTime();
/** Le nombre d'heures pleines de l'événement, ou `null` s'il ne se découpe pas en créneaux. */
function heuresPleines(ev: { debut: Date; fin: Date }): number | null {
  const duree = instant(ev.fin) - instant(ev.debut);
  const heures = duree / DUREE_CRENEAU_MS;
  return Number.isInteger(heures) && heures >= 1 && heures <= HEURES_MAX ? heures : null;
}
const heure = (debut: Date, rang: number) => ({
  debut: new Date(instant(debut) + rang * DUREE_CRENEAU_MS),
  fin: new Date(instant(debut) + (rang + 1) * DUREE_CRENEAU_MS),
});
const memesHeures = (a: { debut: Date; fin: Date }, b: { debut: Date; fin: Date }) =>
  instant(a.debut) === instant(b.debut) && instant(a.fin) === instant(b.fin);
const parDebut = (a: EvenementRecu, b: EvenementRecu) =>
  instant(a.debut) - instant(b.debut) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function titreDuCreneau(c: Pick<CreneauConnu, "reserve" | "titreReserve">): string {
  return c.reserve ? (c.titreReserve ?? TITRE.reserve) : TITRE.dispo;
}

export const dansLaFenetre = ({ depuis, jusqua }: Fenetre, d: Date) =>
  instant(d) >= instant(depuis) && instant(d) < instant(jusqua);

/**
 * `creneaux` : ceux qui commencent dans la fenêtre, et ceux, où qu'ils soient,
 * dont l'événement est reçu. Un événement connu se reconnaît où qu'il soit ;
 * un événement inconnu qui commence hors de la fenêtre est ignoré (l'agenda
 * rend aussi ceux qui la chevauchent) ; un créneau hors de la fenêtre dont
 * l'événement n'est pas reçu n'est pas touché.
 */
export function reconcilier(entree: { fenetre: Fenetre; evenements: EvenementRecu[]; creneaux: CreneauConnu[] }): Plan {
  const dansFenetre = (d: Date) => dansLaFenetre(entree.fenetre, d);
  const parEvenement = new Map(
    entree.creneaux.filter((c) => c.evenementId !== null).map((c) => [c.evenementId as string, c]),
  );
  // Le seul filtre de la fenêtre sur les événements.
  const recus = entree.evenements.filter((ev) => parEvenement.has(ev.id) || dansFenetre(ev.debut)).sort(parDebut);
  const idsRecus = new Set(recus.map((ev) => ev.id));

  const plan: Plan = { operations: { fermer: [], rattacher: [], ouvrir: [] }, consignes: [], aCreer: [], conflits: [] };
  const fermer = (c: CreneauConnu, deplacement?: true) =>
    plan.operations.fermer.push({ creneauId: c.id, evenementId: c.evenementId, ...(deplacement && { deplacement }) });
  // L'occupation des débuts une fois l'envoi appliqué (`debut` est unique).
  const occupe = new Map<number, string>();
  // Les créneaux qu'un événement inconnu peut reprendre à leur début : ouverts
  // par script, ou liés à un événement que l'agenda ne rend plus.
  const rattachables = new Map<number, CreneauConnu>();
  const repris = new Set<string>();
  // Liés, dans la fenêtre, et dont l'événement n'est plus reçu.
  const estOrphelin = (c: CreneauConnu) => c.evenementId !== null && !idsRecus.has(c.evenementId) && dansFenetre(c.debut);

  for (const c of entree.creneaux) {
    if (c.evenementId !== null && idsRecus.has(c.evenementId)) continue;
    const orphelin = estOrphelin(c);
    if (orphelin || (c.evenementId === null && dansFenetre(c.debut))) rattachables.set(instant(c.debut), c);
    // Un réservé reste à sa place quoi qu'il arrive ; un libre orphelin sera
    // fermé s'il n'est pas repris.
    if (!orphelin || c.reserve) occupe.set(instant(c.debut), c.id);
  }

  // 1. Les événements connus. Ceux qui restent en place prennent leur début
  //    avant que les déplacés ne cherchent le leur.
  const aDeplacer: [EvenementRecu, CreneauConnu][] = [];
  for (const ev of recus) {
    const c = parEvenement.get(ev.id);
    if (!c) continue;
    if (c.reserve) {
      occupe.set(instant(c.debut), c.id);
      const titre = titreDuCreneau(c);
      const bouge = !memesHeures(ev, c);
      plan.consignes.push({ id: ev.id, titre, ...(bouge && { remettre: { debut: c.debut, fin: c.fin } }) });
      if (bouge) plan.conflits.push({ creneauId: c.id, debut: c.debut, fin: c.fin, nature: "deplace", titre });
    } else if (memesHeures(ev, c)) {
      occupe.set(instant(c.debut), c.id);
      plan.consignes.push({ id: ev.id, titre: TITRE.dispo });
    } else {
      aDeplacer.push([ev, c]);
    }
  }
  /**
   * Place un événement : sa première heure lui revient (rattachée, ou
   * ouverte), les suivantes s'ouvrent et deviennent des événements à créer —
   * le préventeur pose une plage, l'agenda la rend découpée, un événement
   * par créneau. `ancien` : le créneau libre que l'événement portait avant
   * d'être déplacé ou allongé ; il se ferme.
   */
  const placer = (ev: EvenementRecu, ancien?: CreneauConnu) => {
    const heures = heuresPleines(ev);
    const premiere = heure(ev.debut, 0);
    const debut = instant(premiere.debut);
    const c = ancien ? undefined : rattachables.get(debut);
    const reprendre = c && instant(c.fin) === instant(premiere.fin) && (!occupe.has(debut) || occupe.get(debut) === c.id);
    if (heures === null || (!reprendre && occupe.has(debut))) {
      if (ancien) fermer(ancien);
      plan.consignes.push({ id: ev.id, titre: heures === null ? TITRE.duree : TITRE.doublon });
      return;
    }
    const remettre = heures > 1 ? { remettre: premiere } : {};
    if (reprendre && c) {
      rattachables.delete(debut);
      repris.add(c.id);
      occupe.set(debut, c.id);
      plan.operations.rattacher.push({ creneauId: c.id, evenementId: ev.id, ancien: c.evenementId });
      plan.consignes.push({ id: ev.id, titre: titreDuCreneau(c), ...remettre });
    } else {
      if (ancien) fermer(ancien, true);
      occupe.set(debut, `nouveau:${ev.id}`);
      plan.operations.ouvrir.push({ evenementId: ev.id, ...premiere, ...(ancien && { deplacement: true as const }) });
      plan.consignes.push({ id: ev.id, titre: TITRE.dispo, ...remettre });
    }
    for (let rang = 1; rang < heures; rang++) {
      const h = heure(ev.debut, rang);
      if (occupe.has(instant(h.debut))) continue; // une heure déjà tenue n'est pas ouverte deux fois
      occupe.set(instant(h.debut), `decoupe:${ev.id}:${rang}`);
      plan.operations.ouvrir.push({ evenementId: null, ...h });
    }
  };

  for (const [ev, c] of aDeplacer) {
    // Un libre emporté hors de la fenêtre se ferme, sans consigne : l'événement est hors d'atteinte.
    if (dansFenetre(ev.debut)) placer(ev, c);
    else fermer(c);
  }

  // 2. Les événements inconnus : reprendre un créneau à son début, ou en ouvrir.
  for (const ev of recus) if (!parEvenement.has(ev.id)) placer(ev);

  // 3. Les créneaux dont l'événement a disparu sans être repris.
  for (const c of entree.creneaux) {
    if (!estOrphelin(c) || repris.has(c.id)) continue;
    if (c.reserve) {
      const titre = titreDuCreneau(c);
      plan.aCreer.push({ creneauId: c.id, ancien: c.evenementId, debut: c.debut, fin: c.fin, titre });
      plan.conflits.push({ creneauId: c.id, debut: c.debut, fin: c.fin, nature: "supprime", titre });
    } else {
      fermer(c);
    }
  }
  return plan;
}
