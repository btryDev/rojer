// La réconciliation de l'agenda du préventeur avec les créneaux du rendez-vous
// annuel (ADR-064 § 4). Fonction pure : l'état reçu de l'agenda et l'état en
// base entrent, les opérations sur la base et les consignes de l'agent
// sortent. Rien n'y lit l'horloge ni la base.
//
// Qui fait foi (§ 1) : l'agenda pour un créneau libre, Rojer pour un créneau
// réservé — jamais déplacé ni fermé par l'agenda ; son événement est remis en
// place, ou recréé.

import type { Fenetre } from "../creneaux";

const DUREE_CRENEAU_MS = 60 * 60 * 1000;

/** Les titres que l'agent pose : tous fabriqués ici, aucun ne vient de l'agenda. */
export const TITRE = {
  dispo: "Dispo",
  reserve: "Réservé",
  duree: "⚠ Créneau d'1 h exactement",
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
  ouvrir: { evenementId: string; debut: Date; fin: Date; deplacement?: true }[];
};

/** Ce que l'agent fait d'un événement : le retitrer, et le remettre à une heure s'il y en a une. */
type Consigne = { id: string; titre: string; remettre?: { debut: Date; fin: Date } };

export type Conflit = { creneauId: string; debut: Date; fin: Date; nature: "deplace" | "supprime"; titre: string };

export type Plan = {
  operations: Operations;
  consignes: Consigne[];
  /** Les événements à recréer : ceux de créneaux réservés que l'agenda a perdus. */
  aCreer: { debut: Date; fin: Date; titre: string }[];
  conflits: Conflit[];
};

const instant = (d: Date) => d.getTime();
const dureeExacte = (ev: { debut: Date; fin: Date }) => instant(ev.fin) - instant(ev.debut) === DUREE_CRENEAU_MS;
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
  for (const [ev, c] of aDeplacer) {
    // Un libre emporté hors de la fenêtre se ferme, sans consigne : l'événement est hors d'atteinte.
    const refus = !dansFenetre(ev.debut)
      ? null
      : !dureeExacte(ev)
        ? TITRE.duree
        : occupe.has(instant(ev.debut))
          ? TITRE.doublon
          : undefined;
    if (refus === undefined) {
      fermer(c, true);
      plan.operations.ouvrir.push({ evenementId: ev.id, debut: ev.debut, fin: ev.fin, deplacement: true });
      occupe.set(instant(ev.debut), `deplace:${ev.id}`);
      plan.consignes.push({ id: ev.id, titre: TITRE.dispo });
    } else {
      fermer(c);
      if (refus) plan.consignes.push({ id: ev.id, titre: refus });
    }
  }

  // 2. Les événements inconnus : reprendre un créneau à son début, ou en ouvrir un.
  for (const ev of recus) {
    if (parEvenement.has(ev.id)) continue;
    if (!dureeExacte(ev)) {
      plan.consignes.push({ id: ev.id, titre: TITRE.duree });
      continue;
    }
    const debut = instant(ev.debut);
    const c = rattachables.get(debut);
    const libre = !occupe.has(debut) || occupe.get(debut) === c?.id;
    if (c && memesHeures(ev, c) && libre) {
      rattachables.delete(debut);
      repris.add(c.id);
      occupe.set(debut, c.id);
      plan.operations.rattacher.push({ creneauId: c.id, evenementId: ev.id, ancien: c.evenementId });
      plan.consignes.push({ id: ev.id, titre: titreDuCreneau(c) });
    } else if (occupe.has(debut)) {
      plan.consignes.push({ id: ev.id, titre: TITRE.doublon });
    } else {
      occupe.set(debut, `nouveau:${ev.id}`);
      plan.operations.ouvrir.push({ evenementId: ev.id, debut: ev.debut, fin: ev.fin });
      plan.consignes.push({ id: ev.id, titre: TITRE.dispo });
    }
  }

  // 3. Les créneaux dont l'événement a disparu sans être repris.
  for (const c of entree.creneaux) {
    if (!estOrphelin(c) || repris.has(c.id)) continue;
    if (c.reserve) {
      const titre = titreDuCreneau(c);
      plan.aCreer.push({ debut: c.debut, fin: c.fin, titre });
      plan.conflits.push({ creneauId: c.id, debut: c.debut, fin: c.fin, nature: "supprime", titre });
    } else {
      fermer(c);
    }
  }
  return plan;
}
