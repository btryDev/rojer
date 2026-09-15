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
 * droit. `schema.ts` les réexporte, les imports existants ne bougent pas.
 */

export const SOURCES_PRESCRIPTION = [
  "arrete_prefectoral",
  "arrete_municipal",
  "pv_commission_securite",
  "arrete_icpe",
  "inspection_travail",
  "demande_assureur",
  "autre",
] as const;
export type SourcePrescription = (typeof SOURCES_PRESCRIPTION)[number];

/**
 * Libellés du sélecteur. Le `Record` exhaustif est un cliquet voulu : une
 * valeur ajoutée à l'enum sans libellé ne compile pas.
 */
export const LABEL_SOURCE_PRESCRIPTION: Record<SourcePrescription, string> = {
  arrete_prefectoral: "Arrêté préfectoral",
  arrete_municipal: "Arrêté du maire",
  pv_commission_securite: "Procès-verbal de la commission de sécurité",
  arrete_icpe: "Arrêté préfectoral ICPE",
  inspection_travail: "Demande ou mise en demeure de l'inspection du travail",
  demande_assureur: "Demande de votre assureur",
  autre: "Autre acte",
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
  "Engagement d'assurance, pas une obligation légale : cette échéance est " +
  "opposable par votre contrat d'assurance, pas par le droit.";

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
