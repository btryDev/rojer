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
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import {
  estPorteeParSalarie,
  type Obligation,
  type ObligationPorteeParSalarie,
} from "@/lib/referentiels/conformite";
import type { Transmission } from "@/lib/referentiels/conformite/types";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import { cataloguerTitres, exclusionsDuTitre } from "./catalogue";
import { echeanceDuTitre } from "./echeance";

/**
 * Un titre DÛ À L'ENTRÉE : un titre salarié auquel le référentiel donne un
 * `premierDelai`, compté depuis `Salarie.entreLe` (ADR-043 § 2.1) — la VIP,
 * la formation à la sécurité. C'est le cas « dû à chaque salarié actif » de
 * la décision (b) de la propriétaire.
 *
 * Exporté le 2026-10-12 pour que le tableau de bord (`dashboard/transmissions.ts`,
 * compte par personne) et la garde des surfaces
 * (`surfaces/obligations-sans-surface.ts`, surface `fiche_salarie`) lisent
 * CETTE règle et non une phrase qui la redirait : `ceQuiManqueALaPersonne`
 * l'appelle elle-même.
 */
export function estDuALEntree(
  o: Obligation,
): o is ObligationPorteeParSalarie & { premierDelai: Periodicite } {
  return estPorteeParSalarie(o) && o.premierDelai !== undefined;
}

type VersSalarie = Extract<Transmission, { vers: "salarie_designe" }>;

/** Une transmission vers un titre nommé, qui dit quand il est exigible. */
export type TransmissionDatee = VersSalarie & {
  titre: string;
  delai: NonNullable<VersSalarie["delai"]>;
};

/**
 * Les transmissions d'un titre que `ceQuiManqueALaPersonne` LIT : vers un
 * titre nommé, avec un `delai`. Sans `delai`, la transmission ne date rien et
 * la fonction la saute — le test du module exige qu'aucune transmission
 * salarié → salarié n'en manque, donc ce saut ne tait rien aujourd'hui.
 */
export function transmissionsDatees(source: Obligation): TransmissionDatee[] {
  return source.transmet.filter(
    (t): t is TransmissionDatee =>
      t.vers === "salarie_designe" && t.titre !== null && t.delai !== undefined,
  );
}

/**
 * Les titres que la fiche d'une personne peut montrer comme MANQUANTS — ceux
 * que `ceQuiManqueALaPersonne` sait rendre : dus à l'entrée, ou appelés par un
 * autre titre du catalogue avec un délai.
 *
 * C'est la surface de décision que l'ADR-043 (c) donne à ces titres : la fiche
 * les date et les classe. Les titres SOUS CONDITION (secouriste, membre du
 * CSE, salarié désigné, autorisation de conduite…) n'y sont pas : le produit ne
 * sait pas qui y est soumis (décision (b)). Un titre qui n'est la cible que
 * d'une transmission sans délai n'y est pas non plus — la fonction ne le
 * rendrait jamais.
 */
export function titresLusParLaFiche(
  catalogueFourni: readonly ObligationPorteeParSalarie[] = cataloguerTitres(),
): ReadonlySet<string> {
  // Même porte du niveau audit que `ceQuiManqueALaPersonne` (ADR-042).
  const catalogue = catalogueFourni.filter((o) => !estNiveauAudit(o));
  const parId = new Set(catalogue.map((o) => o.id));
  const ids = new Set<string>();
  for (const o of catalogue) {
    if (estDuALEntree(o)) ids.add(o.id);
    for (const t of transmissionsDatees(o)) {
      // La fonction ne rend une cible que si elle est au catalogue.
      if (parId.has(t.titre)) ids.add(t.titre);
    }
  }
  return ids;
}

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
    if (!estDuALEntree(o) || !manque(o.id)) continue;
    rendus.set(o.id, {
      obligation: o,
      origine: { type: "entree", entreLe: personne.entreLe },
      // `echeanceDuTitre`, la seule date d'un titre (ADR-036, garde de
      // convergence) : le premier cycle d'un titre jamais délivré part de
      // l'entrée, et son pas est le premier délai.
      echeance:
        personne.entreLe === null
          ? null
          : echeanceDuTitre({ delivreLe: personne.entreLe, echeanceLe: null }, o.premierDelai),
    });
  }

  for (const source of catalogue) {
    const delivreLe = derniere(titres, source.id);
    if (delivreLe === null) continue;
    // Sans `delai`, la transmission ne date rien : `transmissionsDatees` la
    // laisse de côté (voir sa note).
    for (const t of transmissionsDatees(source)) {
      const cible = parId.get(t.titre);
      if (!cible || !manque(cible.id)) continue;
      if (rendus.has(cible.id)) continue;
      rendus.set(cible.id, {
        obligation: cible,
        origine: { type: "transmis", par: source, delivreLe, motif: t.motif },
        echeance:
          t.delai === "aucun"
            ? delivreLe
            : echeanceDuTitre({ delivreLe, echeanceLe: null }, periodiciteEffective(cible)),
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
