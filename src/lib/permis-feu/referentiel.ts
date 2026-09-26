/**
 * Référentiel des mesures préventives applicables à un permis de feu.
 *
 * Sourcé sur INRS ED 6030 « Le permis de feu » (guide de bonnes pratiques)
 * et sur la règle APSAD R43 — référentiel de la profession de l'assurance,
 * opposable par un contrat et non par le droit. Aucune des deux n'est un
 * texte réglementaire : ce module produit une check-list, jamais une
 * obligation datée du référentiel de conformité (cf. `conformite/types.ts`).
 * Chaque mesure est rattachée à un groupe (avant / pendant / après) qui
 * structure la check-list présentée dans le wizard.
 */

export type MesurePermisFeu = {
  id: string;
  libelle: string;
  explication?: string;
  groupe: "avant" | "pendant" | "apres";
  /** Obligatoire (INRS recommandation forte) ou conseil */
  priorite: "obligatoire" | "conseillee";
};

export const MESURES_PERMIS_FEU: readonly MesurePermisFeu[] = [
  // — AVANT les travaux —
  {
    id: "zone-degagee-5m",
    libelle: "Éloigner ou protéger les matériaux inflammables dans un rayon de 5 m",
    explication:
      "Bois, cartons, textiles, plastiques, liquides inflammables. Bâcher avec bâche ignifugée si impossible.",
    groupe: "avant",
    priorite: "obligatoire",
  },
  {
    id: "balisage-zone",
    libelle: "Baliser et signaler la zone de travail",
    groupe: "avant",
    priorite: "obligatoire",
  },
  {
    id: "couper-ventilation",
    libelle: "Couper la ventilation / climatisation à proximité",
    explication:
      "Évite la dispersion d'étincelles et la propagation de fumées dans le bâtiment.",
    groupe: "avant",
    priorite: "obligatoire",
  },
  {
    id: "isoler-detection",
    libelle: "Isoler ou neutraliser les détecteurs automatiques d'incendie",
    explication:
      "Uniquement temporairement et selon une procédure écrite. Remise en service en fin de travaux.",
    groupe: "avant",
    priorite: "conseillee",
  },
  {
    id: "extincteurs-proximite",
    libelle: "Extincteur(s) à portée immédiate (≤ 3 m)",
    explication:
      "Au minimum 1 extincteur à eau avec additif de 6 L ou 1 CO2 de 5 kg, selon les matériaux environnants.",
    groupe: "avant",
    priorite: "obligatoire",
  },
  {
    id: "verif-etat-materiel",
    libelle: "Vérifier l'état du matériel d'intervention (flexibles, manodétendeurs, câbles)",
    groupe: "avant",
    priorite: "obligatoire",
  },
  {
    id: "information-occupants",
    libelle: "Informer les occupants et responsables de zone",
    groupe: "avant",
    priorite: "conseillee",
  },

  // — PENDANT les travaux —
  {
    id: "surveillant-dedie",
    libelle: "Surveillant incendie dédié présent en continu",
    explication:
      "Personne distincte de l'opérateur, formée à la manipulation des extincteurs.",
    groupe: "pendant",
    priorite: "obligatoire",
  },
  {
    id: "epi-operateur",
    libelle: "EPI adaptés portés par l'opérateur (écran facial, gants, tablier cuir)",
    groupe: "pendant",
    priorite: "obligatoire",
  },
  {
    id: "evacuation-dechets",
    libelle: "Évacuation régulière des déchets chauds (métal, scories)",
    groupe: "pendant",
    priorite: "conseillee",
  },

  // — APRÈS les travaux —
  {
    id: "surveillance-2h-min",
    libelle: "Surveillance de la zone pendant au moins 2 heures après arrêt",
    explication:
      "INRS, ED 6030 : « Surveillance à réaliser pendant 2 h au moins après l'arrêt des travaux. Arrêter les travaux 2 h au moins avant la fermeture de l'entreprise si le maintien de la surveillance n'est pas possible. »",
    groupe: "apres",
    priorite: "obligatoire",
  },
  {
    id: "controle-zone",
    libelle: "Contrôle visuel de la zone : aucun point chaud, aucune fumée",
    groupe: "apres",
    priorite: "obligatoire",
  },
  {
    id: "reactivation-detection",
    libelle: "Réactiver la détection incendie et la ventilation",
    groupe: "apres",
    priorite: "obligatoire",
  },
  {
    id: "nettoyage-zone",
    libelle: "Nettoyer la zone de travail",
    groupe: "apres",
    priorite: "conseillee",
  },
];

export const GROUPES_LABEL: Record<
  MesurePermisFeu["groupe"],
  { label: string; sous: string }
> = {
  avant: {
    label: "Avant les travaux",
    sous: "Préparer la zone et les moyens de secours",
  },
  pendant: {
    label: "Pendant les travaux",
    sous: "Surveillance et protection continues",
  },
  apres: {
    label: "Après les travaux",
    sous: "Inspection, surveillance, remise en service",
  },
};

export function mesuresParGroupe() {
  const map = {
    avant: [] as MesurePermisFeu[],
    pendant: [] as MesurePermisFeu[],
    apres: [] as MesurePermisFeu[],
  };
  for (const m of MESURES_PERMIS_FEU) map[m.groupe].push(m);
  return map;
}

export function mesureParId(id: string): MesurePermisFeu | undefined {
  return MESURES_PERMIS_FEU.find((m) => m.id === id);
}
