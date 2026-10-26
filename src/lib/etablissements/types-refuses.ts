/**
 * LE FILTRE À L'ACCUEIL (2026-10-17, décisions de la propriétaire relayées
 * par c6 ; `propositions/maj-referentiel-constats-2026-10-17.md`, § 5).
 *
 * Rojer refuse, à la création comme à la modification de la fiche, les types
 * d'ERP dont les obligations propres relèvent de textes qu'il ne couvre pas :
 *  - J (structures pour personnes âgées ou handicapées) et U (établissements
 *    de soins) ;
 *  - les établissements spéciaux PA, CTS, SG, OA, REF, GA, EF — PS (parcs de
 *    stationnement couverts) reste accepté ;
 *  - R quand il accueille des enfants (crèche, école, centre de loisirs) — la
 *    formation pour adultes reste acceptée.
 * Le refus vaut pour le type principal ET pour chacun des autres types
 * déclarés (ADR-045).
 *
 * ~~TROIS PORTES, UNE RÈGLE. Ce module est lu par `etablissementCreationSchema`
 * (création, y compris d'un second établissement), par~~ [2026-10-26 : deux
 * surfaces de création, une porte. Ce module est lu par] `onboardingSchema`
 * (serveur du parcours, seule porte de création) et par `components/onboarding/validation.ts` (client,
 * refus à l'étape) ; la fiche (`modifierEtablissement`) l'applique à la
 * TRANSITION : un type refusé qui n'était pas en base. Un dossier créé avant
 * le filtre s'enregistre comme avant (données factices en prod au
 * 2026-10-17 ; `docs/chantiers-ouverts.md`).
 *
 * LA RÉPONSE « ACCUEIL D'ENFANTS » N'EST PAS STOCKÉE, et c'est un choix
 * assumé (c6, 2026-10-17) : elle ne sert qu'à refuser. Aucune colonne, aucune
 * migration ; sur la fiche, la question n'est posée qu'à l'ENTRÉE de R.
 *
 * Les phrases expliquent sans qualifier (ligne de partage 8). Module pur.
 */

import { z } from "zod";
import type { TypeErp } from "@/lib/referentiels/types-communs";

/** Les types refusés, et la famille de phrase qui le dit. */
export const TYPES_ERP_REFUSES = ["J", "U", "PA", "CTS", "SG", "OA", "REF", "GA", "EF"] as const satisfies readonly TypeErp[];
export type TypeErpRefuse = (typeof TYPES_ERP_REFUSES)[number];

const SPECIAUX: ReadonlySet<string> = new Set(["PA", "CTS", "SG", "OA", "REF", "GA", "EF"]);

export const PHRASE_REFUS_J =
  "Rojer ne prend pas en charge les structures d'accueil pour personnes âgées ou handicapées (type J) : leurs obligations propres relèvent de textes que Rojer ne couvre pas.";
export const PHRASE_REFUS_U =
  "Rojer ne prend pas en charge les établissements de soins (type U) : leurs obligations propres relèvent de textes que Rojer ne couvre pas.";
// ~~« Les établissements spéciaux — … — relèvent de dispositions propres du
// règlement de sécurité que Rojer ne couvre pas. »~~ — revue du 2026-10-17 :
// même forme que J et U.
export const PHRASE_REFUS_SPECIAUX =
  "Rojer ne prend pas en charge les établissements spéciaux (plein air, chapiteaux et tentes, structures gonflables, hôtels-restaurants d'altitude, refuges de montagne, gares, établissements flottants) : leurs obligations propres relèvent de textes que Rojer ne couvre pas.";
export const PHRASE_REFUS_ENFANTS =
  "Rojer ne prend pas en charge l'accueil d'enfants (crèche, école, centre de loisirs) : il relève d'obligations propres que Rojer ne couvre pas.";

/** La question posée au seul type R. */
export const QUESTION_ACCUEIL_ENFANTS =
  "Accueillez-vous des enfants (crèche, école, centre de loisirs) ?";

const estRefuse = (t: string): t is TypeErpRefuse =>
  (TYPES_ERP_REFUSES as readonly string[]).includes(t);

/** Les types refusés parmi ceux déclarés, sans doublon, dans l'ordre de la déclaration. */
export function typesRefusesDe(
  typeErp: string | null | undefined,
  typesErpAutres: readonly string[] | null | undefined,
): TypeErpRefuse[] {
  const vus = new Set<string>();
  const sortie: TypeErpRefuse[] = [];
  for (const t of [typeErp, ...(typesErpAutres ?? [])]) {
    if (!t || vus.has(t) || !estRefuse(t)) continue;
    vus.add(t);
    sortie.push(t);
  }
  return sortie;
}

/** La phrase qui refuse ces types : une par famille, dans l'ordre J, U, spéciaux. */
export function phraseRefusTypes(refuses: readonly string[]): string | null {
  const phrases = [
    refuses.includes("J") ? PHRASE_REFUS_J : null,
    refuses.includes("U") ? PHRASE_REFUS_U : null,
    refuses.some((t) => SPECIAUX.has(t)) ? PHRASE_REFUS_SPECIAUX : null,
  ].filter((p): p is string => p !== null);
  return phrases.length > 0 ? phrases.join(" ") : null;
}

/** La question de l'accueil d'enfants est-elle posée ? Si R est déclaré, principal ou autre. */
export function questionEnfantsPosee(d: {
  estERP?: boolean | null;
  typeErp?: string | null;
  typesErpAutres?: readonly string[] | null;
}): boolean {
  return d.estERP === true && [d.typeErp, ...(d.typesErpAutres ?? [])].includes("R");
}

type Types = { estERP?: boolean | null; typeErp?: string | null; typesErpAutres?: readonly string[] | null };
type TypesEnBase = { typeErp: string | null; typesErpAutres: readonly string[] } | null | undefined;

/**
 * R entre-t-il ? Déclaré dans la saisie, absent de la fiche enregistrée
 * (`avant` vide à la création). LA seule lecture de la règle : le filtre, la
 * fiche et l'action la lisent ici (revue du 2026-10-17, R2).
 */
export function rEntre(apres: Types, avant?: TypesEnBase): boolean {
  const dejaR = Boolean(avant && [avant.typeErp, ...avant.typesErpAutres].includes("R"));
  return questionEnfantsPosee(apres) && !dejaR;
}

/** Le champ du schéma : « oui » / « non » / vide → vrai / faux / non posté. */
export const champAccueilEnfants = z.preprocess(
  (v) => (v === "oui" || v === true ? true : v === "non" || v === false ? false : undefined),
  z.boolean().optional(),
);

/**
 * Les refus du filtre posés sur un schéma (création, parcours) : ceux de
 * `refusDuFiltre`, et la réponse postée là où la question n'est pas posée.
 */
export function appliquerFiltre(
  val: Types & { accueilEnfants?: boolean | null },
  ctx: {
    addIssue: (i: { code: "custom"; path: string[]; message: string }) => void;
  },
): void {
  for (const r of refusDuFiltre(val))
    ctx.addIssue({
      code: "custom",
      path: [r.champ],
      message: r.message,
      // ~~`params: { perimetre: true }`~~ [2026-10-26 : son seul lecteur,
      // `creerEtablissement`, est retiré.]
    });
  if (val.accueilEnfants !== undefined && !questionEnfantsPosee(val)) {
    ctx.addIssue({
      code: "custom",
      path: ["accueilEnfants"],
      message: "La question de l'accueil d'enfants n'est posée qu'au type R.",
    });
  }
}

/** La saisie sans la réponse « accueil d'enfants », qui ne s'écrit jamais. */
export function sansReponseEnfants<T extends { accueilEnfants?: unknown }>(d: T): Omit<T, "accueilEnfants"> {
  const copie: Partial<T> = { ...d };
  delete copie.accueilEnfants;
  return copie as Omit<T, "accueilEnfants">;
}

/**
 * ~~`perimetre` : un refus de ce que Rojer sert (ADR-031)~~ [2026-10-26 :
 * retiré avec son seul lecteur, le formulaire de création d'établissement ;
 * le parcours distingue les deux natures de refus par lui-même
 * (`components/onboarding/validation.ts`).]
 */
export type RefusFiltre = {
  champ: "typeErp" | "typesErpAutres" | "accueilEnfants";
  message: string;
};

/**
 * Ce que le filtre refuse dans une saisie, champ par champ. `avant` (la fiche
 * en base) ne compte que ce qui ENTRE : un type refusé déjà enregistré, ou un
 * R déjà enregistré, ne déclenche rien.
 */
export function refusDuFiltre(
  d: {
    estERP?: boolean | null;
    typeErp?: string | null;
    typesErpAutres?: readonly string[] | null;
    accueilEnfants?: boolean | null;
  },
  avant?: { typeErp: string | null; typesErpAutres: readonly string[] } | null,
): RefusFiltre[] {
  if (d.estERP !== true) return [];
  const dejaLa = new Set(avant ? [avant.typeErp, ...avant.typesErpAutres].filter(Boolean) : []);
  const refus: RefusFiltre[] = [];
  const principal = d.typeErp && !dejaLa.has(d.typeErp) ? typesRefusesDe(d.typeErp, []) : [];
  const autres = typesRefusesDe(null, (d.typesErpAutres ?? []).filter((t) => !dejaLa.has(t)));
  const p = phraseRefusTypes(principal);
  if (p) refus.push({ champ: "typeErp", message: p });
  const a = phraseRefusTypes(autres);
  if (a) refus.push({ champ: "typesErpAutres", message: a });
  if (rEntre(d, avant)) {
    if (d.accueilEnfants === true)
      refus.push({ champ: "accueilEnfants", message: PHRASE_REFUS_ENFANTS });
    else if (d.accueilEnfants !== false)
      refus.push({ champ: "accueilEnfants", message: "Indiquez si vous accueillez des enfants." });
  }
  return refus;
}
