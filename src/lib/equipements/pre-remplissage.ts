import { obligationParId } from "@/lib/referentiels/conformite";
import { nafEffectif } from "@/lib/perimetre/secteur";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/**
 * Règles de pré-remplissage du parc d'équipements d'un établissement, sur la
 * base de son code NAF et de sa typologie réglementaire (ADR-004).
 *
 * Le pré-remplissage est **une suggestion** : l'utilisateur peut décocher
 * n'importe quelle catégorie et en ajouter d'autres. On ne crée aucun
 * équipement automatiquement — on propose une liste de cases à cocher qui,
 * une fois validée, crée les `Equipement` correspondants.
 *
 * Sources de la logique métier :
 *   - Code NAF 56.xx (restauration) → cuisine professionnelle → hotte,
 *     appareils de cuisson, VMC, installation électrique, extincteurs,
 *     installation frigorifique.
 *   - Code NAF 47.xx (commerce de détail) → ERP fréquent → extincteurs,
 *     BAES, alarme, installation électrique, ventilation éventuelle. Le froid
 *     n'est suggéré qu'au commerce **alimentaire** (cf. `isCommerceAlimentaire`).
 *   - Tertiaire / bureau → installation électrique, BAES, alarme, VMC,
 *     éventuels portes automatiques et ascenseurs si bâtiment collectif.
 *   - Typologie ERP → extincteurs, BAES, alarme, SSI systématiques.
 *   - Typologie IGH → SSI, désenfumage, ascenseurs, alarme.
 *
 * ── Les références ne sont plus écrites ici (amendement 2026-08-25) ─────────
 *
 * Chaque suggestion citait son article **en dur**, dans une chaîne recopiée à
 * la main. Le module n'importait pas le référentiel : deux sources vivaient
 * côte à côte pour la même citation, et corriger l'une laissait l'autre en
 * place. La dérive n'était pas théorique, elle était déjà là — quatre cas
 * relevés, dont un texte abrogé :
 *
 *   - VMC d'habitation : « arrêté 25 avril 1985 », **abrogé le 5 mars 2018**
 *     et remplacé par l'arrêté du 23 février 2018 dans le référentiel ;
 *   - SSI ERP : « MS 73 § 1 » quand l'obligation est fondée sur MS 73 § 2 ;
 *   - désenfumage IGH : « GH 60 s. » quand l'obligation cite GH 5 ;
 *   - installation électrique : « annuelle/quinquennale selon régime ERP »
 *     alors que la 5ᵉ catégorie est passée en **triennale** (arrêté du
 *     1ᵉʳ décembre 2025).
 *
 * Une suggestion qui cite un texte abrogé est pire qu'une suggestion muette :
 * elle a l'autorité de la source sans en avoir l'exactitude. Désormais la
 * suggestion déclare **l'identifiant de l'obligation** qui la fonde, et la
 * citation est lue dans `referentielsConformite` au moment du rendu. Une seule
 * source, et un id inconnu échoue bruyamment (`FondementInconnuError`) plutôt
 * que d'afficher une raison sans article — cf. le test qui résout tous les
 * fondements déclarés.
 */

/**
 * Un fondement : l'obligation du référentiel de conformité qui justifie la
 * périodicité annoncée par une suggestion, et les références à en citer.
 */
type Fondement = {
  /** Id stable d'une obligation de `src/lib/referentiels/conformite/`. */
  obligationId: string;
  /**
   * Indices dans `referencesLegales` à citer. Par défaut `[0]` — l'article qui
   * **fonde** l'obligation (convention du référentiel). On en nomme un second
   * quand c'est lui qui porte l'exigence en langage de terrain : le BAES hors
   * ERP tient de R. 4227-14, que l'arrêté du 14 décembre 2011 ne fait
   * qu'appliquer.
   */
  refs?: number[];
};

export class FondementInconnuError extends Error {
  constructor(obligationId: string, indice?: number) {
    super(
      indice === undefined
        ? `Fondement de suggestion inconnu : ${obligationId}`
        : `Référence ${indice} absente de l'obligation ${obligationId}`,
    );
    this.name = "FondementInconnuError";
  }
}

/**
 * Assemble la citation d'une suggestion depuis le référentiel.
 *
 * Échoue plutôt que de rendre une raison sans article. Les identifiants sont
 * des constantes de ce module, couvertes par un test : une exception ici
 * signifie qu'une obligation a été retirée ou renommée sans que la suggestion
 * qui s'appuyait dessus ait suivi. C'est exactement ce qu'on veut voir.
 */
function citer(fondements: Fondement[]): string {
  const vues = new Set<string>();
  const sorties: string[] = [];

  for (const f of fondements) {
    const obligation = obligationParId(f.obligationId);
    if (!obligation) throw new FondementInconnuError(f.obligationId);

    for (const i of f.refs ?? [0]) {
      const ref = obligation.referencesLegales[i];
      if (!ref) throw new FondementInconnuError(f.obligationId, i);
      if (vues.has(ref.reference)) continue;
      vues.add(ref.reference);
      sorties.push(ref.reference);
    }
  }

  return sorties.join(" ; ");
}

export type Entree = {
  categorie: CategorieEquipement;
  libelle: string;
  raison: string;
  /**
   * Ce que la référence citée ne dit pas seule (C39, 2026-09-27). Une
   * citation « — livre II, établissements des quatre premières catégories »
   * lue à côté d'une suggestion faite à un ERP de 5ᵉ se contredit en
   * apparence : l'article n'y vaut pas au titre du texte, et le calendrier
   * pose pourtant l'échéance. La mention le dit, au même endroit. Un champ à
   * part et non une phrase de plus dans `raison`, dont la forme
   * `motif (références).` est tenue par un test.
   */
  mention?: string;
};

/**
 * Posée dès qu'une référence citée est du livre II. Écrite pour tous les ERP
 * — la suggestion ne connaît pas la catégorie —, elle ne dit donc que le cas
 * de la 5ᵉ, sans rien affirmer des quatre premières.
 */
export const MENTION_SUR_APPLICATION_5E =
  "En 5ᵉ catégorie, l'échéance est maintenue par sur-application assumée : le détail est sur la fiche de l'obligation.";

/**
 * Ce qu'une règle de suggestion déclare : le motif en langage courant, et les
 * obligations qui le fondent. Le motif ne cite **jamais** d'article — c'est le
 * référentiel qui les porte, et lui seul.
 */
type Suggestion = {
  categorie: CategorieEquipement;
  libelle: string;
  motif: string;
  fondements: Fondement[];
};

function entree(s: Suggestion): Entree {
  const citations = citer(s.fondements);
  return {
    categorie: s.categorie,
    libelle: s.libelle,
    raison: `${s.motif} (${citations}).`,
    ...(/livre II(?!I)/.test(citations)
      ? { mention: MENTION_SUR_APPLICATION_5E }
      : {}),
  };
}

export type ContexteEtablissement = {
  codeNaf?: string | null;
  estEtablissementTravail: boolean;
  estERP: boolean;
  estIGH: boolean;
  estHabitation: boolean;
};

/**
 * Le contexte des suggestions, depuis un établissement ET son entreprise.
 *
 * LE NAF SE LIT AVEC SON REPLI (2026-09-27, A1 de l'analyse de la réponse
 * absente). La page du parc passait `etab.codeNaf` nu, alors que ce champ n'est
 * renseigné que s'il diffère de celui de l'entreprise — le formulaire le dit :
 * « Si vide, on utilise le code NAF de l'entreprise ». Un second établissement
 * sans NAF propre perdait toutes les suggestions sectorielles (froid, hotte,
 * cuisson, éclairage de sécurité par secteur), sans rien pour le dire. Même
 * repli que `perimetre/secteur.ts` (`nafEffectif`), et même moyen de ne pas
 * l'oublier : l'entreprise est un paramètre requis.
 */
export function contexteDesSuggestions(etab: {
  codeNaf: string | null;
  entreprise: { codeNaf: string | null };
  estEtablissementTravail: boolean;
  estERP: boolean;
  estIGH: boolean;
  estHabitation: boolean;
}): ContexteEtablissement {
  return {
    codeNaf: nafEffectif({
      etablissement: etab.codeNaf,
      entreprise: etab.entreprise.codeNaf,
    }),
    estEtablissementTravail: etab.estEtablissementTravail,
    estERP: etab.estERP,
    estIGH: etab.estIGH,
    estHabitation: etab.estHabitation,
  };
}

function normNaf(naf: string | null | undefined): string {
  return (naf ?? "").trim().toUpperCase();
}

/**
 * Le motif des suggestions de BAES hors régime ERP. Une seule constante pour
 * les deux branches sectorielles qui la posent (commerce, bureau) : elles
 * doivent annoncer la même chose, et une divergence entre les deux passerait
 * inaperçue.
 *
 * Il ne parle que du régime travail, et c'est correct : la branche ERP suggère
 * le BAES plus haut, et la déduplication par catégorie garde la première
 * entrée. Un commerce ERP n'atteint donc jamais ce motif — il garde celui qui
 * annonce la vérification annuelle de la section EC.
 */
const MOTIF_BAES_TRAVAIL =
  "Éclairage d'évacuation obligatoire dans les lieux de travail : essai mensuel et contrôle semestriel de l'autonomie";

/**
 * R. 4227-14 avant l'arrêté qui l'applique : c'est l'article du Code du
 * travail que le dirigeant reconnaîtra, l'arrêté n'en est que la mise en
 * œuvre. D'où l'ordre `[1, 0]`.
 */
const FONDEMENTS_BAES_TRAVAIL: Fondement[] = [
  {
    obligationId: "incendie-travail-eclairage-securite-essai-mensuel",
    refs: [1, 0],
  },
];

function isRestauration(naf: string): boolean {
  return naf.startsWith("56.");
}

function isCommerce(naf: string): boolean {
  return naf.startsWith("47.");
}

/**
 * Commerce de détail **alimentaire** : le froid ne se suggère qu'à lui.
 *
 * `isCommerce` couvre tout le 47, librairie et prêt-à-porter compris. Leur
 * proposer une chambre froide avec une raison de criticité 4 revenait à
 * suggérer une obligation sur une supposition — et une suggestion de cette
 * forme se coche vite. La règle métier écrite partout ailleurs dans ce module
 * dit « tout commerce alimentaire », pas « tout commerce ».
 *
 * Les codes retenus : 47.11 (magasins non spécialisés à prédominance
 * alimentaire), 47.2x (détail alimentaire en magasin spécialisé) hors 47.26
 * (tabac, qui n'exploite pas de froid), et 47.81 (alimentaire sur éventaires
 * et marchés). Suggestion, jamais déduction : le dirigeant valide.
 */
function isCommerceAlimentaire(naf: string): boolean {
  const n = naf.toUpperCase();
  if (n.startsWith("47.11") || n.startsWith("47.81")) return true;
  return n.startsWith("47.2") && !n.startsWith("47.26");
}

function isBureau(naf: string): boolean {
  // On inclut volontairement un spectre large : conseil, comm, services,
  // administration. Liste à affiner à mesure que de nouveaux secteurs
  // rejoignent le MVP.
  return (
    naf.startsWith("62.") || // info/IT
    naf.startsWith("63.") || // services info
    naf.startsWith("69.") || // juridique/compta
    naf.startsWith("70.") || // conseil
    naf.startsWith("71.") || // ingénierie
    naf.startsWith("73.") || // publicité
    naf.startsWith("74.") || // design
    naf.startsWith("82.")    // admin / centres d'appel
  );
}

/**
 * Le froid se suggère au restaurant comme au commerce alimentaire, avec le
 * même fondement — seul le libellé change (chambre froide contre vitrine).
 * Les deux branches citaient la même chose en double ; elles la lisent
 * désormais au même endroit.
 */
const FONDEMENTS_FROID: Fondement[] = [
  { obligationId: "froid-controle-etancheite-mise-en-service" },
  { obligationId: "froid-controle-etancheite-annuel" },
];

const MOTIF_FROID =
  "Contrôle d'étanchéité du fluide frigorigène par un opérateur certifié";

/**
 * Renvoie la liste des équipements suggérés pour un établissement donné.
 *
 * Le moteur reste **pur** (pas d'accès DB, pas d'horloge) pour rester
 * testable : le référentiel qu'il lit est une constante du module, pas une
 * source externe. L'UI de l'étape 4 l'appelle côté serveur au rendu du wizard
 * de déclaration.
 */
export function suggererEquipements(ctx: ContexteEtablissement): Entree[] {
  const naf = normNaf(ctx.codeNaf);
  const set = new Map<string, Entree>();

  const ajoute = (s: Suggestion) => {
    // Déduplication par catégorie : une suggestion par catégorie dans l'UI.
    // Plusieurs règles peuvent proposer la même catégorie — on garde la
    // première rencontrée (ordre de priorité : base → ERP → IGH → travail →
    // sectoriel → habitation).
    if (!set.has(s.categorie)) set.set(s.categorie, entree(s));
  };

  // ---------------------------------------------------------------------------
  // Règles de base — quasi universelles dès qu'il y a un bâtiment
  // ---------------------------------------------------------------------------
  if (ctx.estEtablissementTravail || ctx.estERP || ctx.estIGH) {
    // Les fondements suivent le régime : citer l'article du Code du travail à
    // un ERP qui n'emploie personne, ou l'arrêté ERP à un employeur qui
    // n'accueille pas de public, revenait à justifier la suggestion par un
    // texte qui ne s'applique pas à lui.
    const fondements: Fondement[] = [];
    if (ctx.estEtablissementTravail) {
      fondements.push({ obligationId: "elec-travail-periodique-annuelle" });
    }
    if (ctx.estERP) {
      // Les deux régimes ERP sont cités : la catégorie n'est pas connue de ce
      // moteur, et le rythme en dépend (annuel en 1ʳᵉ-4ᵉ, triennal en 5ᵉ).
      fondements.push({ obligationId: "elec-erp-cat1-4-annuelle" });
      // En 5ᵉ catégorie, le fondement est PE 4 § 2, désormais encodé entier et
      // porté par l'établissement (ADR-022) — le fragment « installations
      // électriques » a été absorbé. La suggestion reste juste : c'est bien ce
      // texte qui impose le contrôle triennal de cette installation.
      fondements.push({
        obligationId: "incendie-erp-pe4-entretien-installations-techniques",
      });
    }
    if (ctx.estIGH) {
      fondements.push({ obligationId: "elec-igh-annuelle" });
    }

    ajoute({
      categorie: "INSTALLATION_ELECTRIQUE",
      libelle: "Installation électrique principale",
      // Le motif reste neutre : les régimes cités varient d'un établissement à
      // l'autre, et nommer l'ERP à un employeur qui n'en est pas un décrirait
      // une situation qui n'est pas la sienne.
      motif:
        "Vérification périodique de l'installation, à un rythme fixé par le régime de l'établissement",
      fondements,
    });
  }

  // ---------------------------------------------------------------------------
  // Typologie ERP → moyens de secours de base
  // ---------------------------------------------------------------------------
  if (ctx.estERP) {
    ajoute({
      categorie: "EXTINCTEUR",
      libelle: "Extincteurs portatifs",
      motif: "Vérification annuelle",
      fondements: [
        { obligationId: "incendie-erp-extincteurs-annuelle", refs: [0, 1] },
      ],
    });
    ajoute({
      categorie: "BAES",
      libelle: "Éclairage de sécurité (BAES)",
      motif:
        "Essai mensuel, contrôle semestriel de l'autonomie et vérification annuelle",
      fondements: [
        { obligationId: "incendie-erp-baes-annuelle" },
        { obligationId: "incendie-erp-eclairage-securite-essai-mensuel" },
      ],
    });
    ajoute({
      categorie: "ALARME_INCENDIE",
      libelle: "Système de sécurité incendie (SSI / alarme)",
      // La référence porte déjà « (vérification annuelle) » : redire la
      // périodicité dans le motif imbriquerait deux parenthèses pour rien.
      motif: "Vérification périodique du système de sécurité incendie",
      fondements: [{ obligationId: "incendie-erp-ssi-annuelle" }],
    });
  }

  // ---------------------------------------------------------------------------
  // Typologie IGH → moyens renforcés
  // ---------------------------------------------------------------------------
  if (ctx.estIGH) {
    ajoute({
      categorie: "DESENFUMAGE",
      libelle: "Désenfumage mécanique",
      motif:
        "Moyens de secours vérifiés annuellement par organisme agréé en immeuble de grande hauteur",
      fondements: [{ obligationId: "incendie-igh-moyens-secours-annuelle" }],
    });
    ajoute({
      categorie: "ASCENSEUR",
      libelle: "Ascenseur(s)",
      motif:
        "Équipement quasi systématique en IGH, soumis au contrôle technique quinquennal",
      fondements: [{ obligationId: "ascenseur-controle-technique-quinquennal" }],
    });
  }

  // ---------------------------------------------------------------------------
  // Travail (hors spécialisation) → aération obligatoire dans la plupart des
  // locaux de travail.
  // ---------------------------------------------------------------------------
  if (ctx.estEtablissementTravail) {
    ajoute({
      categorie: "VMC",
      libelle: "Ventilation des locaux de travail",
      motif: "Entretien et contrôle périodiques des installations d'aération",
      fondements: [
        // R. 4222-20 est désormais encodé entier et porté par l'établissement
        // (ADR-022) : le fragment « VMC/CTA » a été absorbé. La suggestion
        // reste juste — c'est bien ce texte qui impose d'entretenir et de
        // contrôler cette installation.
        {
          obligationId: "aeration-controle-installations-r4222-20",
          refs: [0, 1],
        },
      ],
    });
    ajoute({
      categorie: "EXTINCTEUR",
      libelle: "Extincteurs de l'établissement",
      motif: "Moyens de lutte contre l'incendie obligatoires",
      fondements: [{ obligationId: "incendie-travail-moyens-lutte" }],
    });
  }

  // ---------------------------------------------------------------------------
  // Règles sectorielles (NAF)
  // ---------------------------------------------------------------------------
  if (isRestauration(naf)) {
    ajoute({
      categorie: "INSTALLATION_FRIGORIFIQUE",
      libelle: "Chambre froide / groupe froid",
      motif: MOTIF_FROID,
      fondements: FONDEMENTS_FROID,
    });
    ajoute({
      categorie: "HOTTE_PRO",
      libelle: "Hotte d'extraction cuisine",
      motif: "Ramonage et nettoyage annuels des circuits d'extraction de buées",
      fondements: [
        { obligationId: "cuisson-erp-circuits-extraction-nettoyage" },
      ],
    });
    ajoute({
      categorie: "APPAREIL_CUISSON_ERP",
      libelle: "Appareils de cuisson professionnels",
      motif:
        "Vérification annuelle des appareils de cuisson et de leurs dispositifs de sécurité",
      fondements: [{ obligationId: "cuisson-erp-appareils-annuelle" }],
    });
  }

  if (isCommerceAlimentaire(naf)) {
    ajoute({
      categorie: "INSTALLATION_FRIGORIFIQUE",
      libelle: "Vitrines réfrigérées / chambre froide",
      motif: MOTIF_FROID,
      fondements: FONDEMENTS_FROID,
    });
  }

  if (isCommerce(naf)) {
    ajoute({
      categorie: "BAES",
      libelle: "Éclairage de sécurité (BAES)",
      motif: MOTIF_BAES_TRAVAIL,
      fondements: FONDEMENTS_BAES_TRAVAIL,
    });
  }

  if (isBureau(naf)) {
    ajoute({
      categorie: "BAES",
      libelle: "Éclairage de sécurité (BAES)",
      motif: MOTIF_BAES_TRAVAIL,
      fondements: FONDEMENTS_BAES_TRAVAIL,
    });
    ajoute({
      categorie: "ALARME_INCENDIE",
      libelle: "Alarme incendie",
      motif:
        "Obligatoire dès que plus de 50 personnes peuvent être habituellement occupées ou réunies dans l'établissement, ou dès qu'il manipule des matières inflammables",
      // `refs: [1, 0]` : R. 4227-34 porte le champ d'application que le motif
      // décrit ; R. 4227-39 n'en est que la conséquence semestrielle.
      fondements: [
        { obligationId: "incendie-travail-exercice-semestriel", refs: [1, 0] },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // Habitation
  // ---------------------------------------------------------------------------
  if (ctx.estHabitation) {
    ajoute({
      categorie: "VMC",
      libelle: "VMC de l'immeuble d'habitation",
      motif: "Si VMC-Gaz : entretien annuel obligatoire",
      fondements: [{ obligationId: "aeration-habitation-vmc-gaz-annuelle" }],
    });
  }

  return [...set.values()];
}
