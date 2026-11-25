// La réconciliation de l'agenda du préventeur avec les créneaux du rendez-vous
// annuel (ADR-064 § 4). Fonction pure : l'état reçu de l'agenda et l'état en
// base entrent, les opérations sur la base et les consignes de l'agent
// sortent. Rien n'y lit l'horloge ni la base.
//
// Qui fait foi (§ 1) : l'agenda pour un créneau libre, Rojer pour un créneau
// réservé — jamais déplacé ni fermé par l'agenda ; son événement est remis en
// place, ou recréé.

export const DUREE_CRENEAU_MS = 60 * 60 * 1000;

/** Les titres que l'agent pose : tous fabriqués ici, aucun ne vient de l'agenda. */
export const TITRE = {
  dispo: "Dispo",
  reserve: "Réservé",
  duree: "⚠ Créneau d'1 h exactement",
  doublon: "⚠ Doublon : un créneau commence déjà à cette heure",
} as const;

export type Fenetre = { depuis: Date; jusqua: Date };

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

export type Operations = {
  ouvrir: { evenementId: string; debut: Date; fin: Date }[];
  deplacer: { creneauId: string; evenementId: string; debut: Date; fin: Date }[];
  fermer: { creneauId: string; evenementId: string | null }[];
  rattacher: { creneauId: string; evenementId: string; ancien: string | null }[];
};

/** Ce que l'agent fait d'un événement : le retitrer, et le remettre à une heure s'il y en a une. */
export type Consigne = { id: string; titre: string; remettre?: { debut: Date; fin: Date } };

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

/**
 * `creneaux` : ceux qui commencent dans la fenêtre, et ceux, où qu'ils soient,
 * dont l'événement est reçu. Un événement qui commence hors de la fenêtre est
 * ignoré (l'agenda rend aussi ceux qui la chevauchent) ; un créneau hors de la
 * fenêtre dont l'événement n'est pas reçu n'est pas touché.
 */
export function reconcilier(entree: { fenetre: Fenetre; evenements: EvenementRecu[]; creneaux: CreneauConnu[] }): Plan {
  const { depuis, jusqua } = entree.fenetre;
  const dansFenetre = (d: Date) => instant(d) >= instant(depuis) && instant(d) < instant(jusqua);
  const recus = entree.evenements.filter((ev) => dansFenetre(ev.debut)).sort(parDebut);
  const idsRecus = new Set(recus.map((ev) => ev.id));
  const parEvenement = new Map(
    entree.creneaux.filter((c) => c.evenementId !== null).map((c) => [c.evenementId as string, c]),
  );

  const plan: Plan = {
    operations: { ouvrir: [], deplacer: [], fermer: [], rattacher: [] },
    consignes: [],
    aCreer: [],
    conflits: [],
  };
  // L'occupation des débuts une fois l'envoi appliqué (`debut` est unique).
  const occupe = new Map<number, string>();
  // Les créneaux qu'un événement inconnu peut reprendre à leur début : ouverts
  // par script, ou liés à un événement que l'agenda ne rend plus.
  const rattachables = new Map<number, CreneauConnu>();
  // Liés, dans la fenêtre, et dont l'événement n'est plus reçu.
  const orphelins = new Map<string, CreneauConnu>();

  for (const c of entree.creneaux) {
    if (c.evenementId !== null && idsRecus.has(c.evenementId)) continue;
    if (c.evenementId !== null && dansFenetre(c.debut)) {
      orphelins.set(c.id, c);
      rattachables.set(instant(c.debut), c);
      // Un réservé reste à sa place quoi qu'il arrive ; un libre sera fermé
      // s'il n'est pas repris.
      if (c.reserve) occupe.set(instant(c.debut), c.id);
      continue;
    }
    occupe.set(instant(c.debut), c.id);
    if (c.evenementId === null && dansFenetre(c.debut)) rattachables.set(instant(c.debut), c);
  }

  // 1. Les événements connus. Ceux qui restent en place prennent leur début
  //    avant que les déplacés ne cherchent le leur.
  const aDeplacer: [EvenementRecu, CreneauConnu][] = [];
  for (const ev of recus) {
    const c = parEvenement.get(ev.id);
    if (!c) continue;
    if (c.reserve) {
      occupe.set(instant(c.debut), c.id);
      if (memesHeures(ev, c)) {
        plan.consignes.push({ id: ev.id, titre: titreDuCreneau(c) });
      } else {
        plan.consignes.push({ id: ev.id, titre: titreDuCreneau(c), remettre: { debut: c.debut, fin: c.fin } });
        plan.conflits.push({ creneauId: c.id, debut: c.debut, fin: c.fin, nature: "deplace", titre: titreDuCreneau(c) });
      }
    } else if (memesHeures(ev, c)) {
      occupe.set(instant(c.debut), c.id);
      plan.consignes.push({ id: ev.id, titre: TITRE.dispo });
    } else {
      aDeplacer.push([ev, c]);
    }
  }
  for (const [ev, c] of aDeplacer) {
    if (!dureeExacte(ev)) {
      plan.operations.fermer.push({ creneauId: c.id, evenementId: c.evenementId });
      plan.consignes.push({ id: ev.id, titre: TITRE.duree });
    } else if (occupe.has(instant(ev.debut))) {
      plan.operations.fermer.push({ creneauId: c.id, evenementId: c.evenementId });
      plan.consignes.push({ id: ev.id, titre: TITRE.doublon });
    } else {
      plan.operations.deplacer.push({ creneauId: c.id, evenementId: ev.id, debut: ev.debut, fin: ev.fin });
      occupe.set(instant(ev.debut), c.id);
      plan.consignes.push({ id: ev.id, titre: TITRE.dispo });
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
    const repris = rattachables.get(debut);
    const libre = !occupe.has(debut) || occupe.get(debut) === repris?.id;
    if (repris && memesHeures(ev, repris) && libre) {
      rattachables.delete(debut);
      orphelins.delete(repris.id);
      occupe.set(debut, repris.id);
      plan.operations.rattacher.push({ creneauId: repris.id, evenementId: ev.id, ancien: repris.evenementId });
      plan.consignes.push({ id: ev.id, titre: titreDuCreneau(repris) });
    } else if (occupe.has(debut)) {
      plan.consignes.push({ id: ev.id, titre: TITRE.doublon });
    } else {
      occupe.set(debut, `nouveau:${ev.id}`);
      plan.operations.ouvrir.push({ evenementId: ev.id, debut: ev.debut, fin: ev.fin });
      plan.consignes.push({ id: ev.id, titre: TITRE.dispo });
    }
  }

  // 3. Les créneaux dont l'événement a disparu sans être repris.
  for (const c of orphelins.values()) {
    if (c.reserve) {
      plan.aCreer.push({ debut: c.debut, fin: c.fin, titre: titreDuCreneau(c) });
      plan.conflits.push({ creneauId: c.id, debut: c.debut, fin: c.fin, nature: "supprime", titre: titreDuCreneau(c) });
    } else {
      plan.operations.fermer.push({ creneauId: c.id, evenementId: c.evenementId });
    }
  }
  return plan;
}
