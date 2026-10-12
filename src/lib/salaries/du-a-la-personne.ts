/**
 * Ce qui MANQUE à une personne — un titre que le droit lui doit et qu'aucune
 * déclaration ne porte encore (ADR-043).
 *
 * ## Le défaut que ce module ferme
 *
 * Jusqu'au 2026-10-12, un titre n'existait pour Rojer qu'une fois déclaré : le
 * générateur part des `TitreSalarie`, Équipe classe des titres, le badge compte
 * des titres. Une personne embauchée sans visite d'information et de
 * prévention n'apparaissait donc nulle part en défaut, alors que `R. 4624-10`
 * la lui doit dans les trois mois — et `Salarie.entreLe`, documenté au schéma
 * comme le « point de départ des obligations à l'embauche », n'était lu par
 * aucun calcul.
 *
 * ## Ce qu'il rend, et rien d'autre
 *
 * Un titre manque s'il n'a JAMAIS été déclaré pour la personne, et :
 *
 *  1. **qu'il est dû à l'entrée** — le référentiel le dit en lui donnant un
 *     `premierDelai`, compté depuis `entreLe` (la VIP, la formation à la
 *     sécurité) ;
 *  2. **ou qu'un titre qu'elle détient l'appelle** — une transmission d'un
 *     titre salarié vers un autre, avec son `delai` (le suivi renforcé appelle
 *     la visite intermédiaire, l'autorisation de conduite l'attestation).
 *
 * Sauf si elle détient un titre que le droit déclare exclusif de celui-là
 * (`exclusionsDuTitre`) : l'examen du suivi renforcé « se substitue » à la VIP
 * (`R. 4624-24`), et la réclamer serait faux.
 *
 * Un titre DÉJÀ déclaré n'est jamais rendu ici : il suit son propre cycle
 * (`echeanceDuTitre`), au calendrier comme sur Équipe. Le recompter ferait
 * deux signaux pour une seule visite.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne devine pas qui relève d'un titre sous condition — suivi renforcé,
 * secouriste, membre du CSE : le produit ne sait pas à quoi une personne est
 * exposée, et l'ADR-023 lui interdit de le déduire. Il n'écrit rien en base
 * (décision (a) de l'ADR-043 : aucune ligne de calendrier). Il ne lit aucune
 * horloge : l'état se classe à part, par `etatDuManque`.
 */
import { classerDate } from "@/lib/calendrier/etats";
import { prochaineEcheance } from "@/lib/calendrier/periodicite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import type { ObligationPorteeParSalarie } from "@/lib/referentiels/conformite";
import { cataloguerTitres, exclusionsDuTitre } from "./catalogue";

/** Ce que le module lit d'une personne. */
export type PersonneLue = {
  actif: boolean;
  /** Date d'entrée dans l'effectif ; `null` quand elle n'est pas renseignée. */
  entreLe: Date | null;
};

/** Ce que le module lit d'un titre déclaré. */
export type TitreDeclareLu = { obligationId: string; delivreLe: Date };

/** Pourquoi un titre manque. */
export type OrigineDuManque =
  | {
      type: "entree";
      /** `null` : la date d'entrée n'est pas renseignée, rien n'est daté. */
      entreLe: Date | null;
    }
  | {
      type: "transmis";
      /** Le titre détenu qui appelle celui-ci. */
      par: ObligationPorteeParSalarie;
      /** Sa délivrance la plus récente, d'où court le délai. */
      delivreLe: Date;
      /** La phrase du référentiel qui fonde la transmission. */
      motif: string;
    };

export type Manque = {
  obligation: ObligationPorteeParSalarie;
  origine: OrigineDuManque;
  /**
   * La date au plus tard, ou `null` quand le produit n'a pas de quoi la
   * calculer — une date d'entrée absente. Jamais une date inventée : un retard
   * calculé sur le jour de la saisie serait un retard que le texte ne pose pas.
   */
  echeance: Date | null;
};

/** La délivrance la plus récente d'un titre, ou `null`. */
function derniere(titres: readonly TitreDeclareLu[], id: string): Date | null {
  let plusRecente: Date | null = null;
  for (const t of titres) {
    if (t.obligationId !== id) continue;
    if (plusRecente === null || t.delivreLe > plusRecente) plusRecente = t.delivreLe;
  }
  return plusRecente;
}

/**
 * Les titres qui manquent à une personne, dans l'ordre du catalogue.
 *
 * `catalogue` n'existe que pour éprouver la règle sur un référentiel
 * synthétique ; il vaut `cataloguerTitres()` — donc sans titre retiré ni au
 * niveau audit (ADR-042) — partout ailleurs.
 */
export function ceQuiManqueALaPersonne(
  personne: PersonneLue,
  titres: readonly TitreDeclareLu[],
  catalogueFourni: readonly ObligationPorteeParSalarie[] = cataloguerTitres(),
): Manque[] {
  // Le défaut l'écarte déjà ; un catalogue fourni aussi, ici, pour que la
  // porte du niveau audit (ADR-042) ne dépende pas de l'appelant.
  const catalogue = catalogueFourni.filter((o) => !estNiveauAudit(o));
  // Une personne sortie de l'effectif ne réclame plus rien — même règle que
  // `etatDuTitre` et que le badge du rail.
  if (!personne.actif) return [];

  const detenus = new Set(titres.map((t) => t.obligationId));
  const parId = new Map(catalogue.map((o) => [o.id, o]));
  // Ce que les titres détenus écartent, au sens du droit (R. 4624-24,
  // R. 4451-82…). Fermé par symétrie dans `exclusionsDuTitre`.
  const ecartes = new Set<string>();
  for (const id of detenus) {
    for (const x of exclusionsDuTitre(id)) ecartes.add(x.titre.id);
  }
  const manque = (id: string) => !detenus.has(id) && !ecartes.has(id);

  const rendus = new Map<string, Manque>();

  for (const o of catalogue) {
    if (o.premierDelai === undefined || !manque(o.id)) continue;
    rendus.set(o.id, {
      obligation: o,
      origine: { type: "entree", entreLe: personne.entreLe },
      echeance:
        personne.entreLe === null
          ? null
          : prochaineEcheance(personne.entreLe, o.premierDelai),
    });
  }

  for (const source of catalogue) {
    const delivreLe = derniere(titres, source.id);
    if (delivreLe === null) continue;
    for (const t of source.transmet) {
      if (t.vers !== "salarie_designe" || t.titre === null) continue;
      const cible = parId.get(t.titre);
      // Sans `delai`, la transmission ne date rien : le test du module exige
      // qu'aucune transmission salarié → salarié n'en manque, donc ce saut ne
      // tait rien aujourd'hui.
      if (!cible || t.delai === undefined || !manque(cible.id)) continue;
      if (rendus.has(cible.id)) continue;
      rendus.set(cible.id, {
        obligation: cible,
        origine: { type: "transmis", par: source, delivreLe, motif: t.motif },
        echeance:
          t.delai === "aucun"
            ? delivreLe
            : prochaineEcheance(delivreLe, periodiciteEffective(cible)),
      });
    }
  }

  return [...rendus.values()];
}

/**
 * L'état d'un manque à une date : celui d'une échéance (`classerDate`, la même
 * règle de retard que partout, ADR-011), ou `null` quand rien n'est daté.
 */
export function etatDuManque(
  m: Manque,
  now: Date,
): ReturnType<typeof classerDate> | null {
  return m.echeance === null ? null : classerDate(m.echeance, now);
}
