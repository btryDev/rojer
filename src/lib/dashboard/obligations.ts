// Matrice « Vos documents, en un coup d'œil » — le tableau en pastilles
// du board éditorial (4a).
//
// Règle de conduite, héritée du CLAUDE.md (« l'outil ne dit jamais vous
// êtes conforme ») : chaque cellule est un fait vérifiable sur les données
// de l'établissement, jamais un jugement de conformité. Trois états
// seulement :
//
//   ok   — le fait est établi (le document existe, il est récent…)
//   todo — le fait n'est pas établi ; c'est ce qu'il reste à faire
//   na   — la colonne n'a pas de sens pour cette ligne
//
// `na` existe précisément pour ne pas afficher un rond vert par défaut là
// où l'on ne mesure rien : un tableau tout vert qui ment est pire qu'un
// tableau troué.

export type EtatCellule = "ok" | "todo" | "na";

export const COLONNES_MATRICE = ["En place", "À jour", "Sans retard"] as const;

export type LigneMatrice = {
  id:
    | "duerp"
    | "registre"
    | "verifications"
    | "actions"
    | "accessibilite"
    | "permis-feu"
    | "plans-prevention"
    | "carnet-sanitaire"
    | "prestataires";
  libelle: string;
  href: string;
  cellules: [EtatCellule, EtatCellule, EtatCellule];
};

/**
 * Modules complémentaires — chacun ajoute une ligne à la matrice, mais
 * seulement quand il concerne l'établissement :
 *
 *   - accessibilité : tout ERP doit tenir le registre (R. 164-6 CCH),
 *     la ligne apparaît donc dès que l'établissement est ERP, même si
 *     rien n'a été créé — c'est précisément le « reste à faire » ;
 *   - permis de feu, plans de prévention, prestataires : événementiels,
 *     la ligne n'apparaît que s'il y a de l'activité — un commerce sans
 *     travaux par point chaud ne doit pas voir une ligne trouée ;
 *   - carnet sanitaire : dépend de la présence d'un réseau ECS, que
 *     l'outil ne sait pas déduire — la ligne suit la création du carnet.
 */
export type ModulesMatrice = {
  estERP: boolean;
  accessibilite: { existe: boolean; publie: boolean };
  permisFeu: { total: number; echusNonClos: number };
  plansPrevention: {
    total: number;
    sansInspection: number;
    echusNonClos: number;
  };
  carnetSanitaire: {
    existe: boolean;
    /** Points de relevé **actifs**. */
    nbPoints: number;
    /** Points actifs jamais relevés : leur ancienneté n'est pas mesurable,
     *  ils ne peuvent donc pas entrer dans le maximum ci-dessous — mais ils
     *  interdisent de conclure que le carnet est tenu. */
    nbPointsJamaisReleves: number;
    /** Jours écoulés depuis le relevé du point **le plus en retard** parmi
     *  les points actifs déjà relevés ; null si aucun ne l'a été. */
    jourPointLePlusEnRetard: number | null;
    /** Jours depuis la dernière analyse légionelles, null si aucune. */
    jourDerniereAnalyse: number | null;
  };
  prestataires: { total: number; enAlerte: number };
};

export type EntreeMatrice = {
  etablissementId: string;
  duerp: { existe: boolean; estAJour: boolean; duerpId: string | null };
  nbRapports: number;
  nbVerifs: number;
  /** Jours écoulés depuis le dernier rapport déposé, null si aucun. */
  jourDernierRapport: number | null;
  compteurs: {
    verifsEnRetard: number;
    verifsAPlanifier: number;
    actionsOuvertes: number;
    actionsEnCours: number;
    actionsEnRetard: number;
    actionsLeveesRecemment: number;
    /** Toutes les actions jamais créées, statuts finaux compris. Optionnel
     *  le temps que tous les appelants le transmettent — à défaut, on
     *  retombe sur la somme partielle historique. */
    actionsTotal?: number;
  };
  /** Absent = matrice socle uniquement (4 lignes). */
  modules?: ModulesMatrice;
};

/** Un registre alimenté dans l'année est considéré « à jour ». */
export const SEUIL_REGISTRE_JOURS = 365;

/**
 * Relevé de température ECS : seuil d'affichage **retenu par le produit**,
 * pas une périodicité recopiée d'un texte.
 *
 * Le commentaire précédent attribuait ce rythme hebdomadaire à l'arrêté du
 * 1er février 2010, ce que ce texte ne dit pas : il prescrit une mesure
 * mensuelle de la température aux points d'usage représentatifs. Le rythme
 * hebdomadaire relève de la bonne pratique d'exploitation. La valeur est
 * conservée telle quelle (elle n'a pas été tranchée sur source primaire),
 * mais elle n'est plus présentée comme une exigence réglementaire — règle
 * n°6 du projet : ne jamais attribuer à un texte ce qu'il n'écrit pas.
 */
export const SEUIL_RELEVE_CARNET_JOURS = 7;

/**
 * Analyse légionelles : seuil d'affichage annuel. L'arrêté du 1er février
 * 2010 organise la surveillance des légionelles dans les installations
 * collectives d'eau chaude sanitaire ; ~~la fréquence exacte dépend du type
 * d'établissement et du point de prélèvement~~ — lu le 2026-09-20 : ses deux
 * annexes disent « Analyses de légionelles : 1 fois par an », PAR POINT de
 * surveillance. 365 jours colle donc au texte pour UNE analyse ; ce que le
 * produit ne vérifie pas, c'est que chaque point a eu la sienne.
 */
export const SEUIL_ANALYSE_LEGIONELLE_JOURS = 365;

function oui(v: boolean): EtatCellule {
  return v ? "ok" : "todo";
}

function lignesModules(
  base: string,
  m: ModulesMatrice | undefined,
): LigneMatrice[] {
  if (!m) return [];
  const lignes: LigneMatrice[] = [];

  // Tout ERP doit tenir le registre — la ligne apparaît donc dès que le
  // régime est déclaré. Un registre déjà créé reste visible même si le
  // régime ERP a été décoché depuis : on ne cache pas une donnée existante.
  if (m.estERP || m.accessibilite.existe) {
    lignes.push({
      id: "accessibilite",
      libelle: "Accessibilité",
      href: `${base}/accessibilite`,
      cellules: [
        oui(m.accessibilite.existe),
        // Le registre n'a de valeur que consultable par le public.
        oui(m.accessibilite.publie),
        "na",
      ],
    });
  }

  if (m.permisFeu.total > 0) {
    lignes.push({
      id: "permis-feu",
      libelle: "Permis de feu",
      href: `${base}/permis-feu`,
      cellules: [
        "ok", // la ligne n'existe que si des permis sont tracés
        "na", // un permis n'a pas de notion de péremption propre
        oui(m.permisFeu.echusNonClos === 0),
      ],
    });
  }

  if (m.plansPrevention.total > 0) {
    lignes.push({
      id: "plans-prevention",
      libelle: "Plans de prévention",
      href: `${base}/plan-prevention`,
      cellules: [
        "ok",
        // « À jour » = inspection commune préalable renseignée sur
        // chaque plan actif (art. R. 4512-2 — c'est lui qui impose
        // l'inspection, R. 4512-7 ne portant que le seuil de l'écrit).
        oui(m.plansPrevention.sansInspection === 0),
        oui(m.plansPrevention.echusNonClos === 0),
      ],
    });
  }

  if (m.carnetSanitaire.existe) {
    lignes.push({
      id: "carnet-sanitaire",
      libelle: "Carnet sanitaire",
      href: `${base}/carnet-sanitaire`,
      cellules: [
        oui(m.carnetSanitaire.nbPoints > 0),
        // « À jour » se juge sur le point **le plus en retard**, jamais sur
        // le plus récent : un seul point relevé cette semaine ne dit rien
        // des dix autres. Un point actif jamais relevé suffit à empêcher la
        // pastille — on ne peut pas établir un fait sur une sonde muette.
        oui(
          m.carnetSanitaire.nbPoints > 0 &&
            m.carnetSanitaire.nbPointsJamaisReleves === 0 &&
            m.carnetSanitaire.jourPointLePlusEnRetard !== null &&
            m.carnetSanitaire.jourPointLePlusEnRetard <=
              SEUIL_RELEVE_CARNET_JOURS,
        ),
        oui(
          m.carnetSanitaire.jourDerniereAnalyse !== null &&
            m.carnetSanitaire.jourDerniereAnalyse <=
              SEUIL_ANALYSE_LEGIONELLE_JOURS,
        ),
      ],
    });
  }

  if (m.prestataires.total > 0) {
    lignes.push({
      id: "prestataires",
      libelle: "Prestataires",
      href: `${base}/prestataires`,
      cellules: [
        "ok",
        "na", // « à jour » et « sans retard » se confondent ici
        // Aucune pièce de vigilance manquante, expirée ou à renouveler.
        oui(m.prestataires.enAlerte === 0),
      ],
    });
  }

  return lignes;
}

export function construireMatrice(e: EntreeMatrice): LigneMatrice[] {
  const base = `/etablissements/${e.etablissementId}`;
  const { compteurs: c } = e;
  // Existence du plan d'actions : **toutes** les actions comptent, y compris
  // celles qui sont levées depuis longtemps ou abandonnées. La somme
  // partielle (ouvertes + en cours + levées sur trente jours) faisait dire
  // « Plan d'actions : rien en place » à un établissement exemplaire ayant
  // clôturé ses vingt actions trois mois plus tôt. Le repli sur la somme
  // partielle ne sert qu'aux appelants qui ne transmettent pas encore le
  // total.
  const totalActions =
    c.actionsTotal ??
    c.actionsOuvertes + c.actionsEnCours + c.actionsLeveesRecemment;

  const socle: LigneMatrice[] = [
    {
      id: "duerp",
      libelle: "DUERP",
      href: e.duerp.duerpId ? `/duerp/${e.duerp.duerpId}` : `${base}/duerp`,
      cellules: [
        oui(e.duerp.existe),
        // « À jour » = une version est figée et aucune échéance de mise à
        // jour n'est dépassée (cf. `./duerp` : la mise à jour annuelle de
        // l'art. R. 4121-2 ne s'impose qu'à partir de onze salariés). Un
        // DUERP ouvert sans version validée reste « à faire ».
        oui(e.duerp.estAJour),
        // Un DUERP n'a pas d'échéances propres : « à jour » couvre déjà
        // la seule notion de retard qui le concerne.
        "na",
      ],
    },
    {
      id: "registre",
      libelle: "Registre de sécurité",
      href: `${base}/registre`,
      cellules: [
        oui(e.nbRapports > 0),
        oui(
          e.jourDernierRapport !== null &&
            e.jourDernierRapport <= SEUIL_REGISTRE_JOURS,
        ),
        "na",
      ],
    },
    {
      id: "verifications",
      libelle: "Vérifications",
      href: `${base}/calendrier`,
      cellules: [
        oui(e.nbVerifs > 0),
        // « À jour » ici = plus rien en attente de programmation.
        oui(e.nbVerifs > 0 && c.verifsAPlanifier === 0),
        oui(e.nbVerifs > 0 && c.verifsEnRetard === 0),
      ],
    },
    {
      id: "actions",
      libelle: "Plan d'actions",
      href: `${base}/actions`,
      cellules: [
        oui(totalActions > 0),
        // Le plan n'a pas de date de péremption propre.
        "na",
        oui(totalActions > 0 && c.actionsEnRetard === 0),
      ],
    },
  ];

  return [...socle, ...lignesModules(base, e.modules)];
}

/** Nombre de faits restant à établir — sert d'accroche sous le tableau. */
export function compterRestes(lignes: LigneMatrice[]): number {
  return lignes.reduce(
    (n, l) => n + l.cellules.filter((c) => c === "todo").length,
    0,
  );
}
