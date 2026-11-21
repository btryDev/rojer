/**
 * Les familles de risque proposées à cocher dans le formulaire du plan de
 * prévention (2026-11-21, décision de la propriétaire) — les treize de
 * RiskBoard (`enum RiskFamily` de GestBAT), avec ses libellés français.
 *
 * Une liste TypeScript et non un enum Prisma : la colonne
 * `LignePlanPrevention.famille` est un texte validé ici. Une famille retirée
 * un jour de la liste ne rend pas illisible une ligne déjà écrite — elle
 * s'affiche alors par son code (`libelleFamille`).
 *
 * Cocher une famille crée une ligne d'analyse d'interférence (R. 4512-6
 * al. 2) dont le risque est prérempli par le libellé ; les deux mesures, celle
 * de l'entreprise utilisatrice et celle de l'entreprise extérieure, restent
 * séparées comme le texte les sépare.
 */
export const FAMILLES_RISQUE = [
  { code: "AMIANTE", libelle: "Amiante" },
  { code: "CIRCULATION_INTERNE", libelle: "Circulation interne" },
  { code: "CHUTES_HAUTEUR", libelle: "Chutes en hauteur" },
  { code: "PRODUITS_CHIMIQUES", libelle: "Produits chimiques" },
  { code: "ELECTRIQUE", libelle: "Électrique" },
  { code: "MANUTENTIONS_MANUELLES", libelle: "Manutentions manuelles" },
  { code: "BIOLOGIQUE", libelle: "Biologique" },
  { code: "INCENDIE_EXPLOSION", libelle: "Incendie / Explosion" },
  { code: "ATEX", libelle: "ATEX (atmosphères explosibles)" },
  { code: "RADON", libelle: "Radon" },
  { code: "COACTIVITE", libelle: "Coactivité EU / EE" },
  { code: "NUISANCES", libelle: "Nuisances (bruit, chaleur, etc.)" },
  { code: "AUTRE", libelle: "Autre risque" },
] as const;

type CodeFamilleRisque = (typeof FAMILLES_RISQUE)[number]["code"];

/** Les codes, pour `z.enum` (`schema.ts`). */
export const CODES_FAMILLE_RISQUE = FAMILLES_RISQUE.map((f) => f.code) as [
  CodeFamilleRisque,
  ...CodeFamilleRisque[],
];

/** Le libellé d'une famille ; un code inconnu de la liste se rend tel quel. */
export function libelleFamille(code: string): string {
  return FAMILLES_RISQUE.find((f) => f.code === code)?.libelle ?? code;
}
