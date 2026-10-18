import {
  MESSAGE_NOMBRE_DE_PERSONNES,
  nombreDePersonnesADemander,
} from "@/lib/matching/personnes-presentes";
import { z } from "zod";
import { depuisCleJourCivil, estJourCivilReel } from "@/lib/dates";
import { TYPES_ERP_A_SOMMEIL_PLAUSIBLE } from "@/lib/referentiels/types-communs";
import { appliquerFiltre, champAccueilEnfants } from "./types-refuses";

// Enums reflétant le schéma Prisma. Si on ajoute une valeur côté Prisma,
// pensez à la refléter ici — pas d'import direct de @prisma/client pour
// garder le schéma Zod isolé (runtime Zod + typage Prisma).
/**
 * Les vingt-deux types de l'article GN 1 § 1 de l'arrêté du 25 juin 1980.
 *
 * TROISIÈME COPIE DE LA MÊME LISTE — après l'enum Prisma `TypeErp` et
 * `TYPES_ERP` (src/lib/referentiels/types-communs.ts) —, et c'est cette
 * multiplication qui a laissé le type J absent des trois à la fois. Rien ne
 * les rapprochait ; `types-erp.test.ts` le fait désormais, en les confrontant
 * toutes au verbatim de GN 1 dépouillé au corpus.
 *
 * Elle reste distincte parce que ce module ne doit pas dépendre du
 * référentiel : c'est le schéma Zod des formulaires. Ce qui change, c'est
 * qu'une divergence se voit maintenant le jour où elle s'écrit.
 */
export const TYPE_ERP = [
  // a) Établissements installés dans un bâtiment.
  "M", "N", "O", "L", "P", "R", "S", "T", "U", "V",
  "W", "X", "Y", "J",
  // b) Établissements spéciaux.
  "PA", "CTS", "SG", "PS", "REF", "GA", "OA", "EF",
] as const;

/**
 * La liste des autres types d'ERP postée (ADR-045), BORNÉE AVANT d'être lue
 * (revue de c6, 2026-10-17). Sans borne, un POST forgé de 300 000 entrées
 * invalides rendait 52 Mo d'erreurs, et à un million zod levait une RangeError
 * — l'action répondait 500. Un simple `.max()` ne suffit pas : zod contrôle
 * chaque élément AVANT la longueur, et rend une erreur par élément plus la
 * sienne. La longueur se vérifie donc d'abord sur des valeurs quelconques, et
 * `pipe` n'examine les types que si elle passe : un seul message.
 *
 * La même à la fiche et au parcours d'accueil. `typesErpAutresPostes` tronque
 * aussi en amont.
 */
export const typesErpAutresSchema = z
  .array(z.unknown())
  .max(TYPE_ERP.length, { message: "La liste des autres types d'ERP est trop longue." })
  .pipe(z.array(z.enum(TYPE_ERP)));

/** Catégories d'ERP — CCH, art. R. 143-19. Cinq, dans l'ordre du texte. */
export const CATEGORIES_ERP = ["N1", "N2", "N3", "N4", "N5"] as const;

/**
 * À QUI LA QUESTION DU SOMMEIL EST POSÉE — alias de la liste du référentiel.
 *
 * ~~Une première version (2026-09-09, jamais fusionnée) en faisait QUATRE types
 * et une BORNE DE PÉRIMÈTRE sur les obligations elles-mêmes (`typesExclus`), en
 * sacrifiant nommément le refuge et l'hôtel-restaurant d'altitude.~~ Ce n'est
 * plus ça : la liste en compte SIX, elle ne borne aucune obligation, et REF et
 * OA y figurent. Elle dit à qui la question est posée — parcours d'accueil et
 * fiche —, et le moteur s'en sert pour le silence. L'argument complet est sur
 * `TYPES_ERP_A_SOMMEIL_PLAUSIBLE` (`referentiels/types-communs.ts`).
 *
 * Deux lectures du texte avaient été écartées par l'arbitrage de 2026-09-09 et
 * le restent : « un type N peut comporter des chambres à l'étage », et
 * « encoder une liste de types trancherait sans source quels types
 * hébergent ». Elles sont vraies comme lecture du règlement ; ce qui les écarte
 * est une décision de produit, prise deux fois, en connaissance du coût —
 * l'auberge typée N n'est pas couverte tant qu'elle ne se déclare pas O.
 */
// ~~Liste propre à ce module : O, R, U, J, bornant aussi les obligations par
// `typesExclus`.~~ Remplacée le 2026-09-20 : la liste vit côté référentiel
// (`TYPES_ERP_A_SOMMEIL_PLAUSIBLE`), où le moteur la lit, et elle ne borne plus
// aucune obligation — elle dit à qui la question est posée dès le parcours, et
// ce que vaut le silence. Voir sa note pour l'argument complet. L'alias garde
// le nom que les écrans du parcours importent déjà.
export const TYPES_ERP_QUESTION_LOCAUX_SOMMEIL = TYPES_ERP_A_SOMMEIL_PLAUSIBLE;

/**
 * LA RÉPONSE SUIT LE TYPE (2026-09-20).
 *
 * La question du sommeil n'est posée qu'aux types de la liste. Quand
 * l'établissement enregistré n'en est pas — ERP décoché, ou type hors liste —,
 * la question n'existe plus pour lui et SA RÉPONSE PART AVEC ELLE : la colonne
 * est remise à `null`.
 *
 * Sans cela, un hôtel devenu restaurant garderait son « oui » en base, donc
 * ses quatre lignes (dans le moteur, une réponse explicite l'emporte), et plus
 * aucun écran ne lui montrerait la question pour le corriger : le champ masqué
 * n'est pas posté, et un champ non posté n'écrit rien.
 *
 * Le risque que l'ancienne protection couvrait — un « non » effacé qui fait
 * réapparaître quatre lignes « à confirmer » — n'existe plus pour ces types :
 * le moteur ne retient rien sur leur silence.
 */
export function reponseSommeilSuivantLeType<
  T extends {
    estERP?: boolean | null;
    typeErp?: string | null;
    // REQUIS (revue du lot 2) : optionnel, un appelant l'omettait sans que
    // tsc le voie, et un N + O se voyait refuser la réponse de son hôtel.
    typesErpAutres: readonly string[] | null | undefined;
    comporteLocauxSommeilPublic?: boolean | null;
  },
>(donnees: T): T {
  return questionSommeilPosee(donnees)
    ? donnees
    : { ...donnees, comporteLocauxSommeilPublic: null };
}

/**
 * La question des locaux à sommeil est-elle posée à cet établissement ? Oui
 * pour un ERP dont L'UN des types déclarés est de la liste (ADR-045) : un
 * restaurant qui exploite aussi un hôtel — N déclaré en premier, O parmi les
 * autres — doit pouvoir répondre, et sa réponse ne doit pas être effacée.
 *
 * Seule lecture de la règle : les schémas de création et de modification et
 * `reponseSommeilSuivantLeType` passent par elle.
 */
export function questionSommeilPosee(donnees: {
  estERP?: boolean | null;
  typeErp?: string | null;
  /** REQUIS : `undefined` doit être écrit, pas omis — c'est dire « non posté ». */
  typesErpAutres: readonly string[] | null | undefined;
}): boolean {
  if (donnees.estERP !== true) return false;
  const types = [donnees.typeErp, ...(donnees.typesErpAutres ?? [])];
  return types.some(
    (t) => t != null && (TYPES_ERP_QUESTION_LOCAUX_SOMMEIL as readonly string[]).includes(t),
  );
}

/**
 * Les autres types d'ERP à écrire, cohérents avec la contrainte de la base
 * (migration `20261017120000`) : ni `typeErp` ni doublon dedans. Sans quoi
 * l'écriture planterait.
 *
 * `enBase` est la valeur enregistrée : un formulaire qui ne poste pas le champ
 * la garde. Décocher « ERP » la garde aussi, comme `typeErp` et la catégorie
 * (décision du 2026-10-17) — le moteur l'ignore hors ERP. Changer le premier
 * type pour l'un des autres l'en retire.
 *
 * `typeErp` est le premier type QUI SERA EN BASE : le posté, ou à défaut
 * celui qu'un formulaire sans le champ laisse en place.
 */
export function typesErpAutresCoherents<T extends string>(
  donnees: { typeErp?: string | null; typesErpAutres?: readonly T[] },
  enBase: readonly T[] = [],
): T[] {
  const source = donnees.typesErpAutres ?? enBase;
  return [...new Set(source)].filter((t) => t !== donnees.typeErp);
}

export type TypeErpQuestionLocauxSommeil =
  (typeof TYPES_ERP_QUESTION_LOCAUX_SOMMEIL)[number];

/**
 * LA CLASSE D'IGH ET LA FAMILLE D'HABITATION NE SE DÉCLARENT PLUS (2026-09-03).
 *
 * Deux listes vivaient ici — `CLASSES_IGH` (dix valeurs de R. 146-4) et
 * `FAMILLES_HABITATION` (cinq valeurs de l'article 3 de l'arrêté du 31 janvier
 * 1986) —, chacune validant un menu de formulaire. Les deux questions ont été
 * retirées de l'onboarding et de la fiche : mesuré en appelant le moteur, leurs
 * quinze valeurs et `null` rendaient exactement le même jeu d'obligations, et
 * la lecture des deux textes a établi qu'aucune obligation d'exploitant ne
 * dépend ni de l'une ni de l'autre.
 *
 *   IGH — les périodicités de GH 5 s'adressent aux « propriétaires » et ne
 *   varient pas par classe ; la seule périodicité indexée sur la classe de tout
 *   l'arrêté (GH 4 § 3) est celle de la visite de la commission de sécurité ;
 *   et GH 66 achève le sujet — le classement retient « l'usage principal de
 *   l'immeuble », les dispositions de chaque classe s'appliquant « dans chacune
 *   des parties concernées », si bien que la classe DÉCLARÉE de la tour n'est
 *   pas le régime du plateau qu'on y occupe. Voir `corpus/arrete-2011-12-30-igh.ts`.
 *
 *   HABITATION — l'article 101 est la seule obligation périodique du texte et
 *   ne mentionne aucune famille : les familles gouvernent la CONSTRUCTION
 *   (degrés coupe-feu de l'article 97, colonnes sèches de l'article 98). Voir
 *   `corpus/arrete-1986-habitation.ts`.
 *
 * LES COLONNES ET LES ÉNUMÉRATIONS RESTENT : `Etablissement.classeIgh`,
 * `Etablissement.familleHabitation`, `enum ClasseIgh`, `enum FamilleHabitation`,
 * et leurs reflets dans `types-communs.ts` — qui disent ce que la base peut
 * CONTENIR, et continuent d'être tenus à leur texte par `classes-igh.test.ts`
 * et `familles-habitation.test.ts`. Une migration destructive se décide à part ;
 * le dépôt en a un palier en cours pour `GHW` (`docs/chantiers-ouverts.md`
 * § 9 bis).
 *
 * CE QUE LE MOTEUR SAIT ENCORE FAIRE NE BOUGE PAS NON PLUS : `igh: { classes }`
 * et `habitation: { familles }` restent des restrictions exprimables. Retirer la
 * question n'est pas retirer la capacité — c'est cesser de demander une donnée
 * dont aucune obligation ne dépend.
 */

/**
 * La borne du produit (ADR-025 § 1). Elle porte sur les **travailleurs**, et
 * sur eux seuls : le public reçu ne la déclenche jamais. Un restaurant de huit
 * salariés qui peut accueillir quatre cents personnes à la fois relève de la 3ᵉ catégorie d'ERP et
 * reste dans la cible — la catégorie mesure le public, pas l'effectif.
 *
 * Elle vit ici, au plus bas, parce que trois écrits la posent : le schéma
 * d'onboarding, celui de création d'un établissement suivant, et la validation
 * client du wizard. Elle a d'abord été déclarée dans `onboarding/schema.ts`, ce
 * qui a fabriqué un cycle d'imports — et un cycle, en Zod, ne casse pas à la
 * compilation mais à l'initialisation : `z.enum(TYPE_ERP)` recevait
 * `undefined`. Le chiffre appartient au périmètre du produit, pas à l'un de ses
 * parcours.
 */
export const EFFECTIF_MAX = 50;

const nafRegex = /^\d{2}\.?\d{2}[A-Z]?$/;

/**
 * Une réponse oui / non / « je ne sais pas encore » d'un `<select>` de la
 * fiche. `undefined` TRAVERSE — « le champ n'a pas été posté » n'écrit rien —,
 * là où le vide devient `null`, « pas encore répondu ».
 */
const reponseTroisEtats = (v: unknown) =>
  v === "oui"
    ? true
    : v === "non"
      ? false
      : v === true || v === false
        ? v
        : v === undefined
          ? undefined
          : null;

/** Le détail des EPI : borné comme les autres textes libres du modèle. Lu
 *  par la fiche et par la question de la checklist (`parametrage.ts`). */
export const DETAIL_EPI = z
  .string()
  .trim()
  .max(1000, "1000 caractères au maximum");

/**
 * Un « non » (ou un « je ne sais pas ») efface le détail laissé par un « oui »
 * précédent : le garder ferait subsister une liste d'EPI sous une déclaration
 * d'absence d'EPI, et c'est la contradiction qu'un contrôleur relèverait.
 * Règle unique de la checklist et de la fiche (2026-10-12, audit B2).
 */
export function reponseEpiCoherente<
  T extends { epiPresents?: boolean | null; epiPresentsDetail?: string | null },
>(d: T): T {
  if (d.epiPresents === undefined) return d;
  return d.epiPresents === true ? d : { ...d, epiPresentsDetail: null };
}

/**
 * Schéma de validation d'un établissement. La typologie est faite de flags
 * cumulables (ADR-004). Les précisions (typeErp, categorieErp, classeIgh)
 * ne sont requises que si le flag correspondant est vrai — on impose la
 * cohérence via un refine global.
 */
/**
 * Une date civile facultative saisie en AAAA-MM-JJ.
 *
 * `depuisCleJourCivil` ancre la date dans le fuseau de référence (ADR-011).
 * Passer par `new Date("2026-08-26")` la placerait à minuit UTC, soit la
 * veille au soir à Paris — le bug déjà rencontré sur les échéances.
 *
 * Le format est validé AVANT la conversion, et c'est ce qui compte :
 * `depuisCleJourCivil` **jette** sur une chaîne mal formée. Dans un
 * `z.preprocess`, ce throw traverse `safeParse` — qui cesse alors de rendre
 * `{ success: false }` pour propager une exception. Les deux actions serveur
 * appellent `safeParse` hors de tout try/catch : une date saisie « 26/08/2026 »
 * par un navigateur sans `type=date` natif ou par une autocomplétion faisait
 * planter l'action et perdre le formulaire entier, au lieu d'afficher « Format
 * attendu ». Le reste du dépôt valide déjà dans cet ordre (`rapports/schema.ts`,
 * `equipements/schema.ts`) ; ce champ était le seul à s'en écarter.
 */
const DATE_FMT = /^\d{4}-\d{2}-\d{2}$/;

const dateCivileOptionnelle = z
  .union([
    z.literal("").transform(() => null),
    z.null(),
    z
      .string()
      .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
      .refine(estJourCivilReel, "Cette date n'existe pas")
      .transform((v) => depuisCleJourCivil(v)),
  ])
  .optional();

export const etablissementSchema = z
  .object({
    raisonDisplay: z
      .string()
      .trim()
      .min(1, "Le nom de l'établissement est obligatoire")
      .max(200),
    adresse: z.string().trim().min(1, "Adresse requise").max(300),
    codeNaf: z.preprocess(
      (v) =>
        typeof v === "string"
          ? v.trim().toUpperCase() || undefined
          : v,
      z
        .string()
        .regex(nafRegex, "Code NAF invalide (ex. 56.10A)")
        .optional(),
    ),
    effectifSurSite: z.coerce
      .number()
      .int("Effectif entier")
      .min(0, "Effectif positif")
      .max(9999),
    // Champ de R. 4227-34 CT (cf. schema.prisma) : personnes habituellement
    // présentes, salariés + public, et manipulation de matières R. 4227-22.
    // Optionnels : vide = « non renseigné », jamais 0 ni « non » par défaut.
    personnesPresentesHabituellement: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.coerce.number().int("Nombre entier").min(0).max(99999).nullable(),
    ),
    manipuleMatieresR422722: z.preprocess(
      (v) => (v === "oui" ? true : v === "non" ? false : v === true || v === false ? v : null),
      z.boolean().nullable(),
    ),
    // ~~`chiffonsImpregnes`~~ (R. 4227-26, C45) — retiré le 2026-10-08
    // (décision de la propriétaire) : la question n'est plus posée ; la ligne
    // des chiffons est au niveau audit (ADR-042), sans condition.
    estEtablissementTravail: z.coerce.boolean().default(true),
    estERP: z.coerce.boolean().default(false),
    estIGH: z.coerce.boolean().default(false),
    estHabitation: z.coerce.boolean().default(false),
    typeErp: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.enum(TYPE_ERP).optional(),
    ),
    // Les autres types d'ERP (ADR-045, GN 2). Absent = le formulaire ne l'a
    // pas posté : la valeur en base est gardée (`typesErpAutresCoherents`).
    typesErpAutres: typesErpAutresSchema.optional(),
    categorieErp: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.enum(CATEGORIES_ERP).optional(),
    ),
    // `classeIgh` et `familleHabitation` ne figurent plus ici : les deux
    // questions ont été retirées des formulaires le 2026-09-03, et un champ
    // qu'aucune surface ne poste n'a rien à valider. Les colonnes restent en
    // base — voir le bloc en tête de fichier.
    // Locaux à sommeil pour le public (arrêté du 25 juin 1980, Livre III —
    // PE 4 § 1, PE 33, PE 35, PE 37). Trois états comme
    // `manipuleMatieresR422722`, et la même règle : vide = « pas encore
    // répondu », jamais « non ».
    //
    // [2026-09-20 : « je ne sais pas » n'est plus proposé, et la réponse est
    // due pour les types de la liste (`superRefine` ci-dessous). La protection
    // décrite ici ne vaut plus que pour eux : hors liste, la colonne est
    // remise à `null` par `reponseSommeilSuivantLeType`.]
    //
    // `undefined` traverse au lieu d'être coercé en `null` — c'est ce qui
    // distingue « le champ n'a pas été posté » (bloc ERP replié) de
    // « l'utilisateur a remis « je ne sais pas ». Sans lui, décocher l'ERP
    // effacerait un « non » déjà donné et ferait réapparaître quatre lignes.
    comporteLocauxSommeilPublic: z.preprocess(
      reponseTroisEtats,
      z.boolean().nullable().optional(),
    ),
    // Présence d'EPI (ADR-041 : elle conditionne la consigne d'utilisation de
    // R. 4323-105). Posée d'abord par la checklist, qui s'efface une fois
    // répondue : un « non » ne se corrigeait plus nulle part (audit du
    // 2026-10-12, B2). La fiche la pose désormais en modification, comme les
    // matières et le sommeil. La fiche de CRÉATION ne la pose pas : le champ
    // n'est pas posté et `undefined` n'écrit rien.
    epiPresents: z.preprocess(
      reponseTroisEtats,
      z.boolean().nullable().optional(),
    ),
    // SSI de catégorie A ou B (DF 10 § 3), 2026-10-12. Trois états, et la
    // réponse n'est PAS exigée : le silence retient la triennale du
    // désenfumage mécanique « à confirmer » (ADR-022). `undefined` traverse —
    // la question n'est rendue qu'aux ERP des quatre premières catégories, et
    // un champ non posté n'écrit rien.
    ssiCategorieAouB: z.preprocess(
      reponseTroisEtats,
      z.boolean().nullable().optional(),
    ),
    epiPresentsDetail: z.preprocess(
      (v) =>
        v === undefined
          ? undefined
          : typeof v === "string"
            ? v.trim() || null
            : (v ?? null),
      DETAIL_EPI.nullable().optional(),
    ),

    // Renseignements de la fiche « Renseignements généraux » du registre de
    // sécurité (CCH R. 143-44). Ils vivent sur l'établissement, pas dans une
    // fiche de registre : le registre les lit, il ne les recopie pas.
    // Tous optionnels — vide = non renseigné, jamais une valeur par défaut.
    natureActivite: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() || null : (v ?? null)),
      z.string().max(500).nullable(),
    ),
    // `undefined` traverse au lieu d'être coercé en `null` : c'est ce qui
    // distingue « le champ n'a pas été posté » de « l'utilisateur l'a vidé ».
    // Le premier cas arrive dès qu'on décoche ERP — le champ n'est alors plus
    // rendu — et il ne doit rien écrire. Sans ça, `normaliserFormData` avait
    // beau omettre la clé, le schéma la recréait à `null` et Prisma l'écrasait.
    effectifPublicAdmis: z
      .preprocess(
        (v) => (v === "" || v === null ? null : v),
        z.coerce
          .number()
          .int("Nombre entier")
          .min(0, "Effectif positif")
          .max(999999)
          .nullable(),
      )
      .optional(),
    // Dates civiles (ADR-011) : saisies en AAAA-MM-JJ, converties dans le
    // fuseau de référence — jamais `new Date(chaine)`, qui interpréterait en
    // UTC et décalerait la veille.
    dateAutorisationOuverture: dateCivileOptionnelle,
    dateCertificatConformite: dateCivileOptionnelle,
    // 2026-10-17, filtre à l'accueil : la réponse « accueil d'enfants », posée
    // au seul type R. NON STOCKÉE (choix assumé, c6) : elle ne sert qu'à
    // refuser ; l'action la retire avant l'écriture.
    accueilEnfants: champAccueilEnfants,
  })
  .superRefine((val, ctx) => {
    // LA RÉPONSE SUR LE SOMMEIL EST DUE À LA PORTE, PAS SEULEMENT À L'ÉCRAN
    // (2026-09-20, relevé par la revue du lot). Le `required` du formulaire ne
    // tenait que dans le navigateur : ce schéma — qui sert la modification ET,
    // par `etablissementCreationSchema`, la création d'un second établissement
    // — laissait passer un hôtel muet. `actions.ts` l'écrit : « c'est la
    // porte, pas le parcours, qui doit porter la règle ». Même contrôle que
    // celui d'`onboarding/schema.ts`. Hors de la liste, rien n'est refusé : la
    // valeur est remise à `null` par `reponseSommeilSuivantLeType`.
    // La liste POSTÉE seulement : la fusion avec la valeur en base se fait
    // après, dans l'action. ~~Un N + O dont O ne vient que de la base et dont
    // la réponse est vide n'est donc pas refusé ici (revue du lot 2) — il n'a
    // aucun écran pour répondre avant le lot 3, qui postera la liste.~~
    // [2026-10-17, lot 3 : la fiche poste la liste ENTIÈRE, avec un champ
    // témoin (`CHAMP_TEMOIN_TYPES_ERP_AUTRES`) — elle montre les autres types
    // enregistrés et pose la question dès qu'un d'eux l'appelle. La liste
    // postée est donc celle qui sera écrite, et ce contrôle la voit.] Seul
    // un formulaire sans le bloc ERP ne poste rien ; il ne pose pas non plus
    // la question.
    if (
      questionSommeilPosee({ ...val, typesErpAutres: val.typesErpAutres }) &&
      (val.comporteLocauxSommeilPublic === undefined ||
        val.comporteLocauxSommeilPublic === null)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["comporteLocauxSommeilPublic"],
        message:
          "Indiquez si votre établissement héberge du public pour la nuit.",
      });
    }

    // LE NOMBRE DE PERSONNES EST DÛ LÀ OÙ LE MOTEUR NE SAIT PAS CONCLURE SANS LUI
    // (2026-09-20). Même règle qu'au parcours de création, par la même
    // fonction : `/etablissements/nouveau` passe par ce schéma-ci, et une
    // règle posée sur un seul parcours se contourne en changeant de porte.
    // Ici le champ reste ACCEPTÉ de tous — la fiche le montre à tous, et un
    // nombre déclaré tranche dans les deux sens.
    //
    // Conséquence voulue pour un dossier ancien resté muet : sa fiche ne
    // s'enregistre plus sans le nombre. C'est le seul endroit où il peut
    // lever le « à confirmer » de sa consigne incendie et de son exercice
    // semestriel.
    if (
      val.personnesPresentesHabituellement == null &&
      nombreDePersonnesADemander({
        estERP: val.estERP,
        categorieErp: val.categorieErp ?? null,
        effectifSurSite: val.effectifSurSite,
        manipuleMatieresR422722: val.manipuleMatieresR422722,
      })
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["personnesPresentesHabituellement"],
        message: MESSAGE_NOMBRE_DE_PERSONNES,
      });
    }

    // Règle ADR-004 : les précisions sont alignées sur les flags.
    if (val.estERP) {
      if (!val.typeErp) {
        ctx.addIssue({
          code: "custom",
          path: ["typeErp"],
          message: "Type ERP requis dès lors que l'établissement est ERP",
        });
      }
      if (!val.categorieErp) {
        ctx.addIssue({
          code: "custom",
          path: ["categorieErp"],
          message: "Catégorie ERP requise (1 à 5)",
        });
      }
    } else {
      // Si pas ERP, ni typeErp ni categorieErp ne doivent être posés
      if (val.typesErpAutres && val.typesErpAutres.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["typesErpAutres"],
          message: "Ne doit être posé que si l'établissement est ERP",
        });
      }
      if (val.typeErp) {
        ctx.addIssue({
          code: "custom",
          path: ["typeErp"],
          message: "Ne doit être posé que si l'établissement est ERP",
        });
      }
      if (val.categorieErp) {
        ctx.addIssue({
          code: "custom",
          path: ["categorieErp"],
          message: "Ne doit être posée que si l'établissement est ERP",
        });
      }
    }

    // Trois règles vivaient ici et sont tombées avec les questions, le
    // 2026-09-03 : « classe IGH requise si estIGH », « classe interdite hors
    // IGH », « famille interdite hors habitation ». Aucune n'était fausse ;
    // elles gardaient la cohérence d'une donnée que plus personne ne saisit.
    // Un régime IGH ou habitation se déclare désormais par son seul booléen.

    // Un établissement doit relever d'au moins un régime ; si tout est à
    // false, on retombe implicitement sur « travail classique ».
    const aucunRegime =
      !val.estEtablissementTravail &&
      !val.estERP &&
      !val.estIGH &&
      !val.estHabitation;
    if (aucunRegime) {
      ctx.addIssue({
        code: "custom",
        path: ["estEtablissementTravail"],
        message:
          "Cochez au moins un régime : travail, ERP, IGH ou habitation.",
      });
    }
  });

export type EtablissementInput = z.infer<typeof etablissementSchema>;

/**
 * Schéma de **création** d'un établissement (ADR-025 § 4, ADR-031).
 *
 * Il ne porte plus que ~~les deux refus de périmètre de l'ADR-031~~
 * [2026-10-18 : les refus de périmètre de l'ADR-031 — effectif, ERP en IGH,
 * et depuis le 2026-10-17 le filtre à l'accueil (`appliquerFiltre`)].
 *
 * IL A PORTÉ UNE TROISIÈME RÈGLE, ET SA DISPARITION SE RACONTE. Du 2026-09-01
 * au 2026-09-03, la FAMILLE D'HABITATION était exigée ici et nulle part
 * ailleurs — dissymétrie création / modification voulue, pour qu'une règle
 * neuve ne rende pas inutilisables les dossiers saisis avant elle. Elle tombe
 * avec la question : l'arrêté du 31 janvier 1986 a été dépouillé, son unique
 * obligation périodique (article 101) ne mentionne aucune famille, et aucune
 * obligation du référentiel n'en dépend. Exiger à la création une donnée qui ne
 * décide de rien, c'est ajouter une étape au parcours pour rien.
 */
export const etablissementCreationSchema = etablissementSchema.superRefine(
  (val, ctx) => {
    // ~~Les deux refus de périmètre~~ [2026-10-18 : les refus de taille et
    // d'IGH ; le filtre à l'accueil suit, plus bas] (ADR-031). Ils vivent ici et non dans
    // `etablissementSchema` parce que ce schéma-là sert aussi à modifier un
    // dossier ancien, et un client qui passe de quarante-cinq à soixante
    // salariés reste servi — son dossier porte alors un manque de couverture,
    // il ne se ferme pas.
    //
    // Ils vivent ici et PAS SEULEMENT dans le wizard : depuis l'ADR-028, un
    // second établissement se crée par un autre chemin. Une règle posée sur le
    // parcours et non sur la porte se contourne en changeant de parcours.
    if (val.effectifSurSite > EFFECTIF_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["effectifSurSite"],
        message: `Rojer prend en charge les structures jusqu'à ${EFFECTIF_MAX} salariés.`,
      });
    }

    // La borne compte les TRAVAILLEURS. Le public reçu ne la déclenche jamais :
    // un restaurant de huit salariés qui peut accueillir quatre cents personnes à la fois est classé
    // en 3ᵉ catégorie d'ERP et reste dans la cible.
    if (val.estERP && val.estIGH) {
      ctx.addIssue({
        code: "custom",
        path: ["estIGH"],
        message:
          "Un établissement recevant du public situé dans un immeuble de grande hauteur relève du règlement de sécurité des IGH, que Rojer ne couvre pas.",
      });
    }

    // Le filtre à l'accueil (2026-10-17, `types-refuses.ts`) : types J, U,
    // établissements spéciaux, et R qui accueille des enfants. La modification
    // de la fiche l'applique à la transition, dans `modifierEtablissement`.
    appliquerFiltre(val, ctx);
  },
);
