import { depuisCleJourCivil } from "@/lib/dates";
import { z } from "zod";
import {
  HandicapAccessible,
  RegimeConformiteErp,
} from "@prisma/client";

/**
 * Validation du registre d'accessibilité ERP.
 *
 * ~~Les 4 sections correspondent au contenu imposé par l'arrêté~~ —
 * faux, rayé le 2026-10-12 (audit des modules) : l'arrêté (art. 1er I)
 * énumère NEUF pièces, plus une attestation annuelle de formation en 1ʳᵉ à
 * 4ᵉ catégorie (II), et aucune ne se dépose dans Rojer. Les quatre sections
 * sont celles du module ; seul le 9° (modalités de maintenance) y est
 * saisi tel quel. Texte d'origine : les 4 sections « correspondent » à l'arrêté du
 * 19 avril 2017 (NOR: LHAL1702706A, publié au JO), pris en application de
 * l'article R. 111-19-60 du code de la construction et de l'habitation —
 * devenu **R. 164-6** à la recodification du 1er juillet 2021. Le module
 * citait « D111-19-33 », qui ne désigne aucun article du CCH : la coquille
 * vise R. 111-19-33, lequel portait l'attestation d'accessibilité — pas le
 * registre — et que le décret 2021-872 a abrogé (relu à la source le
 * 2026-08-28) :
 *
 *   1. Informations sur les prestations fournies par l'ERP
 *   2. Liste des pièces administratives et techniques (attestation
 *      d'accessibilité, Ad'AP, arrêté préfectoral de dérogation…)
 *   3. Description des actions de formation du personnel d'accueil
 *   4. Modalités de maintenance des équipements d'accessibilité
 *
 * Chaque section peut être remplie en plusieurs passes : la validation
 * en base tolère les champs partiels tant que le registre n'est pas
 * « publié ». À la publication, un check plus strict applique les règles
 * de l'arrêté (cf. `schemaPublication`).
 */

const DATE_FMT = /^\d{4}-\d{2}-\d{2}$/;

/**
 * UN CHAMP VIDÉ S'EFFACE (2026-10-12, audit des modules). Ces deux
 * aides rendaient `undefined` pour un champ vide, et Prisma laisse une
 * colonne inchangée quand on lui passe `undefined` : un champ rempli ne se
 * vidait plus jamais, et le registre public gardait une phrase que
 * l'exploitant avait retirée. Elles rendent `null`, que Prisma écrit.
 */
const optionalTrimmed = (max = 2000) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || null : v ?? null),
    z.string().max(max).nullable(),
  );

const optionalDate = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .nullable()
    .transform((v) => (v ? depuisCleJourCivil(v) : null)),
);

/**
 * Les familles de handicap dans lesquelles un ERP déclare être adapté.
 *
 * **Leur source n'est pas le droit de l'accessibilité.** Toute la chaîne a été
 * ouverte le 2026-09-03 — `L. 161-1` et `L. 164-1` du CCH, `R. 164-6` qui
 * institue le registre, l'arrêté du 19 avril 2017 qui en fixe le contenu — et
 * aucun de ces textes ne répartit les personnes handicapées. La seule
 * énumération du droit français est `L. 114` du code de l'action sociale et des
 * familles (loi du 11 février 2005, art. 2), dépouillée dans
 * `referentiels/corpus/accessibilite-handicap.ts`.
 *
 * Les « quatre familles de handicap » qui circulent partout ne sont dans aucun
 * de ces textes ; elles viennent du document ministériel d'aide à l'accueil que
 * l'arrêté fait ANNEXER au registre sans en édicter le contenu.
 */
export const HANDICAPS = [
  "moteur",
  "visuel",
  "auditif",
  "mental",
  "cognitif",
  "psychique",
  // Entrées le 2026-09-03. `L. 114` les met sur le même plan que les cinq
  // familles de fonctions, et le modèle ne savait ni l'une ni l'autre : un
  // établissement adapté au polyhandicap ouvrait la liste et n'y trouvait pas
  // la sienne.
  "polyhandicap",
  "trouble_sante_invalidant",
] as const satisfies readonly HandicapAccessible[];

/**
 * Ce que chaque valeur du modèle dit de l'énumération de `L. 114`.
 *
 * **Le modèle n'écrit pas les mots du texte, et il faut le déclarer plutôt que
 * de le taire.** `L. 114` énumère cinq familles de FONCTIONS — physiques,
 * sensorielles, mentales, cognitives, psychiques — puis deux situations. Le
 * produit en affine deux : `moteur` pour « physiques », `visuel` et `auditif`
 * pour « sensorielles ». C'est le vocabulaire dans lequel un dirigeant se
 * reconnaît, et l'affiner ne cache personne tant que chaque famille du texte
 * garde au moins un répondant.
 *
 * C'est exactement ce que `handicap-accessible.test.ts` vérifie, **dans les
 * deux sens** : aucune famille écrite par le texte sans valeur qui la porte,
 * aucune valeur qui prétende porter un mot que le texte n'écrit pas. Les mots
 * de droite sont comparés au verbatim de `L. 114` relevé au corpus — ils ne se
 * réparent donc pas en recopiant une autre déclaration.
 *
 * Ce que cette table N'EST PAS : une équivalence juridique. `moteur` n'est pas
 * synonyme de « physiques », il en est un cas ; c'est pour cela que
 * `trouble_sante_invalidant` existe à part et non comme un second `moteur`.
 */
export const FAMILLE_L114: Record<HandicapAccessible, string> = {
  moteur: "physiques",
  visuel: "sensorielles",
  auditif: "sensorielles",
  mental: "mentales",
  cognitif: "cognitives",
  psychique: "psychiques",
  polyhandicap: "polyhandicap",
  trouble_sante_invalidant: "trouble de santé invalidant",
};

export const REGIMES = [
  "conforme_origine",
  "conforme_apres_travaux",
  "derogation_accordee",
  "adap_en_cours",
  "non_conforme_sans_adap",
] as const satisfies readonly RegimeConformiteErp[];

export const LABEL_HANDICAP: Record<HandicapAccessible, string> = {
  moteur: "Handicap moteur",
  visuel: "Handicap visuel",
  auditif: "Handicap auditif",
  mental: "Handicap mental",
  cognitif: "Handicap cognitif",
  psychique: "Handicap psychique",
  // Ces deux-là ne prennent pas la forme « Handicap X », et c'est le texte qui
  // le veut : `L. 114` écrit « d'un polyhandicap ou d'un trouble de santé
  // invalidant », pas « handicap polyhandicap ». Le test vérifie donc la FORME
  // du libellé — il doit dire les mots de la valeur —, jamais un gabarit fixe.
  polyhandicap: "Polyhandicap",
  trouble_sante_invalidant: "Trouble de santé invalidant",
};

export const LABEL_REGIME: Record<RegimeConformiteErp, string> = {
  conforme_origine: "Conforme dès la construction",
  conforme_apres_travaux: "Mis en conformité après travaux",
  derogation_accordee: "Dérogation préfectorale accordée",
  adap_en_cours: "Agenda d'accessibilité programmée (Ad'AP) en cours",
  non_conforme_sans_adap: "Hors conformité — aucun Ad'AP actif",
};

/** Schéma pour chaque section (tolérant, utilisable en draft). */
export const section1Schema = z.object({
  prestationsFournies: optionalTrimmed(4000),
  handicapsAccueillis: z
    .array(z.enum(HANDICAPS))
    .default([])
    .transform((a) => Array.from(new Set(a))),
  servicesAdaptes: optionalTrimmed(4000),
});

export const section2Schema = z.object({
  conformiteRegime: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(REGIMES).nullable(),
  ),
  dateConformite: optionalDate,
  numeroAttestationAccess: optionalTrimmed(120),
  dateDepotAdap: optionalDate,
});

export const section3Schema = z.object({
  personnelForme: z.coerce.boolean().optional().default(false),
  dateDerniereFormation: optionalDate,
  organismeFormation: optionalTrimmed(200),
  effectifForme: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int().min(0).max(99999).nullable(),
  ),
});

export const section4Schema = z.object({
  equipementsAccessibilite: optionalTrimmed(4000),
  modalitesMaintenance: optionalTrimmed(4000),
  dernierControleMaintenance: optionalDate,
});

export type Section1Input = z.infer<typeof section1Schema>;
export type Section2Input = z.infer<typeof section2Schema>;
export type Section3Input = z.infer<typeof section3Schema>;
export type Section4Input = z.infer<typeof section4Schema>;

/**
 * Génère un slug public stable depuis la raison sociale.
 * Utilisé pour l'URL publique + QR code.
 */
export function genererSlug(raison: string, siret: string | null): string {
  const base = raison
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const suffix = siret ? siret.slice(-6) : Math.random().toString(36).slice(2, 8);
  return `${base || "etablissement"}-${suffix}`;
}

/**
 * Le premier slug libre à partir de `base` : `base`, puis `base-2`,
 * `base-3`… (2026-10-12, audit des modules). Deux sites d'une même
 * entreprise portant le même nom recevaient le même slug — même raison
 * sociale, même SIRET d'entreprise — et la création du second registre
 * échouait sur `slugPublic @unique`.
 */
export function slugLibre(base: string, pris: readonly string[]): string {
  const occupes = new Set(pris);
  if (!occupes.has(base)) return base;
  let n = 2;
  while (occupes.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
