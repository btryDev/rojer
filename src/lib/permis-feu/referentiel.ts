/**
 * Les mesures préventives d'un permis de feu, telles que la brochure INRS
 * ED 6030 les écrit.
 *
 * LA SOURCE, ET ELLE SEULE. « Le permis de feu — Démarche et document
 * support », INRS, 2e édition révisée en août 2019 : les tableaux « Étape de
 * préparation » (p. 8), « Étape de réalisation » et « Étape d'après travaux »
 * (p. 9), le paragraphe sur la détection (p. 7) et le formulaire (p. 10). Ni
 * article de code, ni arrêté. ~~« et sur la règle APSAD R43 — référentiel de
 * la profession de l'assurance, opposable par un contrat et non par le
 * droit »~~ — rayé le 2026-09-26 : la règle APSAD R43, payante, n'a jamais été
 * lue par ce dépôt, et rien ici n'en vient.
 *
 * CHAQUE MESURE CITE LA BROCHURE : son libellé est l'« Action » du tableau,
 * mot pour mot, et son explication le « Commentaire » de la même ligne. Le
 * 2026-09-26, l'appariement ligne à ligne a trouvé des mesures qui la
 * CONTREDISAIENT (« rayon de 5 m » pour « au moins 10 m », un extincteur de
 * 6 L ou de CO2 pour « 1 extincteur 9 litres à eau et 1 extincteur adapté aux
 * risques du local », « couper la ventilation » là où la brochure prévoit une
 * ventilation « si nécessaire ») et d'autres qu'elle ne contient pas (EPI de
 * l'opérateur, déchets chauds). `permis-feu/referentiel.test.ts` tient la
 * règle ; journal C33.
 *
 * LES IDENTIFIANTS SONT EN BASE (`PermisFeu.mesuresValidees`), et un permis
 * signé les porte dans son empreinte. Une mesure dont le CONTENU change prend
 * donc un nouvel identifiant ; l'ancienne passe dans `MESURES_RETIREES`, avec
 * son libellé d'origine, pour que les permis existants s'affichent comme ils
 * ont été établis. ~~Seule une reformulation sans changement de sens garde son
 * identifiant (`balisage-zone`, `isoler-detection`, `verif-etat-materiel`,
 * `controle-zone`, `surveillance-2h-min`).~~ — rayé le 2026-09-26 (contre-
 * lecture) : ces cinq-là avaient bien changé de contenu (abords et locaux
 * communicants ajoutés, « 2 heures » sorti du libellé, explication changée),
 * et la page de signature affichait à un signataire un autre texte que celui
 * qu'il avait coché, sous la même empreinte. Aucun identifiant n'est gardé.
 */

/** Où la mesure se lit dans la brochure : la page, et l'« Action » et le « Commentaire » mot pour mot. */
export type SourceInrs = {
  page: number;
  action: string;
  commentaire?: string;
  /** La page du commentaire, quand ce n'est pas celle de l'action (source composite). */
  pageCommentaire?: number;
};

export type MesurePermisFeu = {
  id: string;
  libelle: string;
  explication?: string;
  groupe: "avant" | "pendant" | "apres";
  /**
   * ~~Obligatoire (INRS recommandation forte) ou conseil~~ — rayé le
   * 2026-09-26 : l'INRS ne classe aucune mesure (son formulaire demande
   * « À FAIRE ? O/N »). `obligatoire` est l'identifiant du classement que
   * Rojer affiche « prioritaire » ; `conseillee`, le reste.
   */
  priorite: "obligatoire" | "conseillee";
  source: SourceInrs;
};

/** Une mesure que la brochure dit mot pour mot : le libellé et l'explication SONT la source. */
const inrs = (
  id: string,
  groupe: MesurePermisFeu["groupe"],
  priorite: MesurePermisFeu["priorite"],
  source: SourceInrs,
): MesurePermisFeu => ({
  id,
  libelle: source.action,
  ...(source.commentaire ? { explication: source.commentaire } : {}),
  groupe,
  priorite,
  source,
});

export const MESURES_PERMIS_FEU: readonly MesurePermisFeu[] = [
  // — AVANT : « Étape de préparation », p. 8 —
  inrs("eloignement-combustibles-10m", "avant", "obligatoire", {
    page: 8,
    action: "Éloignement des matières et produits combustibles (chiffons, cartons, plastique, bois, bidons...)",
    commentaire: "Éloigner les produits et matières inflammables à une distance d'au moins 10 m du lieu d'intervention et de toute source d'inflammation.",
  }),
  inrs("protection-combustibles", "avant", "obligatoire", {
    page: 8,
    action: "Protection de tous les éléments combustibles qu'il n'aura pas été possible d'éloigner",
    commentaire: "Protéger les éléments combustibles par la pose de bâches ignifugées ou de plaques jointives. Prévoir un arrosage complémentaire si nécessaire.",
  }),
  inrs("balisage-zone-ed6030", "avant", "obligatoire", {
    page: 8,
    action: "Balisage de la zone",
    commentaire: "Matérialiser la zone afin d'interdire l'ajout de matériel ou de produits augmentant le risque initialement établi (stockage temporaire de carton ou de produit divers). Visualiser les éventuelles zones de co-activité.",
  }),
  inrs("ventilation-si-necessaire", "avant", "conseillee", {
    page: 8,
    action: "Ventilation des zones de travail et/ou des locaux attenants si nécessaire",
    commentaire: "Mettre éventuellement en place une ventilation mécanique à l'aide d'un dispositif adapté notamment dans les zones confinées.",
  }),
  // SOURCE COMPOSITE, et elle est la seule : l'action est une ligne du
  // formulaire (« Mise en sécurité », p. 10) ; le commentaire, le paragraphe
  // « Préparation » de la p. 7, qui vise les systèmes « de détection OU
  // d'extinction automatique ». La brochure n'a pas de ligne de tableau qui
  // porte les deux ensemble.
  inrs("isolation-boucle-detection", "avant", "conseillee", {
    page: 10,
    pageCommentaire: 7,
    action: "Isolation de la boucle de détection",
    commentaire: "Il convient de s'interroger sur les systèmes de détection ou d'extinction automatique existants dans le local d'intervention. Dans l'éventualité d'une mise hors service de tout ou partie du système, des mesures de sécurité au moins équivalentes devront être mises en place, en accord avec l'assureur de l'entreprise.",
  }),
  inrs("moyens-extinction-alarme", "avant", "obligatoire", {
    page: 8,
    action: "Mise en place de moyens d'extinction et d'alarme",
    commentaire: "Ces moyens, situés à proximité immédiate de la zone de travail, comprennent au minimum 1 extincteur 9 litres à eau et 1 extincteur adapté aux risques du local.",
  }),
  inrs("verification-outillage", "avant", "obligatoire", {
    page: 8,
    action: "Vérification de l'état de l'outillage utilisé",
    commentaire: "S'assurer que les tuyères ne sont pas endommagées, les brûleurs bouchés, les manomètres déréglés, les vannes rouillées, les tuyaux inadaptés (détériorés, trop minces ou cassants, sans raccord spécial…), de l'absence de graisse sur la robinetterie et les garnitures à oxygène.",
  }),
  inrs("nettoyage-zone-preparation", "avant", "conseillee", {
    page: 8,
    action: "Nettoyage de la zone",
    commentaire: "Éliminer déchets, couches et tas de poussières, dépôts gras...",
  }),
  inrs("visite-commune", "avant", "conseillee", {
    page: 8,
    action: "Visite commune du ou des lieux d'intervention",
    commentaire: "Informer les opérateurs situés à proximité.",
  }),

  // — PENDANT : « Étape de réalisation », p. 9 —
  inrs("surveillance-premiere-intervention", "pendant", "obligatoire", {
    page: 9,
    action: "Surveillance par une personne formée à la première intervention",
    commentaire: "Surveillance difficile, voire impossible à réaliser par l'opérateur qui est absorbé par son travail et dont le champ de vision est limité par le port des EPI.",
  }),

  // — APRÈS : « Étape d'après travaux », p. 9 —
  inrs("inspection-apres-arret", "apres", "obligatoire", {
    page: 9,
    action: "Inspection du lieu d'intervention et des abords juste après l'arrêt des travaux (notamment des locaux communicants par des tuyauteries, gaines...)",
    commentaire: "Vérifier, entre autres, l'absence de surfaces chaudes, la fermeture des bouteilles de gaz utilisées pour l'opération...",
  }),
  inrs("surveillance-lieux-abords", "apres", "obligatoire", {
    page: 9,
    action: "Surveillance des lieux de travail et des abords",
    commentaire: "Surveillance à réaliser pendant 2 h au moins après l'arrêt des travaux. Arrêter les travaux 2 h au moins avant la fermeture de l'entreprise si le maintien de la surveillance n'est pas possible.",
  }),
  inrs("deconsignation-remise-disposition", "apres", "obligatoire", {
    page: 9,
    action: "Déconsignation et remise à disposition de l'installation",
  }),
];

/**
 * Les mesures retirées le 2026-09-26, avec leur libellé D'ORIGINE : un permis
 * établi avant cette date les porte en base, et s'affiche comme il a été
 * établi. On ne les coche plus.
 */
export const MESURES_RETIREES: readonly {
  id: string;
  libelle: string;
  groupe: MesurePermisFeu["groupe"];
  motif: string;
}[] = [
  { id: "zone-degagee-5m", libelle: "Éloigner ou protéger les matériaux inflammables dans un rayon de 5 m", groupe: "avant", motif: "La brochure dit « au moins 10 m » (p. 8)." },
  { id: "couper-ventilation", libelle: "Couper la ventilation / climatisation à proximité", groupe: "avant", motif: "La brochure prévoit une « Ventilation des zones de travail et/ou des locaux attenants si nécessaire » (p. 8)." },
  { id: "extincteurs-proximite", libelle: "Extincteur(s) à portée immédiate (≤ 3 m)", groupe: "avant", motif: "« ≤ 3 m » n'est pas dans la brochure ; elle demande « au minimum 1 extincteur 9 litres à eau et 1 extincteur adapté aux risques du local » (p. 8)." },
  { id: "information-occupants", libelle: "Informer les occupants et responsables de zone", groupe: "avant", motif: "La brochure vise « les opérateurs situés à proximité », lors de la visite commune (p. 8)." },
  { id: "surveillant-dedie", libelle: "Surveillant incendie dédié présent en continu", groupe: "pendant", motif: "« Dédié, présent en continu » n'est pas dans la brochure ; elle dit « une personne formée à la première intervention » (p. 9)." },
  { id: "epi-operateur", libelle: "EPI adaptés portés par l'opérateur (écran facial, gants, tablier cuir)", groupe: "pendant", motif: "Aucune mesure de la brochure : les EPI n'y sont nommés qu'à propos du champ de vision de l'opérateur (p. 9)." },
  { id: "evacuation-dechets", libelle: "Évacuation régulière des déchets chauds (métal, scories)", groupe: "pendant", motif: "Aucune mesure de la brochure." },
  { id: "reactivation-detection", libelle: "Réactiver la détection incendie et la ventilation", groupe: "apres", motif: "La brochure dit « Déconsignation et remise à disposition de l'installation » (p. 9)." },
  { id: "nettoyage-zone", libelle: "Nettoyer la zone de travail", groupe: "apres", motif: "La brochure place le nettoyage en préparation, pas après les travaux (p. 8)." },
  // Retirés le même jour, après contre-lecture : leur contenu avait changé
  // sous le même identifiant.
  { id: "balisage-zone", libelle: "Baliser et signaler la zone de travail", groupe: "avant", motif: "Remplacé par « Balisage de la zone » et son commentaire (p. 8)." },
  { id: "isoler-detection", libelle: "Isoler ou neutraliser les détecteurs automatiques d'incendie", groupe: "avant", motif: "Remplacé par « Isolation de la boucle de détection » (formulaire, p. 10) et le paragraphe de la p. 7." },
  { id: "verif-etat-materiel", libelle: "Vérifier l'état du matériel d'intervention (flexibles, manodétendeurs, câbles)", groupe: "avant", motif: "Remplacé par « Vérification de l'état de l'outillage utilisé » (p. 8)." },
  { id: "surveillance-2h-min", libelle: "Surveillance de la zone pendant au moins 2 heures après arrêt", groupe: "apres", motif: "Remplacé par « Surveillance des lieux de travail et des abords », « 2 h au moins » (p. 9)." },
  { id: "controle-zone", libelle: "Contrôle visuel de la zone : aucun point chaud, aucune fumée", groupe: "apres", motif: "Remplacé par l'inspection « du lieu d'intervention et des abords juste après l'arrêt des travaux » (p. 9)." },
];

/** Les identifiants qu'une création accepte : ceux de la liste courante, et eux seuls. */
export const IDS_MESURES_COURANTES: ReadonlySet<string> = new Set(MESURES_PERMIS_FEU.map((m) => m.id));

/** Un permis porte-t-il des mesures d'une liste antérieure ? */
export const surListeAnterieure = (ids: readonly string[]) =>
  ids.some((id) => MESURES_RETIREES.some((m) => m.id === id));

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
    sous: "Surveillance de l'opération",
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

/** Le libellé d'une mesure cochée — courante, ou retirée depuis que le permis a été établi. */
export function mesureParId(id: string): { libelle: string } | undefined {
  return MESURES_PERMIS_FEU.find((m) => m.id === id) ?? MESURES_RETIREES.find((m) => m.id === id);
}
