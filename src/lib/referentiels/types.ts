export type TypeMesure =
  | "suppression"
  | "reduction_source"
  | "protection_collective"
  | "protection_individuelle"
  | "formation"
  | "organisationnelle";

export const HIERARCHIE_MESURES: TypeMesure[] = [
  "suppression",
  "reduction_source",
  "protection_collective",
  "protection_individuelle",
  "formation",
  "organisationnelle",
];

export type StatutMesure = "existante" | "prevue";

export type MesureRecommandee = {
  id: string;
  libelle: string;
  type: TypeMesure;
};

export type UniteTravailSuggeree = {
  id: string;
  nom: string;
  description?: string;
};

export type RisqueReferentiel = {
  id: string;
  libelle: string;
  description?: string;
  unitesAssociees: string[];
  graviteParDefaut: number;
  probabiliteParDefaut: number;
  maitriseParDefaut?: number;
  mesuresRecommandees: MesureRecommandee[];
};

export type OptionQuestion = {
  libelle: string;
  valeur: number;
};

export type QuestionCotation = {
  axe: "gravite" | "probabilite" | "maitrise";
  intitule: string;
  options: OptionQuestion[];
};

export type QuestionDetection = {
  id: string;
  intitule: string;
  risqueIdAssocie: string;
  uniteCible?: string;
};

/**
 * Une activité que le référentiel sectoriel **ne couvre pas**, et la question
 * fermée qui permet de savoir si l'établissement l'exerce.
 *
 * Le besoin vient d'un cas concret : un supermarché relève du code NAF 47.11,
 * donc du référentiel commerce, qui n'a que quatre unités types — réception et
 * stockage, mise en rayon, vente et caisse, locaux. Aucun atelier, aucun
 * laboratoire. Le dossier se crée sans le moindre avertissement, et le DUERP
 * qui en sort ne dit rien de la boucherie, de ses machines de découpe, du
 * travail au froid ni des TMS de désossage. Le document a l'air complet parce
 * qu'il a les mêmes colonnes que les autres.
 *
 * Le mécanisme est volontairement pauvre, et c'est ce qui le rend fiable : une
 * question fermée, une réponse oui ou non, rien d'autre. Pas d'analyse du nom
 * de l'établissement, pas de détection sur du texte libre — le principe zéro
 * IA du produit vaut ici comme ailleurs, et sur un document à valeur légale
 * une couverture devinée serait pire qu'une couverture ignorée.
 *
 * Un « oui » ne bloque jamais rien. Il fait basculer le dossier en couverture
 * partielle, ce qui se dit à l'écran et s'imprime dans le document — un DUERP
 * qui se présente comme exhaustif alors qu'il ignore un atelier entier est
 * plus dangereux qu'un refus d'onboarding.
 */
export type ActiviteNonCouverte = {
  /** Identifiant stable, préfixé par le secteur (ex. `com-decoupe-viande`). */
  id: string;
  /** Nom de l'activité, tel qu'il sera cité dans la mention du PDF. */
  libelle: string;
  /** La question posée au dirigeant, fermée, à laquelle il peut répondre seul. */
  question: string;
  /** Précision facultative : ce que la question englobe, ce qu'elle exclut. */
  aide?: string;
  /**
   * Ce que le référentiel ne saura pas proposer si la réponse est « oui ».
   * Rédigé pour être lu par un tiers dans le document généré, donc concret et
   * descriptif — les familles de risques absentes, pas une appréciation.
   */
  cequiManque: string;
  /**
   * Pourquoi le référentiel s'arrête là. `cequiManque` dit **ce que** le
   * document ne traite pas ; celui-ci dit **d'où vient la limite**, et les
   * deux s'impriment côte à côte.
   *
   * Sans lui, la mention se lit comme un aveu de lacune du produit. Avec lui,
   * elle se lit pour ce qu'elle est : un référentiel sectoriel est bâti sur
   * une activité type documentée par une source précise, et le code NAF qui
   * l'a déclenché ratisse plus large que cette source. Le lecteur tiers —
   * inspecteur, assureur, acquéreur — a besoin de cette phrase pour savoir
   * s'il regarde un oubli ou un bord connu.
   *
   * Même régime que `cequiManque` : factuel, sourcé, imprimé tel quel dans le
   * document et figé dans le snapshot. On nomme la source qui traite
   * l'activité ailleurs — un outil OiRA distinct, une brochure sectorielle —
   * jamais l'état d'avancement du produit, qui ne veut rien dire pour le
   * lecteur et vieillirait mal dans une pièce conservée quarante ans.
   */
  pourquoi: string;
};

export type Referentiel = {
  id: string;
  nom: string;
  codesNaf: string[];
  unitesTravailSuggerees: UniteTravailSuggeree[];
  risques: RisqueReferentiel[];
  questionsDetection: QuestionDetection[];
  /**
   * Les activités hors couverture de ce secteur. Vide ne veut pas dire « ce
   * secteur couvre tout » : ça veut dire que la liste n'a pas encore été
   * instruite. La nuance compte, elle est portée par le module de couverture.
   */
  activitesNonCouvertes: ActiviteNonCouverte[];
};
