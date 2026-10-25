// Types partagés par le système de widgets du tableau de bord.
// Le "gabarit" produit est volontairement simple : un widget = un id
// stable + un rendu React + des variants de visualisation optionnels.
// L'ordre et le choix de variant sont pilotés par l'utilisateur via
// localStorage (voir useLayoutPerso).

import type { BatimentListe } from "@/lib/batiments/queries";
import type { IllustrationBatiment } from "@/lib/etablissements/illustration";
import type { ComponentType } from "react";
import type { SidebarItemId } from "@/components/layout/sidebar-nav";
import type {
  BarMois,
  BarresAnnee,
  DashboardData,
  EvenementFenetre,
} from "@/lib/dashboard/queries";
import type { EvenementGrille } from "@/lib/calendrier/grille";
import type { EtatEcheances } from "@/lib/calendrier/retards";
import type { ModulesMatrice } from "@/lib/dashboard/obligations";
import type { StatsRetardActions } from "@/lib/actions/queries";
import type { MentionRythme } from "@/lib/referentiels/conformite/mention-rythme";

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
  | "meteo"
  | "etats-permanents";

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

export type EtablissementLite = {
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
  typesErpAutres: readonly string[];
  categorieErp: string | null;
  classeIgh: string | null;
  entreprise: {
    raisonSociale: string;
    siret: string | null;
    codeNaf: string;
    /** L'effectif déclaré de l'entreprise (C37), rappelé sous celui du site. */
    effectif: number;
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
  /**
   * L'obligation de la ligne. REQUIS depuis le C64 (2026-10-08) : c'est par
   * lui que le widget reconnaît la visite de la commission de sécurité, « pour
   * information » (`estLignePourInformation`) — un champ facultatif oublié la
   * ferait compter en retard en silence.
   */
  obligationId: string;
  libelleObligation: string;
  datePrevue: Date;
  statut: string;
  /** Le rythme : les widgets classent eux-mêmes leurs lignes, et le
   *  classement en a besoin pour ne pas croire « réalisée » une obligation
   *  périodique dont la date est passée (`estVerificationRealisee`). */
  periodicite: string;
  /**
   * `null` = ligne ouverte (ADR-034). Il traverse jusqu'au board bien que la
   * requête qui alimente `prochainesVerifs` écarte déjà les lignes archivées :
   * les widgets classent eux-mêmes leurs lignes, et un classement qui reçoit
   * une forme sans ce champ redevient aveugle le jour où la requête change.
   * C'est exactement ce qui s'est produit avec le préfixe de libellé.
   */
  archiveLe: Date | null;
  /** Délai de grâce (ADR-040) — lu par `delaiDeGrace`. */
  graceJusquAu: Date | null;
  equipement: { libelle: string };
  /**
   * La source de la prescription dont la ligne est née, quand elle en a une.
   * Le board s'en sert pour marquer les échéances contractuelles (ADR-032) —
   * une demande d'assureur n'est pas une obligation légale, et l'écran le plus
   * lu du produit ne peut pas la présenter comme les autres.
   */
  prescription?: { source: string } | null;
  /**
   * La prescription dont la ligne tient son rythme (ADR-035), `null` sinon.
   * REQUIS : une ligne rythmée par une autorité n'est jamais « retenue par
   * prudence » (`retenueParSaMarque`), et un champ facultatif oublié la ferait
   * sortir des retards en silence (revue indépendante du lot 3).
   */
  prescriptionId: string | null;
  /**
   * Les phrases « à confirmer » de la ligne (`matching/marques.ts`), vide si
   * rien ne la retient par prudence (revue du lot 1 : le board listait ces
   * échéances sans la mention). Optionnel pour les fixtures ; la page le
   * remplit toujours.
   */
  aConfirmer?: readonly string[];
  /**
   * D'où vient le rythme quand Rojer le retient (ADR-039 § 5 : jamais sans
   * marquage), `null` sinon — calculé au serveur
   * (`mentionRythmeDeVerification`), le board est un composant client.
   * Optionnel pour les fixtures ; la page le remplit toujours.
   */
  rythmeRetenu?: MentionRythme | null;
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
  /** Les zones de l'établissement (ADR-019, ADR-029) et leur parc, nommées
   *  dans la fiche du hero. */
  batiments: BatimentListe[];
  /** Le bâtiment filtré, ou `null` = tout l'établissement. Les widgets
   *  d'échéances et le parc reçoivent une donnée déjà réduite ; ce champ
   *  leur permet de le dire. */
  batimentFiltre: { id: string; nom: string } | null;
  /**
   * Le dessin du hero (`illustrationBatiment`), choisi côté serveur : la
   * reconnaissance par code NAF lit les référentiels sectoriels, qui n'ont
   * pas à partir dans le bundle du board.
   */
  illustrationHero: IllustrationBatiment;
  /** L'adresse de la photo du lieu déposée par le dirigeant, ou `null` :
   *  le hero montre alors l'illustration. */
  photoHero: string | null;
  /** Les fiches actives de l'équipe (`compterEquipe`), pour la fiche du hero. */
  nbEquipe: number;
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
   * Le même état, **filtre bâtiment ignoré**. Pour le titre du hero, qui
   * parle de l'établissement. [2026-10-25 : la plaque des zones et les
   * relevés chiffrés, qui en faisaient le premier lecteur, ont quitté le
   * hero.]
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
  /**
   * Les lignes de l'année SANS ÉCHÉANCE CONNUE : aucune barre ne les porte,
   * les comptes du widget les gardent (`BarresAnnee`).
   */
  barsSansEcheance: BarresAnnee["sansEcheance"];
  /** Les retards DATÉS d'années passées, comptés dans l'année en cours
   *  (`BarresAnnee`) : aucune barre de l'année ne les porte. */
  barsRetardsAnterieurs: number;
  /** Date de référence, calculée côté serveur : garantit un rendu
   *  déterministe (pas d'écart d'hydratation) et des tests reproductibles. */
  aujourdhui: Date;
  /** Toutes les échéances datées, toutes familles confondues (contrôles,
   *  travaux, papiers) — alimente la frise et la vue calendrier du bloc,
   *  qui coupent côté client. Même donnée que la page Calendrier. */
  evenementsHorizon: EvenementGrille[];
  /** Fenêtre glissante 7 j — widget « Semaine ». */
  evenementsSemaine?: EvenementFenetre[];
  /** Fenêtre glissante 30 j — widget « 30 prochains jours ». */
  evenementsMois?: EvenementFenetre[];
  statsRetardActions: StatsRetardActions;
  /** Lignes conditionnelles de la matrice « Vos documents » —
   *  registres complémentaires (accessibilité, permis de feu…). */
  modulesMatrice: ModulesMatrice;
  /** Les cinq lignes aux dates les plus proches, lignes sans échéance connue
   *  COMPRISES : le widget « Prochaines échéances » les affiche. */
  prochainesVerifs: VerificationLite[];
  /**
   * La prochaine échéance CONNUE (`prochaineEcheanceConnue`), choisie sur la
   * liste entière — jamais dérivée de `prochainesVerifs`, qui est coupée à
   * cinq : le widget « Prochaine échéance » y filtrait les lignes sans
   * échéance APRÈS la coupe, et annonçait « sans échéance connue » quand cinq
   * « à planifier » précédaient une vraie échéance. `null` = aucune.
   */
  prochaineEcheance: VerificationLite | null;
  /**
   * Les demandes d'assureur à planifier (sans échéance connue) que
   * `prochainesVerifs` a coupées : le widget « Prochaines échéances » les
   * nomme sous sa liste (`echeancesDuTableauDeBord`, contrôle visuel du
   * 2026-10-13). Requis : facultatif, une projection qui l'oublierait la
   * ferait disparaître du board en silence — le défaut même qu'il corrige.
   */
  demandesAssureurHorsListe: VerificationLite[];
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
  /**
   * La page où le widget mène — celle dont il est l'extrait. Sa section du
   * rail en découle (`categorieDeItem`), et avec elle la coiffe teintée de
   * sa carte (`CarteBoard`) : un widget ne déclare pas de couleur, il dit
   * de quoi il parle.
   */
  page: SidebarItemId;
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

