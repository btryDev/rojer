/**
 * Obligations réglementaires — Sécurité incendie (P1).
 *
 * Sources primaires :
 *   - Code du travail, articles R. 4227-28 à R. 4227-41 (lutte contre
 *     l'incendie, consignes, exercices) et L. 4711-5 (registre de sécurité).
 *   - Arrêté du 14 décembre 2011 relatif aux installations d'éclairage de
 *     sécurité, pris pour l'application de l'article R. 4227-14 du code du
 *     travail (conception, exploitation et maintenance en lieu de travail).
 *   - Arrêté du 25 juin 1980 modifié (règlement de sécurité ERP) — livre II,
 *     articles MS (moyens de secours), DF (désenfumage) et EC (éclairage).
 *   - Arrêté du 22 juin 1990 modifié (règles PE — ERP 5ᵉ catégorie).
 *   - Arrêté du 30 décembre 2011 (règlement IGH) — article GH 5 (vérifications
 *     techniques par organismes agréés).
 *   - CCH articles R. 143-1 s. (ERP) et R. 146-3 s. (IGH) — registre de
 *     sécurité : R. 143-44 (ERP) et R. 146-35 (IGH).
 *
 * Note sur les extincteurs :
 *   La NF EN 3 et la règle APSAD R4 ne sont pas des textes opposables en tant
 *   que tels. L'obligation opposable vient de l'arrêté du 25 juin 1980 (art.
 *   MS 38) et du Code du travail R. 4227-29. On cite les deux, sans les normes
 *   privées.
 */

import type { Obligation, ReferenceLegale } from "./types";

// -----------------------------------------------------------------------------
// GE 4 § 1 — le tableau des visites périodiques de commission, case par case
//
// Six lignes, une par bloc (catégorie × périodicité) du tableau. Elles
// partagent leurs références, la partie de leur description qui ne dépend
// d'aucune case, et l'essentiel de leurs notes : six copies d'un même
// verbatim divergent à la première correction, et c'est la divergence qu'on
// ne verrait pas.
// -----------------------------------------------------------------------------

/** Les deux références de GE 4 § 1, partagées par les six lignes du tableau. */
const REFERENCES_GE4: [ReferenceLegale, ...ReferenceLegale[]] = [
  {
    source: "ARRETE",
    reference:
      "Arrêté du 25 juin 1980, art. GE 4 § 1 (visites périodiques des quatre premières catégories)",
    article: "GE 4",
    url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020303874/",
    note:
      "« Les établissements des 1re, 2e, 3e et 4e catégories doivent être visités périodiquement par les commissions de sécurité selon la fréquence fixée au tableau suivant en fonction de leur type et de leur catégorie. » Verbatim relevé en première main le 2026-09-01. Le tableau lui-même — quinze colonnes de type, deux blocs de quatre lignes de catégorie, trois ans ou cinq ans — a été relevé le 2026-09-02 puis VÉRIFIÉ CASE PAR CASE SUR LE FAC-SIMILÉ DU JOURNAL OFFICIEL, les quinze colonnes sur les huit lignes : les positions concordent sans exception avec le relevé. Sa version actuelle lui vient de l'arrêté du 20 octobre 2014, NOR INTE1420988A (JORFTEXT000029641453, JORF n°0250 du 28 octobre 2014, texte n°23, page 17818), dont l'annexe dispose que « le tableau du chapitre Ier est remplacé par le tableau suivant ». ATTENTION : deux arrêtés du 20 octobre 2014 au titre identique figurent au même JO ; l'autre, NOR INTE1421827A (JORFTEXT000029641444), modifie REF 7 (refuges de montagne) et ne touche pas GE 4. Citer « l'arrêté du 20 octobre 2014 » sans son NOR désigne les deux à la fois. Version en vigueur depuis le 01/01/2015, SANS terme : vérifié sur la page d'article, et confirmé par une lecture de la section au 1er juillet 2027 où GE 4 figure inchangé.",
    versionConstatee: "2015-01-01",
  },
  {
    source: "CCH",
    reference: "CCH, art. R. 143-41 (visites périodiques de la commission)",
    article: "CCH R. 143-41",
    url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043819015/",
    note:
      "Fonde les visites périodiques de la commission et renvoie leur périodicité au règlement de sécurité, sans en fixer aucune. C'est GE 4 qui la fixe pour les quatre premières catégories.",
    versionConstatee: "2021-07-01",
  },
];

/**
 * Ce que le tableau ne dit pas seul, et qui vaut pour les six lignes. Les
 * § 2, § 3 et § 4 ne sont pas des rythmes ; ils sont nommés au dirigeant
 * plutôt que tus, et ne sont encodés nulle part.
 */
const DESCRIPTION_GE4_RESERVES =
  " Trois ajustements existent, qui ne sont pas des rythmes et que le produit " +
  "ne calcule pas. Lorsque l'établissement comprend plusieurs bâtiments isolés " +
  "les uns des autres, la catégorie s'apprécie bâtiment par bâtiment et les " +
  "visites se font pour l'ensemble avec la périodicité la plus courte de celles " +
  "qui correspondent aux catégories des bâtiments : le rythme réel peut donc " +
  "être plus court que celui de la catégorie de l'établissement. Après deux " +
  "visites périodiques consécutives conclues par un avis favorable, un " +
  "établissement ne comportant pas de locaux d'hébergement peut voir le délai " +
  "de sa prochaine visite prolongé dans la limite de cinq ans, sur proposition " +
  "de la commission inscrite au procès-verbal — c'est une faculté sous plafond, " +
  "pas un rythme. Et le maire ou le préfet peut modifier la fréquence des " +
  "contrôles par arrêté, après avis de la commission. La visite est déclenchée " +
  "par l'administration : ce qui se trace au registre est la visite lorsqu'elle " +
  "a eu lieu.";

/**
 * La note commune aux quatre lignes de locaux à sommeil : d'où vient la borne
 * par type posée le 2026-09-09, ce qu'elle renverse, et ce qu'elle coûte.
 */
const NOTE_BORNE_TYPES_SOMMEIL =
  "\n\n— — — NOTE COMMUNE AUX QUATRE LIGNES DE LOCAUX À SOMMEIL — — —\n\n" +
  "⚠ AMENDEMENT 2026-09-09 — LES QUATRE LIGNES SONT BORNÉES AUX TYPES J, O, U ET R. Jusqu'à ce jour elles ne portaient que `categories: [\"N5\"]` et `locauxSommeilPublic: true` : tout ERP de 5ᵉ catégorie qui n'avait pas répondu à la question les recevait « à confirmer », restaurants et boutiques compris, et la question n'était posée nulle part avant la fiche établissement. Elles portent désormais `typesExclus` — le complément des quatre types dans la nomenclature de GN 1 — et la question est posée au parcours d'accueil à ces quatre types-là.\n\n" +
  "LA BORNE N'EST PAS UNE LECTURE DU TEXTE, ET C'EST LE POINT LE PLUS IMPORTANT DE CETTE NOTE. Aucun article ne rattache un type d'exploitation à la présence de locaux à sommeil. `GN 1 § 1` est la nomenclature des vingt-deux types et ne dit rien de l'hébergement ; son § 4 en donne la définition — « les seuls locaux destinés au sommeil du public la nuit » — et rien de plus. La liste J, O, U, R ressemble à la colonne triennale de 4ᵉ catégorie du tableau de `GE 4 § 1`, mais elle n'en vient pas et ne pourrait pas en venir : ce tableau fixe des fréquences de VISITE, et il relève du Livre II, que `PE 1 § 1` écarte en 5ᵉ catégorie — c'est-à-dire pour les quatre lignes que voici. La liste vient d'un spécialiste consulté par la propriétaire, et elle a été arbitrée le 2026-09-09 en connaissance de cette absence de fondement textuel. C'est une BORNE DE PÉRIMÈTRE — le produit décide qui ces obligations visent —, pas une déduction sur ce que chaque établissement comporte.\n\n" +
  "CE QU'ELLE RENVERSE. Le dépôt avait tranché deux fois dans l'autre sens, et les deux motifs sont conservés parce qu'ils restent exacts comme lecture du texte, non parce qu'ils décrivent encore le choix fait : (1) `docs/carto-obligations-hors-equipement.md` § « Décisions tranchées » point 3 — « attribut DÉCLARÉ, pas dérivé », au motif que « la dérivation depuis `typeErp` est incomplète des deux côtés — un type N peut comporter des chambres à l'étage, un type R sans internat n'en comporte pas » ; (2) la note de `incendie-erp-visite-commission-cat5-quinquennale` ci-dessus — « encoder une liste de types équivaudrait à trancher, sans source article par article, quels types d'exploitation comportent des locaux à sommeil — ce que la règle n°6 interdit ». Les deux ont été relues et remontées à la propriétaire AVANT l'arbitrage, avec le constat que GN 1 ne fonde pas la liste. Elles sont écartées comme règle de produit, pas réfutées comme lecture.\n\n" +
  "POURQUOI `typesExclus` ET NON `types`, ET CE N'EST PAS UN DÉTAIL D'ÉCRITURE. Une restriction `types` REJETTE l'ERP dont le `typeErp` n'est pas renseigné — une restriction invérifiable ne s'ignore pas — tandis que `typesExclus` le RETIENT — une exclusion invérifiable ne s'applique pas. Avec `types`, un ERP de 5ᵉ catégorie sans type déclaré aurait perdu ses quatre lignes en silence : exactement le faux négatif muet que toute la carto des obligations hors équipement cherche à supprimer. Avec `typesExclus`, il les garde, marquées « à confirmer » par `evaluerLocauxSommeil`. Même raison et même forme que les six lignes de GE 4 § 1.\n\n" +
  "CE QUE LA BORNE COÛTE, NOMMÉ PLUTÔT QUE TU. Trois cas perdent les quatre lignes, et aucun ne se voit du côté de qui les subit :\n" +
  "  (1) LE REFUGE DE MONTAGNE (REF) ET L'HÔTEL-RESTAURANT D'ALTITUDE (OA). Leurs libellés à GN 1 § 1 nomment l'hébergement — un refuge de montagne héberge par définition —, et ils sont pourtant hors de la liste. Les deux ont été soumis à l'arbitrage du 2026-09-09 et écartés avec lui.\n" +
  "  (2) LE TYPE N OU M QUI COMPORTE DES CHAMBRES. L'auberge, la chambre d'hôtes au-dessus du restaurant, le gîte attenant à la boutique. `Etablissement.typeErp` ne stocke qu'UN type, et `GN 2` et `GN 3` — qui règlent le classement des exploitations à types multiples — ne sont pas dépouillés au corpus : rien dans le dépôt ne dit comment une auberge se déclare. L'aide du champ, elle, nomme toujours « chambres d'hôtes » et « gîte ».\n" +
  "  (3) LE DIRIGEANT D'UN TYPE HORS LISTE QUI RÉPOND « OUI ». C'est le plus dur des trois, parce qu'il porte sur un fait DÉCLARÉ et non sur un silence. La question reste visible sur la fiche établissement pour tout ERP ; un exploitant de type N qui y répond « oui » — donc qui déclare faire dormir du public — ne reçoit AUCUNE des quatre lignes, la borne de type et le critère de sommeil se lisant en ET. Sa réponse est enregistrée en base et n'a aucun effet. L'aide du champ lui annonce pourtant ce qu'elle ajoute. Nommé ici, non corrigé : le corriger demanderait que la borne cède devant une déclaration explicite, ce qui n'est pas exprimable dans `TypologieApplication` aujourd'hui — `types`/`typesExclus` sont des ET secs — et surtout ce serait rouvrir l'arbitrage. À reprendre avec la propriétaire, en sachant que c'est le seul des trois cas où quelqu'un a pris la peine de dire le contraire de ce que le produit conclut.\n\n" +
  "CE QUE LA BORNE CORRIGE, EN REGARD. La sur-application mesurée le 2026-09-01 — « deux restaurants sur deux » portant une visite de commission quinquennale « à confirmer » — disparaît pour les types hors liste, et sans qu'on écrive « non » à la place de personne : la colonne `comporteLocauxSommeilPublic` reste `null` pour qui n'a pas répondu. Rien n'est inscrit au dossier que personne n'a dit, et la réserve sur l'allègement futur de `PE 2 § 3` tombe avec — un établissement jamais interrogé ne pourra pas s'en prévaloir, faute de « non » en base.";

/**
 * La note commune aux six lignes : d'où vient le tableau, comment il est
 * contrôlé, pourquoi six lignes, et ce qui reste non encodé.
 */
const NOTE_GE4_TABLEAU =
  "— — — NOTE COMMUNE AUX SIX LIGNES DE GE 4 § 1 — — —\n\n" +
  "LE TABLEAU, TEL QU'IL EST ENCODÉ (types × catégories, en années) :\n" +
  "  J, O, R (1) avec hébergement, U .......... 3 | 3 | 3 | 3\n" +
  "  L, P, R (2) sans hébergement ............. 3 | 3 | 3 | 5\n" +
  "  M, N, S, T, W, X, Y ...................... 3 | 3 | 5 | 5\n" +
  "  V ........................................ 5 | 5 | 5 | 5\n\n" +
  "D'OÙ IL VIENT. Relevé du 2026-09-02 (`docs/revues/releve-ge4-tableau.md`, branche `releve/ge4-tableau`) : les libellés de lignes et de colonnes et le texte des § 1 à § 4 lus sur la donnée officielle consolidée (jeu LEGI de la DILA, LEGIARTI000029642660) ; les CARDINALITÉS de chaque ligne lues sur DEUX jeux de données officiels indépendants (LEGI consolidé et JORF tel qu'édicté en 2014) ; les POSITIONS lues d'abord sur quatre reproductions secondaires concordantes, PUIS VÉRIFIÉES CASE PAR CASE SUR LE FAC-SIMILÉ DU JOURNAL OFFICIEL par la propriétaire — les quinze colonnes sur les huit lignes, sans un écart. La réserve principale du relevé (« aucune position n'a été lue sur une source officielle ») est donc levée ; elle est reproduite ici parce que le relevé la porte encore et qu'il ne faut pas le lire sans savoir qu'elle a été levée après coup.\n\n" +
  "LE CONTRÔLE MÉCANIQUE, ET IL EST LE SEUL DISPONIBLE. Dans la donnée officielle, les cellules VIDES du tableau ne sont pas encodées — le défaut est déjà dans le texte publié au JO et se retrouve dans le consolidé. Les lignes n'ont donc pas toutes le même nombre de cellules, et une extraction qui les aligne à gauche produit un tableau faux, faux DIFFÉREMMENT selon l'outil : c'est ce qui a fait se contredire quatre extractions le 2026-09-01. Ce qui est exact et officiel, ce sont les CARDINALITÉS : trois ans → 14, 14, 7, 4 ; cinq ans → 1, 1, 8, 11 ; chaque catégorie se complétant à quinze. Un test (`conformite.test.ts`) les recalcule depuis le tableau encodé au lieu de les recopier, et refuse toute case portée à cinq ans là où le tableau dit trois.\n\n" +
  "POURQUOI SIX LIGNES, ET NON UNE. Le tableau est une fonction de deux variables ; `periodicite` est un scalaire. Il faut donc autant d'obligations que le tableau a de blocs (catégorie × valeur) : 1ʳᵉ-2ᵉ / 3ᵉ / 4ᵉ, trois ans / cinq ans. Regrouper 1ʳᵉ et 2ᵉ est exact — leurs deux lignes sont identiques —, regrouper au-delà ne l'est pas. Chaque établissement en reçoit EXACTEMENT UNE : les six typologies forment une partition, et un test l'éprouve sur les 22 types × 4 catégories, plus le cas du type non renseigné.\n\n" +
  "POURQUOI `typesExclus`, ET POURQUOI IL A FALLU L'AJOUTER. Le complément d'un ensemble de types ne s'écrit pas avec `types` : une restriction `types` rejette l'ERP dont le `typeErp` n'est PAS RENSEIGNÉ (`docs/regles-matching.md` : « une restriction que l'on ne peut pas vérifier ne doit pas être silencieusement ignorée »). Énumérer les types à trois ans aurait donc privé de toute visite l'établissement de 1ʳᵉ à 4ᵉ catégorie qui n'a pas précisé son activité — un faux négatif MUET, exactement l'erreur que ce lot avait pour consigne de ne pas commettre. `typesExclus` est le complément, avec la sémantique inverse et pour la même raison : une exclusion invérifiable ne s'applique pas, l'établissement au type inconnu retombe sur les trois ans. Extension du modèle purement additive (aucune migration : la typologie vit en TypeScript, ADR-003).\n\n" +
  "CE QUE L'ÉNUMÉRATION `TypeErp` NE PORTE PAS, ET QUI EST SIGNALÉ PLUTÔT QUE DEVINÉ.\n" +
  "  (a) LE TYPE J N'EXISTE PAS dans `TypeErp` (ni côté Prisma). Le tableau lui donne trois ans dans les quatre catégories. L'absence ne crée aucun écart de périodicité — `typesExclus` fait retomber tout type non nommé sur les lignes triennales, qui est justement le régime de J —, mais elle empêche un EHPAD ou une résidence pour personnes handicapées de se déclarer pour ce qu'il est, et l'oriente vers un type voisin. À reprendre avec l'ajout de la valeur à l'énumération, qui est une migration de schéma.\n" +
  "  (b) LA DISTINCTION R (1) / R (2) N'EXISTE PAS. Le tableau tient l'hébergement pour une COLONNE, pas pour une nuance : en 4ᵉ catégorie, R avec hébergement est à trois ans et R sans hébergement à cinq. Le modèle n'a aucun attribut d'établissement disant si l'exploitation héberge. Tout R est donc retenu à TROIS ANS, y compris en 4ᵉ catégorie où le tableau en met une moitié à cinq. C'est la seule sur-application volontaire de l'encodage, et elle est du bon côté : elle avance une date, elle ne l'allonge pas.\n" +
  "  (c) LES HUIT TYPES SPÉCIAUX — PA, CTS, SG, PS, GA, OA, REF, EF — N'ONT AUCUNE COLONNE au tableau. GE 4 § 1 ne leur fixe rien. Aucune périodicité ne leur est inventée : ils ne figurent dans aucune liste `types` des lignes quinquennales, et tombent donc sur les lignes triennales par le jeu de `typesExclus` — c'est-à-dire au statu quo, qui est la borne prudente. Ce que ce référentiel ne sait pas, c'est où LEUR périodicité est fixée ; la question est ouverte, pas tranchée.\n\n" +
  "CE QUI N'EST PAS ENCODÉ, ET NE DOIT PAS L'ÊTRE.\n" +
  "  § 2 — bâtiments isolés : la catégorie s'apprécie bâtiment par bâtiment et la visite se fait pour l'ensemble « avec la périodicité la plus courte de celles qui correspondent aux catégories des bâtiments ». Le produit ne détermine pas de catégorie par bâtiment (ADR-019 : le bâtiment est un lieu). Nommé en description.\n" +
  "  § 3 — après deux visites périodiques consécutives conclues par un avis favorable, un établissement sans locaux d'hébergement peut voir son délai « prolongé DANS LA LIMITE DE CINQ ANS », sur proposition de la commission inscrite au procès-verbal. C'est une FACULTÉ SOUS PLAFOND soumise à décision, pas un rythme, et elle suppose un historique que le produit n'observe pas. Deux tests interdisent que `quinquennale` s'y glisse : ils vérifient que la valeur cinq ans d'une ligne vient d'une case du TABLEAU, jamais du § 3.\n" +
  "  § 4 — le maire ou le préfet peut modifier la fréquence des contrôles par arrêté, après avis de la commission. Pouvoir de l'autorité exercé par acte administratif individuel : prescription particulière (ADR-014), qui surcharge la périodicité sur un dossier donné.\n\n" +
  "PORTEUR ÉTABLISSEMENT (ADR-022) : GE 4 § 1 ne conditionne la visite à aucun équipement, il vise « les établissements des 1re, 2e, 3e et 4e catégories ». La ligne existe donc même si rien n'est déclaré, et n'en produit qu'une.\n\n" +
  "FRONTIÈRE AVEC LA 5ᵉ CATÉGORIE, INCHANGÉE : GE 4 relève du Livre II, écarté en 5ᵉ par PE 1 § 1 ; `incendie-erp-5-visite-commission` se fonde sur PE 37 et ne vise que la 5ᵉ. Aucun établissement ne peut recevoir une ligne de chaque, et un test l'éprouve sur les cinq catégories.\n\n" +
  "LE PIÈGE DE LA DATE, RAPPELÉ POUR QU'IL NE SE REPRENNE PAS : le sélecteur de la page de SECTION affiche pour GE 4 « 01/01/2015 au 01/06/2027 ». Ce terme est celui de GE 2 et GE 6, qui vivent dans la même section ; trois lectures s'y sont laissé prendre le 2026-09-01. La section relue AU 1ER JUILLET 2027 rend GE 4 présent et inchangé. Aucune `relectureDue` n'est due de ce chef.\n\n" +
  "RÉSERVE D'USAGE : la visite est initiée par l'administration, pas par l'exploitant. Une déclaration « en place » n'aurait pas de sens sur ces lignes ; ce qui se trace est la visite QUAND ELLE A EU LIEU.\n\n" +
  "NATURE : ÉCHÉANCE RÉCURRENTE (ADR-026). La visite revient.";

export const obligationsIncendie: Obligation[] = [
  // ---------------------------------------------------------------------------
  // Porteur : l'établissement (ADR-022)
  // ---------------------------------------------------------------------------
  {
    id: "incendie-erp-pe4-entretien-installations-techniques",
    domaine: "incendie",
    libelle:
      "Entretien et vérification de l'ensemble des installations techniques (ERP 5ᵉ catégorie)",
    description:
      "Tous les trois ans au plus, l'exploitant procède ou fait procéder, par des techniciens compétents, aux opérations d'entretien et de vérification de l'ensemble des installations et équipements techniques de son établissement. L'obligation porte sur l'ensemble, avec une liste que le texte laisse ouverte : elle est due même si aucun équipement n'est déclaré dans l'outil.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 4 § 2",
        article: "PE 4",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024760269",
        versionConstatee: "2026-07-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 2 § 3",
        article: "PE 2",
        url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374770",
        versionConstatee: "2026-01-01",
      },
      {
        // C'est ce texte qui donne son rythme à l'article : avant lui, PE 4 § 2
        // n'imposait aucune périodicité en exploitation. Le citer n'est pas
        // décoratif — sans lui, « tous les trois ans » ne serait porté par
        // rien. Repris des deux fragments absorbés (ADR-022), qui le citaient.
        source: "ARRETE",
        reference:
          "Arrêté du 1er décembre 2025 modifiant le règlement de sécurité ERP (applicable au 1er juillet 2026)",
        article: "Arrêté 2025-12-01",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053020948",
        versionConstatee: "2026-07-01",
      },
    ],
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    // L'INTERSECTION, pas l'union — corrigé le 2026-08-27 après relecture.
    //
    // La première rédaction unissait les réalisateurs des deux fragments
    // absorbés, au motif de « ne rien retirer à l'utilisateur ». Le
    // raisonnement était faux dans un sens : `realisateurs` est une liste
    // d'intervenants ACCEPTÉS, donc une union prend l'exigence la plus BASSE
    // de chaque branche. Le fragment gaz n'admettait que
    // `personne_qualifiee` ou `organisme_agree` — une personne seulement
    // « compétente » n'était pas acceptable pour une installation de gaz en
    // ERP. L'union l'autorisait, sur une ligne de criticité 5.
    //
    // Entre sur-exiger visiblement et sous-exiger en silence, le référentiel
    // choisit partout la première (cf. les sur-applications assumées de ce
    // fichier). Un exploitant d'ERP N5 dont l'installation électrique était
    // jusqu'ici vérifiable par une personne compétente devra donc une
    // personne qualifiée — c'est une exigence de plus, pas une protection en
    // moins, et elle est écrite ici plutôt que subie.
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    // 5, reprise de `cuisson-gaz-installations-triennale` : le tout absorbe
    // ses fragments, il doit donc en absorber la criticité la plus haute. La
    // rabaisser à 4 déclasserait dans le calendrier un contrôle d'installation
    // de gaz qui y figurait en tête.
    criticite: 5,
    transmet: [],
    // 5ᵉ catégorie SEULEMENT. `{ erp: true }` — la première rédaction — était
    // une sur-application : `evaluerErp` traite `true` comme « tout ERP » sans
    // regarder la catégorie, et un ERP de 2ᵉ catégorie recevait une ligne dont
    // le libellé dit « 5ᵉ catégorie ». PE 4 relève du Livre III, qui régit les
    // établissements du second groupe (PE 1 § 1) ; les quatre premières
    // catégories relèvent du Livre II et de ses propres articles de
    // vérification. Les deux fragments qui citent le même article portent la
    // même restriction (`electricite.ts`, `cuisson-hotte.ts`).
    typologies: { erp: { categories: ["N5"] } },
    porteur: "etablissement",
    equipementsEnContexte: [
      "INSTALLATION_ELECTRIQUE",
      "ALARME_INCENDIE",
      "DESENFUMAGE",
      "APPAREIL_CUISSON_ERP",
      "ASCENSEUR",
      "EXTINCTEUR",
      "RIA",
    ],
    notesInternes:
      "Porteur établissement (ADR-022) — c'est l'obligation qui a motivé le chantier.\n\nVersion relue sur Légifrance le 2026-08-27 : PE 4 est en vigueur dans sa rédaction du 2026-07-01 (arrêté du 1er décembre 2025). Le § 2 disait « En cours d'exploitation » ; il dit désormais « Tous les trois ans AU PLUS ». La périodicité triennale est donc écrite dans le texte, elle n'est plus déduite.\n\nChamp d'application, par renvoi : PE 2 § 3, dans sa version du 2026-01-01 (même arrêté), maintient « PE 4, PE 10 B, PE 24 § 1, PE 26 § 1 et PE 27 » pour les établissements recevant au plus 19 personnes. La rédaction antérieure ne maintenait que « PE 4 § 2 et § 3 ». Le champ s'est donc élargi, et l'argument tient a fortiori : l'obligation atteint les établissements qui ont le MOINS déclaré, ceux-là mêmes chez qui une décomposition par installation ne produirait aucune ligne.\n\n`equipementsEnContexte` n'est pas un déclencheur : ce sont les installations que le texte cite (« chauffage, éclairage, installations électriques, appareils de cuisson, circuits d'extraction, ascenseurs, moyens de secours »), affichées pour aider le dirigeant à voir ce qui est visé chez lui. Le texte finit par « etc. » — l'interface accompagne la liste de la mention « non limitative », et il ne faut pas la refermer.\n\nCe que cette ligne ne fait PAS : elle ne lève aucune des neuf sur-applications du Livre II — six ici, trois dans `electricite.ts`. Leurs notes annoncent « à reprendre lorsque le référentiel saura porter PE 4 § 2 » — le référentiel le sait désormais, mais savoir le porter n'est que la moitié de la condition. L'autre moitié est un point de droit, article par article : le Code du travail fonde-t-il chacune d'elles indépendamment du classement ERP ? Tant que cette relecture n'est pas faite sur Légifrance, retirer les lignes détruirait chez l'utilisateur des échéances dont on n'a pas établi qu'elles ne sont pas dues. Voir la note commune de ces neuf lignes.\n\nLe chapeau neuf de PE 4 (installations de gaz neuves ou modifiées, renvoi à PE 10 B, applicable au 2026-07-01) n'est pas encodé ici : c'est une vérification à la construction ou après travaux, pas une échéance récurrente. À instruire à part.",
  },
  // ---------------------------------------------------------------------------
  // Travail (Code du travail) — consignes, exercices, moyens de lutte
  // ---------------------------------------------------------------------------
  {
    id: "incendie-travail-moyens-lutte",
    domaine: "incendie",
    libelle: "Présence et maintien en état des moyens de lutte contre l'incendie (travail)",
    description:
      "Les établissements doivent être dotés de moyens de lutte contre l'incendie adaptés (extincteurs appropriés, RIA le cas échéant), maintenus en bon état et accessibles. La vérification annuelle des extincteurs est la règle de fait.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-28",
        article: "R. 4227-28",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532081/",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-29",
        article: "R. 4227-29",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489127/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "personne_competente"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["EXTINCTEUR"],
    notesInternes:
      "AMENDEMENT 2026-08-27, audit systématique des périodicités sans source porteuse. L'obligation affichait une échéance ANNUELLE en ne citant que R. 4227-28 et R. 4227-29. Section R. 4227-28 à R. 4227-41 relue à la source : AUCUN de ces articles ne fixe de périodicité annuelle, pour quoi que ce soit. La seule périodicité de toute la section est celle de R. 4227-39, « au moins tous les six mois », et elle porte sur les exercices et essais, pas sur les extincteurs. R. 4227-29 dit « maintenus en bon état de fonctionnement » — une obligation d'ÉTAT, sans rythme.\n\nLa vérification annuelle des extincteurs existe bien, mais elle vient de la norme NF S 61-919 et des contrats de maintenance, pas du Code du travail. Une norme n'est pas opposable par elle-même. C'est le même motif que la règle APSAD R4 retirée en août.\n\n`periodicite` passe à `autre` : l'obligation reste, parce que doter l'établissement de moyens de lutte et les maintenir en état est bien exigé, mais le produit cesse d'afficher une date que le droit ne donne pas. Les ERP ne perdent rien : `incendie-erp-extincteurs-annuelle` porte l'annuelle pour eux, fondée sur MS 73.\n\nNATURE : ÉTAT PERMANENT (ADR-026). C'est la lecture que l'amendement du 2026-08-27 avait faite du texte — « R. 4227-29 dit « maintenus en bon état de fonctionnement » — une obligation d'ÉTAT, sans rythme » — sans qu'aucun champ ne puisse la porter. Elle l'est désormais, et `periodicite: \"autre\"` cesse d'être le seul indice.",
  },
  {
    id: "incendie-travail-consigne-affichee",
    relectureDue: {
      le: "2027-01-01",
      motif:
        "R. 4227-37 porte une version future au 1er janvier 2027 (décret n° 2025-1100, art. 3), dans le cadre du transfert des dispositions « bâtiments à usage professionnel » vers le CCH. Le champ d'application de la consigne — et donc celui des exercices de R. 4227-39, qui en dépend par renvoi — peut en être modifié. Relire R. 4227-37, R. 4227-34, et les articles R. 144-16 et R. 144-17 créés à la même date.",
    },
    domaine: "incendie",
    libelle: "Consigne de sécurité incendie établie et affichée",
    description:
      "Dans les établissements mentionnés à l'article R. 4227-34 (plus de cinquante personnes occupées ou réunies habituellement, ou manipulation de matières visées par R. 4227-22, quel que soit l'effectif), une consigne de sécurité incendie est établie et affichée de manière très apparente : dans chaque local de plus de cinq personnes et dans les locaux à matières inflammables, sinon dans chaque local ou dégagement desservant un groupe de locaux. Elle indique le matériel d'extinction et de secours, les personnes chargées de l'activer, de diriger l'évacuation des travailleurs et du public, les mesures pour les personnes handicapées, les moyens d'alerte, les personnes chargées d'aviser les sapeurs-pompiers, l'adresse et le numéro du service de secours (R. 4227-38). Les autres établissements établissent de simples instructions d'évacuation.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-37",
        article: "R. 4227-37",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769379/",
        note: "« Dans les établissements mentionnés à l'article R. 4227-34, une consigne de sécurité incendie est établie et affichée de manière très apparente [...] » Verbatim relevé le 2026-08-31. L'article ne subordonne la consigne à AUCUN équipement : il ne nomme ni extincteur ni alarme. Son seul critère est le champ de R. 4227-34.",
        versionConstatee: "2011-11-10",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-38",
        article: "R. 4227-38",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769384/",
        note: "« La consigne de sécurité incendie indique : 1° Le matériel d'extinction et de secours qui se trouve dans le local ou à ses abords ; [...] 8° Le devoir, pour toute personne apercevant un début d'incendie, de donner l'alarme et de mettre en œuvre les moyens de premier secours, sans attendre l'arrivée des travailleurs spécialement désignés. » Verbatim relevé le 2026-09-01. C'est de cet article que la description tient ses huit points ; il n'ajoute ni champ ni périodicité, il donne le contenu de l'écrit que R. 4227-37 fait établir.",
        versionConstatee: "2011-11-10",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "consigne de sécurité incendie",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: { travail: true, personnesPresentesMin: 51, champR422734: true },
    equipementsEnContexte: ["EXTINCTEUR", "ALARME_INCENDIE"],
    notesInternes:
      "Amendement 2026-08-25 (relecture Légifrance R. 4227-34, -37, -38) : la consigne affichée n'est due que dans les établissements de R. 4227-34, par renvoi exprès de R. 4227-37 ; hors de ce champ le texte ne demande que des « instructions » d'évacuation. L'obligation était encodée sans seuil (sur-application à tout employeur) et sa description exigeait une « mise à jour à chaque changement notable » qui ne figure dans aucun des deux articles — retirée. La périodicité annuelle est une convention de rappel, aucun texte ne fixe de périodicité à la consigne. R. 4227-37 porte une version future au 01/01/2027 : à relire à cette date.\n\nAMENDEMENT 2026-08-27, même audit. L'obligation affichait une échéance ANNUELLE en ne citant que R. 4227-37, qui ne porte aucune périodicité — vérifié sur toute la section. Aucun texte n'impose de réafficher ou de réviser la consigne chaque année.\n\n`periodicite` passe à `autre`. L'affichage de la consigne est une obligation PERMANENTE, pas une échéance : elle est due tant que l'établissement entre dans le champ de R. 4227-34, et elle se met à jour quand l'organisation change — pas à date fixe. Ce qui est bien périodique, dans la même sous-section, ce sont les exercices et essais semestriels de R. 4227-39, portés par `incendie-travail-exercice-semestriel`.\n\nAMENDEMENT 2026-08-31, lot « faux négatifs d'ancrage ». `categoriesEquipement: [EXTINCTEUR, ALARME_INCENDIE]` est retiré au profit du porteur établissement (ADR-022). R. 4227-37 relu au verbatim ce jour : il ne mentionne aucun équipement. Le champ de l'obligation est celui de R. 4227-34, et il est DÉJÀ encodé — `personnesPresentesMin: 51` et `champR422734`. La liste d'équipements ne restreignait donc rien de ce que le texte restreint : elle ajoutait une condition que le texte n'écrit pas, et qui produisait un faux négatif chez tout établissement du champ de R. 4227-34 n'ayant déclaré ni extincteur ni alarme. Les deux catégories passent en `equipementsEnContexte`, à titre indicatif — c'est bien le matériel que la consigne doit désigner (R. 4227-38 1°), mais le désigner n'est pas en avoir déclaré un dans l'outil.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue: \"consigne de sécurité incendie\"` (ADR-026). R. 4227-37 fait ÉTABLIR la consigne avant de la faire afficher : c'est un écrit, et son contenu est fixé par R. 4227-38. Deux affichages voisins n'en sont pas — l'affichage des coordonnées (D. 4711-1) et l'avis d'accès au DUERP (R. 4121-4) portent `pieceAttendue: null`, parce que ce que le texte exige y est l'affichage lui-même, pas la détention d'une pièce.\n\nAMENDEMENT 2026-09-01, lot « traçabilité ». `R. 4227-38` était nommé dans la prose de `reference` (« R. 4227-37 et R. 4227-38 ») et dans la description, mais la clé `article` ne désignait que le 37 : l'article était donc irrattachable au corpus, où il n'existait pas. Ouvert à la source ce jour (LEGIARTI000024769384, version en vigueur depuis le 10 novembre 2011, sans terme programmé — contrairement à R. 4227-37 qui, lui, s'arrête au 1er janvier 2027). Il entre au corpus avec son verbatim intégral et devient une `ReferenceLegale` à part entière ; `reference` se réduit à « R. 4227-37 » pour le premier élément, qui reste l'article fondateur. Aucun champ d'empreinte n'est touché : `referencesLegales` en est hors, et R. 4227-38 ne porte ni champ d'application ni périodicité propres.",
  },
  {
    id: "incendie-travail-exercice-semestriel",
    relectureDue: {
      le: "2027-01-01",
      motif:
        "Cette obligation ne porte pas son champ : elle le tient de la consigne de R. 4227-37, qui le tient lui-même de R. 4227-34. Or R. 4227-37 affiche « Version en vigueur du 10/11/2011 au 01/01/2027 » — son terme emporte donc le champ des exercices. Relire R. 4227-37 dans sa version au 1er janvier 2027, puis vérifier si `personnesPresentesMin: 51` et `champR422734` restent la bonne traduction. Relire aussi R. 4227-2, second article du chapitre VII à porter un terme à cette date, et absent du référentiel.",
    },
    domaine: "incendie",
    libelle: "Essais du matériel et exercices d'évacuation semestriels",
    description:
      "Dans les établissements mentionnés à l'article R. 4227-34 — plus de cinquante personnes occupées ou réunies habituellement (public compris), ou manipulation et mise en œuvre de matières visées par R. 4227-22 quel que soit l'effectif —, la consigne de sécurité incendie prévoit des essais et visites périodiques du matériel et des exercices au cours desquels les travailleurs apprennent à reconnaître le signal sonore d'alarme générale, à localiser et utiliser les espaces d'attente sécurisés, à se servir des moyens de premier secours et à exécuter les manœuvres nécessaires. Ces exercices et essais ont lieu au moins tous les six mois ; leur date et leurs observations sont consignées sur un registre tenu à la disposition de l'inspection du travail.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-39",
        article: "R. 4227-39",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769386/",
        note: "« La consigne de sécurité incendie prévoit des essais et visites périodiques du matériel et des exercices [...] Ces exercices et essais périodiques ont lieu au moins tous les six mois. Leur date et les observations auxquelles ils peuvent avoir donné lieu sont consignées sur un registre tenu à la disposition de l'inspection du travail. » Verbatim relevé le 2026-08-31. Aucun équipement n'y conditionne l'exercice.",
        versionConstatee: "2011-11-10",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-34",
        article: "R. 4227-34",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532067/",
        note: "Article qui pose le seuil : « Les établissements dans lesquels peuvent se trouver occupées ou réunies habituellement plus de cinquante personnes, ainsi que ceux, quelle que soit leur importance, où sont manipulées et mises en œuvre des matières inflammables mentionnées à l'article R. 4227-22 SONT ÉQUIPÉS d'un système d'alarme sonore. » Verbatim relevé le 2026-08-31. Le point décisif pour l'ancrage : cet article IMPOSE l'alarme aux établissements de son champ. L'alarme est donc l'objet d'une obligation qui découle du champ, jamais le critère qui y fait entrer.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: "registre des exercices et essais",
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [
      {
        vers: "modele_absent",
        modele: "ExerciceSecurite",
        motif:
          "R. 4227-39 impose que la date et les observations des exercices soient consignées sur un registre. Le produit ouvre bien l'échéance, mais ne sait la solder que par un dépôt de fichier — là où le texte attend un formulaire. Manque recensé priorité 1 par docs/registre-securite-ecart.md § 3.2.",
      },
    ],
    porteur: "etablissement",
    typologies: { travail: true, personnesPresentesMin: 51, champR422734: true },
    equipementsEnContexte: ["ALARME_INCENDIE"],
    notesInternes:
      "Seuil encodé (amendement 2026-08) : sans seuil, la règle s'appliquait à un salon de coiffure de deux personnes alors que sa propre description citait un seuil. « Plus de cinquante » ⇒ 51, bornes incluses.\n\nAmendement 2026-08-25 (relecture Légifrance R. 4227-22, -34, -37, -39) : le champ de R. 4227-39 est celui de R. 4227-34 par double renvoi (39 → consigne 37 → établissements 34). Il est disjonctif — « plus de cinquante personnes […] ainsi que ceux, quelle que soit leur importance, où sont manipulées et mises en œuvre des matières inflammables mentionnées à l'article R. 4227-22 » — et compte les personnes « occupées ou réunies », public compris (R. 4227-38 3° distingue « les travailleurs et le public »). `effectifMin: 51` (salariés seuls) est remplacé par `personnesPresentesMin: 51` (personnes présentes, repli sur l'effectif salarié si non déclaré) et `champR422734: true` (branche matières R. 4227-22, déclarée par le dirigeant). Le déclencheur ALARME_INCENDIE reste une heuristique : l'alarme est une conséquence de R. 4227-34, pas sa condition.\n\nAMENDEMENT 2026-08-31, lot « faux négatifs d'ancrage ». La phrase ci-dessus avait raison et n'avait pas été suivie d'effet : le déclencheur ALARME_INCENDIE est retiré, l'obligation passe au porteur établissement (ADR-022). R. 4227-34 relu au verbatim ce jour, et il tranche seul : les établissements de son champ « SONT ÉQUIPÉS d'un système d'alarme sonore ». L'alarme y est le CONTENU d'une obligation, pas la condition d'une autre. Ancrer l'exercice semestriel dessus revenait à ne l'exiger que de ceux qui avaient déjà obéi — et à laisser sans aucune ligne d'exercice l'établissement de plus de cinquante personnes qui n'a rien déclaré, c'est-à-dire précisément celui qui est en défaut. C'est le faux négatif le plus lourd du lot : criticité 4, échéance semestrielle réelle, et zéro ligne affichée.\n\nCe qui NE change pas : le champ. `personnesPresentesMin: 51` et `champR422734` restent la seule restriction, et ils portent le double renvoi 39 → 37 → 34. Le salon de coiffure de deux personnes ne reçoit toujours rien. ALARME_INCENDIE passe en `equipementsEnContexte`.",
  },
  {
    id: "incendie-registre-securite",
    domaine: "incendie",
    libelle: "Tenue du registre de sécurité",
    description:
      "En établissement recevant du public, le registre de sécurité porte les renseignements indispensables à la bonne marche du service de sécurité et comprend, outre les pièces attendues aux articles R. 141-10 et R. 141-11 : les dates des travaux d'aménagement et de transformation, leur nature et les noms des entrepreneurs ; l'état nominatif et hiérarchique des personnes appartenant au service de sécurité ; les diverses consignes établies en cas d'incendie, y compris les consignes d'évacuation prenant en compte les différents types de handicap ; les dates des divers contrôles et vérifications ainsi que les observations auxquelles ceux-ci ont donné lieu ; les dates des exercices de sécurité incendie. Côté Code du travail, la date des essais et exercices périodiques et les observations auxquelles ils ont donné lieu sont consignées sur un registre tenu à la disposition de l'inspection du travail.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-39",
        article: "R. 4227-39",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769386",
        note: "Consignation sur registre des essais et exercices périodiques, avec leur date et les observations auxquelles ils ont donné lieu.",
        versionConstatee: "2011-11-10",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "L. 4711-1 — mentions obligatoires des pièces de vérification",
        article: "L. 4711-1",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178110/",
        note: "« Les attestations, consignes, résultats et rapports relatifs aux vérifications et contrôles mis à la charge de l'employeur au titre de la santé et de la sécurité au travail comportent des mentions obligatoires déterminées par voie réglementaire. » Verbatim relevé le 2026-08-31. Aucune condition d'effectif, d'équipement ni de classement ERP : c'est l'un des deux articles qui fondent réellement la branche `travail: true`.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "L. 4711-2 — conservation des observations de l'inspection",
        article: "L. 4711-2",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178110/",
        note: "« Les observations et mises en demeure notifiées par l'inspection du travail en matière de santé et de sécurité, de médecine du travail et de prévention des risques sont conservées par l'employeur. » Verbatim relevé le 2026-08-31. Second fondement de la branche `travail: true`, sans condition d'effectif ni d'équipement.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "D. 4711-2 — datation et identité du vérificateur",
        article: "D. 4711-2",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018493740/",
        note: "« [Les pièces] sont datés. Ils mentionnent l'identité de la personne ou de l'organisme chargé du contrôle ou de la vérification ainsi que celle de la personne qui a réalisé le contrôle ou la vérification. » Verbatim relevé le 2026-08-31. Ce sont les « mentions obligatoires » que L. 4711-1 renvoie au pouvoir réglementaire.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "D. 4711-3 — conservation cinq ans",
        article: "D. 4711-3",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020398142/",
        note: "« Sauf dispositions particulières, l'employeur conserve les documents concernant les observations et mises en demeure de l'inspection du travail ainsi que ceux concernant les vérifications et contrôles [...] des cinq dernières années et, en tout état de cause, ceux des deux derniers contrôles ou vérifications. Il conserve, pendant la même durée, les copies des déclarations d'accidents du travail déclarés à la caisse primaire d'assurance maladie. » Verbatim intégral relevé le 2026-09-01, en remplacement d'un relevé du 2026-08-31 qui amputait l'ouverture et le second alinéa, et qui datait l'article de 2008-05-01 au lieu du 16/03/2009. Cette durée n'est portée par aucun champ du référentiel — voir la réserve inscrite sur cet article au corpus.",
        versionConstatee: "2009-03-16",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "L. 4711-5 — faculté de regroupement, PAS un fondement",
        article: "L. 4711-5",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903389/",
        note: "« [...] l'employeur EST AUTORISÉ À réunir ces informations dans un registre unique dès lors que cette mesure est de nature à faciliter la conservation et la consultation de ces informations. » Verbatim relevé le 2026-08-31. Le verbe est une AUTORISATION, pas une prescription : cet article ne fonde aucune obligation, il en assouplit la forme. Cité pour cela, et parce qu'il était jusqu'ici la seule référence Code du travail à porter la branche `travail: true` — ce qui faisait reposer une obligation sur une faculté.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CCH",
        reference: "CCH, art. R. 143-44 (ex R. 123-51) — ERP",
        article: "CCH R. 143-44",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819037/",
        note: "Version en vigueur depuis le 1er juillet 2026 (décret n° 2025-1100 du 19 novembre 2025) : ajout du 5° sur les dates des exercices de sécurité incendie, et renvoi aux articles R. 141-10 et R. 141-11. Vise « les établissements soumis aux prescriptions du présent chapitre » — tous les ERP, 5e catégorie comprise.",
        versionConstatee: "2026-07-01",
      },
      {
        source: "CCH",
        reference: "CCH, art. R. 141-10 — contenu du registre",
        article: "CCH R. 141-10",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818891/",
        note: "Créé au 1er juillet 2026. Le registre « comprend en particulier les vérifications réalisées, les mesures de correction des écarts constatés ainsi que les diverses consignes établies en cas d'incendie, y compris concernant l'évacuation et la mise en sécurité des personnes ».",
        versionConstatee: "2026-07-01",
      },
      {
        source: "CCH",
        reference: "CCH, art. R. 141-11 — solutions d'effet équivalent",
        article: "CCH R. 141-11",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818891/",
        note: "Créé au 1er juillet 2026. Les éléments identifiant une solution d'effet équivalent sont annexés au registre. Sans objet pour un établissement qui n'en met aucune en œuvre.",
        versionConstatee: "2026-07-01",
      },
      {
        source: "CCH",
        reference: "CCH, art. R. 146-35 (ex R. 122-29) — IGH",
        article: "CCH R. 146-35",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819153",
        versionConstatee: "2026-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "registre de sécurité",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: { travail: true, erp: true },
    equipementsEnContexte: ["EXTINCTEUR", "ALARME_INCENDIE"],
    notesInternes:
      "Obligation permanente (pas d'échéance périodique). Modélisée sur travail=true en MVP : en pratique tout établissement du scope V2 emploie au moins un salarié (L. 4711-5 CT). Les références CCH R. 143-44 (ERP) et R. 146-35 (IGH) restent citées pour information. Corrigé à l'audit 2026-08 : R. 146-21 était cité à tort — cet article traite du silence de l'administration sur une demande d'agrément et a été abrogé par le décret 2025-1100 ; le registre de sécurité IGH est à R. 146-35.\n\nLIMITE CONNUE, NON CORRIGÉE ICI — restaurée le 2026-08-27. Cette note a été écrite le 2026-08-26 (commit 7736869) et perdue : un rebase a laissé ce commit derrière, et sa rapatriation partielle n'en a rien repris ici. Elle disait, et c'était juste : `categoriesEquipement` ancre cette obligation à un extincteur ou une alarme DÉCLARÉS. Un établissement qui n'a déclaré ni l'un ni l'autre ne reçoit AUCUNE ligne « tenue du registre », alors que le registre est dû sans condition d'équipement. Même cause pour `incendie-travail-exercice-semestriel`, ancrée sur ALARME_INCENDIE.\n\nCe qui a changé depuis : la note concluait que corriger ce faux négatif « suppose de rendre le calendrier capable de porter une obligation sans équipement — décision de schéma, à instruire séparément ». C'est fait (ADR-022). Le modèle ne bloque plus ; ces deux obligations peuvent passer au porteur établissement. Elles ne l'ont PAS été dans ce lot, tenu aux deux articles dont le verbatim était relevé en première main (PE 4 § 2, R. 4222-20). C'est le lot suivant, et il est court.\n\nAUTRE PERTE DU MÊME REBASE, non réparée ici et signalée pour qu'elle ne se reperde pas : le commit 7736869 portait aussi trois corrections réglementaires à cette obligation, relevées sur Légifrance le 2026-08-26. (1) R. 143-44 a été RÉÉCRIT au 1er juillet 2026 par le décret n° 2025-1100 ; la description ci-dessus reprend la version antérieure et ignore le 5° (dates des exercices de sécurité incendie) ainsi que le renvoi aux articles R. 141-10 et R. 141-11. (2) `typologies` devait gagner `erp: true` : R. 143-44 fonde le registre en ERP par lui-même, indépendamment de la qualité d'employeur. (3) R. 146-35 (IGH) reste cité sans `igh: true` parce que l'IGH est hors périmètre, non parce que la référence serait décorative. Réparer ces trois points modifie le champ d'application d'une obligation en production : c'est une relecture réglementaire, pas un effet de bord du chantier du porteur.\n\nAMENDEMENT 2026-08-31, lot « faux négatifs d'ancrage ». C'est le lot annoncé ci-dessus, et il fait deux choses.\n\n(A) LE PORTEUR. `categoriesEquipement: [EXTINCTEUR, ALARME_INCENDIE]` est retiré, `porteur: etablissement`. R. 143-44 relu au verbatim le 2026-08-31 dans sa version en vigueur depuis le 2026-07-01 : « DANS LES ÉTABLISSEMENTS SOUMIS AUX PRESCRIPTIONS DU PRÉSENT CHAPITRE, il doit être tenu un registre de sécurité [...] » Le champ est le chapitre ERP tout entier, 5ᵉ catégorie comprise ; l'article ne nomme aucun équipement. Côté travail, L. 4711-1 et L. 4711-2 relus le même jour ne posent pas davantage de condition d'équipement. Les deux catégories passent en `equipementsEnContexte`.\n\n(B) LA BRANCHE TRAVAIL REPOSAIT SUR UNE FACULTÉ. Constat non prévu par le brief de ce lot, et c'est le plus gênant des deux. Les seules références Code du travail portées ici étaient R. 4227-39 — dont le champ est celui de R. 4227-34, donc PAS tout employeur — et L. 4711-5, qui dispose que « l'employeur EST AUTORISÉ À réunir ces informations dans un registre unique ». Une autorisation ne fonde rien. `travail: true` s'appliquait donc à tout employeur sans qu'aucune des références citées ne l'établisse pour lui. L. 4711-1, L. 4711-2, D. 4711-2 et D. 4711-3 sont ajoutés : ce sont eux qui obligent tout employeur, sans seuil, à tenir datées et à conserver cinq ans les pièces des vérifications. La typologie ne bouge pas ; ce qui la fonde est désormais écrit. L. 4711-5 reste cité, requalifié en toutes lettres.\n\nCE QUI ÉTAIT DÉJÀ RÉPARÉ, contrairement à ce que la note ci-dessus annonce. Les points (1) et (2) de la « autre perte du même rebase » ont été traités avant ce lot : la description porte bien le 5° et le renvoi à R. 141-10 / R. 141-11, et `typologies` porte bien `erp: true`. Vérifié ligne à ligne contre le verbatim du 2026-08-31. Le point (3) tient toujours : R. 146-35 reste cité sans `igh: true` parce que l'IGH est hors périmètre. La note qui les annonçait comme non réparés est restée en place après leur correction — c'est elle qui m'a fait ouvrir R. 143-44, ce qui est le comportement voulu, mais une note qui décrit un état révolu finit par faire refaire le travail.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue: \"registre de sécurité\"` (ADR-026). Un registre tenu, pas un acte à refaire.",
  },

  // ---------------------------------------------------------------------------
  // Travail — Éclairage de sécurité (R. 4227-14 CT / arrêté du 14 déc. 2011)
  //
  // Les deux obligations qui suivent sont les deux fréquences distinctes que
  // pose l'article 11 de l'arrêté : un essai de fonctionnement mensuel et une
  // vérification semestrielle de l'autonomie. Elles ne sont PAS absorbées par
  // la vérification périodique annuelle des installations électriques
  // (R. 4226-16 CT / arrêté du 26 décembre 2011) : l'article 11 les rattache
  // expressément à la *maintenance* de l'article R. 4226-7, acte distinct de
  // la vérification périodique, et les fait porter par l'employeur lui-même.
  // Seul le registre est commun (R. 4226-19).
  // ---------------------------------------------------------------------------
  {
    id: "incendie-travail-eclairage-securite-essai-mensuel",
    domaine: "incendie",
    libelle: "Essai mensuel de l'éclairage de sécurité (lieu de travail)",
    description:
      "Une fois par mois, l'employeur vérifie le passage à la position de fonctionnement en cas de défaillance de l'alimentation normale et l'allumage de toutes les lampes, ainsi que l'efficacité de la commande de mise en position de repos à distance et de la remise automatique en position de veille au retour de l'alimentation normale. Le résultat est porté au registre. Sur une installation constituée de blocs autonomes à système automatique de test intégré (SATI), ces opérations peuvent être effectuées automatiquement.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 14 décembre 2011, art. 11",
        article: "Arrêté 2011-12-14 art. 11",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025072657",
        note: "« Dans le cadre de la maintenance prescrite à l'article R. 4226-7 du code du travail, l'employeur procède aux vérifications de fonctionnement périodiques suivantes : Une fois par mois : a) Du passage à la position de fonctionnement en cas de défaillance de l'alimentation normale et de l'allumage de toutes les lampes […] ; b) De l'efficacité de la commande de mise en position de repos à distance et de la remise automatique en position de veille au retour de l'alimentation normale. »",
        versionConstatee: "2011-12-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-14",
        article: "R. 4227-14",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022764985",
        note: "Fonde l'obligation d'éclairage de sécurité en lieu de travail et renvoie à un arrêté le soin de fixer « les conditions d'exploitation et de maintenance de cet éclairage ». Ne fixe lui-même aucune périodicité : c'est l'arrêté du 14 décembre 2011 qui la pose.",
        versionConstatee: "2011-07-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4226-19",
        article: "R. 4226-19",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765064/",
        note: "Support de consignation, pas fondement de la périodicité — et la distinction a été instruite. R. 4226-19 institue le registre des SEULES vérifications électriques de R. 4226-14 et R. 4226-16 : il ne fonde rien en éclairage de sécurité. Mais l'article 11 de l'arrêté le désigne nommément pour y porter ce résultat-ci — « Le résultat des opérations précédentes doit être mentionné sur le registre prévu à l'article R. 4226-19 du code du travail. » —, cohérent avec sa première phrase qui place ces vérifications « dans le cadre de la maintenance prescrite à l'article R. 4226-7 ». Le relevé du 2026-09-01 avait conclu que la citation était fautive en lisant R. 4226-19 sans remonter qui le cite ; vérifié à la source le même jour, elle ne l'est pas.",
        versionConstatee: "2011-07-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 14 décembre 2011, art. 1er",
        article: "Arrêté 2011-12-14 art. 1",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025072663",
        note: "Fonde le `erp: false` : « Dans les établissements recevant du public, pour les locaux dont la fonction essentielle est de recevoir du public et pour les dégagements accessibles au public, les dispositions du règlement de sécurité relatif à de tels établissements sont seules applicables à l'éclairage de sécurité de ces locaux ou dégagements. » Texte relu le 23 août 2026.",
        versionConstatee: "2011-12-31",
      },
    ],
    periodicite: "mensuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true, erp: false },
    categoriesEquipement: ["BAES"],
    notesInternes:
      "Ajoutée 2026-08 : le pré-remplissage suggérait un BAES à tout bureau tertiaire alors que la seule obligation visant la catégorie BAES était `incendie-erp-baes-annuelle` (erp: true). Un employeur non-ERP déclarait donc l'équipement que l'outil venait de lui conseiller et n'obtenait aucune échéance. `erp: false` **est** une lecture du texte, et non un choix de modélisation comme cette note l'a d'abord affirmé : l'article 1er, alinéa 2, de l'arrêté dit que « dans les établissements recevant du public, pour les locaux dont la fonction essentielle est de recevoir du public et pour les dégagements accessibles au public, les dispositions du règlement de sécurité relatif à de tels établissements sont seules applicables ». Le pendant ERP existe désormais, adossé à EC 14 § 3 (`incendie-erp-eclairage-securite-essai-mensuel` et `-autonomie-semestrielle`) : il porte les mêmes deux fréquences, la note qui parlait d'un « relais » par la seule vérification annuelle était fausse. Deux limites assumées. D'abord, les locaux d'un ERP non accessibles au public (réserves, bureaux) relèvent bien de l'arrêté du 14 décembre 2011, ce que le modèle — qui raisonne par établissement et non par local — ne sait pas exprimer ; les fréquences étant désormais identiques des deux côtés, l'écart est sans effet sur le calendrier. Ensuite, l'alinéa 3 du même article soumet les cantines, restaurants et salles de réunion à la réglementation ERP « lorsque celle-ci s'avère plus contraignante » : une règle comparative, local par local, hors de portée du modèle. Enfin l'exception SATI de l'article 11 n'est pas encodée en condition : aucune propriété d'équipement ne porte encore la question.",
  },
  {
    id: "incendie-travail-eclairage-securite-autonomie-semestrielle",
    domaine: "incendie",
    libelle: "Vérification semestrielle de l'autonomie de l'éclairage de sécurité (lieu de travail)",
    description:
      "Une fois tous les six mois, l'employeur vérifie l'autonomie d'au moins une heure de l'éclairage de sécurité. Dans les établissements comportant des périodes de fermeture, l'opération est conduite de telle manière qu'au début de chaque période d'ouverture l'installation ait retrouvé l'autonomie prescrite. Le résultat est porté au registre.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 14 décembre 2011, art. 11",
        article: "Arrêté 2011-12-14 art. 11",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025072657",
        note: "« Une fois tous les six mois, de l'autonomie d'au moins une heure. Dans les établissements comportant des périodes de fermeture, ces opérations doivent être effectuées de telle manière qu'au début de chaque période d'ouverture l'installation d'éclairage ait retrouvé l'autonomie prescrite. »",
        versionConstatee: "2011-12-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-14",
        article: "R. 4227-14",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022764985",
        note: "Fonde l'obligation d'éclairage de sécurité en lieu de travail et renvoie à un arrêté le soin de fixer « les conditions d'exploitation et de maintenance de cet éclairage ». Ne fixe lui-même aucune périodicité : c'est l'arrêté du 14 décembre 2011 qui la pose.",
        versionConstatee: "2011-07-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4226-19",
        article: "R. 4226-19",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765064/",
        note: "Support de consignation, pas fondement de la périodicité — et la distinction a été instruite. R. 4226-19 institue le registre des SEULES vérifications électriques de R. 4226-14 et R. 4226-16 : il ne fonde rien en éclairage de sécurité. Mais l'article 11 de l'arrêté le désigne nommément pour y porter ce résultat-ci — « Le résultat des opérations précédentes doit être mentionné sur le registre prévu à l'article R. 4226-19 du code du travail. » —, cohérent avec sa première phrase qui place ces vérifications « dans le cadre de la maintenance prescrite à l'article R. 4226-7 ». Le relevé du 2026-09-01 avait conclu que la citation était fautive en lisant R. 4226-19 sans remonter qui le cite ; vérifié à la source le même jour, elle ne l'est pas.",
        versionConstatee: "2011-07-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 14 décembre 2011, art. 1er",
        article: "Arrêté 2011-12-14 art. 1",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025072663",
        note: "Fonde le `erp: false` : « Dans les établissements recevant du public, pour les locaux dont la fonction essentielle est de recevoir du public et pour les dégagements accessibles au public, les dispositions du règlement de sécurité relatif à de tels établissements sont seules applicables à l'éclairage de sécurité de ces locaux ou dégagements. » Texte relu le 23 août 2026.",
        versionConstatee: "2011-12-31",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: false },
    categoriesEquipement: ["BAES"],
    notesInternes:
      "Même fondement et même choix de typologie que `incendie-travail-eclairage-securite-essai-mensuel` : voir ses notes internes. Les deux périodicités de l'article 11 sont scindées en deux obligations parce que le modèle ne porte qu'une périodicité par obligation, et parce qu'il s'agit bien de deux actes distincts (contrôle visuel d'allumage / décharge complète sur batterie).",
  },

  // ---------------------------------------------------------------------------
  // ERP — Éclairage de sécurité : ce que l'exploitant s'assure lui-même
  //
  // Symétriques exactes des deux obligations « travail » ci-dessus, et pour
  // cause : l'arrêté du 25 juin 1980 impose à l'exploitant d'ERP les mêmes
  // deux fréquences que l'arrêté du 14 décembre 2011 impose à l'employeur —
  // un essai mensuel, un contrôle semestriel de l'autonomie.
  //
  // Elles manquaient. L'article 1er de l'arrêté de 2011 réserve les parties
  // publiques d'un ERP au seul règlement de sécurité ERP, ce que le
  // référentiel traduit par `erp: false` sur les deux obligations « travail ».
  // Faute d'équivalent ERP, un restaurant ou un commerce — les deux secteurs
  // que ce produit vise — ne recevait qu'une ligne annuelle : quatorze actes
  // par an remplacés par un seul.
  //
  // Aucun risque de double compte : `erp: false` est une exclusion en ET
  // (cf. `matchTypologie`), donc un établissement ERP ne peut pas prendre les
  // deux jeux. La partition est exacte — ERP d'un côté, employeur non-ERP de
  // l'autre.
  // ---------------------------------------------------------------------------
  {
    id: "incendie-erp-eclairage-securite-essai-mensuel",
    domaine: "incendie",
    libelle: "Essai mensuel de l'éclairage de sécurité (ERP)",
    description:
      "Une fois par mois, l'exploitant s'assure du passage à la position de fonctionnement en cas de défaillance de l'alimentation normale et de l'allumage de toutes les lampes, ainsi que de l'efficacité de la commande de mise en position de repos à distance et de la remise automatique en position de veille au retour de l'alimentation normale. Le résultat est consigné au registre de sécurité. Sur une installation constituée de blocs autonomes à système automatique de test intégré (SATI), ces opérations peuvent être effectuées automatiquement.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EC 14 § 3",
        article: "EC 14",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021838315",
        note: "« L'exploitant s'assure périodiquement : — une fois par mois : — du passage à la position de fonctionnement en cas de défaillance de l'alimentation normale et à la vérification de l'allumage de toutes les lampes (le fonctionnement doit être strictement limité au temps nécessaire au contrôle visuel) ; — de l'efficacité de la commande de mise en position de repos à distance et de la remise automatique en position de veille au retour de l'alimentation normale. — une fois tous les six mois, de l'autonomie d'au moins 1 heure. » Version en vigueur depuis le 16 mai 2010, modifiée par l'arrêté du 11 décembre 2009. Texte relu le 23 août 2026.",
        versionConstatee: "2010-05-16",
      },
    ],
    periodicite: "mensuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["BAES"],
    notesInternes:
      "Ajoutée 2026-08 après lecture du texte : EC 14 § 3 impose à l'exploitant d'ERP exactement les deux fréquences de l'article 11 de l'arrêté du 14 décembre 2011. La note de `incendie-travail-eclairage-securite-essai-mensuel` affirmait que `incendie-erp-baes-annuelle` « prenait le relais » — un relais qui remplaçait quatorze actes annuels par un seul. L'exception SATI (NF C 71-820, mai 1999) n'est pas encodée en condition : aucune propriété d'équipement ne porte encore la question, ici comme du côté travail.\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.",
  },
  {
    id: "incendie-erp-eclairage-securite-autonomie-semestrielle",
    domaine: "incendie",
    libelle: "Vérification semestrielle de l'autonomie de l'éclairage de sécurité (ERP)",
    description:
      "Une fois tous les six mois, l'exploitant s'assure de l'autonomie d'au moins une heure de l'éclairage de sécurité. Dans les établissements comportant des périodes de fermeture, l'opération est conduite de telle manière qu'au début de chaque période d'ouverture au public l'installation ait retrouvé l'autonomie prescrite. Le résultat est consigné au registre de sécurité.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EC 14 § 3",
        article: "EC 14",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021838315",
        note: "« L'exploitant s'assure périodiquement : — une fois par mois : — du passage à la position de fonctionnement en cas de défaillance de l'alimentation normale et à la vérification de l'allumage de toutes les lampes (le fonctionnement doit être strictement limité au temps nécessaire au contrôle visuel) ; — de l'efficacité de la commande de mise en position de repos à distance et de la remise automatique en position de veille au retour de l'alimentation normale. — une fois tous les six mois, de l'autonomie d'au moins 1 heure. » Version en vigueur depuis le 16 mai 2010, modifiée par l'arrêté du 11 décembre 2009. Texte relu le 23 août 2026.",
        versionConstatee: "2010-05-16",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["BAES"],
    notesInternes:
      "Même fondement et même partition que `incendie-erp-eclairage-securite-essai-mensuel` : voir ses notes internes. Les deux périodicités d'EC 14 § 3 sont scindées en deux obligations pour la même raison que du côté travail — le modèle ne porte qu'une périodicité par obligation, et il s'agit de deux actes distincts (contrôle visuel d'allumage / décharge complète sur batterie).\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.",
  },

  // ---------------------------------------------------------------------------
  // ERP — Moyens de secours (MS)
  // ---------------------------------------------------------------------------
  {
    id: "incendie-erp-extincteurs-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des extincteurs (ERP)",
    description:
      "Un extincteur fait l'objet d'une vérification annuelle et d'une révision tous les dix ans, par une personne ou un organisme compétent. L'appareil porte une étiquette identifiable apposée par le vérificateur, indiquant l'année et le mois des vérifications. Un plan d'implantation des extincteurs et un relevé des vérifications sont portés au registre de sécurité.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 38 § 4",
        article: "MS 38",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020317639/",
        note: "« Un extincteur doit faire l'objet d'une vérification annuelle et d'une révision tous les dix ans par une personne ou un organisme compétent. Il doit être marqué d'une étiquette clairement identifiable apposée par la personne ou l'organisme ayant réalisé cette dernière. Les années et les mois des vérifications doivent apparaître sur l'étiquette. Un plan d'implantation des extincteurs et un relevé des vérifications doivent être portés au registre de sécurité. » Le § 2 traite du marquage de l'appareil, pas de sa vérification : il était cité à tort.",
        versionConstatee: "2008-10-08",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 73 § 2",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317755/",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["EXTINCTEUR"],
    notesInternes:
      "Sur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur."
  },
  {
    id: "incendie-erp-ssi-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des systèmes de sécurité incendie (SSI) en ERP",
    description:
      "Les systèmes de sécurité incendie, notamment les SSI de catégorie A et B (détection, alarme, compartimentage, désenfumage), font l'objet d'un contrôle annuel par un technicien compétent.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification annuelle)",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317755/",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["ALARME_INCENDIE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait un « arrêté du 2 mai 2005 (SSI) » ; ce texte régit le personnel SSIAP, pas les systèmes de sécurité incendie. Référence retirée.\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.",
  },
  {
    id: "incendie-erp-extincteurs-revision-decennale",
    domaine: "incendie",
    libelle: "Révision décennale des extincteurs (ERP)",
    description:
      "Outre sa vérification annuelle, un extincteur fait l'objet d'une révision tous les dix ans par une personne ou un organisme compétent. L'appareil porte une étiquette clairement identifiable apposée par celui qui a réalisé cette révision, et les années et les mois des vérifications doivent apparaître sur l'étiquette.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 38 § 4 (révision décennale)",
        article: "MS 38",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020317639/",
        note: "« Un extincteur doit faire l'objet d'une vérification annuelle et d'une révision tous les dix ans par une personne ou un organisme compétent. Il doit être marqué d'une étiquette clairement identifiable apposée par la personne ou l'organisme ayant réalisé CETTE DERNIÈRE. » Article rouvert à la source le 2026-09-01 avant l'encodage, version en vigueur du 08/10/2008 : le § 4 porte DEUX rythmes dans une seule phrase, et l'étiquette se rattache grammaticalement à la révision — « cette dernière » —, pas à la vérification annuelle.",
        versionConstatee: "2008-10-08",
      },
    ],
    periodicite: "decennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["EXTINCTEUR"],
    notesInternes:
      "AJOUTÉE LE 2026-09-01 (lot C). Le § 4 de MS 38 porte deux rythmes — « une vérification annuelle ET une révision tous les dix ans » — et le référentiel n'en portait qu'un : `incendie-erp-extincteurs-annuelle` prend l'annuelle, sa description NOMMAIT la décennale, et aucune échéance ne la datait. Le corpus le déclarait en réserve depuis le relevé du même jour.\n\nPOURQUOI UNE LIGNE À PART ET NON UN CHAMP SUR L'AUTRE. Ce sont deux actes, à deux dates, avec deux preuves : la vérification annuelle laisse une ligne sur l'étiquette, la révision décennale est un démontage de l'appareil, et un extincteur qui l'a subie porte une étiquette apposée par celui qui l'a faite. Le modèle n'a d'ailleurs aucun moyen de porter deux rythmes sur une obligation — c'est la limite que le cadrage du 2026-09-01 nomme en section B, et elle vaut ici aussi ; la différence est qu'ici les deux rythmes portent sur deux actes distincts, ce qui rend la scission juste plutôt que palliative.\n\nCRITICITÉ 4 ET NON 5, à la différence de l'annuelle : un extincteur non révisé depuis onze ans reste un extincteur vérifié il y a moins d'un an. Le risque immédiat est celui que porte l'annuelle.\n\nSUR-APPLICATION EN 5ᵉ CATÉGORIE, la même que l'annuelle et pour la même raison — MS 38 relève du Livre II, écarté par PE 1 § 1, et le Livre III n'y renvoie pas. Elle est héritée telle quelle et non aggravée : la ligne suit exactement le périmètre de `incendie-erp-extincteurs-annuelle`, dont les notes portent l'analyse complète. Si cette dernière est un jour restreinte, celle-ci doit l'être du même mouvement.\n\nCE QUE LE DIRIGEANT VERRA : rien avant dix ans après la première révision déclarée, et une échéance « à planifier » tant qu'aucune date n'est connue. C'est le comportement ordinaire d'une périodicité longue, pas un défaut.",
  },
  {
    id: "incendie-erp-ssi-triennale",
    domaine: "incendie",
    libelle: "Vérification triennale approfondie des SSI de catégorie A ou B (ERP)",
    description:
      "En complément du contrôle annuel, les SSI de catégorie A ou B sont soumis à une vérification triennale approfondie par un organisme agréé.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification triennale par organisme agréé des SSI de catégorie A ou B)",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317755/",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: { categories: ["N1", "N2", "N3", "N4"] },
    },
    categoriesEquipement: ["ALARME_INCENDIE"],
  },
  {
    id: "incendie-erp-alarme-verification-hebdomadaire",
    domaine: "incendie",
    libelle:
      "Vérification hebdomadaire du bon fonctionnement de l'alarme (ERP des 4 premières catégories)",
    description:
      "L'exploitant ou son représentant s'assure, une fois par semaine au moins, du bon fonctionnement de l'installation d'alarme et de l'aptitude des alimentations électriques et/ou pneumatiques de sécurité. C'est une vérification que l'exploitant conduit lui-même, sans tiers, au même titre que l'essai mensuel de l'éclairage de sécurité — et c'est le seul contrôle du règlement de sécurité qui revienne chaque semaine.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 69 deuxième alinéa (l'exploitant s'assure une fois par semaine au moins du bon fonctionnement de l'installation)",
        article: "MS 69",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317748",
        note: "« L'exploitant ou son représentant doit s'assurer, une fois par semaine au moins, du bon fonctionnement de l'installation et de l'aptitude des alimentations électriques et/ou pneumatiques de sécurité à satisfaire aux exigences du présent règlement. » Article ouvert à la source le 2026-09-04, page d'article. Les trois autres alinéas — initiation du personnel, remise en état sans délai, stock de fournitures de rechange — ne portent aucun rythme et ne sont pas encodés ; la réserve du corpus les nomme un par un.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "hebdomadaire",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: { categories: ["N1", "N2", "N3", "N4"] },
    },
    categoriesEquipement: ["ALARME_INCENDIE"],
    notesInternes:
      "CRÉÉE LE 2026-09-04, AVEC LES SEPT DERNIERS ARTICLES À RYTHME DU LIVRE II. `MS 69` n'était cité nulle part dans `src/` : le référentiel portait l'annuelle et la triennale du SSI (`MS 73`) et ignorait le contrôle que l'exploitant doit faire lui-même chaque semaine — le plus fréquent du règlement, et le seul qui ne coûte rien.\n\nPÉRIMÈTRE : N1 À N4, ET C'EST UNE CORRECTION DE CAP. `MS 69` est au Livre II, dont `PE 1 § 1` écarte l'application en 5ᵉ catégorie sauf renvoi exprès ; le Livre III n'ouvre que `MS 39` et `MS 70`, pas `MS 69`. La typologie est donc bornée aux quatre premières catégories, comme `incendie-erp-ssi-triennale` et à la différence de `incendie-erp-ssi-annuelle`, dont la sur-application en N5 est ancienne, documentée et maintenue pour ne pas creuser un faux négatif muet. Une ligne NEUVE n'a pas cet héritage : aucun calendrier ne la porte encore, personne ne la perd, et l'encoder au-delà de son champ aurait fabriqué une sur-application de plus au lieu d'en hériter d'une.\n\nCE QUE CETTE BORNE PRODUIT, ET C'EST LE POINT DU LOT. Un ERP de 3ᵉ catégorie recevait jusqu'ici MOINS d'obligations qu'un de 5ᵉ, parce que les articles du Livre II n'étaient dépouillés qu'à moitié tandis que le Livre III l'était en entier. Cette ligne et celle des filtres de CH 39 sont les deux premières à ne s'adresser QU'aux quatre premières catégories par lecture du champ, et non par héritage.\n\nUN RENDEZ-VOUS PAR SEMAINE, ET C'EST LE TEXTE. Environ 52 lignes de calendrier par an et par installation d'alarme. Le précédent est `cuisson-erp-filtres-hebdomadaire` (GC 21 § 2), livrée le 2026-08-26 avec la même remarque : si le volume devient un problème d'affichage, c'est l'affichage qu'il faut traiter, pas la périodicité.\n\n`realisateurs: [\"exploitant\"]`, SANS TIERS. Le texte nomme « l'exploitant ou son représentant » et personne d'autre. Y ajouter `personne_qualifiee` aurait envoyé le dirigeant chercher chaque semaine quelqu'un que l'article n'exige pas.\n\nCriticité 4 : une alarme muette ne se découvre qu'au moment où elle devait sonner. Elle n'est pas à 5 comme la vérification annuelle du SSI, qui porte sur la chaîne entière — détection, compartimentage, désenfumage — là où celle-ci porte sur le seul fonctionnement de l'alarme et de ses alimentations.\n\nCE QUI N'EST PAS ENCODÉ ET QUI EST DANS LE MÊME ARTICLE : le stock permanent de petites fournitures de rechange (lampes, fusibles, vitres de déclencheurs manuels à bris de glace, cartouches de gaz inerte). C'est un état permanent matériel, de la même espèce que `secours-etablissement-materiel` ; rien ne le bloque au modèle. Il fera une seconde ligne le jour où quelqu'un le décidera — la réserve de `MS 69` au corpus le porte.",
  },
  {
    id: "incendie-erp-baes-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle de l'éclairage de sécurité / BAES (ERP)",
    description:
      "L'éclairage de sécurité (blocs autonomes d'éclairage de sécurité et source centrale) est vérifié annuellement par un technicien compétent. Les essais que l'exploitant conduit lui-même — mensuel et semestriel — font l'objet de leurs propres échéances.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EC 15",
        article: "EC 15",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000020317463",
        note: "« Vérifications. — Les installations d'éclairage doivent être vérifiées dans les conditions de l'article EL 19. » Version en vigueur depuis le 15 août 1980. EC 15 ne fixe donc aucune périodicité : il renvoie, et c'est EL 19 qui porte les conditions. Texte relu le 23 août 2026.",
        versionConstatee: "1980-08-15",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EL 19",
        article: "EL 19",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021231068",
        note: "Article de destination du renvoi d'EC 15 : c'est lui qui pose les vérifications techniques des installations d'éclairage, dont la périodicité annuelle. **Texte non encore relu au mot près** — Légifrance ne sert pas le corps des articles de cet arrêté à un client automatisé. À confronter avant toute évolution de cette obligation.",
        versionConstatee: "2010-01-23",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["BAES"],
    notesInternes:
      "Régime ERP de l'éclairage de sécurité, volet « vérification technique par un tiers ». Il se coordonne avec le régime travail (arrêté du 14 décembre 2011) par l'article 1er de celui-ci, qui laisse le règlement de sécurité ERP gouverner les locaux et dégagements accessibles au public : les deux obligations « travail » portent donc `erp: false`. Cette ligne n'est PAS l'équivalent ERP de l'article 11 — ce sont `incendie-erp-eclairage-securite-essai-mensuel` et `-autonomie-semestrielle`, fondés sur EC 14 § 3, qui le sont. La référence citait « EC 14 et EC 15 » : EC 14 ne fonde aucune vérification annuelle, il fonde les deux essais de l'exploitant, et EC 15 est un pur renvoi à EL 19. Réserve ouverte : EL 19 n'a pas encore été confronté au mot près, faute d'accès automatisé au corps des articles de cet arrêté.\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.",
  },
  {
    id: "incendie-erp-desenfumage-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des installations de désenfumage (ERP)",
    description:
      "Les dispositifs de désenfumage (DENFC, volets, clapets, amenées d'air) des ERP font l'objet d'une vérification annuelle par un technicien compétent.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. DF 10",
        article: "DF 10",
        url:
          "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000020303557/",
        versionConstatee: "2007-10-28",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["DESENFUMAGE"],
    notesInternes:
      "Sur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur."
  },
  {
    id: "incendie-erp-ria-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des robinets d'incendie armés (RIA) en ERP",
    description:
      "Les robinets d'incendie armés, installations fixes de lutte contre l'incendie (MS 14 à MS 17), sont vérifiés au moins une fois par an en cours d'exploitation (MS 73 § 2), dans les conditions de la section II du chapitre Ier du titre Ier du règlement de sécurité.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 73 (appareils et installations fixes)",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317755/",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["RIA"],
    notesInternes:
      "Amendement 2026-08-25 : la catégorie d'équipement `RIA` existe désormais (enum Prisma + migration 20260825130000). Un RIA déclaré déclenche l'obligation sans condition. La branche EXTINCTEUR bornée par `aRobinetsIncendieArmes` (forme non_infirmee, criticité 4) est TRANSITOIRE : elle protège les établissements existants qui ont répondu « oui » sur leurs extincteurs, jusqu'à la reprise de données (scripts/reprise-ria.ts) qui crée un équipement RIA à partir de chaque extincteur ainsi marqué. Critère de retrait de la branche : plus aucun équipement EXTINCTEUR ne porte la clé `aRobinetsIncendieArmes` en base — retirer alors « EXTINCTEUR » des catégories, la condition, et la question du formulaire. Un établissement qui aurait à la fois un extincteur « oui » et un RIA déclaré reçoit deux lignes d'ici là.\n\nSources relues ce jour : MS 73 § 2 (LEGIARTI000020317755) fonde la vérification annuelle des installations fixes ; MS 38 ne vise que les extincteurs et ne fonde pas les RIA ; MS 68 ne vise que le SSI. R. 4227-30 CT fonde la présence des RIA « si nécessaire » côté employeur, sans périodicité. En 5ᵉ catégorie, PE 4 § 2 (version au 01/07/2026) prévoit « tous les trois ans au plus » par techniciens compétents : l'annuelle est une sur-application assumée en N5, cohérente avec le traitement des extincteurs. La mention « contrôle visuel trimestriel » (norme NF S 62-201, non opposable) a été retirée.\n\nCRITÈRE DE RETRAIT SOLDÉ LE 2026-09-03, ET IL MANQUAIT UN TIERS. La note ci-dessus prescrivait trois retraits : « EXTINCTEUR » des catégories, la condition, ET LA QUESTION DU FORMULAIRE. Les deux premiers ont été faits le 2026-08-25 (commit ff87f4b), dont le message relate la reprise appliquée en production le jour même — cinq RIA créés, cinq lignes de calendrier réaffectées en conservant leurs statuts, plus aucun extincteur porteur de la clé, vérifié en base après écriture et sauvegarde ciblée prise avant. Le critère était donc rempli. Le troisième retrait a été oublié : la question « Votre établissement dispose-t-il de robinets d'incendie armés (RIA) ? » est restée posée sur CHAQUE extincteur déclaré, neuf jours durant, alors qu'elle ne bornait plus rien. Mesuré en appelant le moteur le 2026-09-03 : `true`, `false` et l'absence de réponse rendent le même jeu d'obligations, à l'identité près.\n\nCE QUE LE RETRAIT COÛTE, ET POURQUOI IL SE FAIT QUAND MÊME. Rien n'est perdu côté calcul — la catégorie `RIA` porte l'obligation seule depuis le 2026-08-25. Ce qui disparaît est une réponse historique éventuelle dans le JSON `caracteristiques` d'un extincteur ; le commit ff87f4b atteste qu'il n'en reste aucune en base, et `serialiserCaracteristiques` la retirerait de toute façon à la première édition de l'appareil. En regard, une question qui ne décide de rien est pire qu'absente : le dirigeant y répond en croyant que ça compte. C'est mot pour mot la raison qui a fait retirer `dessertLocauxSommeil` le 2026-09-01, et c'est la même règle. Les RIA se déclarent par leur catégorie propre.",
  },
  {
    id: "incendie-erp-5-visite-commission",
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 5ᵉ avec locaux à sommeil ou installations spécifiques)",
    description:
      "Les ERP font l'objet de visites périodiques de contrôle et de visites inopinées par la commission de sécurité compétente, « dans les conditions fixées au règlement de sécurité ». En 5ᵉ catégorie, la périodicité dépend de la présence de locaux à sommeil : les établissements qui en comportent pour le public sont visités TOUS LES CINQ ANS (PE 37), fréquence que le maire ou le préfet peut augmenter par arrêté ; ceux qui n'en comportent pas ne relèvent d'aucune périodicité écrite, le tableau de GE 4 ne visant que les quatre premières catégories. L'échéance est donc quinquennale, et la visite se trace au registre quand elle a lieu.",
    referencesLegales: [
      {
        source: "CCH",
        reference: "CCH, art. R. 143-41 (visites périodiques de la commission)",
        article: "CCH R. 143-41",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043819015/",
        note: "« Ces établissements doivent faire l'objet, dans les conditions fixées au règlement de sécurité, de visites périodiques de contrôle et de visites inopinées effectuées par la commission de sécurité compétente. » Verbatim relevé en première main le 2026-08-26. L'article FONDE les visites mais ne fixe AUCUNE périodicité : il renvoie au règlement de sécurité.",
        versionConstatee: "2021-07-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. GE 4 — n'est PAS applicable en 5ᵉ catégorie",
        article: "GE 4",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020303874/",
        note: "Cité pour montrer où la périodicité est fixée, et pour quels établissements. « Les établissements des 1re, 2e, 3e et 4e catégories doivent être visités périodiquement par les commissions de sécurité selon la fréquence fixée au tableau suivant. » Le tableau ne comporte aucune ligne de 5ᵉ catégorie, et GE 4 relève du Livre II, écarté par PE 1 § 1. Il ne fonde donc PAS cette obligation.",
        versionConstatee: "2015-01-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PE 37 (ERP de 5ᵉ catégorie avec locaux à sommeil)",
        article: "PE 37",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374774/",
        note: "« Ces établissements doivent être visités tous les cinq ans par la commission de sécurité compétente ; la fréquence de ces visites peut être augmentée, s'il est jugé nécessaire, par arrêté du maire ou du préfet, après avis de la commission. » Verbatim relevé en première main le 2026-08-26. SEUL article du Livre III fixant une périodicité de visite de commission — et il ne vise que les établissements comportant, pour le public, des locaux à sommeil.",
        versionConstatee: "2004-11-24",
      },
    ],
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    porteur: "etablissement",
    typologies: {
      erp: {
        categories: ["N5"],
        typesExclus: [
          // Le complément de J, O, U et R dans la nomenclature de GN 1 § 1,
          // dans l'ordre du texte. Tenu par `locaux-sommeil-borne-types.test.ts`,
          // qui le DÉRIVE de `TYPE_ERP` au lieu de le recopier : une lettre
          // ajoutée à la nomenclature et oubliée ici fait tomber le test.
          "M", "N", "L", "P", "S", "T", "V", "W", "X", "Y",
          "PA", "CTS", "SG", "PS", "REF", "GA", "OA", "EF",
        ],
      },
      locauxSommeilPublic: true,
    },
    notesInternes:
      "Visite commissionnelle : n'est pas à la charge de l'exploitant au sens opérationnel (initiée par l'administration) mais est à tracer dans le registre. Échéance quinquennale en première approche.\n\nAmendement 2026-08 : la restriction « locaux à sommeil » figurait dans le libellé et la description mais n'était encodée nulle part — l'obligation tombait donc sur tout ERP de 5ᵉ catégorie déclarant une alarme, restaurants et commerces compris. Elle est désormais bornée par la propriété `dessertLocauxSommeil`.\n\nPourquoi une condition d'équipement et non une restriction `types` : la présence de locaux à sommeil est une caractéristique de l'établissement qui traverse les types (un bâtiment de type W peut comporter un logement de fonction, un type O n'est pas nécessairement de 5ᵉ catégorie). Encoder une liste de types équivaudrait à trancher, sans source article par article, quels types d'exploitation comportent des locaux à sommeil — ce que la règle n°6 interdit. Le libellé de l'obligation mentionne aussi les « installations spécifiques », second cas de visite périodique qui n'est pas modélisé : la condition ne couvre que la branche « locaux à sommeil ».\n\nForme `non_infirmee` (criticité 4, obligation déjà publiée) : les établissements existants gardent la ligne jusqu'à une réponse « non » explicite, plutôt que de la perdre en silence à la prochaine régénération.\n\nAmendement 2026-08-26 : l'obligation portait une périodicité QUINQUENNALE qu'aucun texte ne fonde, et deux références dont aucune ne l'établissait. Trois lectures indépendantes le confirment. R. 143-34 traite des vérifications techniques à la charge de l'exploitant, pas des visites de commission — il est remplacé par R. 143-41, qui les fonde. GE 4 fixe bien des périodicités, mais pour les 1ʳᵉ à 4ᵉ catégories seulement : son tableau ne comporte aucune ligne de 5ᵉ catégorie, et il relève du Livre II, écarté par PE 1 § 1. Il est conservé en référence pour montrer précisément cela. Aucun article du Livre III n'organise de visite périodique de commission. La règle des cinq ans circule dans les guides préfectoraux et remonterait à la circulaire du 22 juin 1995 relative aux CCDSA — non lue au verbatim, et de toute façon non opposable. `periodicite` passe donc à `autre` : la ligne subsiste, parce que les visites existent et se tracent au registre, mais le produit cesse d'afficher une échéance que le droit ne donne pas.\n\nRECTIFIÉ LE 2026-08-26, quelques heures après l'amendement ci-dessus, qui était FAUX sur un point. Il affirmait qu'« aucun article du Livre III n'organise de visite périodique de commission ». PE 37 le fait, et fixe cinq ans. La quinquennale n'était donc pas sans fondement : elle en avait un, que je n'avais pas trouvé, et la description d'origine le disait presque — elle liait déjà la visite aux locaux à sommeil. Je l'ai remplacée par une affirmation d'absence au lieu de chercher plus loin. Ne pas avoir trouvé la source n'est pas la preuve qu'il n'y en a pas.\n\n`periodicite` reste `autre`, mais cette fois pour une raison nommée : PE 37 ne vise QUE les établissements comportant, pour le public, des locaux à sommeil. Le modèle n'a aucun attribut d'établissement pour cette distinction. Poser `quinquennale` sur tous les ERP de 5ᵉ catégorie sur-appliquerait à la boutique et au bureau ; laisser `autre` sous-applique à l'hôtel et à la chambre d'hôtes. Le manque est déclaré sur PE 37 dans le corpus, et l'attribut reste à créer.\n\nEXAMINÉE ET NON REBRANCHÉE — 2026-08-31, lot « faux négatifs d'ancrage ». Le brief de ce lot attendait un passage au porteur établissement. Il ne peut pas se faire, et voici ce qui l'en empêche.\n\nLe faux négatif est RÉEL : R. 143-41, relu au verbatim ce jour (version en vigueur depuis le 2021-07-01), dit « CES ÉTABLISSEMENTS doivent faire l'objet [...] de visites périodiques de contrôle et de visites inopinées effectuées par la commission de sécurité compétente », l'antécédent étant les établissements soumis au chapitre. Aucun équipement n'y figure. Un hôtel qui n'a pas déclaré d'alarme ne reçoit donc aucune ligne, alors qu'il est visité tous les cinq ans.\n\nMais le rebranchement produirait le faux positif symétrique, et plus large. PE 37, relu au verbatim ce jour, est intitulé « Contrôle des établissements de 5e catégorie comportant des locaux à sommeil » et ne vise que « les établissements comportant, POUR LE PUBLIC, des locaux à sommeil ». C'est le SEUL article du Livre III qui organise une visite périodique en 5ᵉ catégorie — GE 4 ne couvre que les 1ʳᵉ à 4ᵉ, et relève du Livre II écarté par PE 1 § 1. La restriction « locaux à sommeil » ne module donc pas un rythme : elle décide de l'EXISTENCE de la visite périodique. La retirer ferait naître une échéance chez chaque restaurant et chaque boutique de 5ᵉ catégorie.\n\nOr `ObligationPorteeParEtablissement` interdit `conditions` — à raison : une condition porte sur une propriété d'équipement, et il n'y aurait plus d'équipement pour la porter. Aujourd'hui la caractéristique `dessertLocauxSommeil` vit sur l'ALARME_INCENDIE, ce qui est un pis-aller : les locaux à sommeil sont un attribut de l'ÉTABLISSEMENT, pas de son alarme.\n\nLe déblocage est donc un attribut d'établissement — quelque chose comme `comporteLocauxSommeilPublic` — c'est-à-dire une migration de schéma. Ce lot n'y touche pas : `prisma/schema.prisma` est explicitement hors de son périmètre. La question est remontée à la session qui l'a délégué, avec ce constat.\n\nEn attendant, l'ancrage d'origine est CONSERVÉ tel quel. Entre un faux négatif borné aux établissements à locaux à sommeil sans alarme déclarée et un faux positif sur tous les ERP de 5ᵉ catégorie, on garde le premier — et on l'écrit ici plutôt que de le corriger de travers.\n\nNATURE : ÉCHÉANCE RÉCURRENTE (ADR-026), ET LE COUPLE AVEC `periodicite: \"autre\"` EST ICI UN MANQUE, PAS UNE DESCRIPTION. Troisième cas d'école de l'audit du 2026-08-31. La description ci-dessus est explicite : PE 37 fixe CINQ ANS pour les établissements de 5ᵉ catégorie comportant des locaux à sommeil, et la condition `dessertLocauxSommeil` restreint déjà cette ligne à ceux-là. Le rythme est donc écrit, et la périodicité devrait pouvoir être `quinquennale`. Elle ne l'est pas encore, et ce lot ne la change pas : PE 37 n'a pas été relu à la source dans ce lot, et une périodicité se pose sur un verbatim, jamais sur une description. À reprendre avec la relecture réglementaire, en gardant que le maire ou le préfet peut augmenter la fréquence par arrêté — ce qui relève d'une prescription particulière (ADR-014), pas du référentiel.\n\nSECONDE RÉSERVE, indépendante : la visite est initiée par l'administration, pas par l'exploitant. Une déclaration « en place » n'aurait aucun sens sur cette ligne ; ce qui se trace est la visite quand elle a eu lieu.\n\n⚠ AMENDEMENT 2026-08-31, SOIR — `periodicite` PASSE À `quinquennale`. CE QUI SUIT REMPLACE LES DEUX JUSTIFICATIONS CI-DESSUS (« reste `autre` » du 2026-08-26, et la réserve ADR-026). Elles sont conservées parce qu'elles racontent comment on s'est trompé deux fois de suite sur cet article, pas parce qu'elles décrivent encore le choix fait.\n\nLE FONDEMENT. PE 37, version en vigueur depuis le 2004-11-24 : « Ces établissements doivent être visités TOUS LES CINQ ANS par la commission de sécurité compétente ; la fréquence de ces visites peut être augmentée, s'il est jugé nécessaire, par arrêté du maire ou du préfet, après avis de la commission. » C'est un rythme, pas un plafond — le texte n'écrit pas « au moins ». La seconde phrase ouvre un raccourcissement par acte administratif individuel : c'est une prescription particulière (ADR-014), qui surcharge la périodicité sur un dossier donné, et non une raison de n'en poser aucune au référentiel.\n\nTROIS RELEVÉS INDÉPENDANTS ET CONCORDANTS, tous en première main : celui du 2026-08-26 porté par `referencesLegales[2].note` ci-dessus, celui du corpus (`arrete-1980-livre-3.ts`, PE 37), et celui de la session de coordination le 2026-08-31 au soir. La date de version — 24 novembre 2004 — a été recoupée une quatrième fois sur Légifrance ce jour ; le CORPS de l'article n'a pas pu l'être, la page rendant sa table des matières sans le texte et l'URL d'article répondant 403. C'est dit ici plutôt que passé sous silence : la valeur repose sur trois lectures humaines concordantes, pas sur une quatrième vérification automatique.\n\nPOURQUOI LA JUSTIFICATION DU 2026-08-26 NE TIENT PLUS — ET POURQUOI CE N'EST PAS POUR LA RAISON QU'ON CROIT. Elle disait : « Poser `quinquennale` sur tous les ERP de 5ᵉ catégorie sur-appliquerait à la boutique et au bureau. » On serait tenté de répondre que la condition `dessertLocauxSommeil` restreint déjà la ligne aux établissements que PE 37 vise. **C'est faux, et il faut le dire précisément.** La condition est de forme `equipement_propriete_non_infirmee` : elle est satisfaite TANT QUE l'utilisateur n'a pas répondu « non ». La ligne tombe donc sur tout ERP de 5ᵉ catégorie ayant déclaré une alarme et n'ayant pas encore répondu à la question — c'est-à-dire, aujourd'hui, sur la boutique et le bureau exactement comme le craignait la note.\n\nCE QUI CHANGE VRAIMENT, c'est la NATURE de cette sur-application, et c'est une règle que ce dépôt a déjà écrite. Avec `autre`, elle était MUETTE : le générateur sautait la ligne, aucun écran ne la montrait, et personne ne pouvait la corriger puisque personne ne la voyait. Avec `quinquennale`, elle devient une échéance datée, visible au calendrier, et **corrigeable par une réponse « non »** — la question est posée au formulaire d'équipement, avec cette aide : « Un restaurant, un commerce ou un bureau sans hébergement : répondez « non ». » C'est mot pour mot la doctrine que `ConditionApplication` énonce pour la forme `non_infirmee` : « sur une obligation de criticité élevée, une sur-application visible et corrigeable par une réponse « non » est toujours préférable à un faux négatif muet ». La valeur est posée sur ce fondement-là, pas sur l'idée que la condition suffirait.\n\nCE QUE CELA PRODUIT, SANS ENJOLIVER : à la prochaine régénération, tout établissement de 5ᵉ catégorie ayant déclaré une alarme sans répondre à la question voit apparaître une ligne « Visite périodique de la commission de sécurité », criticité 4, « à planifier » et urgente — y compris s'il n'a aucun local à sommeil. Répondre « non » à la question la fait disparaître. C'est assumé ; ce n'est pas indolore.\n\nL'AMPLEUR, MESURÉE PLUTÔT QU'ESTIMÉE — DEUX SUR DEUX. Le 2026-09-01, sur le jeu de démonstration : les deux dossiers sont des restaurants ERP de type N, 5ᵉ catégorie, chacun avec une ALARME_INCENDIE déclarée et `dessertLocauxSommeil` **vide** — pas « non », vide. `determineObligationsApplicables` rend la ligne pour les deux. Ce n'est pas un cas limite, c'est le cas NORMAL : rien n'oblige un dirigeant à répondre à cette question, et un parc repris ou importé n'y aura jamais répondu. Le taux à attendre sur le parc réel est donc proche de 100 % des ERP de 5ᵉ catégorie ayant déclaré une alarme, jusqu'à ce que chacun réponde « non ».\n\nLe chiffre est écrit ici, et pas seulement la réserve, pour une raison précise : une sur-application assumée qui ne dit pas son ampleur se redécouvre plus tard et se prend pour un bug. Quelqu'un verra deux restaurants sur deux porter une échéance de visite commissionnelle et croira à un défaut d'ancrage. C'en est un — il est nommé au (1) et au (2) ci-dessous —, mais il est CHOISI, et il se corrige d'un clic du côté de l'utilisateur, pas d'un correctif du côté du produit.\n\nDEUX RÉSERVES D'ANCRAGE, INCHANGÉES PAR CET AMENDEMENT — elles existaient à l'identique avant, et ne sont pas corrigées ici.\n\n(1) FAUX NÉGATIF, déjà documenté plus haut : un hôtel qui n'a déclaré aucune ALARME_INCENDIE ne reçoit rien, alors que PE 37 le vise. Le déblocage est un attribut d'établissement (`comporteLocauxSommeilPublic`), donc une migration et une donnée à collecter.\n\n(2) FAUX POSITIF, NON DOCUMENTÉ JUSQU'ICI, et c'est l'apport de cet amendement : PE 37 écrit « des locaux à sommeil POUR LE PUBLIC ». `dessertLocauxSommeil` ne distingue pas le sommeil du public de celui du personnel — et la note du 2026-08 invoque justement un logement de fonction pour justifier le choix d'une condition d'équipement plutôt qu'une restriction par type. Or un logement de fonction occupé par le personnel n'est pas un local à sommeil pour le public. **La condition est donc plus large que l'article**, dans un second sens, indépendant du précédent. L'aide du formulaire dit « logement de fonction ouvert au public », ce qui est plus juste que le nom du champ ; le nom, lui, reste trompeur. Nommé, non corrigé : le resserrer suppose de reposer la question à des utilisateurs qui y ont déjà répondu.\n\n⚠ AMENDEMENT 2026-09-01, LOT A11 — L'ATTRIBUT EXISTE, ET LES DEUX RÉSERVES CI-DESSUS SONT LEVÉES. Tout ce qui précède décrit un état révolu ; c'est conservé parce que la note dit comment on s'est trompé quatre fois sur cet article, pas parce qu'elle décrit encore le choix fait.\n\nCE QUI CHANGE. `Etablissement.comporteLocauxSommeilPublic` existe (migration 20260901180000). L'obligation passe au PORTEUR ÉTABLISSEMENT ; `categoriesEquipement: [ALARME_INCENDIE]` et la condition `equipement_propriete_non_infirmee` sur `dessertLocauxSommeil` sont retirées, remplacées par `typologies.locauxSommeilPublic: true`.\n\n(1) LE FAUX NÉGATIF EST CORRIGÉ. R. 143-41 et PE 37 visent l'établissement ; aucun des deux ne nomme d'équipement. Un hôtel qui n'a déclaré aucune alarme reçoit désormais la ligne. C'est exactement la correction que le lot « faux négatifs d'ancrage » a faite le 2026-08-31 sur le registre de sécurité, les exercices d'évacuation et la consigne incendie — celle-ci était la quatrième, et elle avait été EXAMINÉE ET REFUSÉE ce jour-là faute de colonne. La colonne est là.\n\n(2) LE FAUX POSITIF « POUR LE PUBLIC » EST CORRIGÉ AUSSI. `dessertLocauxSommeil` ne distinguait pas le sommeil du public de celui du personnel ; la question posée à la fiche établissement le dit en toutes lettres — « Un logement de fonction occupé par vous ou par un salarié ne compte pas : le texte vise le sommeil du public. » PE 37 écrit « comportant, POUR LE PUBLIC, des locaux à sommeil » : la condition n'est plus plus large que l'article.\n\nCE QUE LA SUR-APPLICATION DEVIENT, sans enjoliver. Elle ne disparaît pas, elle change d'assiette et de public. Avant : tout ERP de 5ᵉ catégorie AYANT DÉCLARÉ UNE ALARME et n'ayant pas répondu. Après : tout ERP de 5ᵉ catégorie n'ayant pas répondu, alarme ou non — donc davantage de dossiers, jusqu'à ce que chacun réponde « non ». C'est le prix assumé de la règle du non-renseigné, et c'est le bon sens d'erreur : la ligne est visible au calendrier et se retire d'une réponse, là où l'oubli d'un hôtel ne se voyait de nulle part.\n\nLA CARACTÉRISTIQUE D'ÉQUIPEMENT `dessertLocauxSommeil` EST RETIRÉE, elle ne survit pas en dormant. Elle n'existait que pour cette obligation — `equipements/schema.ts` le disait en tête de fichier — et une question qui ne décide plus de rien est pire qu'absente : le dirigeant y répond en croyant que ça compte. Les réponses déjà données ne sont PAS reprises dans la nouvelle colonne : les deux questions ne sont pas la même, et recopier l'une dans l'autre fabriquerait une réponse que personne n'a donnée.\n\nLA PÉRIODICITÉ NE BOUGE PAS. `quinquennale`, sur le fondement de l'amendement du 2026-08-31 au soir. PE 37 a été relu à la source le 2026-09-01 pour ce lot : le corps de l'article est cette fois rendu par Légifrance, et il dit bien « Ces établissements doivent être visités tous les cinq ans par la commission de sécurité compétente », version en vigueur du 24 novembre 2004. La seconde phrase — « la fréquence de ces visites peut être augmentée [...] par arrêté du maire ou du préfet » — n'a PAS été rendue par cette lecture-ci ; elle reste établie par les trois relevés antérieurs concordants, et rien dans la lecture du jour ne la contredit. Elle relève de toute façon d'une prescription particulière (ADR-014), pas du référentiel." +
      NOTE_BORNE_TYPES_SOMMEIL,
  },

  // ---------------------------------------------------------------------------
  // ERP 5ᵉ catégorie COMPORTANT DES LOCAUX À SOMMEIL — chapitre III du Livre III
  //
  // Les trois lignes qui suivent sont entrées le 2026-09-01 avec l'attribut
  // `Etablissement.comporteLocauxSommeilPublic` (lot A11). Elles étaient
  // encodables depuis le premier dépouillement du Livre III, le 2026-08-26 :
  // ce qui manquait n'était ni la lecture ni le porteur, c'était la colonne
  // qui dit si l'établissement héberge du public pour la nuit. Les articles
  // du chapitre III étaient classés `non_couvert` à ce motif, écrit noir sur
  // blanc dans le corpus.
  // ---------------------------------------------------------------------------
  {
    id: "incendie-erp-5-sommeil-contrat-entretien-sdi",
    domaine: "incendie",
    libelle:
      "Contrat annuel d'entretien du système de détection automatique d'incendie (ERP 5ᵉ avec locaux à sommeil)",
    description:
      "Dans les établissements de 5ᵉ catégorie comportant des locaux à sommeil, l'exploitant souscrit un contrat annuel d'entretien du système de détection automatique d'incendie. Ce que le texte impose est le CONTRAT — sa souscription, puis son renouvellement chaque année — et non une visite dont il fixerait le rythme. Le même paragraphe impose par ailleurs une vérification de la détection, du désenfumage et des installations électriques par un organisme agréé à la construction et avant l'ouverture : c'est un contrôle d'ouverture, distinct de ce contrat, et il n'est pas porté ici.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 4 § 1",
        article: "PE 4",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024760269",
        note: "« Les systèmes de détection automatique d'incendie, les installations de désenfumage et les installations électriques dans les établissements avec locaux à sommeil doivent être vérifiés à la construction et avant l'ouverture par des personnes ou des organismes agréés. De plus, un contrat annuel d'entretien des systèmes de détection automatique d'incendie doit être souscrit par l'exploitant. » Verbatim relevé le 2026-09-01, version en vigueur depuis le 2026-07-01.",
        versionConstatee: "2026-07-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue:
      "contrat d'entretien du système de détection automatique d'incendie",
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    porteur: "etablissement",
    typologies: {
      erp: {
        categories: ["N5"],
        typesExclus: [
          // Le complément de J, O, U et R dans la nomenclature de GN 1 § 1,
          // dans l'ordre du texte. Tenu par `locaux-sommeil-borne-types.test.ts`,
          // qui le DÉRIVE de `TYPE_ERP` au lieu de le recopier : une lettre
          // ajoutée à la nomenclature et oubliée ici fait tomber le test.
          "M", "N", "L", "P", "S", "T", "V", "W", "X", "Y",
          "PA", "CTS", "SG", "PS", "REF", "GA", "OA", "EF",
        ],
      },
      locauxSommeilPublic: true,
    },
    equipementsEnContexte: ["ALARME_INCENDIE"],
    notesInternes:
      "Créée le 2026-09-01 (lot A11). PE 4 § 1 était nommé depuis le 2026-08-27 dans la `reserve` de PE 4 au corpus, avec sa cause : « il attend l'attribut `Etablissement.locauxSommeil`, qui n'existe pas ». L'attribut existe.\n\nPOURQUOI `annuelle` ET `echeance_recurrente`, ET NON UN ÉTAT PERMANENT. Le mot « annuel » est DANS le texte — il n'est ni déduit, ni conventionnel. Il qualifie le contrat, c'est-à-dire sa durée : un contrat annuel arrive à terme et se renouvelle. L'acte est donc dû, puis redû, à intervalle d'un an, ce qui est la définition d'`echeance_recurrente` (ADR-026). Le classer `etat_permanent` aurait fait d'un contrat expiré un état qu'on croit acquis, et c'est exactement le cas que le dirigeant doit voir arriver.\n\nCE QUI N'EST PAS ENCODÉ, et c'est la moitié du même paragraphe. La vérification de la détection, du désenfumage et des installations électriques « à la construction et avant l'ouverture par des personnes ou des organismes agréés » est un contrôle d'OUVERTURE. Le référentiel a bien `mise_en_service_uniquement` et la nature `ponctuelle`, mais l'acte y est attaché à la vie d'un objet ou d'une personne — la mise en service d'un appareil, l'affectation à un poste — et non à l'ouverture de l'établissement, que le produit ne date pas. Un dirigeant qui exploite depuis dix ans n'a rien à en faire, et lui inscrire une ligne « à faire » sur un acte antérieur à son dossier serait faux. Nommé, non encodé — même traitement que le chapeau « installations de gaz neuves ou modifiées » de PE 4, déjà déclaré à part.\n\nLA RÉFÉRENCE EST PLUS LARGE QUE L'ATTRIBUT, ET IL FAUT LE DIRE. PE 4 § 1 écrit « les établissements avec locaux à sommeil », SANS la précision « pour le public » que PE 37 porte. L'obligation est pourtant conditionnée à `comporteLocauxSommeilPublic`, comme les trois autres lignes du chapitre : un établissement dont les seuls locaux à sommeil seraient réservés au personnel ne la recevrait donc pas, alors que la lettre de PE 4 § 1 ne l'en dispense pas expressément. Ce qui n'a PAS été établi dans ce lot, et qui trancherait la question : si les locaux à sommeil du règlement de sécurité ERP s'entendent nécessairement de ceux ouverts au public — un logement de fonction étant traité comme un tiers isolé de l'établissement —, alors il n'y a pas d'écart du tout. Faute d'avoir lu ce qui le dirait, l'écart est nommé ici plutôt que passé sous silence, et il est borné : un seul cas, celui des locaux à sommeil strictement réservés au personnel.\n\nRÉALISATEUR `exploitant` : ce que le texte lui impose est de SOUSCRIRE, pas d'entretenir. L'entretien est fait par le titulaire du contrat, et le produit n'a pas à le lui prescrire." +
      NOTE_BORNE_TYPES_SOMMEIL,
  },
  {
    id: "incendie-erp-5-sommeil-consigne-chambres",
    domaine: "incendie",
    libelle:
      "Consigne d'incendie affichée dans chaque chambre (ERP 5ᵉ avec locaux à sommeil)",
    description:
      "Dans les établissements de 5ᵉ catégorie comportant des locaux à sommeil, une consigne d'incendie est affichée dans chaque chambre. Elle est rédigée en français et complétée par une bande dessinée illustrant les consignes.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 33 § 2",
        article: "PE 33",
        url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374774/",
        note: "« Une consigne d'incendie doit être affichée dans chaque chambre ; elle est rédigée en français et complétée par une bande dessinée illustrant les consignes. » Verbatim relevé le 2026-09-01, version en vigueur depuis le 4 novembre 2011. Le § 1 du même article — « L'exploitant doit tenir à jour un registre de sécurité » — n'est PAS porté ici : il l'est déjà par `incendie-registre-securite`.",
        versionConstatee: "2011-11-04",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "consigne d'incendie affichée dans chaque chambre",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: {
      erp: {
        categories: ["N5"],
        typesExclus: [
          // Le complément de J, O, U et R dans la nomenclature de GN 1 § 1,
          // dans l'ordre du texte. Tenu par `locaux-sommeil-borne-types.test.ts`,
          // qui le DÉRIVE de `TYPE_ERP` au lieu de le recopier : une lettre
          // ajoutée à la nomenclature et oubliée ici fait tomber le test.
          "M", "N", "L", "P", "S", "T", "V", "W", "X", "Y",
          "PA", "CTS", "SG", "PS", "REF", "GA", "OA", "EF",
        ],
      },
      locauxSommeilPublic: true,
    },
    notesInternes:
      "Créée le 2026-09-01 (lot A11). PE 33 était classé `non_couvert` au motif que l'attribut « locaux à sommeil » n'existait pas.\n\nÀ NE PAS CONFONDRE AVEC `incendie-travail-consigne-affichee`, ni avec `habitation-consignes-plans-intervention`. Les trois font afficher une consigne, aucune ne dit la même chose. Celle du Code du travail (R. 4227-37) est due à l'employeur dont l'établissement entre dans le champ de R. 4227-34, et son contenu est fixé par R. 4227-38 ; celle de l'arrêté de 1986 est due au propriétaire d'un immeuble d'habitation ; celle-ci est due à l'exploitant d'un ERP de 5ᵉ catégorie avec hébergement, DANS CHAQUE CHAMBRE, et elle est la seule des trois que le texte exige illustrée par une bande dessinée — parce que son destinataire est un client qui dort là et ne lit peut-être pas le français. Un même établissement peut recevoir deux de ces lignes ; ce ne sont pas deux fois la même affiche.\n\n`pieceAttendue` NON NULLE, comme `habitation-consignes-plans-intervention` et pour le même motif : ce qui est dû est un écrit affiché, et une case cochée sans consigne au mur serait la déclaration-qui-ressemble-à-une-preuve que l'écran d'états permanents interdit.\n\nLE § 1 N'EST PAS REPRIS. « L'exploitant doit tenir à jour un registre de sécurité. Ce document doit pouvoir être présenté à chaque visite de la commission de sécurité. » C'est le registre que `incendie-registre-securite` porte déjà, fondé sur R. 143-44 CCH — dont le champ est « les établissements soumis aux prescriptions du présent chapitre », 5ᵉ catégorie comprise. Créer une seconde ligne « registre » pour les seuls établissements à locaux à sommeil ferait croire à deux registres là où le texte n'en impose qu'un." +
      NOTE_BORNE_TYPES_SOMMEIL,
  },
  {
    id: "incendie-erp-5-sommeil-plans-affiches",
    domaine: "incendie",
    libelle:
      "Plan de l'établissement, plans d'orientation et de repérage affichés (ERP 5ᵉ avec locaux à sommeil)",
    description:
      "Dans les établissements de 5ᵉ catégorie comportant des locaux à sommeil, trois affichages sont dus : un plan de l'établissement dans le hall d'entrée, un plan d'orientation simplifié à chaque étage près de l'accès aux escaliers, et un plan sommaire de repérage de chaque chambre par rapport aux dégagements à utiliser en cas d'incendie, fixé dans chaque chambre.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 35",
        article: "PE 35",
        url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374774/",
        note: "« § 1. Un plan de l'établissement, conforme aux dispositions de l'article MS 41, doit être apposé dans le hall d'entrée. § 2. Un plan d'orientation simplifié doit être apposé à chaque étage près de l'accès aux escaliers. § 3. Un plan sommaire de repérage de chaque chambre par rapport aux dégagements à utiliser en cas d'incendie doit être fixé dans chaque chambre. » Verbatim relevé le 2026-09-01, version en vigueur depuis le 27 août 1990.",
        versionConstatee: "1990-08-27",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue:
      "plans affichés — établissement, orientation par étage, repérage par chambre",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: {
      erp: {
        categories: ["N5"],
        typesExclus: [
          // Le complément de J, O, U et R dans la nomenclature de GN 1 § 1,
          // dans l'ordre du texte. Tenu par `locaux-sommeil-borne-types.test.ts`,
          // qui le DÉRIVE de `TYPE_ERP` au lieu de le recopier : une lettre
          // ajoutée à la nomenclature et oubliée ici fait tomber le test.
          "M", "N", "L", "P", "S", "T", "V", "W", "X", "Y",
          "PA", "CTS", "SG", "PS", "REF", "GA", "OA", "EF",
        ],
      },
      locauxSommeilPublic: true,
    },
    notesInternes:
      "Créée le 2026-09-01 (lot A11). PE 35 était classé `non_couvert` au motif que l'attribut « locaux à sommeil » n'existait pas.\n\nUNE LIGNE POUR TROIS PARAGRAPHES, et c'est un choix. Les trois plans sont trois affichages du même acte — cartographier l'établissement pour quelqu'un qui s'y réveille la nuit — dus au même moment, au même exploitant, et constatés du même regard. Les scinder aurait produit trois cases à cocher là où le dirigeant fait une commande unique à son imprimeur. Le libellé et la `pieceAttendue` nomment les trois pour qu'aucun ne se perde dans le regroupement.\n\nRENVOI NON OUVERT, DÉCLARÉ COMME TEL. Le § 1 exige un plan « conforme aux dispositions de l'article MS 41 ». MS 41 relève du LIVRE II, que PE 1 § 1 écarte sauf renvoi exprès — et c'en est un, donc il s'applique. Il n'a PAS été ouvert dans ce lot : la description dit donc qu'un plan est dû dans le hall, sans dire ce que MS 41 exige de son contenu. À rouvrir si l'on veut décrire le plan et pas seulement l'imposer.\n\nCE QUI DISTINGUE CETTE LIGNE DE PE 34, resté `sans_objet`. PE 34 impose que les dégagements soient POURVUS de symboles de sécurité conformes à la norme NF X 08-003, et que les portes inutilisables soient fermées à clé ou munies d'un ferme-porte : c'est une règle d'équipement du bâtiment, de la même famille que PE 24 (éclairage) et PE 26 (dotation en extincteurs), tous deux `sans_objet` depuis le premier dépouillement. PE 35, lui, fait PRODUIRE ET AFFICHER un écrit par l'exploitant — même espèce que les affichages du lot 8 (`D. 4711-1`, `R. 4121-4`), encodés en états permanents. La ligne de partage est celle-là, et elle est écrite ici pour qu'on n'ait pas à la redevinner." +
      NOTE_BORNE_TYPES_SOMMEIL,
  },

  {
    id: "incendie-erp-visite-commission-cat1-2-triennale",
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements de 1ʳᵉ et de 2ᵉ catégorie sont visités TOUS LES TROIS ANS par la commission de sécurité. Le tableau de l'article GE 4 § 1 croise le type d'exploitation et la catégorie ; sur ces deux catégories, le seul type qu'il porte à cinq ans est le culte (type V), qui fait l'objet d'une ligne distincte." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: { erp: { categories: ["N1", "N2"], typesExclus: ["V"] } },
    porteur: "etablissement",
    notesInternes:
      "LIGNE 1 SUR 6 DU TABLEAU DE GE 4 § 1 — 1ʳᵉ et 2ᵉ catégories, tous types SAUF V.\n\nCASES COUVERTES : quatorze des quinze colonnes du tableau sur chacune des deux lignes de catégorie, soit les cardinalités officielles 14 et 14 (voir la note commune ci-dessous). Les quatorze sont représentables depuis que le type J est entré dans l'énumération (2026-09-03, avec le dépouillement de GN 1) ; les huit types spéciaux, absents du tableau, y sont retenus à trois ans par prudence.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  {
    id: "incendie-erp-visite-commission-cat1-2-quinquennale",
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements de culte (type V) de 1ʳᵉ et de 2ᵉ catégorie sont visités TOUS LES CINQ ANS par la commission de sécurité. Le type V est le seul que le tableau de l'article GE 4 § 1 porte à cinq ans dans les quatre catégories." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: { erp: { categories: ["N1", "N2"], types: ["V"] } },
    porteur: "etablissement",
    notesInternes:
      "LIGNE 2 SUR 6 DU TABLEAU DE GE 4 § 1 — 1ʳᵉ et 2ᵉ catégories, type V seul.\n\nCASES COUVERTES : une colonne sur quinze sur chacune des deux lignes de catégorie, soit les cardinalités officielles 1 et 1 (voir la note commune ci-dessous). C'est la seule case de ces deux catégories où le tableau quitte les trois ans, et elle est la raison pour laquelle la note de corpus qui parlait du « type Y » était fausse : la lettre est V.\n\nCETTE LIGNE EST LA SEULE DES SIX QUI ALLONGE UN DÉLAI PAR RAPPORT À L'ÉTAT ANTÉRIEUR sur les deux premières catégories. Un établissement de culte de 1ʳᵉ ou 2ᵉ catégorie passait jusqu'ici en trois ans ; il passe à cinq. C'est ce que dit le tableau, et c'est le sens d'erreur que le dépôt surveille le plus : elle est posée sur un tableau vérifié case par case au fac-similé du Journal officiel, pas sur une reconstruction.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  {
    id: "incendie-erp-visite-commission-cat3-triennale",
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements de 3ᵉ catégorie sont visités TOUS LES TROIS ANS par la commission de sécurité lorsqu'ils relèvent des types que le tableau de l'article GE 4 § 1 y maintient à trois ans : structures d'accueil pour personnes âgées ou handicapées (J), salles d'auditions, de conférences, de réunions et de spectacles (L), hôtels et pensions de famille (O), salles de danse et de jeux (P), établissements d'enseignement et colonies (R), établissements de soins (U). Les autres types de 3ᵉ catégorie sont à cinq ans et font l'objet d'une ligne distincte." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: {
        categories: ["N3"],
        typesExclus: ["M", "N", "S", "T", "V", "W", "X", "Y"],
      },
    },
    porteur: "etablissement",
    notesInternes:
      "LIGNE 3 SUR 6 DU TABLEAU DE GE 4 § 1 — 3ᵉ catégorie, types J, L, O, P, R (1), R (2) et U.\n\nCASES COUVERTES : sept colonnes sur quinze, soit la cardinalité officielle 7 (voir la note commune ci-dessous). En 3ᵉ catégorie, R avec et R sans hébergement sont TOUS DEUX à trois ans : la distinction R (1) / R (2) ne mord pas ici, et l'exclusion écrite en face — M, N, S, T, V, W, X, Y — reproduit exactement les huit cases à cinq ans de cette ligne.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  {
    id: "incendie-erp-visite-commission-cat3-quinquennale",
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements de 3ᵉ catégorie relevant des types magasins de vente et centres commerciaux (M), restaurants et débits de boissons (N), bibliothèques et centres de documentation (S), salles d'expositions (T), établissements de culte (V), administrations, banques et bureaux (W), établissements sportifs couverts (X) et musées (Y) sont visités TOUS LES CINQ ANS par la commission de sécurité, selon le tableau de l'article GE 4 § 1." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: {
        categories: ["N3"],
        types: ["M", "N", "S", "T", "V", "W", "X", "Y"],
      },
    },
    porteur: "etablissement",
    notesInternes:
      "LIGNE 4 SUR 6 DU TABLEAU DE GE 4 § 1 — 3ᵉ catégorie, types M, N, S, T, V, W, X, Y.\n\nCASES COUVERTES : huit colonnes sur quinze, soit la cardinalité officielle 8 (voir la note commune ci-dessous).\n\nY EST ICI, ET IL N'EST PAS UNE EXCEPTION. La note de corpus corrigée par ce lot faisait du type Y le seul à sortir du rythme de trois ans ; il suit en réalité exactement le régime de M, N, S, T, W et X — trois ans en 1ʳᵉ et 2ᵉ catégories, cinq ans en 3ᵉ et 4ᵉ.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  {
    id: "incendie-erp-visite-commission-cat4-triennale",
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements de 4ᵉ catégorie sont visités TOUS LES TROIS ANS par la commission de sécurité lorsqu'ils relèvent des types que le tableau de l'article GE 4 § 1 y maintient à trois ans : structures d'accueil pour personnes âgées ou handicapées (J), hôtels et pensions de famille (O), établissements d'enseignement et colonies AVEC hébergement (R), établissements de soins (U). Le tableau distingue en 4ᵉ catégorie l'enseignement avec hébergement, visité tous les trois ans, de l'enseignement sans hébergement, visité tous les cinq ans ; le produit ne sait pas encore si votre établissement héberge, et retient donc trois ans pour tout établissement de type R — le plus court des deux rythmes, jamais le plus long." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: {
        categories: ["N4"],
        typesExclus: ["L", "M", "N", "P", "S", "T", "V", "W", "X", "Y"],
      },
    },
    porteur: "etablissement",
    notesInternes:
      "LIGNE 5 SUR 6 DU TABLEAU DE GE 4 § 1 — 4ᵉ catégorie, types J, O, R (1) et U... PLUS R (2), ET C'EST LA SEULE SUR-APPLICATION VOLONTAIRE DES SIX LIGNES.\n\nCASES COUVERTES : quatre colonnes sur quinze au tableau — J, O, R (1), U —, soit la cardinalité officielle 4 (voir la note commune ci-dessous). Le produit en couvre une CINQUIÈME, R (2), l'enseignement SANS hébergement, que le tableau met à cinq ans. Il ne peut pas faire autrement : `TypeErp` ne connaît qu'un seul R, et rien dans le modèle ne dit si un établissement héberge. Entre mettre tout R à cinq ans — ce qui donnerait deux ans de trop à un internat de 4ᵉ catégorie, sans que personne le voie — et mettre tout R à trois ans — ce qui avance la date d'un centre de formation sans hébergement, ce qui se voit et se corrige —, la seconde est la seule acceptable.\n\nLE MANQUE À COMBLER EST NOMMÉ : un attribut d'établissement disant si l'exploitation comporte des locaux d'hébergement. Il n'existe pas ; le poser est une migration de schéma, hors du périmètre de ce lot. Tant qu'il n'existe pas, cette ligne garde R et la ligne quinquennale de 4ᵉ catégorie ne le prend pas.\n\nLES QUATRE CASES DU TABLEAU SONT CELLES QUE LA NOTE DE CORPUS FAUSSE AURAIT EFFACÉES. Elle disait « cinq ans en 4ᵉ catégorie hors Y » ; l'encoder aurait mis à cinq ans un EHPAD (J), un hôtel (O), un internat (R avec hébergement) et un établissement de soins (U) que le texte visite tous les trois ans.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  {
    id: "incendie-erp-visite-commission-cat4-quinquennale",
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements de 4ᵉ catégorie relevant des types salles d'auditions, de conférences, de réunions et de spectacles (L), magasins de vente et centres commerciaux (M), restaurants et débits de boissons (N), salles de danse et de jeux (P), bibliothèques et centres de documentation (S), salles d'expositions (T), établissements de culte (V), administrations, banques et bureaux (W), établissements sportifs couverts (X) et musées (Y) sont visités TOUS LES CINQ ANS par la commission de sécurité, selon le tableau de l'article GE 4 § 1." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: {
        categories: ["N4"],
        types: ["L", "M", "N", "P", "S", "T", "V", "W", "X", "Y"],
      },
    },
    porteur: "etablissement",
    notesInternes:
      "LIGNE 6 SUR 6 DU TABLEAU DE GE 4 § 1 — 4ᵉ catégorie, types L, M, N, P, S, T, V, W, X, Y.\n\nCASES COUVERTES : dix colonnes sur quinze. La cardinalité officielle de cette ligne est ONZE, et l'écart est nommé : la onzième est R (2), l'enseignement sans hébergement, que le produit ne sait pas distinguer de R (1) et qu'il laisse donc à trois ans sur la ligne triennale de 4ᵉ catégorie. C'est le seul écart volontaire de l'encodage, et il va dans le sens court.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  // ---------------------------------------------------------------------------
  // IGH
  // ---------------------------------------------------------------------------
  {
    id: "incendie-igh-moyens-secours-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des moyens de secours et SSI (IGH)",
    description:
      "Dans les immeubles de grande hauteur, le propriétaire fait vérifier annuellement par un organisme agréé les moyens de secours (art. GH 51 à GH 55), les scénarios et le fonctionnement du SSI, les dispositifs de sécurité, les interphones et télécommunications de sécurité. Le désenfumage mécanique est vérifié par cinquième chaque année (100 % en cinq ans).",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 30 décembre 2011 (règlement IGH), art. GH 5 (vérifications techniques par organismes agréés)",
        article: "GH 5",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025169258",
        versionConstatee: "2026-01-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { igh: true },
    categoriesEquipement: ["ALARME_INCENDIE", "EXTINCTEUR", "DESENFUMAGE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait « GH 60 à GH 63 ». GH 60 traite de la surveillance, des exercices et de l'information des locataires. Les vérifications techniques périodiques sont à l'article GH 5.",
  },
  {
    id: "incendie-igh-charge-calorifique-quinquennale",
    domaine: "incendie",
    libelle:
      "Rapport de vérification de la charge calorifique (occupant d'un IGH)",
    description:
      "Dans un immeuble de grande hauteur, l'occupant de locaux autres que d'habitation — l'employeur qui y loue des bureaux ou un commerce — fait établir par un organisme agréé un rapport de vérification de conformité de la charge calorifique, puis le fait renouveler tous les cinq ans. Le locataire doit en outre pouvoir justifier au propriétaire ou au mandataire de sécurité que les locaux qu'il occupe ne dépassent pas les charges calorifiques autorisées.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 30 décembre 2011 (règlement IGH), art. GH 61 § 5 (rapport de vérification de la charge calorifique, à la charge des occupants)",
        article: "GH 61",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025170361",
        note: "« Dans les locaux autres que les locaux d'habitation, LES OCCUPANTS sont tenus de faire établir, par un ORGANISME AGRÉÉ, un rapport de vérification de conformité de la charge calorifique. Ce rapport est établi dans l'année qui suit l'installation dans les lieux ou toute modification importante de l'aménagement, PUIS PÉRIODIQUEMENT TOUS LES CINQ ANS. » Le § 7 ajoute : « Les locataires autres que ceux occupant des locaux d'habitation doivent pouvoir justifier au propriétaire ou au mandataire de sécurité que les locaux qu'ils occupent ne dépassent pas les charges calorifiques autorisées. » Article lu en entier le 2026-09-04 : sept paragraphes, dont aucun autre ne porte de périodicité ni ne nomme l'occupant (§ 1 à § 4 et § 6 fixent des plafonds en MJ/m²). Relevé quatre fois, sur trois URL distinctes ; le premier appel de la veille avait rendu le § 5 amputé de sa seconde phrase, celle qui porte les cinq ans.",
        versionConstatee: "2012-04-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 30 décembre 2011 (règlement IGH), art. GH 5 § 3.1.4 (la quinquennale au tableau des vérifications techniques)",
        article: "GH 5",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000052234026",
        note: "Contexte, et surtout CONTRE-VÉRIFICATION PAR UN SECOND ARTICLE : « 3.1.4. Tous les cinq ans : les évaluations de la charge calorifique visée à l'article GH 61. » Lu le 2026-09-04 sur deux URL distinctes. Le même article porte la phrase qui articule les deux régimes et qui n'avait jamais été relevée : « Les vérifications techniques concernant un même type d'installation, HORMIS LES VÉRIFICATIONS DE LA CHARGE CALORIFIQUE, sont exécutées dans l'ensemble de l'immeuble sous la responsabilité d'un même organisme agréé. » L'exception dit pourquoi : la charge calorifique est la seule vérification que GH 5 ne fait pas passer par le propriétaire, parce que GH 61 § 5 la met à la charge de chaque occupant, local par local.",
        versionConstatee: "2026-01-01",
      },
    ],
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    porteur: "etablissement",
    typologies: { igh: true },
    notesInternes:
      "ENTRÉE LE 2026-09-04. C'est la PREMIÈRE obligation IGH du référentiel qui vise l'OCCUPANT, et c'est tout son intérêt : les deux autres (`elec-igh-annuelle`, `incendie-igh-moyens-secours-annuelle`) sont fondées sur GH 5, dont la phrase d'attaque est « LES PROPRIÉTAIRES font effectuer… ». Le produit sert un employeur locataire de bureaux dans une tour (ADR-031) et ne lui devait, du règlement IGH, que des lignes dont il n'est pas le débiteur.\n\nLA RAISON DE NON-ENCODAGE QUI TENAIT LA PLACE ÉTAIT FAUSSE, et c'est le motif de ce lot. Le corpus rangeait cette quinquennale avec les paratonnerres, « faute de catégorie d'équipement ». Elle n'en a jamais eu besoin : son porteur est l'établissement (ADR-022), et ce porteur existe depuis le 2026-08-31. Un motif faux fait plus de mal qu'un manque nu, parce qu'il clôt la question — celui-ci l'a close du 2026-08-27, jour où il a été écrit, au 2026-09-03, jour où le lot suivant a rouvert GH 61 et vu qu'il était faux.\n\nPAS DE RESTRICTION DE CLASSE, ET C'EST UNE LECTURE, PAS UN OUBLI. `typologies: { igh: true }` sans `classes`. GH 61 est au titre Ier (dispositions générales), chapitre III « obligations des propriétaires et des occupants » : il s'applique quelle que soit la classe. Et le lot du 2026-09-03 a établi que la classe n'est pas le bon objet — GH 66 fait du classement l'affaire de « l'usage principal de l'immeuble », si bien qu'un plateau de bureaux dans une tour classée GH U relève des dispositions GH W. La question a été retirée du produit le même jour.\n\nCE QUI N'EST PAS PORTÉ, ET IL FAUT LE LIRE AVANT DE CROIRE LA LIGNE COMPLÈTE. Le § 5 porte DEUX délais, et un seul est encodable. « Dans l'année qui suit l'installation dans les lieux ou toute modification importante de l'aménagement » est un plafond de PREMIER CYCLE, déclenché par un événement — emménagement, réaménagement. Le champ `premierDelai` existe pour ça, mais le générateur ne le lit que sur la branche `misesEnService`, qui est indexée par équipement (`generateur.ts`) : sur un porteur établissement, `eq.id` est `null` et le champ ne serait jamais lu. L'écrire quand même donnerait une donnée juste et un comportement inexistant. Faute d'une date d'installation dans les lieux au modèle, la ligne sans historique tombe en `a_planifier` immédiat — le sens d'erreur voulu, celui que l'occupant voit et peut corriger, jamais celui qui se tait.\n\nCRITICITÉ 4 ET NON 5. La mise en danger directe est portée par les plafonds eux-mêmes (§ 1 à § 4 : 480 MJ/m², 680 sous sprinkleur), qui sont des états de l'aménagement ; le § 5 impose d'en faire ÉTABLIR la preuve. Un manquement se paie d'abord devant le propriétaire ou le mandataire de sécurité (§ 7), pas en flamme.\n\n`pieceAttendue: null` : l'obligation porte sur un ACTE — faire établir une vérification —, et le rapport en est la trace. Même traitement que les vérifications annuelles ; ce n'est pas `R. 4226-19`, où l'écrit EST l'obligation.\n\nRÉALISATEUR SUR LE MOT DU TEXTE : « par un organisme agréé », donc `organisme_agree` seul. Ni `personne_qualifiee` ni `bureau_controle` — l'arrêté du 31 janvier 1986 se contente d'« organismes ou techniciens compétents » à son article 103, celui-ci exige l'agrément, et confondre les deux enverrait un occupant vers la mauvaise prestation dans un sens comme dans l'autre.",
  },

  // ---------------------------------------------------------------------------
  // Habitation — arrêté du 31 janvier 1986 (titre VIII, obligations des
  // propriétaires)
  //
  // Le texte qui définit les familles d'habitation, dépouillé le 2026-09-01 —
  // il n'avait jamais été ouvert dans ce dépôt. Voir
  // `corpus/arrete-1986-habitation.ts` pour le détail article par article, et
  // notamment pour ce que la lecture N'A PAS établi : aucune des trois
  // obligations ci-dessous ne porte de restriction de famille, parce que
  // l'arrêté n'en pose aucune sur ce qu'il demande à l'exploitant. Les
  // familles y gouvernent la construction, pas l'entretien.
  //
  // Les trois lignes vivent en domaine `incendie` — c'est l'objet de l'arrêté
  // — et sont portées par l'ÉTABLISSEMENT : l'article 101 vise « le
  // propriétaire » sans subordonner quoi que ce soit à un équipement déclaré.
  // Les y accrocher reproduirait le faux négatif d'ancrage corrigé le
  // 2026-08-31 sur le registre de sécurité et la consigne incendie.
  // ---------------------------------------------------------------------------
  {
    id: "habitation-verification-annuelle-installations-securite",
    domaine: "incendie",
    libelle:
      "Vérification annuelle des installations de sécurité (immeuble d'habitation)",
    description:
      "Au moins une fois par an, le propriétaire de l'immeuble d'habitation — ou la personne responsable qu'il désigne — fait effectuer la vérification des installations de détection, de désenfumage et de ventilation, de toutes les installations fonctionnant automatiquement et des colonnes sèches. Il s'assure en particulier du bon fonctionnement des portes coupe-feu, des ferme-portes et des dispositifs de manœuvre des ouvertures en partie haute des escaliers. Les vérifications sont effectuées par des organismes ou techniciens compétents, qu'il choisit.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 31 janvier 1986, art. 101 (vérifications annuelles à la charge du propriétaire)",
        article: "Arrêté 1986-01-31 art. 101",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006828539",
        note: "« Le propriétaire ou, le cas échéant, la personne responsable désignée par ses soins, est tenu de faire effectuer, AU MOINS UNE FOIS PAR AN, les vérifications des installations de détection, de désenfumage, de ventilation, ainsi que de toutes les installations fonctionnant automatiquement et des colonnes sèches. Il doit s'assurer, en particulier, du bon fonctionnement des portes coupe-feu, des ferme-portes ainsi que des dispositifs de manoeuvre des ouvertures en partie haute des escaliers. » Relevé sur Légifrance le 2026-09-01, puis relu sur une seconde URL distincte : les deux relevés sont identiques mot pour mot. Version en vigueur depuis le 5 mars 1986, aucun texte modificateur.",
        versionConstatee: "1986-03-05",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 31 janvier 1986, art. 103 (qualité du vérificateur)",
        article: "Arrêté 1986-01-31 art. 103",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006828541",
        note: "« Les vérifications visées à l'article 101 ci-avant doivent être effectuées par des organismes ou techniciens COMPÉTENTS, choisis par le propriétaire. » Relevé le 2026-09-01. C'est cet article qui fixe `realisateurs` — et il n'exige ni agrément, ni accréditation, ni certification.",
        versionConstatee: "2015-10-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 31 janvier 1986, art. 1er (champ d'application : habitations dont le plancher bas du logement le plus haut est à 50 m au plus)",
        article: "Arrêté 1986-01-31 art. 1",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000042744547",
        note: "Contexte, pas fondement : cet article borne le champ des quatre familles. Au-delà de 50 mètres, l'immeuble relève du régime IGH et non de cet arrêté.",
        versionConstatee: "2020-12-25",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    porteur: "etablissement",
    typologies: { habitation: true },
    equipementsEnContexte: ["DESENFUMAGE", "VMC", "ALARME_INCENDIE"],
    notesInternes:
      "Créée le 2026-09-01, au dépouillement de l'arrêté du 31 janvier 1986. C'est l'unique obligation périodique du texte, et le référentiel ne la portait pas : neuf obligations déclaraient la typologie `habitation` — sept d'ascenseur, deux de VMC-gaz — mais aucune ne venait de l'arrêté qui régit la sécurité incendie des immeubles d'habitation.\n\nPAS DE RESTRICTION DE FAMILLE, ET C'EST LE RÉSULTAT PRINCIPAL DU LOT. L'article 101 ne mentionne aucune famille, ni directement ni par renvoi : il vise « le propriétaire » de tout bâtiment entrant dans le champ de l'article 1er, c'est-à-dire les quatre familles. La tentation était de poser `familles: [\"TROISIEME_B\", \"QUATRIEME\"]` puisque les colonnes sèches, l'un des objets de la vérification, n'existent que là (art. 98). Ce serait une erreur de lecture : l'article 98 dispense en outre les 3ᵉ famille B d'au plus sept étages desservies par une voie échelles, si bien que la famille ne détermine même pas la présence de la colonne sèche. Et surtout, une telle condition ferait disparaître la ligne chez un propriétaire de 1ʳᵉ ou 2ᵉ famille à qui l'article impose bel et bien de vérifier SES installations de ventilation et ses ferme-portes. La famille décide de ce que le bâtiment contient ; l'article fait vérifier ce qui est là.\n\nRÉALISATEUR. `personne_qualifiee` seul, sur le verbatim de l'article 103 : « organismes ou techniciens compétents, choisis par le propriétaire ». Ni `organisme_agree` ni `organisme_accredite` ni `bureau_controle` — aucun agrément n'est requis, à la différence du contrôle technique quinquennal des ascenseurs (R. 134-12 CCH). Ajouter l'une de ces valeurs inventerait une exigence de qualification que le texte ne pose pas, et pousserait un propriétaire vers une prestation plus coûteuse que celle qu'on lui doit.\n\nPORTEUR ÉTABLISSEMENT, `equipementsEnContexte` non limitatif. L'article énumère détection, désenfumage, ventilation, « toutes les installations fonctionnant automatiquement » et colonnes sèches. Les trois catégories affichées sont celles que le modèle connaît ; « toutes les installations fonctionnant automatiquement » n'a pas d'équivalent au parc, et le dispositif d'appel prioritaire des pompiers de la 4ᵉ famille (art. 97) en est un exemple qu'aucune catégorie ne porte.\n\nCE QUE LA LIGNE NE COUVRE PAS, dit ici plutôt que passé sous silence : l'article 101 impose aussi d'« assurer l'entretien de toutes les installations concourant à la sécurité », sans rythme. Cet entretien n'est pas encodé — il n'a pas de périodicité propre et se confondrait avec les contrats d'entretien que d'autres lignes portent déjà (VMC-gaz, ascenseur). Le registre, lui, a sa ligne : `habitation-registre-securite`.\n\nNATURE : ÉCHÉANCE RÉCURRENTE (ADR-026). Un acte à refaire chaque année.",
  },
  {
    id: "habitation-registre-securite",
    domaine: "incendie",
    libelle: "Tenue du registre de sécurité (immeuble d'habitation)",
    description:
      "Le propriétaire assure l'entretien de toutes les installations concourant à la sécurité de l'immeuble et doit pouvoir le justifier par la tenue d'un registre de sécurité. Ce registre comprend au minimum les rapports des vérifications annuelles exigées par l'article 101, les rapports d'intervention d'entretien et les opérations de maintenance. Le propriétaire présente toutes les justifications utiles concernant l'entretien et la vérification des installations sur demande des agents assermentés et commissionnés à cet effet.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 31 janvier 1986, art. 103 (contenu minimal du registre)",
        article: "Arrêté 1986-01-31 art. 103",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006828541",
        note: "« Le registre défini à l'article R. 111-13 du code de la construction et de l'habitation comprend a minima : - les rapports des vérifications exigées à l'article 101 du présent arrêté ; - les rapports d'intervention d'entretien ; - les opérations de maintenance. » Relevé le 2026-09-01. La liste vient de l'arrêté du 19 juin 2015 et ne s'impose, aux termes de son article d'application, qu'aux bâtiments dont le permis de construire a été déposé après le 1er octobre 2015 ; l'existence du registre, elle, est d'origine (art. 101).",
        versionConstatee: "2015-10-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 31 janvier 1986, art. 101 in fine (le registre justifie l'entretien)",
        article: "Arrêté 1986-01-31 art. 101",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006828539",
        note: "« Il doit également assurer l'entretien de toutes les installations concourant à la sécurité et doit pouvoir le justifier par la TENUE D'UN REGISTRE DE SÉCURITÉ. » Relevé le 2026-09-01, relu sur une seconde URL distincte. C'est l'article qui crée le registre ; l'article 103 en fixe le contenu.",
        versionConstatee: "1986-03-05",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 31 janvier 1986, art. 104 (présentation aux agents assermentés)",
        article: "Arrêté 1986-01-31 art. 104",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006828542",
        note: "« Le propriétaire est tenu de présenter toutes les justifications utiles concernant l'entretien et la vérification des installations sur demande des agents assermentés et commissionnés à cet effet. » Relevé le 2026-09-01. C'est ce qui rend le registre opposable.",
        versionConstatee: "1986-03-05",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "registre de sécurité",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: { habitation: true },
    notesInternes:
      "Créée le 2026-09-01. DISTINCTE DE `incendie-registre-securite`, et il faut dire pourquoi plutôt que de laisser croire à un doublon. Celle-là est fondée sur R. 143-44 CCH et L. 4711-1 CT, et vise `{ travail: true, erp: true }` : le registre de l'employeur et celui de l'exploitant d'ERP. Celle-ci est fondée sur l'arrêté du 31 janvier 1986 et vise l'habitation. Les contenus imposés diffèrent — l'article 103 énumère les rapports de vérification, les rapports d'intervention d'entretien et les opérations de maintenance, là où R. 143-44 énumère les travaux d'aménagement, l'état nominatif du service de sécurité, les consignes et les dates d'exercices. Un immeuble d'habitation sans salarié et sans ERP ne recevait donc aucune ligne « registre », alors que l'article 101 lui en impose un. Ajouter `habitation: true` à l'obligation existante aurait fusionné deux registres au contenu différent sous un libellé et une description qui ne parlent que d'ERP et de Code du travail.\n\nUn même établissement peut recevoir les deux lignes — un immeuble d'habitation dont le rez-de-chaussée est un ERP, ou qui emploie un gardien. Ce n'est pas un défaut : ce sont deux registres que deux textes imposent, et les fondre reviendrait à décider à la place du propriétaire qu'un seul document satisfait les deux, ce qu'aucun des deux textes ne dit.\n\nPAS DE RESTRICTION DE FAMILLE : ni l'article 101, ni l'article 103, ni l'article 104 n'en mentionnent une.\n\nRENVOI NON VÉRIFIÉ, ET DÉCLARÉ COMME TEL. L'article 103 nomme « le registre défini à l'article R. 111-13 du code de la construction et de l'habitation ». Cet article du CCH N'A PAS ÉTÉ OUVERT dans ce lot. La recodification du CCH de 2021 a déplacé la numérotation R. 111-*, et ce renvoi peut désigner aujourd'hui un autre article que celui que le rédacteur de 2015 visait. L'obligation ne repose pas dessus — elle repose sur les articles 101, 103 et 104 relevés au verbatim — mais la description reprend le contenu que l'article 103 attache à ce renvoi. À rouvrir : si R. 111-13 impose davantage, la description est incomplète.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue: \"registre de sécurité\"` (ADR-026). Un registre tenu, pas un acte à refaire à date.",
  },
  {
    id: "habitation-consignes-plans-intervention",
    domaine: "incendie",
    libelle:
      "Affichage des consignes d'incendie et des plans d'intervention (immeuble d'habitation)",
    description:
      "Le propriétaire — ou la personne responsable qu'il désigne — affiche dans les halls d'entrée, près des accès aux escaliers et aux ascenseurs, les consignes à respecter en cas d'incendie ainsi que les plans des sous-sols et du rez-de-chaussée. Les consignes particulières à l'immeuble sont également affichées dans les parcs de stationnement, s'il en existe, à proximité des accès aux escaliers et aux ascenseurs. Les plans d'intervention portent au minimum l'emplacement des cloisonnements principaux et des cheminements des sous-sols, les dégagements et voies permettant d'atteindre l'extérieur, l'emplacement des ascenseurs et monte-charge avec leurs accès, celui des locaux poubelles et réceptacles de vide-ordures, et celui des moyens de secours — notamment les prises de colonnes sèches et les commandes de désenfumage.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 31 janvier 1986, art. 100 (affichage des consignes et des plans d'intervention)",
        article: "Arrêté 1986-01-31 art. 100",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006828538",
        note: "« Le propriétaire ou, le cas échéant, la personne responsable désignée par ses soins, est tenu d'afficher dans les halls d'entrée, près des accès aux escaliers et aux ascenseurs : les consignes à respecter en cas d'incendie ; les plans de sous-sols et du rez-de-chaussée. » Relevé sur Légifrance le 2026-09-01. Version en vigueur depuis le 1er octobre 2015, arrêté du 19 juin 2015 - art. 9.",
        versionConstatee: "2015-10-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "consignes d'incendie et plans d'intervention affichés",
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    porteur: "etablissement",
    typologies: { habitation: true },
    notesInternes:
      "Créée le 2026-09-01. À ne pas confondre avec `incendie-travail-consigne-affichee`, fondée sur R. 4227-37 et s. du Code du travail et due à l'employeur : celle-ci est due au propriétaire d'un immeuble d'habitation, y compris sans aucun salarié, et son contenu est différent — le Code du travail ne demande pas de plan des sous-sols ni l'emplacement des prises de colonnes sèches.\n\nPAS DE RESTRICTION DE FAMILLE : l'article 100 n'en mentionne aucune. Une maison individuelle de 1ʳᵉ famille n'a ni hall d'entrée ni accès commun aux escaliers, si bien que l'affichage y est matériellement sans objet — mais c'est une conséquence de fait, pas une dispense écrite, et l'encoder en `familles` ferait dire au texte ce qu'il ne dit pas. Le moteur retenant l'obligation lorsque la famille n'est pas renseignée, un propriétaire de maison individuelle peut voir la ligne : elle est visible, donc corrigible en renseignant la famille, ce qui est le sens qui a été donné à cette dissymétrie.\n\nDEUX RÉGIMES DANS UN SEUL ARTICLE, et l'obligation ne les sépare pas. L'affichage des consignes est d'origine (1986). La liste des cinq éléments du plan d'intervention a été ajoutée par l'arrêté du 19 juin 2015, dont l'article d'application la réserve aux bâtiments dont le permis de construire a été déposé après le 1er octobre 2015. Le modèle porte bien une année de permis de construire côté établissement, mais `TypologieApplication` ne sait pas conditionner sur elle. La ligne est donc écrite au régime le plus complet : un propriétaire d'immeuble antérieur à 2015 se verra demander un plan d'intervention que l'arrêté ne lui impose pas dans cette forme. Sur-application assumée et bornée — le contenu du plan, pas l'affichage lui-même — plutôt que de taire la liste, auquel cas les immeubles postérieurs à 2015 ne sauraient pas ce qu'on attend d'eux.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue` non nulle (ADR-026). Ce qui est dû est un écrit affiché : une case cochée sans consigne au mur serait la déclaration-qui-ressemble-à-une-preuve que l'écran d'états permanents interdit.",
  },
];
