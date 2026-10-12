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
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: false,
  comporteLocauxSommeilPublic: null,
  chiffonsImpregnes: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
};

type Reponses = Partial<Record<ChampTriEtat, boolean>>;

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

/** Les questions dont la réponse est exigée pour cette catégorie (vide hors D29). */
export function questionsExigeesPour(categorie: CategorieEquipement): readonly ChampTriEtat[] {
  let q = CACHE.get(categorie);
  if (!q) {
    q = deriver(categorie);
    CACHE.set(categorie, q);
  }
  return q;
}

/** La carte complète, sérialisable, pour le formulaire (qui change de catégorie côté client). */
export function questionsExigeesParCategorie(): Partial<Record<CategorieEquipement, readonly ChampTriEtat[]>> {
  const out: Partial<Record<CategorieEquipement, readonly ChampTriEtat[]>> = {};
  for (const c of CATEGORIES_A_REPONSE_EXIGEE) out[c] = questionsExigeesPour(c);
  return out;
}

/** Les questions exigées restées sans réponse, lues sur le JSON de l'appareil. */
export function reponsesManquantes(
  categorie: CategorieEquipement,
  caracteristiques: unknown,
): ChampTriEtat[] {
  const c =
    caracteristiques !== null && typeof caracteristiques === "object" && !Array.isArray(caracteristiques)
      ? (caracteristiques as Record<string, unknown>)
      : {};
  return questionsExigeesPour(categorie).filter((champ) => typeof c[champ] !== "boolean");
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
): Record<string, string[]> | null {
  const manque = questionsExigeesPour(val.categorie).filter(
    (champ) => val[champ] === undefined,
  );
  return manque.length === 0
    ? null
    : Object.fromEntries(manque.map((c) => [c, [MESSAGE_REPONSE_EXIGEE]]));
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
): { equipementId: string; libelle: string; champ: ChampTriEtat }[] {
  return equipements.flatMap((e) =>
    reponsesManquantes(e.categorie as CategorieEquipement, e.caracteristiques).map(
      (champ) => ({ equipementId: e.id, libelle: e.libelle, champ }),
    ),
  );
}
