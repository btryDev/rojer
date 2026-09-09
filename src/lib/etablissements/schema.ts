import { z } from "zod";
import { depuisCleJourCivil } from "@/lib/dates";

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

/** Catégories d'ERP — CCH, art. R. 143-19. Cinq, dans l'ordre du texte. */
export const CATEGORIES_ERP = ["N1", "N2", "N3", "N4", "N5"] as const;

/**
 * LES QUATRE TYPES AUXQUELS LA QUESTION DES LOCAUX À SOMMEIL EST POSÉE.
 *
 * DÉCISION DE PRODUIT DU 2026-09-09, ET ELLE N'EST PAS UNE LECTURE DU TEXTE.
 * Aucun article ne rattache un type d'exploitation à la présence de locaux à
 * sommeil, et ce n'est pas faute d'avoir cherché : `GN 1 § 1` est la
 * nomenclature des vingt-deux types et ne dit rien de l'hébergement ; son § 4
 * en donne la définition — « les seuls locaux destinés au sommeil du public la
 * nuit » — et rien de plus. La liste vient d'un spécialiste consulté par la
 * propriétaire, arbitrée le 2026-09-09 en connaissance de cette absence de
 * fondement textuel. Elle est une BORNE DE PÉRIMÈTRE, pas une déduction : le
 * produit ne suppose pas qu'une boulangerie ne fait pas dormir, il décide que
 * les obligations de locaux à sommeil ne visent que ces quatre types.
 *
 * CE QUE CETTE BORNE RENVERSE, ET IL FAUT LE LIRE AVANT DE LA TOUCHER. Le
 * dépôt avait tranché deux fois dans l'AUTRE sens :
 *   — `docs/carto-obligations-hors-equipement.md` § « Décisions tranchées »
 *     point 3 : « attribut DÉCLARÉ, pas dérivé », au motif que « la dérivation
 *     depuis `typeErp` est incomplète des deux côtés — un type N peut comporter
 *     des chambres à l'étage, un type R sans internat n'en comporte pas » ;
 *   — la note de `incendie-erp-visite-commission-cat5-quinquennale` : « encoder
 *     une liste de types équivaudrait à trancher, sans source article par
 *     article, quels types d'exploitation comportent des locaux à sommeil — ce
 *     que la règle n°6 interdit ».
 * Les deux ont été relues et remontées avant l'arbitrage. Elles restent vraies
 * comme lecture du texte ; elles sont écartées comme règle de produit. Ce qui
 * les écarte est une décision, pas une réfutation — d'où cette note plutôt
 * qu'une suppression.
 *
 * CE QU'ELLE COÛTE, NOMMÉ PLUTÔT QUE TU. Trois cas perdent les quatre lignes :
 * le refuge de montagne (REF) et l'hôtel-restaurant d'altitude (OA), dont les
 * libellés de GN 1 nomment pourtant l'hébergement ; et le type N ou M qui
 * comporte des chambres à l'étage — l'auberge, la chambre d'hôtes au-dessus du
 * restaurant —, que `typeErp` ne sait pas distinguer parce qu'il ne stocke
 * qu'un type par établissement et que `GN 2` et `GN 3`, qui règlent le
 * classement des exploitations à types multiples, ne sont pas dépouillés au
 * corpus. Ces trois cas ont été soumis à l'arbitrage et écartés avec lui.
 *
 * L'ORDRE EST CELUI DE `TYPE_ERP`, lui-même celui de `GN 1 § 1`.
 */
export const TYPES_ERP_QUESTION_LOCAUX_SOMMEIL = [
  "O",
  "R",
  "U",
  "J",
] as const;

export type TypeErpQuestionLocauxSommeil =
  (typeof TYPES_ERP_QUESTION_LOCAUX_SOMMEIL)[number];

/**
 * Le complément de la liste ci-dessus, dérivé plutôt que recopié.
 *
 * C'est cette forme-là que le référentiel encode, en `typesExclus` : celui-ci
 * retient l'ERP dont le type n'est pas renseigné, là où `types` le rejette. Un
 * ERP de 5ᵉ catégorie qui n'a pas déclaré son type garde donc ses quatre
 * lignes, « à confirmer » — la borne ne creuse pas de faux négatif muet chez
 * qui n'a rien précisé.
 *
 * LE RÉFÉRENTIEL NE L'IMPORTE PAS : il écrit la liste en clair, parce que ce
 * module est le schéma Zod des formulaires et que `src/lib/referentiels/` ne
 * doit pas en dépendre. C'est `locaux-sommeil-borne-types.test.ts` qui tient
 * les deux ensemble, comme `categories-erp.test.ts` le fait déjà pour les
 * catégories. Une divergence se voit le jour où elle s'écrit, au lieu de se
 * découvrir dans un calendrier.
 *
 * Dérivée et non écrite à la main : une lettre ajoutée à `TYPE_ERP` entre
 * automatiquement dans le complément, donc DANS le champ des obligations, et
 * jamais dehors par oubli. C'est le sens d'erreur qui se voit.
 */
export const TYPES_ERP_HORS_QUESTION_LOCAUX_SOMMEIL = TYPE_ERP.filter(
  (t) =>
    !(TYPES_ERP_QUESTION_LOCAUX_SOMMEIL as readonly string[]).includes(t),
);

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
 * salariés qui sert trois cents couverts relève de la 3ᵉ catégorie d'ERP et
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
    estEtablissementTravail: z.coerce.boolean().default(true),
    estERP: z.coerce.boolean().default(false),
    estIGH: z.coerce.boolean().default(false),
    estHabitation: z.coerce.boolean().default(false),
    typeErp: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.enum(TYPE_ERP).optional(),
    ),
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
    // `undefined` traverse au lieu d'être coercé en `null` — c'est ce qui
    // distingue « le champ n'a pas été posté » (bloc ERP replié) de
    // « l'utilisateur a remis « je ne sais pas ». Sans lui, décocher l'ERP
    // effacerait un « non » déjà donné et ferait réapparaître quatre lignes.
    comporteLocauxSommeilPublic: z.preprocess(
      (v) =>
        v === "oui"
          ? true
          : v === "non"
            ? false
            : v === true || v === false
              ? v
              : v === undefined
                ? undefined
                : null,
      z.boolean().nullable().optional(),
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
  })
  .superRefine((val, ctx) => {
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
 * Il ne porte plus que les deux refus de périmètre de l'ADR-031.
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
    // Les deux refus de périmètre (ADR-031). Ils vivent ici et non dans
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
    // un restaurant de huit salariés qui sert trois cents couverts est classé
    // en 3ᵉ catégorie d'ERP et reste dans la cible.
    if (val.estERP && val.estIGH) {
      ctx.addIssue({
        code: "custom",
        path: ["estIGH"],
        message:
          "Un établissement recevant du public situé dans un immeuble de grande hauteur relève du règlement de sécurité des IGH, que Rojer ne couvre pas.",
      });
    }
  },
);
