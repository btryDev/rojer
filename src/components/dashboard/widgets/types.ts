// Types partagés par le système de widgets du tableau de bord.
// Le "gabarit" produit est volontairement simple : un widget = un id
// stable + un rendu React + des variants de visualisation optionnels.
// L'ordre et le choix de variant sont pilotés par l'utilisateur via
// localStorage (voir useLayoutPerso).

import type { BatimentCharge } from "@/lib/batiments/queries";
import type { ComponentType } from "react";
import type {
  BarMois,
  DashboardData,
  EvenementFenetre,
} from "@/lib/dashboard/queries";
import type { EvenementGrille } from "@/lib/calendrier/grille";
import type { EtatEcheances } from "@/lib/calendrier/retards";
import type { ModulesMatrice } from "@/lib/dashboard/obligations";
import type { StatsRetardActions } from "@/lib/actions/queries";

export type Taille = "small" | "medium" | "large";
// small = 2 col · medium = 3 col · large = 6 col (grille à 6 colonnes)

export type WidgetId =
  | "etablissement"
  | "score"
  | "indicateurs"
  | "echeances"
  | "activite"
  | "a-faire"
  | "par-ou-commencer"
  | "actions-retard"
  | "controle"
  | "kpi-en-retard"
  | "kpi-sous-30j"
  | "kpi-actions"
  | "kpi-rapports"
  | "bars-obligations"
  | "prochaines-echeances"
  | "plan-actions"
  | "registre"
  | "equipements-grid"
  | "duerp"
  | "guide"
  | "recos"
  | "calendrier-type"
  | "documents"
  | "countdown"
  | "anciennete"
  | "semaine"
  | "flux-registre"
  | "meteo";

export type LayoutItem = {
  widgetId: WidgetId;
  /** identifiant de variant — « default » si non précisé */
  variant: string;
};

export type PersistedLayout = {
  version: number;
  items: LayoutItem[];
};

/* ─── Bundle de données consommé par tous les widgets ─────── */

type EtablissementLite = {
  id: string;
  raisonDisplay: string;
  entrepriseId: string;
  adresse: string;
  effectifSurSite: number;
  codeNaf: string | null;
  estEtablissementTravail: boolean;
  estERP: boolean;
  estIGH: boolean;
  estHabitation: boolean;
  typeErp: string | null;
  categorieErp: string | null;
  classeIgh: string | null;
  entreprise: {
    raisonSociale: string;
    siret: string | null;
    codeNaf: string;
  };
};

type EquipementLite = {
  id: string;
  libelle: string;
  categorie: string;
  /** Stats de vérification pour afficher des pastilles contextuelles
   * (en retard / à planifier / à venir / à jour). Undefined si aucune
   * vérification n'existe pour cet équipement. */
  stats?: {
    enRetard: number;
    aPlanifier: number;
    sous30j: number;
    derniereRealisee: Date | null;
    prochaineDate: Date | null;
  };
};

type VerificationLite = {
  id: string;
  libelleObligation: string;
  datePrevue: Date;
  statut: string;
  /**
   * `null` = ligne ouverte (ADR-034). Il traverse jusqu'au board bien que la
   * requête qui alimente `prochainesVerifs` écarte déjà les lignes archivées :
   * les widgets classent eux-mêmes leurs lignes, et un classement qui reçoit
   * une forme sans ce champ redevient aveugle le jour où la requête change.
   * C'est exactement ce qui s'est produit avec le préfixe de libellé.
   */
  archiveLe: Date | null;
  equipement: { libelle: string };
  /**
   * La source de la prescription dont la ligne est née, quand elle en a une.
   * Le board s'en sert pour marquer les échéances contractuelles (ADR-032) —
   * une demande d'assureur n'est pas une obligation légale, et l'écran le plus
   * lu du produit ne peut pas la présenter comme les autres.
   */
  prescription?: { source: string } | null;
};

type RapportLite = {
  id: string;
  verificationId: string;
  dateRapport: Date;
  resultat:
    | "conforme"
    | "observations_mineures"
    | "ecart_majeur"
    | "non_verifiable";
  verification: { libelleObligation: string };
};

type DuerpLite = {
  id: string;
  versions: Array<{ numero: number; createdAt: Date }>;
};

export type DashboardBundle = {
  etablissementId: string;
  /** Les bâtiments de l'établissement (ADR-019) — un seul le plus souvent.
   *  Le hero en affiche une carte chacun, avec son parc et sa charge. */
  batiments: BatimentCharge[];
  /** Le bâtiment filtré, ou `null` = tout l'établissement. Les widgets
   *  d'échéances et le parc reçoivent une donnée déjà réduite ; ce champ
   *  leur permet de le dire. */
  batimentFiltre: { id: string; nom: string } | null;
  /**
   * Ce que les deux compteurs du hero comptent, en toutes lettres.
   *
   * **Dérivées côté serveur, et transportées** — pas calculées ici. Les deux
   * phrases sortent de `perimetre/porteurs-comptes.ts`, qui lit le référentiel
   * et fait tourner l'agrégation des zones pour savoir ce qu'elle retient
   * vraiment ; rien de tout cela n'a à traverser vers le navigateur, et le
   * board est un composant client.
   *
   * Elles existent parce que le hero pose côte à côte deux nombres qui ne
   * comptent pas la même chose : le relevé « Dépassées » réunit toutes les
   * familles de tout l'établissement, les pastilles des zones ne comptent que
   * ce que portent les équipements. Les deux sont justes ; c'est le seul
   * endroit du produit où l'écart se constate d'un coup d'œil, donc le seul où
   * il doit s'expliquer sur place.
   */
  perimetreHero: { releves: string; plaqueZones: string };
  etablissement: EtablissementLite;
  dashboard: DashboardData;
  /**
   * Le dépassé et l'horizon proche, ventilés par famille — **la** source
   * des nombres de retard du board (`lib/calendrier/retards`), la même que
   * celle des badges de la sidebar et du bandeau du calendrier.
   *
   * Aucun bloc ne recompte : le bandeau d'accueil additionnait deux
   * familles sur cinq, le widget « Échéances » comptait les dates passées
   * de la frise (donc aussi celles d'un permis clos), et l'écran affichait
   * trois nombres sous le même mot. Suit le filtre bâtiment, comme les
   * listes qu'il surplombe.
   */
  echeances: EtatEcheances;
  /**
   * Le même état, **filtre bâtiment ignoré**. Pour le hero, qui parle de
   * l'établissement : la plaque des bâtiments y liste tous les volumes avec
   * la charge de chacun, et les relevés d'à côté suivaient le filtre. Sur un
   * site filtré, « Dépassées 3 » voisinait donc des cartes qui en totalisent
   * sept, sans que rien n'explique l'écart.
   *
   * Le filtre gouverne ce qui est *sous* le hero — la file de travail, le
   * calendrier, le parc. La légende du sélecteur le dit.
   */
  echeancesEtablissement: EtatEcheances;
  equipements: EquipementLite[];
  /**
   * Le parc **entier**, filtre bâtiment ignoré. Pour les blocs qui portent
   * explicitement sur l'établissement — le score de conformité, que la
   * légende du sélecteur annonce comme tel, et qui mêle de toute façon des
   * faits sans lieu (état du DUERP, actions, documents).
   *
   * Sans cette seconde liste, la carte Score affichait la note de
   * l'établissement au-dessus d'un découpage par famille restreint au
   * bâtiment choisi : deux périmètres dans le même cadre, et une légende
   * qui promettait l'inverse.
   */
  equipementsEtablissement: EquipementLite[];
  barsData: BarMois[];
  /** Date de référence, calculée côté serveur : garantit un rendu
   *  déterministe (pas d'écart d'hydratation) et des tests reproductibles. */
  aujourdhui: Date;
  /** Toutes les échéances datées, toutes familles confondues (contrôles,
   *  travaux, papiers) — alimente la frise et la vue calendrier du bloc,
   *  qui coupent côté client. Même donnée que la page Calendrier. */
  evenementsHorizon: EvenementGrille[];
  /** Fenêtre glissante 7 j — widget « Semaine ». */
  evenementsSemaine?: EvenementFenetre[];
  /** Fenêtre glissante 30 j — widget « Météo ». */
  evenementsMois?: EvenementFenetre[];
  statsRetardActions: StatsRetardActions;
  /** Lignes conditionnelles de la matrice « Vos documents » —
   *  registres complémentaires (accessibilité, permis de feu…). */
  modulesMatrice: ModulesMatrice;
  prochainesVerifs: VerificationLite[];
  rapportsRecents: RapportLite[];
  nbVerifs: number;
  nbRapports: number;
  duerpDernier: DuerpLite | null;
  jourDernierRapport: number | null;
  moisCourant: number;
};

/* ─── Définition d'un widget dans le registre ─────────────── */

export type Variant = { id: string; label: string };

export type WidgetDefinition = {
  id: WidgetId;
  titre: string;
  /** Phrase courte affichée dans le tiroir « Ajouter un widget » */
  description: string;
  taille: Taille;
  variants: readonly Variant[];
  defaultVariant: string;
  Component: ComponentType<{ bundle: DashboardBundle; variant: string }>;
  /** Exclu du layout par défaut (disponible mais pas monté d'office) */
  exclueDuDefaut?: boolean;
  /** Widget obligatoire : ne peut pas être retiré par l'utilisateur et est
   * réinjecté automatiquement si absent du layout persisté. */
  obligatoire?: boolean;
  /** Si la fonction renvoie false, le widget est masqué même s'il est
   * dans le layout (ex. widget DUERP alors qu'aucun DUERP n'existe). */
  visibleQuand?: (b: DashboardBundle) => boolean;
};

