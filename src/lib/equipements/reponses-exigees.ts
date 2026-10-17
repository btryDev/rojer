// Les questions d'équipement dont la réponse est EXIGÉE (D29, option (a),
// décision de la propriétaire du 2026-09-28).
//
// LE PÉRIMÈTRE EST UNE DÉCISION, LE CONTENU EST DÉRIVÉ. La propriétaire a
// tranché pour les appareils de levage : leur silence sur la force humaine
// retient trois mois (art. 23 b) de l'arrêté du 1er mars 2004, le plus exigeant
// qu'une réponse possible donnerait), et cette sur-application ne doit durer que
// le temps d'une réponse. D'où `CATEGORIES_A_REPONSE_EXIGEE` : une catégorie,
// nommée parce que la décision la nomme.
//
// Les QUESTIONS, elles, ne sont pas recopiées. « Si leur silence change le
// rythme » : une question de la catégorie est exigée quand, pour au moins une
// combinaison des autres réponses, le rythme retenu au silence diffère de celui
// qu'une réponse donnerait — le silence y impose alors un défaut, et le défaut
// est la raison de la décision. Le rythme d'un appareil est la plus courte des
// périodicités cycliques que le moteur lui sert. Une question dont la réponse
// ajoute une ligne sans changer ce rythme (les accessoires de levage, annuels à
// côté d'une VGP qui l'est au plus) n'est pas exigée : son silence ne fait pas
// vérifier plus souvent.
//
// SECONDE DÉCISION, AUTRE FORME (2026-10-12, `lot/suites-0810`). La
// propriétaire a validé le 2026-10-08 (« ok pour tes recos », point 5 ;
// décision 4 de la synthèse de revue du 2026-10-07) de rendre EXIGÉE la
// réponse « désenfumage mécanique » (DF 10 § 3), « comme D29 pour le
// levage » : son silence ne fait pas naître la triennale par organisme agréé,
// et personne ne verrait qu'elle manque. La dérivation de D29 ne la trouverait
// pas — la réponse AJOUTE une ligne sans changer le rythme le plus court de
// l'appareil, que l'annuelle tient. La décision NOMME donc la question
// (`QUESTIONS_EXIGEES_PAR_DECISION`) ; le LIEU, lui, reste dérivé du moteur :
// elle n'est exigée que dans un établissement où la réponse « oui » fait
// naître une ligne que le silence ne sert pas — un ERP des quatre premières
// catégories qui n'a pas dit « non » au SSI de catégorie A ou B. Ailleurs, la
// question ne décide de rien et reste facultative (C41).
//
// TROISIÈME DÉCISION, MÊME FORME (2026-10-13, `lot/conditions-equipement`).
// La propriétaire rend EXIGÉE la réponse « groupe électrogène de sécurité »
// d'une installation électrique, « exactement comme le désenfumage
// mécanique » : depuis le référentiel `2026-10-13.2`, les deux lignes d'EL 18
// § 4 ne naissent que d'un « oui », et un silence les tairait sans que
// personne le voie. La réponse étant exigée là où elle décide, il n'y a plus
// de silence. Le lieu reste dérivé du moteur : tout ERP — les deux lignes
// portent `erp: true`, sans borne de catégorie ; hors ERP, la question ne
// décide de rien et reste facultative.
//
// Module serveur : il appelle le moteur, donc charge le référentiel. Le
// formulaire reçoit le résultat en propriété, il ne l'importe pas.

import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import { determineObligationsApplicables } from "@/lib/matching";
import type { EtablissementMatching } from "@/lib/matching/types";
import {
  PERIODICITE_EN_JOURS,
  type CategorieEquipement,
} from "@/lib/referentiels/types-communs";
import {
  questionsTriEtatPour,
  type ChampTriEtat,
  type EquipementInput,
} from "./schema";

/** D29 (a) : la catégorie dont la décision exige les réponses. */
export const CATEGORIES_A_REPONSE_EXIGEE: readonly CategorieEquipement[] = [
  "EQUIPEMENT_LEVAGE",
];

/**
 * Les questions qu'une décision nomme elle-même, avec ce que le refus dit au
 * dirigeant. Exigées là où la réponse « oui » ajoute une ligne
 * (`exigeeDansCeRegime`), facultatives ailleurs.
 */
export const QUESTIONS_EXIGEES_PAR_DECISION: readonly {
  categorie: CategorieEquipement;
  champ: ChampTriEtat;
  /** Le refus du formulaire. */
  message: string;
  /** La raison de la relance du tableau de bord. */
  pourquoi: string;
}[] = [
  // Décision du 2026-10-08, point 5 : « Désenfumage mécanique : réponse
  // exigée ».
  {
    categorie: "DESENFUMAGE",
    champ: "estDesenfumageMecanique",
    message:
      "Répondez oui ou non : la réponse décide de la vérification tous les trois ans par un organisme agréé (arrêté du 25 juin 1980, art. DF 10 § 3).",
    pourquoi:
      "Un désenfumage mécanique est vérifié tous les trois ans par un organisme agréé quand l'établissement dispose aussi d'un système de sécurité incendie de catégorie A ou B (arrêté du 25 juin 1980, art. DF 10 § 3). Tant que la réponse manque, cette vérification n'apparaît pas au calendrier.",
  },
  // Décision du 2026-10-13 : « la réponse à `aGroupeElectrogene` devient
  // EXIGÉE pour une INSTALLATION_ELECTRIQUE en ERP, exactement comme
  // `estDesenfumageMecanique` ».
  {
    categorie: "INSTALLATION_ELECTRIQUE",
    champ: "aGroupeElectrogene",
    message:
      "Répondez oui ou non : la réponse décide de la vérification des niveaux toutes les deux semaines et de l'essai chaque mois du groupe électrogène de sécurité (arrêté du 25 juin 1980, art. EL 18 § 4).",
    pourquoi:
      "Un groupe électrogène de sécurité fait l'objet d'une vérification des niveaux toutes les deux semaines et d'un essai chaque mois (arrêté du 25 juin 1980, art. EL 18 § 4). Tant que la réponse manque, ces vérifications n'apparaissent pas au calendrier.",
  },
];

/**
 * Ce que l'exigence lit de l'établissement : son régime ERP et sa réponse au
 * SSI A/B. Le reste de la sonde est neutre.
 */
export type RegimeExigence = Pick<
  EtablissementMatching,
  "estERP" | "typeErp" | "categorieErp" | "ssiCategorieAouB"
>;

/** Un lieu de travail sans public : aucune question de décision n'y est exigée. */
export const REGIME_TRAVAIL: RegimeExigence = {
  estERP: false,
  typeErp: null,
  categorieErp: null,
  ssiCategorieAouB: null,
};

/** Un établissement de travail neutre : le rythme d'un appareil n'y dépend que de lui. */
const TRAVAIL: EtablissementMatching = {
  id: "sonde",
  effectifSurSite: 10,
  effectifEntreprise: 10,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  typesErpAutres: [],
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: false,
  comporteLocauxSommeilPublic: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
};

type Reponses = Partial<Record<ChampTriEtat, boolean>>;

/** Les obligations que le moteur sert à un appareil seul, dans ce régime. */
function lignesServies(
  categorie: CategorieEquipement,
  reponses: Reponses,
  regime: RegimeExigence,
): string[] {
  return determineObligationsApplicables({ ...TRAVAIL, ...regime }, [
    { id: "sonde", libelle: "sonde", categorie, caracteristiques: { ...reponses } },
  ])
    .filter((a) => a.porteur === "equipement")
    .map((a) => a.obligation.id)
    .sort();
}

/**
 * La question nommée par une décision est-elle exigée dans ce régime ? Oui si
 * la réponse « oui » fait servir à l'appareil une ligne que son silence ne
 * sert pas — sinon elle ne décide de rien ici.
 */
function exigeeDansCeRegime(
  categorie: CategorieEquipement,
  champ: ChampTriEtat,
  regime: RegimeExigence,
): boolean {
  const auSilence = new Set(lignesServies(categorie, {}, regime));
  return lignesServies(categorie, { [champ]: true }, regime).some((id) => !auSilence.has(id));
}

/** Le rythme, en jours, que le moteur sert à un appareil — ses lignes propres ; `null` s'il n'a rien de cyclique. */
export function rythmeServi(categorie: CategorieEquipement, reponses: Reponses): number | null {
  const jours = determineObligationsApplicables(TRAVAIL, [
    { id: "sonde", libelle: "sonde", categorie, caracteristiques: { ...reponses } },
  ])
    // Les lignes que l'APPAREIL porte, seules : l'établissement sonde en sert
    // d'autres (une semestrielle de signalisation), qui ne disent rien de lui.
    .filter((a) => a.porteur === "equipement")
    .map((a) => PERIODICITE_EN_JOURS[periodiciteEffective(a.obligation)])
    .filter((j): j is number => j !== null);
  return jours.length === 0 ? null : Math.min(...jours);
}

function combinaisons(champs: readonly ChampTriEtat[]): Reponses[] {
  return champs.reduce<Reponses[]>(
    (acc, champ) =>
      acc.flatMap((r) => [
        { ...r, [champ]: true },
        { ...r, [champ]: false },
        { ...r },
      ]),
    [{}],
  );
}

function deriver(categorie: CategorieEquipement): ChampTriEtat[] {
  if (!CATEGORIES_A_REPONSE_EXIGEE.includes(categorie)) return [];
  const champs = questionsTriEtatPour(categorie).map((q) => q.champ);
  return champs.filter((champ) =>
    combinaisons(champs.filter((c) => c !== champ)).some((autres) => {
      const auSilence = rythmeServi(categorie, autres);
      return [true, false].some(
        (v) => rythmeServi(categorie, { ...autres, [champ]: v }) !== auSilence,
      );
    }),
  );
}

const CACHE = new Map<CategorieEquipement, ChampTriEtat[]>();

/**
 * Les questions dont la réponse est exigée pour cette catégorie, dans le
 * régime de l'établissement : celles de D29 (dérivées, sans régime), et
 * celles qu'une décision nomme, là où elles décident d'une ligne.
 */
export function questionsExigeesPour(
  categorie: CategorieEquipement,
  regime: RegimeExigence,
): readonly ChampTriEtat[] {
  let q = CACHE.get(categorie);
  if (!q) {
    q = deriver(categorie);
    CACHE.set(categorie, q);
  }
  const parDecision = QUESTIONS_EXIGEES_PAR_DECISION.filter(
    (d) => d.categorie === categorie && exigeeDansCeRegime(categorie, d.champ, regime),
  ).map((d) => d.champ);
  return parDecision.length === 0 ? q : [...q, ...parDecision];
}

/** La carte complète, sérialisable, pour le formulaire (qui change de catégorie côté client). */
export function questionsExigeesParCategorie(
  regime: RegimeExigence,
): Partial<Record<CategorieEquipement, readonly ChampTriEtat[]>> {
  const out: Partial<Record<CategorieEquipement, readonly ChampTriEtat[]>> = {};
  const categories = new Set([
    ...CATEGORIES_A_REPONSE_EXIGEE,
    ...QUESTIONS_EXIGEES_PAR_DECISION.map((d) => d.categorie),
  ]);
  for (const c of categories) {
    const q = questionsExigeesPour(c, regime);
    if (q.length > 0) out[c] = q;
  }
  return out;
}

/**
 * La raison de la relance d'un appareil muet. Celle de D29 était écrite dans
 * la page ; elle vit ici depuis que deux décisions relancent (2026-10-12).
 */
export function pourquoiRelanceAppareil(champ: ChampTriEtat): string {
  return (
    QUESTIONS_EXIGEES_PAR_DECISION.find((d) => d.champ === champ)?.pourquoi ??
    "La réponse décide du rythme de sa vérification générale périodique — trois, six ou douze mois (arrêté du 1er mars 2004, art. 23). Tant qu'elle manque, Rojer retient le rythme le plus court."
  );
}

/** Ce que le refus dit au dirigeant, pour une question exigée. */
export function messageReponseExigee(champ: ChampTriEtat): string {
  return (
    QUESTIONS_EXIGEES_PAR_DECISION.find((d) => d.champ === champ)?.message ??
    MESSAGE_REPONSE_EXIGEE
  );
}

/** Les questions exigées restées sans réponse, lues sur le JSON de l'appareil. */
export function reponsesManquantes(
  categorie: CategorieEquipement,
  caracteristiques: unknown,
  regime: RegimeExigence,
): ChampTriEtat[] {
  const c =
    caracteristiques !== null && typeof caracteristiques === "object" && !Array.isArray(caracteristiques)
      ? (caracteristiques as Record<string, unknown>)
      : {};
  return questionsExigeesPour(categorie, regime).filter((champ) => typeof c[champ] !== "boolean");
}

/**
 * D29 (a), décision de la propriétaire du 2026-09-28 : pour un appareil de
 * levage, les réponses dont le silence change le rythme de la VGP sont EXIGÉES
 * à la déclaration comme à la modification (`questionsExigeesPour`, dérivé du
 * moteur). La porte est au serveur (`creerEquipement`, `modifierEquipement`) : l'écran pose la question sans
 * réponse présélectionnée, mais un `required` de navigateur ne tient rien.
 *
 * Un appareil ANCIEN sans réponse n'est pas bloqué en silence : sa fiche de
 * modification lui pose la question, et c'est l'enregistrement qui l'exige —
 * modifier son libellé suppose d'y répondre, ce que la décision veut. La
 * relance du tableau de bord (`repondreQuestionEquipement`) la pose aussi,
 * une par une, sans passer par le formulaire.
 */
export const MESSAGE_REPONSE_EXIGEE =
  "Répondez oui ou non : la réponse décide du rythme de la vérification générale périodique (arrêté du 1er mars 2004, art. 23).";

export function reponsesExigeesManquantes(
  val: EquipementInput,
  regime: RegimeExigence,
): Record<string, string[]> | null {
  const manque = questionsExigeesPour(val.categorie, regime).filter(
    (champ) => val[champ] === undefined,
  );
  return manque.length === 0
    ? null
    : Object.fromEntries(manque.map((c) => [c, [messageReponseExigee(c)]]));
}


/**
 * La relance des appareils muets (D29 (a)) : pour chaque appareil actif, chaque
 * question exigée restée sans réponse — une étape par question, dans l'ordre du
 * parc. Contrairement aux questions de la fiche, une étape répondue ne reste pas
 * cochée : un parc de vingt palans laisserait soixante étapes faites.
 */
export function appareilsMuets(
  equipements: readonly {
    id: string;
    libelle: string;
    categorie: string;
    caracteristiques: unknown;
  }[],
  regime: RegimeExigence,
): { equipementId: string; libelle: string; champ: ChampTriEtat }[] {
  return equipements.flatMap((e) =>
    reponsesManquantes(e.categorie as CategorieEquipement, e.caracteristiques, regime).map(
      (champ) => ({ equipementId: e.id, libelle: e.libelle, champ }),
    ),
  );
}
