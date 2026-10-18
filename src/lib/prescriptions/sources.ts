/**
 * Les sources d'une prescription particulière, leurs libellés, et la
 * distinction qui compte : acte d'autorité opposable ou engagement
 * contractuel (ADR-035, amendée par l'ADR-032).
 *
 * **Module feuille, et c'est la raison de son existence.** Ces constantes
 * vivaient dans `schema.ts`, qui importe `estPeriodicitePlusStricte` du
 * moteur de matching. Le moteur, lui, doit maintenant marquer les lignes
 * contractuelles : l'y faire importer `schema.ts` fermait un cycle
 * d'imports au runtime, entre un module qui construit ses schémas Zod à
 * l'initialisation et un autre qui s'en sert. Le cycle aurait probablement
 * tenu ; « probablement » n'est pas une garantie qu'on veut sous un
 * marquage dont l'absence fait passer un engagement d'assurance pour du
 * droit. ~~`schema.ts` les réexporte, les imports existants ne bougent pas.~~
 * [2026-10-14, audit Next.js H1 : `schema.ts` est réservé au serveur et ne
 * les réexporte plus ; les écrans les prennent ici.]
 */

/**
 * ~~Sept sources : arrêté préfectoral, arrêté du maire, PV de la commission de
 * sécurité, arrêté préfectoral ICPE, inspection du travail, demande de
 * l'assureur, autre acte.~~ — 2026-10-18, décision de la propriétaire (« pour
 * les prescriptions on enlève les arrêtés commission (on garde assurance +
 * autre) ») : DEUX sources. Un arrêté, un PV de commission ou une demande de
 * l'inspection du travail reçus se saisissent en « Autre », et Rojer les
 * applique comme avant. Les saisies anciennes sont passées en `autre`, leur
 * ancien libellé préfixé à la référence (migration
 * `20261018090000_sources_prescription_deux`). L'ordre est celui du sélecteur.
 */
export const SOURCES_PRESCRIPTION = ["demande_assureur", "autre"] as const;
export type SourcePrescription = (typeof SOURCES_PRESCRIPTION)[number];

/**
 * Libellés du sélecteur. Le `Record` exhaustif est un cliquet voulu : une
 * valeur ajoutée à l'enum sans libellé ne compile pas.
 */
export const LABEL_SOURCE_PRESCRIPTION: Record<SourcePrescription, string> = {
  demande_assureur: "Demande de votre assureur",
  // ~~« Autre acte »~~ — 2026-10-18 : l'option dit où va un arrêté reçu.
  autre: "Autre acte (arrêté, procès-verbal de la commission de sécurité, inspection du travail…)",
};

/**
 * Libellés de LISTE — la liste des prescriptions déclarées, où la référence
 * suit (« Autre acte — Arrêté préfectoral — AP 2024-12 »). L'option du
 * sélecteur dit où va un arrêté ; répétée devant chaque ligne, elle noyait
 * la référence (revue du 2026-10-18). Même cliquet `Record`.
 */
export const LABEL_COURT_SOURCE_PRESCRIPTION: Record<SourcePrescription, string> = {
  demande_assureur: "Demande de votre assureur",
  autre: "Autre acte",
};

/**
 * Exemple du champ « Référence », qui suit la source comme le champ
 * « Autorité » : le défaut étant l'assureur, « AP n° 2026-123 » proposait un
 * arrêté préfectoral sous une demande d'assurance (revue du 2026-10-18).
 */
export const EXEMPLE_REFERENCE_PRESCRIPTION: Record<SourcePrescription, string> = {
  demande_assureur: "Avenant n° MRP-2026-4417",
  autre: "AP n° 2026-123 (ou PV du 12/03/2026)",
};

/**
 * Sources **contractuelles** — celles qui ne sont pas un acte d'autorité.
 *
 * Le `Set` est typé : une valeur mal orthographiée ne compile pas. Et la
 * liste vit ici, pas dans chaque écran : le jour où une seconde source
 * contractuelle apparaît, il n'y a aucune surface à retrouver.
 */
const SOURCES_CONTRACTUELLES = new Set<SourcePrescription>([
  "demande_assureur",
]);

/**
 * Accepte `string` — les lectures Prisma et les projections de matching ne
 * s'accordent pas toujours sur le type exact de la colonne, et une source
 * inconnue doit répondre « pas contractuelle » plutôt que faire tomber un
 * rendu. Le cliquet de complétude est ailleurs : dans les `Record` ci-dessus
 * et dans `LIBELLE_SOURCE_EN_PHRASE` du moteur.
 */
export function estSourceContractuelle(source: string): boolean {
  return SOURCES_CONTRACTUELLES.has(source as SourcePrescription);
}

/**
 * Le marquage, écrit une fois, parce qu'il n'est pas optionnel : partout où
 * une ligne née d'une source contractuelle s'affiche — calendrier, registre,
 * PDF, dossier de contrôle — elle le porte (ADR-032). Une échéance
 * contractuelle qui se présenterait comme réglementaire est exactement
 * l'erreur que l'ADR-035 voulait empêcher, et c'est ce marquage, lui seul,
 * qui la retient.
 *
 * La forme est calquée sur ce que le produit dit déjà de la règle APSAD R43
 * (page des permis de feu, pied du dossier de contrôle) : nommer le
 * référentiel privé pour ce qu'il est, sans lui donner la pastille d'un
 * article de code. Aucune référence légale n'est fabriquée pour ces lignes.
 */
export const MARQUAGE_CONTRACTUEL =
  "Engagement d'assurance, pas une obligation légale.";

/** Même chose, pour les surfaces qui ont la place d'une phrase entière. */
export const MARQUAGE_CONTRACTUEL_LONG =
  "Engagement d'assurance, pas une obligation légale : cette échéance naît " +
  "d'une demande de votre assureur, et aucune référence légale ne lui est attachée.";

/** Libellé court des pastilles et des colonnes étroites. */
export const PASTILLE_CONTRACTUELLE = "Engagement d'assurance";

/**
 * Une ligne de calendrier est-elle née d'un acte contractuel ?
 *
 * La forme attendue est celle que rendent les lectures de `Verification` :
 * la relation `prescription` avec sa `source`, ou `null` quand la ligne vient
 * du référentiel. Le prédicat est écrit ici pour que chaque surface pose la
 * même question — six d'entre elles passent par `VerificationListee`, et
 * chacune redemandant « est-ce que source === "demande_assureur" » finirait
 * par diverger d'une.
 *
 * Une échéance dont la prescription a été supprimée (`ON DELETE SET NULL`,
 * ADR-012) rend `null` et n'est donc pas marquée. C'est le comportement
 * voulu : il ne reste rien qui dise de quel acte elle venait, et affirmer
 * « engagement d'assurance » sans acte serait affirmer ce qu'on ne sait plus.
 */
export function estEcheanceContractuelle(v: {
  prescription?: { source: string } | null;
}): boolean {
  return v.prescription != null && estSourceContractuelle(v.prescription.source);
}
