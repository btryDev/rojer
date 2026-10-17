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
 *   [2026-10-07, ADR-039 : une norme NF peut désormais donner le RYTHME d'une
 *   obligation dont le texte ne le chiffre pas — `rythmeRetenu`, motif
 *   « norme ». NF S 61-919 est au corpus `normes` ; l'appliquer aux
 *   extincteurs hors ERP est le lot 3. APSAD R4 reste exclue.]
 */

import type { Obligation, ReferenceLegale, ReferenceNorme, RythmeRetenu } from "./types";

// -----------------------------------------------------------------------------
// NF S 61-919 — le rythme des extincteurs hors ERP (ADR-039, C59 lot 3)
//
// Le Code du travail fait maintenir les extincteurs « en bon état de
// fonctionnement » (R. 4227-29) sans dire à quel rythme. La norme NF S 61-919
// (août 2001), lue sur le scan remis par le préventeur, l'écrit. Elle se cite
// comme norme : source `NORME`, clé au corpus `normes`.
// -----------------------------------------------------------------------------

/** NF S 61-919 § 5.1.1 : la maintenance annuelle par la personne compétente. */
const REFERENCE_NF_S_61_919_ANNUELLE: ReferenceNorme = {
  source: "NORME",
  reference:
    "NF S 61-919 (août 2001), § 5.1.1 (maintenance annuelle par la personne compétente)",
  article: "NF S 61-919 § 5.1.1",
  note:
    "« La personne compétente doit effectuer tous les ans, avec une tolérance de plus ou moins deux mois, la maintenance, conformément au présent document. » Norme homologuée, citée comme norme : aucun texte en vigueur ne la rend obligatoire (ADR-039).",
};

/** NF S 61-919 § 10.1 et annexe A : la révision en atelier, dix ans au plus. */
const REFERENCE_NF_S_61_919_REVISION: ReferenceNorme = {
  source: "NORME",
  reference:
    "NF S 61-919 (août 2001), § 10.1 et annexe A, tableau A.1 (révision en atelier : 10 ans)",
  article: "NF S 61-919 § 10.1",
  note:
    "« Tous les extincteurs portatifs doivent être soumis à une révision en atelier effectuée par le fabricant ou un centre de révision à intervalles ne dépassant pas ceux donnés à l'annexe A. » Le tableau A.1 donne dix ans ; Rojer retient la décennale pour tout extincteur (décision de la propriétaire du 2026-10-08). Norme homologuée, citée comme norme (ADR-039).",
};

/** Le rythme annuel que la norme écrit et que `R. 4227-29` ne chiffre pas. */
const RYTHME_NF_S_61_919_ANNUEL: RythmeRetenu = {
  motif: "norme",
  periodicite: "annuelle",
  norme: "NF S 61-919",
  reference: REFERENCE_NF_S_61_919_ANNUELLE,
  texteVague: "maintenus en bon état de fonctionnement",
};

// -----------------------------------------------------------------------------
// GE 4 § 1 — le tableau des visites périodiques de commission, case par case
//
// Six lignes, une par bloc (catégorie × périodicité) du tableau. Elles
// partagent leurs références, la partie de leur description qui ne dépend
// d'aucune case, et l'essentiel de leurs notes : six copies d'un même
// verbatim divergent à la première correction, et c'est la divergence qu'on
// ne verrait pas.
// -----------------------------------------------------------------------------

/**
 * ~~Les deux références de GE 4 § 1, partagées par les six lignes du tableau.~~
 * [2026-10-17, sous-lot C : trois — MS 74 s'ajoute, l'acte de l'exploitant à
 * chaque visite ; huit lignes du tableau les partagent.]
 */
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
  {
    source: "ARRETE",
    reference:
      "Arrêté du 25 juin 1980, art. MS 74 (personnel compétent et matériel mis en place pour les essais lors des visites de la commission) — livre II, établissements des quatre premières catégories",
    article: "MS 74",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317754",
    note: "« Lors des visites périodiques effectuées par les commissions de sécurité, toutes dispositions doivent être prises par l'exploitant pour permettre le contrôle efficace des moyens de secours. A cet effet, la direction doit mettre en place le personnel compétent et le matériel nécessaire aux essais de fonctionnement. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020317754, seule version, en vigueur depuis le 1980-08-15. Rattaché le 2026-10-17 (sous-lot C) : l'acte accompagne chaque visite, au rythme de GE 4.",
    versionConstatee: "1980-08-15",
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
 * La note commune aux six lignes : d'où vient le tableau, comment il est
 * contrôlé, pourquoi six lignes, et ce qui reste non encodé.
 */
/** Les deux paires de la 5ᵉ catégorie dont un membre est propre au type O (ADR-045). */
const NOTE_GROUPE_5E =
  "PLUSIEURS TYPES (ADR-045). Un hôtel qui groupe d'autres exploitations (GN 2) recevrait, type par type, la ligne générale ET celle de l'hôtel. Les deux portent le même `groupeExclusif` : la plus exigeante l'emporte — celle de l'hôtel, qui fait le même acte à un rythme plus court et cite le texte général. C'est la doctrine que la note de chaque ligne écrit déjà pour l'hôtel seul (« au rythme le plus court »).\n\n";

const NOTE_GE4_TABLEAU =
  "RATTACHEMENT DU 2026-10-17 (sous-lot C, découpage validé par c6) : MS 74 — l'exploitant met en place le personnel compétent et le matériel nécessaire aux essais lors de chaque visite périodique — est cité dans `REFERENCES_GE4`, donc sur les huit lignes du tableau. Référence seule. TEMPORALITÉ : celle de la visite (rythme écrit, GE 4 § 1) ; aucune norme citée.\n\n" +
  "POUR INFORMATION DEPUIS LE 2026-10-08 (C64 ; décision 2 de la synthèse de " +
  "revue, option A, sans migration). La visite est déclenchée par " +
  "l'administration — le préventeur : « une information ». La ligne porte " +
  "`initiative: \"administration\"` : elle reste visible avec son rythme, se " +
  "peint « Pour information — visite à l'initiative de l'administration », et " +
  "n'est plus comptée comme une échéance de l'exploitant (ni retard, ni « à " +
  "faire », ni indice) ; le procès-verbal de visite se dépose et se trace au " +
  "registre. ~~Réalisateur affiché : « Organisme agréé »~~ — le champ " +
  "`realisateurs` garde `organisme_agree` (l'enum Prisma n'a pas de valeur pour " +
  "la commission ; aucune migration), mais l'affichage dit « Commission de " +
  "sécurité » par le marqueur (`conformite/initiative.ts`).\n\n" +
  "— — — NOTE COMMUNE AUX SEPT LIGNES DE GE 4 § 1 — — —\n\n" +
  "LE TABLEAU, TEL QU'IL EST ENCODÉ (types × catégories, en années) :\n" +
  "  J, O, R (1) avec hébergement, U .......... 3 | 3 | 3 | 3\n" +
  "  L, P, R (2) sans hébergement ............. 3 | 3 | 3 | 5\n" +
  "  M, N, S, T, W, X, Y ...................... 3 | 3 | 5 | 5\n" +
  "  V ........................................ 5 | 5 | 5 | 5\n\n" +
  "D'OÙ IL VIENT. Relevé du 2026-09-02 (`docs/revues/releve-ge4-tableau.md`, branche `releve/ge4-tableau`) : les libellés de lignes et de colonnes et le texte des § 1 à § 4 lus sur la donnée officielle consolidée (jeu LEGI de la DILA, LEGIARTI000029642660) ; les CARDINALITÉS de chaque ligne lues sur DEUX jeux de données officiels indépendants (LEGI consolidé et JORF tel qu'édicté en 2014) ; les POSITIONS lues d'abord sur quatre reproductions secondaires concordantes, PUIS VÉRIFIÉES CASE PAR CASE SUR LE FAC-SIMILÉ DU JOURNAL OFFICIEL par la propriétaire — les quinze colonnes sur les huit lignes, sans un écart. La réserve principale du relevé (« aucune position n'a été lue sur une source officielle ») est donc levée ; elle est reproduite ici parce que le relevé la porte encore et qu'il ne faut pas le lire sans savoir qu'elle a été levée après coup.\n\n" +
  "LE CONTRÔLE MÉCANIQUE, ET IL EST LE SEUL DISPONIBLE. Dans la donnée officielle, les cellules VIDES du tableau ne sont pas encodées — le défaut est déjà dans le texte publié au JO et se retrouve dans le consolidé. Les lignes n'ont donc pas toutes le même nombre de cellules, et une extraction qui les aligne à gauche produit un tableau faux, faux DIFFÉREMMENT selon l'outil : c'est ce qui a fait se contredire quatre extractions le 2026-09-01. Ce qui est exact et officiel, ce sont les CARDINALITÉS : trois ans → 14, 14, 7, 4 ; cinq ans → 1, 1, 8, 11 ; chaque catégorie se complétant à quinze. Un test (`conformite.test.ts`) les recalcule depuis le tableau encodé au lieu de les recopier, et refuse toute case portée à cinq ans là où le tableau dit trois.\n\n" +
  "POURQUOI SIX LIGNES, ET NON UNE. Le tableau est une fonction de deux variables ; `periodicite` est un scalaire. Il faut donc autant d'obligations que le tableau a de blocs (catégorie × valeur) : 1ʳᵉ-2ᵉ / 3ᵉ / 4ᵉ, trois ans / cinq ans. Regrouper 1ʳᵉ et 2ᵉ est exact — leurs deux lignes sont identiques —, regrouper au-delà ne l'est pas. Une septième ligne s'est ajoutée le 2026-09-08, et elle ne vient pas d'un bloc de plus : elle vient de la seule COLONNE que le tableau dédouble, R (1) avec hébergement / R (2) sans hébergement, qui met les deux moitiés du type R à des rythmes différents en 4ᵉ catégorie. Chaque établissement reçoit EXACTEMENT UNE ligne : les sept typologies forment une partition, et un test l'éprouve sur les 22 types × 4 catégories × les TROIS états de l'attribut d'hébergement — déclaré présent, déclaré absent, non renseigné —, plus le cas du type non renseigné.\n\n" +
  "POURQUOI `typesExclus`, ET POURQUOI IL A FALLU L'AJOUTER. Le complément d'un ensemble de types ne s'écrit pas avec `types` : une restriction `types` rejette l'ERP dont le `typeErp` n'est PAS RENSEIGNÉ (`docs/regles-matching.md` : « une restriction que l'on ne peut pas vérifier ne doit pas être silencieusement ignorée »). Énumérer les types à trois ans aurait donc privé de toute visite l'établissement de 1ʳᵉ à 4ᵉ catégorie qui n'a pas précisé son activité — un faux négatif MUET, exactement l'erreur que ce lot avait pour consigne de ne pas commettre. `typesExclus` est le complément, avec la sémantique inverse et pour la même raison : une exclusion invérifiable ne s'applique pas, l'établissement au type inconnu retombe sur les trois ans. Extension du modèle purement additive (aucune migration : la typologie vit en TypeScript, ADR-003).\n\n" +
  "CE QUE L'ÉNUMÉRATION `TypeErp` NE PORTE PAS, ET QUI EST SIGNALÉ PLUTÔT QUE DEVINÉ.\n" +
  "  (a) ~~LE TYPE J N'EXISTE PAS dans `TypeErp` (ni côté Prisma). Le tableau lui donne trois ans dans les quatre catégories. L'absence ne crée aucun écart de périodicité — `typesExclus` fait retomber tout type non nommé sur les lignes triennales, qui est justement le régime de J —, mais elle empêche un EHPAD ou une résidence pour personnes handicapées de se déclarer pour ce qu'il est, et l'oriente vers un type voisin. À reprendre avec l'ajout de la valeur à l'énumération, qui est une migration de schéma.~~ [RAYÉ LE 2026-09-08 : LEVÉ LE 2026-09-03 par le commit 4467e79. `TypeErp` porte J, l'énumération est dérivée du verbatim de GN 1 § 1 au corpus (`arrete-1980-livre-1.ts`) et non plus recopiée, et `types-erp.test.ts` rougit si les deux divergent. Ce manque a coûté APRÈS sa correction et non avant : la ligne restée non rayée ici et au § 4 de `docs/chantiers-ouverts.md` l'a fait rapporter deux fois comme ouvert, quatre jours plus tard. C'est l'un des trois incidents qui ont fait écrire la règle de conduite restée sur la branche `garde-fous-tests` (non fusionnée).]\n" +
  "  (b) ~~LA DISTINCTION R (1) / R (2) N'EXISTE PAS. Le tableau tient l'hébergement pour une COLONNE, pas pour une nuance : en 4ᵉ catégorie, R avec hébergement est à trois ans et R sans hébergement à cinq. Le modèle n'a aucun attribut d'établissement disant si l'exploitation héberge. Tout R est donc retenu à TROIS ANS, y compris en 4ᵉ catégorie où le tableau en met une moitié à cinq. C'est la seule sur-application volontaire de l'encodage, et elle est du bon côté : elle avance une date, elle ne l'allonge pas.~~ [RAYÉ LE 2026-09-08. LA PHRASE « le modèle n'a aucun attribut d'établissement disant si l'exploitation héberge » ÉTAIT DÉJÀ FAUSSE QUAND ELLE A ÉTÉ ÉCRITE, ET PERSONNE NE POUVAIT LE VOIR. `Etablissement.comporteLocauxSommeilPublic` est arrivé le 2026-09-02 à 08h49 (commit 8646305), cette ligne a été écrite le même jour à 09h30 (commit 2565a25), et les deux commits ne sont sur la même histoire NI DANS UN SENS NI DANS L'AUTRE — deux branches parallèles réunies plus tard dans `integration/2026-09-02-final`. La note était donc exacte sur sa branche et fausse au merge, sans qu'une seule de ses lignes soit touchée. Relire le code avant de rapporter un manque n'attrape pas ce cas-là ; ce qui l'attrape est de relire, AU MERGE, les motifs d'impossibilité des deux branches réunies. CE QUI EST ENCODÉ DEPUIS : la distinction n'ajoute aucune lettre à la nomenclature — GN 1 § 1 n'écrit qu'un seul R —, elle croise le type R avec l'attribut, que `TypologieApplication.locauxSommeilPublic` sait exprimer. En 4ᵉ catégorie, R + hébergement déclaré → trois ans, R + absence DÉCLARÉE d'hébergement → cinq ans, R non renseigné → trois ans, le plus court, parce qu'un allègement ne se prend jamais sur un silence. En 1ʳᵉ, 2ᵉ et 3ᵉ catégories le tableau met les deux R à trois ans : la question ne s'y pose pas et aucune ligne n'y est scindée.]\n" +
  "  (c) LES HUIT TYPES SPÉCIAUX — PA, CTS, SG, PS, GA, OA, REF, EF — N'ONT AUCUNE COLONNE au tableau. GE 4 § 1 ne leur fixe rien. Aucune périodicité ne leur est inventée : ils ne figurent dans aucune liste `types` des lignes quinquennales, et tombent donc sur les lignes triennales par le jeu de `typesExclus` — c'est-à-dire au statu quo, qui est la borne prudente. Ce que ce référentiel ne sait pas, c'est où LEUR périodicité est fixée ; la question est ouverte, pas tranchée.\n\n" +
  "CE QUI N'EST PAS ENCODÉ, ET NE DOIT PAS L'ÊTRE.\n" +
  "  § 2 — bâtiments isolés : la catégorie s'apprécie bâtiment par bâtiment et la visite se fait pour l'ensemble « avec la périodicité la plus courte de celles qui correspondent aux catégories des bâtiments ». Le produit ne détermine pas de catégorie par bâtiment (ADR-019 : le bâtiment est un lieu). Nommé en description.\n" +
  "  § 3 — après deux visites périodiques consécutives conclues par un avis favorable, un établissement sans locaux d'hébergement peut voir son délai « prolongé DANS LA LIMITE DE CINQ ANS », sur proposition de la commission inscrite au procès-verbal. C'est une FACULTÉ SOUS PLAFOND soumise à décision, pas un rythme, et elle suppose un historique que le produit n'observe pas. Deux tests interdisent que `quinquennale` s'y glisse : ils vérifient que la valeur cinq ans d'une ligne vient d'une case du TABLEAU, jamais du § 3.\n" +
  "  § 4 — le maire ou le préfet peut modifier la fréquence des contrôles par arrêté, après avis de la commission. Pouvoir de l'autorité exercé par acte administratif individuel : prescription particulière (ADR-035), qui surcharge la périodicité sur un dossier donné.\n\n" +
  "PORTEUR ÉTABLISSEMENT (ADR-022) : GE 4 § 1 ne conditionne la visite à aucun équipement, il vise « les établissements des 1re, 2e, 3e et 4e catégories ». La ligne existe donc même si rien n'est déclaré, et n'en produit qu'une.\n\n" +
  "FRONTIÈRE AVEC LA 5ᵉ CATÉGORIE, INCHANGÉE : GE 4 relève du Livre II, écarté en 5ᵉ par PE 1 § 1 ; `incendie-erp-5-visite-commission` se fonde sur PE 37 et ne vise que la 5ᵉ. Aucun établissement ne peut recevoir une ligne de chaque, et un test l'éprouve sur les cinq catégories.\n\n" +
  "LE PIÈGE DE LA DATE, RAPPELÉ POUR QU'IL NE SE REPRENNE PAS : le sélecteur de la page de SECTION affiche pour GE 4 « 01/01/2015 au 01/06/2027 ». Ce terme est celui de GE 2 et GE 6, qui vivent dans la même section ; trois lectures s'y sont laissé prendre le 2026-09-01. La section relue AU 1ER JUILLET 2027 rend GE 4 présent et inchangé. Aucune `relectureDue` n'est due de ce chef.\n\n" +
  "RÉSERVE D'USAGE : la visite est initiée par l'administration, pas par l'exploitant. Une déclaration « en place » n'aurait pas de sens sur ces lignes ; ce qui se trace est la visite QUAND ELLE A EU LIEU.\n\n" +
  "NATURE : ÉCHÉANCE RÉCURRENTE (ADR-026). La visite revient.\n\n" +
  "PLUSIEURS TYPES (ADR-045, décision de la propriétaire du 2026-10-16). Un établissement qui groupe plusieurs exploitations (GN 2) reçoit les lignes de chacun de ses types : un hôtel O + restaurant N de 3ᵉ catégorie sortirait la triennale ET la quinquennale. Les lignes de chaque bloc portent donc le même `groupeExclusif`, et UNE SEULE visite est servie au groupement, AU RYTHME LE PLUS COURT des types déclarés. C'EST UNE LECTURE PAR ANALOGIE, ET AUCUN TEXTE NE LE DIT : GE 4 § 2 fixe « la périodicité la plus courte » pour les bâtiments ISOLÉS d'un même établissement (GN 3) ; pour des exploitations GROUPÉES, GN 2 § 3 applique les dispositions de chaque type sans dire laquelle l'emporte. La propriétaire a cherché un texte ou une doctrine (guides préfectoraux) et n'en a trouvé aucun. La date fixée au procès-verbal prime toujours, par une prescription particulière de source `pv_commission_securite` (ADR-035).";

// -----------------------------------------------------------------------------
// Livre II, titre II — dispositions particulières des types M, N, O et W
// (décision de la propriétaire du 2026-10-14)
//
// Cinq lignes d'établissement, bornées aux catégories 1 à 4 ET aux types dont
// le chapitre a été lu (corpus `arrete-1980-livre-2-titre-2`). Elles citent
// GN 10 en entier, comme les états permanents du livre III : la phrase ci-
// dessous est la constante `DESCRIPTION_GN_10` (`texte-gn10.ts`), recopiée en
// littéral parce qu'un fichier de données n'importe pas de valeur ;
// `conformite.test.ts` exige que chaque description la contienne mot pour mot.
// -----------------------------------------------------------------------------

const GN_10_PHRASE =
  "Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « § 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité. »";

/** La borne commune : les quatre premières catégories, où le livre II s'applique (PE 1 § 1). */
const CATEGORIES_LIVRE_2 = ["N1", "N2", "N3", "N4"] as const;

/** Ce qui vaut pour les cinq lignes, dit une fois. */
const NOTE_TITRE_2_COMMUNE =
  "DÉCISION DE LA PROPRIÉTAIRE DU 2026-10-14 (exception explicite à « l'encodage est terminé »). Le titre II du livre II n'avait jamais été ouvert : la cible était N5 seule. Elle est devenue, le 2026-10-12, ce que l'onboarding ne refuse pas, catégories 1 à 4 comprises (ADR-031). Les quatre chapitres des secteurs cibles — M (magasins), N (restaurants), O (hôtels), W (bureaux) — ont été lus en entier le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée), cent vingt et une entrées, classées au corpus `arrete-1980-livre-2-titre-2`.\n\n" +
  "BORNE : `categories` N1 à N4 ET `types`. Chaque chapitre ne s'applique qu'au-dessus des seuils de public de son article 1er, c'est-à-dire en catégories 1 à 4 ; en 5ᵉ, PE 1 § 1 écarte le livre II entier. Les autres types n'ont pas été lus : ils ne reçoivent rien. Un `typeErp` non renseigné rejette (restriction `types`, règle du dépôt) ; la base rend l'absence impossible pour un ERP (CHECK `Etablissement_erp_type_categorie_requis`).\n\n" +
  "~~CE QUE LA BORNE NE SAIT PAS : GN 2 applique à un établissement qui groupe plusieurs exploitations les dispositions de CHACUN de leurs types. `Etablissement.typeErp` n'en porte qu'un, le principal : un magasin avec un espace de restauration ne reçoit que les lignes du type M (`docs/registre-releve-types-erp.md`, D.2).~~ [2026-10-17, ADR-045 : un établissement déclare ses autres types (`typesErpAutres`, PR #50), et le moteur sert les lignes de chacun (PR #49) — un magasin avec un espace de restauration qui coche N reçoit aussi les lignes du type N.]\n\n" +
  "GN 10 cité en description, comme sur les états permanents du livre III : le règlement ne s'applique pas aux établissements existants, hors administratif, contrôles, vérifications et entretien, et le moteur ne lit pas de date d'ouverture. Sur-application visible, assumée sur le même pied que PE 27.";

/**
 * Ce qui vaut pour les états permanents du livre II, titre Ier, encodés par le
 * sous-lot C (2026-10-17), dit une fois.
 */
const NOTE_TITRE_1_COMMUNE =
  "SOUS-LOT C DU PLAN « MISE À JOUR DU RÉFÉRENTIEL » (2026-10-17, `propositions/plan-maj-referentiel-2026-10-17.md`, § 4 ; découpage validé par c6 le même jour). Le titre Ier du livre II a été lu en entier le 2026-10-17 (`lot/ref-a-corpus-titre-1`, corpus `arrete-1980-livre-2` passé `integral`) ; les actes qu'il porte et que le référentiel ne servait pas étaient au § 9 de `docs/couverture-declaree-du-produit.md`, transitoirement. Chaque article a été relu le 2026-10-17 par l'API Légifrance (PISTE, BAC À SABLE ; égalité avec la production non vérifiée) avant d'être encodé.\n\n" +
  "BORNE : `categories` N1 à N4, tous types. Le titre Ier s'applique aux établissements des quatre premières catégories ; en 5ᵉ, PE 1 § 1 écarte le livre II, sauf renvoi exprès (PE 37 pour GE 5).\n\n" +
  "GN 10 (décision de c6 du 2026-10-17, Q7) : la phrase entière est citée en description sur les états permanents qui ne sont ni administratifs, ni des contrôles, ni de l'entretien — MS 41, MS 70 § 5, MS 57 § 1, MS 52 § 1, GC 4 § 3. Elle ne l'est pas sur GE 5 (pièce de la procédure de contrôle), ni sur les contrats d'entretien et la notice de maintenance (MS 58, MS 68, CO 48 § 3 e), EC 13), que GN 10 § 1 maintient pour l'établissement existant. Le moteur ne lit pas de date d'ouverture : sur-application visible, assumée sur le même pied que PE 27.";

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
    usageEcran: null,
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
    //
    // ~~`{ categories: ["N5"] }`~~ — 2026-10-13 : l'hôtel (type O) sort de
    // cette ligne. `PO 1 § 3` lui impose le même acte — contrôler l'ensemble
    // des installations techniques par un technicien compétent — tous les
    // DEUX ans, et `PO 8 § 1` garde PE 4 et PO 1 § 3 dus aux hôtels existants : deux
    // lignes donneraient deux rendez-vous, à deux et trois ans, pour un seul
    // contrôle. `incendie-hotel-po-controle-biennal-installations` porte les
    // deux textes au rythme le plus court. `typesExclus` retient le type
    // inconnu : une exclusion invérifiable ne s'applique pas.
    typologies: { erp: { categories: ["N5"], typesExclus: ["O"] } },
    porteur: "etablissement",
    groupeExclusif: "erp5-entretien-installations-techniques",
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
      NOTE_GROUPE_5E +
      "Porteur établissement (ADR-022) — c'est l'obligation qui a motivé le chantier.\n\nVersion relue sur Légifrance le 2026-08-27 : PE 4 est en vigueur dans sa rédaction du 2026-07-01 (arrêté du 1er décembre 2025). Le § 2 disait « En cours d'exploitation » ; il dit désormais « Tous les trois ans AU PLUS ». La périodicité triennale est donc écrite dans le texte, elle n'est plus déduite.\n\nChamp d'application, par renvoi : PE 2 § 3, dans sa version du 2026-01-01 (même arrêté), maintient « PE 4, PE 10 B, PE 24 § 1, PE 26 § 1 et PE 27 » pour les établissements recevant au plus 19 personnes. La rédaction antérieure ne maintenait que « PE 4 § 2 et § 3 ». Le champ s'est donc élargi, et l'argument tient a fortiori : l'obligation atteint les établissements qui ont le MOINS déclaré, ceux-là mêmes chez qui une décomposition par installation ne produirait aucune ligne.\n\n`equipementsEnContexte` n'est pas un déclencheur : ce sont les installations que le texte cite (« chauffage, éclairage, installations électriques, appareils de cuisson, circuits d'extraction, ascenseurs, moyens de secours »), affichées pour aider le dirigeant à voir ce qui est visé chez lui. Le texte finit par « etc. » — l'interface accompagne la liste de la mention « non limitative », et il ne faut pas la refermer.\n\nCe que cette ligne ne fait PAS : elle ne lève aucune des neuf sur-applications du Livre II — six ici, trois dans `electricite.ts`. Leurs notes annoncent « à reprendre lorsque le référentiel saura porter PE 4 § 2 » — le référentiel le sait désormais, mais savoir le porter n'est que la moitié de la condition. L'autre moitié est un point de droit, article par article : le Code du travail fonde-t-il chacune d'elles indépendamment du classement ERP ? Tant que cette relecture n'est pas faite sur Légifrance, retirer les lignes détruirait chez l'utilisateur des échéances dont on n'a pas établi qu'elles ne sont pas dues. Voir la note commune de ces neuf lignes.\n\nLe chapeau neuf de PE 4 (installations de gaz neuves ou modifiées, renvoi à PE 10 B, applicable au 2026-07-01) n'est pas encodé ici : c'est une vérification à la construction ou après travaux, pas une échéance récurrente. À instruire à part.",
  },
  {
    id: "incendie-hotel-po-controle-biennal-installations",
    domaine: "incendie",
    libelle:
      "Entretien et contrôle de l'ensemble des installations techniques tous les deux ans (hôtel de 5ᵉ catégorie)",
    description:
      "Dans un hôtel de 5ᵉ catégorie, « l'ensemble des installations techniques doit être contrôlé par un technicien compétent tous les deux ans, à l'exception des installations électriques et des systèmes de détection incendie qui doivent être contrôlés annuellement » (PO 1 § 3). Comme tout établissement de 5ᵉ catégorie, l'hôtel fait aussi procéder, au plus tous les trois ans, aux opérations d'entretien et de vérification de l'ensemble de ses installations et équipements techniques (PE 4 § 2). Rojer suit ces deux textes sur une seule ligne, au rythme le plus court : deux ans. Le contrôle annuel des installations électriques et des systèmes de détection incendie n'est pas sur cette ligne : Rojer en suit l'échéance dès que l'installation électrique et l'alarme sont déclarées au parc. Le contrôle des ascenseurs relève d'autres dispositions. L'obligation porte sur l'ensemble, avec une liste que le texte laisse ouverte : elle est due même si aucun équipement n'est déclaré dans l'outil.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PO 1 § 3 (règles spécifiques aux hôtels)",
        // La clé de l'entrée de corpus propre au volet biennal, et non « PO 1 »
        // dont l'entrée nomme le volet annuel électrique.
        article: "PO 1 § 3 — contrôle biennal des installations techniques",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024770707",
        note: "« § 3. L'ensemble des installations techniques doit être contrôlé par un technicien compétent tous les deux ans, à l'exception des installations électriques et des systèmes de détection incendie qui doivent être contrôlés annuellement. Le contrôle des ascenseurs relève des dispositions particulières précisées dans le cadre de l'article AS 9 du règlement. » Version en vigueur depuis le 30 octobre 2011, relue par l'API Légifrance le 2026-10-07 (C60).",
        versionConstatee: "2011-10-30",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PO 8 § 1 (extension aux hôtels existants)",
        article: "PO 8",
        url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374775/",
        note: "« § 1. Les prescriptions définies dans la présente section sont applicables en complément des articles PE 4, PE 24, PE 26, PE 27, PE 32, PE 36, PO 1 (§ 3) et PO 5. » Relu par l'API Légifrance le 2026-10-07 (C60). PO 1 § 3 vaut donc pour tous les hôtels, existants compris.",
        versionConstatee: "2011-10-30",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 4 § 2",
        article: "PE 4",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024760269",
        versionConstatee: "2026-07-01",
      },
    ],
    periodicite: "biennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    // Ceux de PE 4 § 2, dont cette ligne tient lieu pour l'hôtel : PO 1 § 3
    // dit « technicien compétent », mais la ligne triennale exige déjà une
    // personne qualifiée ou un organisme agréé (l'intersection, voir sa note).
    // Prendre ici l'exigence la plus basse ferait de l'hôtel le seul ERP de
    // 5ᵉ catégorie où un gaz se vérifie par une personne seulement compétente.
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { erp: { categories: ["N5"], types: ["O"] } },
    porteur: "etablissement",
    groupeExclusif: "erp5-entretien-installations-techniques",
    // La liste de PE 4 § 2, moins ce que PO 1 § 3 met à un autre rythme ou
    // sous d'autres dispositions : l'électricité (annuelle,
    // `incendie-hotel-po-controle-annuel-electricite`) et l'ascenseur.
    // [2026-10-13, revue : ~~ALARME_INCENDIE~~ retirée — PO 1 § 3 excepte
    // la détection incendie du biennal, contrôlée chaque année.]
    equipementsEnContexte: [
      "DESENFUMAGE",
      "APPAREIL_CUISSON_ERP",
      "EXTINCTEUR",
      "RIA",
    ],
    // Une scission au sens de `succedeA` : la population « hôtel de 5ᵉ
    // catégorie » quitte la ligne triennale (`typesExclus: ["O"]`) pour
    // celle-ci. Sans la déclarer, la ligne triennale d'un hôtel serait
    // archivée ou supprimée, et celle-ci naîtrait « à planifier » sans tenir
    // compte du dernier contrôle déposé (revue de sécurité du 2026-10-13).
    succedeA: ["incendie-erp-pe4-entretien-installations-techniques"],
    notesInternes:
      NOTE_GROUPE_5E +
      "Créée le 2026-10-13, décision de la propriétaire : l'hôtel entre dans la cible redéfinie le 2026-10-12 (ce que l'onboarding ne refuse pas), et le chapitre PO est le seul de ses manques à être encodé — exception assumée à « encodage terminé ». Le corpus portait PO 1 § 3 en `obligation_manquante` avec ce motif : « le référentiel ne sait pas porter \"l'ensemble\" ». Il le sait depuis l'ADR-022 : c'est exactement ce que fait `incendie-erp-pe4-entretien-installations-techniques`.\n\nUNE LIGNE, ET NON DEUX. ~~PO 8 § 1 applique PO 1 § 3 « en complément » de PE 4~~ [2026-10-13, revue : PO 8 § 1 applique SA section « en complément des articles PE 4, […] PO 1 (§ 3) », qui restent donc dus aux hôtels existants] : l'hôtel doit les deux. Mais les deux textes nomment le même acte — contrôler l'ensemble des installations techniques par un technicien compétent — à deux rythmes, trois ans au plus et deux ans. Le contrôle biennal satisfait le triennal ; deux lignes donneraient deux rendez-vous pour un contrôle. La ligne triennale exclut donc le type O (`typesExclus`), et celle-ci cite les deux textes. ~~Même raisonnement que la ligne CCH des ascenseurs, à laquelle AS 9 a été ajouté en contexte plutôt qu'en seconde ligne.~~ [2026-10-13, revue : précédent faux — le préventeur a levé ce refus le 2026-10-07 (« deux régimes, deux lignes », `ascenseurs.ts`). Ici les deux textes nomment le même acte et le même objet, à deux rythmes ; c'est la partition des extincteurs (`extincteurs-partition.test.ts`) : un acte, un rythme, celui qui est écrit le plus court.] La description ne dit pas que le biennal « tient lieu » du triennal — aucun texte ne le dit — : elle dit que Rojer suit les deux sur une ligne.\n\nCE QUE LE BIENNAL N'EMPORTE PAS. Le texte en excepte l'électricité et la détection incendie (annuelles) et renvoie l'ascenseur à AS 9. L'électricité a sa ligne depuis le 2026-08-26, ~~;~~ [2026-10-13, revue — mais portée par l'équipement : un hôtel qui n'a pas déclaré son installation électrique ne la voit pas, et la ligne triennale, qui la nommait, ne lui est plus servie ; la description le dit] ; la détection est servie par `incendie-erp-ssi-annuelle`, portée par l'alarme déclarée ; l'ascenseur reste suivi par les lignes du CCH — le préventeur borne AS 9 aux N1–N4 (C64), Rojer le suit.\n\nRELECTURE : PO 1 et PO 8 relus par l'API Légifrance le 2026-10-07 (C60), en vigueur depuis le 2011-10-30, texte inchangé. Non relus de nouveau pour cette ligne.",
  },
  // ---------------------------------------------------------------------------
  // Travail (Code du travail) — consignes, exercices, moyens de lutte
  // ---------------------------------------------------------------------------
  {
    id: "incendie-travail-moyens-lutte",
    domaine: "incendie",
    libelle:
      "Maintenance annuelle de l'extincteur, pour le maintenir en bon état de fonctionnement (travail, hors ERP)",
    description:
      "L'extincteur est maintenu en bon état de fonctionnement (R. 4227-29), pour que tout commencement d'incendie puisse être rapidement et efficacement combattu (R. 4227-28). Le Code du travail ne fixe pas le rythme de cet entretien ; la norme NF S 61-919 (août 2001) le fixe : « La personne compétente doit effectuer tous les ans, avec une tolérance de plus ou moins deux mois, la maintenance » (§ 5.1.1). C'est une norme, citée comme norme. En ERP, la vérification annuelle est écrite par le règlement de sécurité (MS 38 § 4) et fait l'objet de sa propre ligne : celle-ci ne s'y ajoute pas. Le nombre d'extincteurs dont l'établissement doit être doté fait l'objet d'une ligne d'établissement distincte.",
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
    rythmeRetenu: RYTHME_NF_S_61_919_ANNUEL,
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee", "personne_competente"],
    criticite: 5,
    transmet: [],
    // `erp: false` : la partition avec `incendie-erp-extincteurs-annuelle`
    // (ADR-039, « un rythme écrit l'emporte toujours »). Voir les notes.
    typologies: { travail: true, erp: false },
    categoriesEquipement: ["EXTINCTEUR"],
    notesInternes:
      "RYTHME DE LA NORME NF S 61-919, LE 2026-10-07 (C59 lot 3, relecture du préventeur, ADR-039). Le préventeur : « Préco annuelle » ; la propriétaire a tranché le 07/10 que les normes sont admises. `R. 4227-29` dit « maintenus en bon état de fonctionnement » sans rythme ; la NF S 61-919 (août 2001) l'écrit, § 5.1.1 : « La personne compétente doit effectuer tous les ans, avec une tolérance de plus ou moins deux mois, la maintenance, conformément au présent document. » `periodicite` reste `autre` (le rythme du TEXTE) ; `rythmeRetenu` porte l'annuelle de la norme, et la ligne passe de l'écran « en place » au calendrier, née « à planifier » (ADR-036, aucun retard rétroactif). L'amendement du 2026-08-27 ci-dessous (« une norme n'est pas opposable par elle-même ») est AMENDÉ par l'ADR-039 : il reste vrai qu'aucun texte ne rend la norme obligatoire, mais une norme lue peut désormais donner le rythme, affiché « Rythme de la norme NF S 61-919 ».\n\nPARTITION AVEC L'ERP — `typologies: { travail: true, erp: false }`. Un établissement ERP ET de travail recevait cette ligne ET `incendie-erp-extincteurs-annuelle` : deux annuelles pour le même extincteur. L'annuelle ERP est écrite par le TEXTE (MS 38 § 4, « une vérification annuelle ») ; un rythme écrit l'emporte toujours, donc c'est celle-ci qui se retire chez un ERP. `ExclusionMutuelle` n'était pas l'outil : elle ne vaut qu'entre titres de salarié (`exclusion.test.ts`). L'ERP ne perd rien de `R. 4227-29` : la dotation (`incendie-travail-extincteurs-dotation`, établissement, `travail: true`) le cite toujours en entier, « maintenus en bon état de fonctionnement » compris, et l'annuelle ERP porte l'acte. Elle est servie à TOUT ERP, 5ᵉ catégorie comprise (sur-application assumée, notes de `incendie-erp-extincteurs-annuelle`) : chaque établissement de travail qui déclare un extincteur reçoit donc exactement UNE annuelle — `extincteurs-partition.test.ts` le tient sur la catégorie inconnue et les cinq catégories. SI L'ANNUELLE ERP EST UN JOUR RESTREINTE AUX QUATRE PREMIÈRES CATÉGORIES, CETTE PARTITION DOIT L'ÊTRE DU MÊME MOUVEMENT — le test rougira.\n\nLIBELLÉ : « maintenance annuelle », le mot de la norme (§ 5.1.1), et « hors ERP ». Réalisateurs inchangés : la norme dit « la personne compétente ».\n\nRÉDUITE AU MAINTIEN EN ÉTAT LE 2026-09-28 (D25, option (a), revue indépendante du lot 2) : la dotation de R. 4227-29 est portée par `incendie-travail-extincteurs-dotation` ; le libellé « Présence et maintien en état des moyens de lutte » et la description « doivent être dotés » la faisaient lire une fois par extincteur en plus de la ligne d'établissement. « Accessibles » retiré : le mot n'est ni dans R. 4227-28 ni dans R. 4227-29.\n\nAMENDEMENT 2026-08-27, audit systématique des périodicités sans source porteuse. L'obligation affichait une échéance ANNUELLE en ne citant que R. 4227-28 et R. 4227-29. Section R. 4227-28 à R. 4227-41 relue à la source : AUCUN de ces articles ne fixe de périodicité annuelle, pour quoi que ce soit. La seule périodicité de toute la section est celle de R. 4227-39, « au moins tous les six mois », et elle porte sur les exercices et essais, pas sur les extincteurs. R. 4227-29 dit « maintenus en bon état de fonctionnement » — une obligation d'ÉTAT, sans rythme.\n\nLa vérification annuelle des extincteurs existe bien, mais elle vient de la norme NF S 61-919 et des contrats de maintenance, pas du Code du travail. ~~Une norme n'est pas opposable par elle-même. C'est le même motif que la règle APSAD R4 retirée en août.~~ [2026-10-07, ADR-039 : une norme lue peut donner le rythme ; APSAD R4 reste exclue — ce n'est pas une norme homologuée.]\n\n`periodicite` passe à `autre` : l'obligation reste, parce que doter l'établissement de moyens de lutte et les maintenir en état est bien exigé, ~~mais le produit cesse d'afficher une date que le droit ne donne pas~~ [2026-10-07 : la date revient, par `rythmeRetenu` et marquée « Rythme de la norme NF S 61-919 » ; `periodicite` reste `autre`]. Les ERP ne perdent rien : `incendie-erp-extincteurs-annuelle` porte l'annuelle pour eux, fondée sur ~~MS 73~~ MS 38 § 4 [2026-10-07, C60 : MS 38 § 4 est son fondateur, « une vérification annuelle » ; MS 73 § 2 n'y est cité qu'en seconde référence].\n\nNATURE : ÉTAT PERMANENT (ADR-026). C'est la lecture que l'amendement du 2026-08-27 avait faite du texte — « R. 4227-29 dit « maintenus en bon état de fonctionnement » — une obligation d'ÉTAT, sans rythme » — sans qu'aucun champ ne puisse la porter. Elle l'est désormais, et `periodicite: \"autre\"` cesse d'être le seul indice.",
  },
  {
    id: "incendie-travail-extincteurs-revision-atelier-decennale",
    // ADR-042 (2026-10-17) : niveau audit — au référentiel, hors du quotidien.
    niveau: "audit",
    domaine: "incendie",
    libelle:
      "Révision en atelier de l'extincteur, tous les dix ans au plus (travail, hors ERP)",
    description:
      "L'extincteur est maintenu en bon état de fonctionnement (R. 4227-29). Outre sa maintenance annuelle, la norme NF S 61-919 (août 2001) le soumet à une révision en atelier, par le fabricant ou un centre de révision, à intervalles ne dépassant pas ceux de son annexe A : dix ans (§ 10.1, tableau A.1). C'est une norme, citée comme norme. La norme compte cet intervalle « de la date de fabrication ou de la dernière recharge effective ou de la révision en atelier » (§ 10.1) ; Rojer, qui ne connaît ni la fabrication ni la recharge, le compte de la mise en service déclarée de l'appareil, puis du dernier rapport déposé. Une révision datée par la norme peut donc tomber plus tôt que celle du calendrier : la date de fabrication est marquée sur le corps de l'appareil. En ERP, la révision tous les dix ans est écrite par le règlement de sécurité (MS 38 § 4) et fait l'objet de sa propre ligne : celle-ci ne s'y ajoute pas.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-29",
        article: "R. 4227-29",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532079/",
        note: "« Le premier secours contre l'incendie est assuré par des extincteurs en nombre suffisant et maintenus en bon état de fonctionnement. » Relu sur l'API Légifrance (sandbox) le 2026-10-07 (`relecture-jc-2026-10/textes.md`) : aucun rythme.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-28",
        article: "R. 4227-28",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532081/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    rythmeRetenu: {
      motif: "norme",
      periodicite: "decennale",
      norme: "NF S 61-919",
      reference: REFERENCE_NF_S_61_919_REVISION,
      texteVague: "maintenus en bon état de fonctionnement",
    },
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee", "fabricant"],
    criticite: 4,
    transmet: [],
    // Même partition que l'annuelle : en ERP, MS 38 § 4 écrit la décennale.
    typologies: { travail: true, erp: false },
    categoriesEquipement: ["EXTINCTEUR"],
    // ~~2026-10-07 (C60) : pour le halon, le tableau A.1 écrit « Voir note 3 »
    // en révision, et la note 3 ne donne aucun intervalle. Au silence du
    // type, la ligne reste.~~ [2026-10-08, C66 : la condition `enum_differente`
    // sur `typeExtincteur` est retirée avec la question — la décennale vaut
    // pour tout extincteur (décision de la propriétaire, « on s'en tient à ce
    // que dit Julien » : la norme a été fournie pour l'annuelle et la
    // décennale « dans tous les établissements »).]
    notesInternes:
      "NIVEAU AUDIT DEPUIS LE 2026-10-17 (ADR-042). Décision de la propriétaire du même jour, après la relecture du préventeur : « toutes les suggestions sont acceptées plus p9 du référentiel \"Révision en atelier de l'extincteur, tous les dix ans au plus (travail, hors ERP)\" » — la page 9 du référentiel complet remis au préventeur, qui porte cette ligne. La décision ne donne pas de motif, et ce paragraphe n'en ajoute pas. Ce que la ligne dit déjà d'elle-même : côté travail, le texte (`R. 4227-29`) n'impose que le maintien « en bon état de fonctionnement », sans rythme ; les dix ans viennent de la seule norme NF S 61-919 (§ 10.1, tableau A.1). La maintenance annuelle de l'extincteur hors ERP, `incendie-travail-moyens-lutte` (rythme de la même norme, § 5.1.1), reste suivie. En ERP, rien ne change : la révision tous les dix ans y est écrite par le règlement de sécurité lui-même (MS 38 § 4), et `incendie-erp-extincteurs-revision-decennale` reste servie. L'OBLIGATION EST LÉGALE ET LE RESTE : `R. 4227-29` reste cité et lu au corpus, et la NF S 61-919 reste citée comme norme. Elle sort du quotidien — ni calendrier, ni « Ce qui doit être en place », ni rappel — et reste nommée, avec sa référence, sur la page « Ce que Rojer ne couvre pas », rubrique « Niveau audit », au dossier qu'elle peut concerner. Effet en base : les lignes déjà posées sont archivées si elles portent une trace, supprimées sinon. RÉACTIVER : retirer `niveau`, monter la version.\n\nCRÉÉE LE 2026-10-07 (C59 lot 3, item 2 ; relecture du préventeur, ADR-039). Le préventeur, p. 6 du référentiel annoté, sur la révision décennale ERP : « valable pour tous les établissements » ; à la question « sur quel texte repose son application hors ERP ? », sa réponse renvoie à la norme. Le Code du travail ne fixe aucune révision (`R. 4227-28` à `R. 4227-41` relus, aucune périodicité hors `R. 4227-39`). La NF S 61-919, lue sur le scan p. 10 et p. 12 le 2026-10-07 : § 10.1 « Tous les extincteurs portatifs doivent être soumis à une révision en atelier effectuée par le fabricant ou un centre de révision à intervalles ne dépassant pas ceux donnés à l'annexe A » ; tableau A.1, colonne « Révision en atelier et renouvellement de la charge (annexe D) » : 10 ans pour l'eau, la mousse, la poudre (avec ou sans opercule) et le CO2 ; « Voir note 3 » pour le halon ~~(vidé et récupéré, plus rechargé)~~ [2026-10-07, C60 : la note 3 ne dit rien de la recharge ; elle dit : « Les extincteurs portatifs à halon ne doivent pas être déchargés mais vidés selon une méthode permettant de récupérer le halon (voir annexe G). »]. ~~Aucun intervalle de révision n'est donc écrit pour le halon : la ligne s'en retire par `enum_differente` sur la valeur `halon` du type, entrée le même jour.~~ [2026-10-08, C66 : condition et question `typeExtincteur` retirées ; la décennale vaut pour tout extincteur, halon compris — décision de la propriétaire (« on s'en tient à ce que dit Julien »).]\n\nPOURQUOI UNE LIGNE À PART : même motif que la jumelle ERP `incendie-erp-extincteurs-revision-decennale` — deux actes, deux dates, deux preuves. Le modèle ne porte qu'un rythme par obligation.\n\nNATURE ÉCHÉANCE RÉCURRENTE et non état permanent comme l'annuelle : la révision est un ACTE daté (démontage en atelier), que la norme répète à intervalle maximal. `periodicite: \"autre\"` reste le rythme du TEXTE (`R. 4227-29` n'en chiffre aucun) ; le décennal est `rythmeRetenu`, motif « norme ». `texteVague` = « maintenus en bon état de fonctionnement », mot pour mot de `R. 4227-29` : il s'affiche en complément de la norme.\n\nANTI-DOUBLON : `typologies: { travail: true, erp: false }`, la même partition que `incendie-travail-moyens-lutte`. Chez un ERP, la décennale de MS 38 § 4 est écrite par le texte et l'emporte ; elle est servie à tout ERP, 5ᵉ catégorie comprise (sur-application assumée). ~~`extincteurs-partition.test.ts` tient « une décennale et une seule » par extincteur sur six profils.~~ [2026-10-17, ADR-042 : hors ERP, cette ligne étant au niveau audit, plus aucune décennale n'est servie ; en ERP, toujours une et une seule, celle de MS 38 § 4. Le test le tient désormais ainsi.]\n\nORIGINE DES INTERVALLES : § 10.1 les fait partir « de la date de fabrication ou de la dernière recharge effective ou de la révision en atelier » ; l'annexe A, « de la date d'installation […] mais ne doivent pas dépasser un an après la date de fabrication marquée sur le corps ». [2026-10-07, C60, revue indépendante : L'ÉCART EST NOMMÉ, et désormais dit au dirigeant dans la description.] Le générateur compte depuis la mise en service déclarée (`premierPas` / ADR-036), jamais depuis la fabrication ni la dernière recharge : pour un appareil fabriqué plus d'un an avant son installation, ou rechargé depuis, la révision de la norme tombe plus tôt que celle du calendrier. Le sens d'erreur est celui de l'échéance en retard sur la norme ; il n'est pas corrigé ici, faute de champ « date de fabrication » ou « dernière recharge » (décision en attente, comme la coïncidence ci-dessous).\n\n~~COÏNCIDENCE AVEC LA MAINTENANCE APPROFONDIE À LA NAISSANCE, nommée sans changer le comportement (décision en attente de la propriétaire, synthèse de la revue, point 12) : pour un extincteur ancien — mis en service il y a plus de dix ans — ou dont la mise en service n'est pas dite, cette ligne et `incendie-travail-extincteurs-maintenance-approfondie` naissent toutes deux « à planifier » à l'origine du suivi, donc ensemble, alors que la norme les place à des années différentes (10 et 5, 15). Le produit ne connaît que la mise en service déclarée de l'appareil : la première échéance part d'elle (ADR-036, règle 4) — elle ne vaut que si elle tombe à l'origine du suivi ou après ; sinon la ligne naît « à planifier ». Un dirigeant qui connaît la date de la dernière révision la saisit par un rapport, et le rythme repart de là.~~ [2026-10-08, C66 : sans objet — `incendie-travail-extincteurs-maintenance-approfondie` est retirée.]\n\nRÉALISATEURS : « le fabricant ou un centre de révision » (§ 10.1). `fabricant` existe ; le centre de révision est un prestataire qualifié, `personne_qualifiee`. Criticité 4, comme la jumelle ERP : un extincteur non révisé depuis onze ans reste un extincteur maintenu dans l'année.",
  },
  {
    id: "incendie-travail-ria-entretien-verification",
    domaine: "incendie",
    libelle:
      "Entretien et vérification du robinet d'incendie armé, annuels par défaut (travail, hors ERP)",
    description:
      "Les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée (R. 4224-17). Le texte ne fixe pas cette périodicité : Rojer retient par défaut au moins une fois par an pour le robinet d'incendie armé — un plancher, pas un rythme lu dans un texte. En ERP, la vérification annuelle des RIA est écrite par le règlement de sécurité (MS 73 § 2) et fait l'objet de sa propre ligne : celle-ci ne s'y ajoute pas.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4224-17 (installations et dispositifs techniques et de sécurité des lieux de travail, entretenus et vérifiés suivant une périodicité appropriée)",
        article: "R. 4224-17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532197",
        note: "« Les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée. » Relu sur l'API Légifrance (sandbox) le 2026-10-07 (LEGIARTI000018532197, en vigueur depuis le 2008-05-01). Le texte ne nomme aucun équipement : y ranger cet équipement est une LECTURE (`relecture-jc-2026-10/reponses.md` Q1), celle du préventeur.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    rythmeRetenu: {
      motif: "defaut_annuel",
      periodicite: "annuelle",
      texteVague: "périodicité appropriée",
    },
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_competente", "personne_qualifiee"],
    criticite: 4,
    transmet: [],
    // Partition avec la ligne ERP, dont le rythme est écrit (ADR-039).
    typologies: { travail: true, erp: false },
    categoriesEquipement: ["RIA"],
    notesInternes:
      "CRÉÉE LE 2026-10-07 (C59 lot 3, item 6 b ; relecture du préventeur, ADR-039). Le préventeur, sur l'identification des RIA en lieu de travail : « entretien et vérification annuelle ». Avant ce lot, un employeur non-ERP qui déclarait un RIA ne recevait que l'état permanent d'identification (`signalisation-incendie-moyens-lutte`, arrêté du 4 novembre 1993, art. 10) : aucune échéance. Aucun article de la section R. 4227-28 à R. 4227-41 ne nomme le RIA ; `R. 4224-17` vise « les installations et dispositifs techniques et de sécurité des lieux de travail » sans en nommer aucun — un RIA en est un par LECTURE.\n\nANTI-DOUBLON : `typologies: { travail: true, erp: false }`. En ERP, `incendie-erp-ria-annuelle` (MS 73 § 2, « au moins une fois par an ») porte un rythme ÉCRIT, servi à tout ERP — 5ᵉ catégorie comprise, par sur-application assumée ; un rythme écrit l'emporte toujours. Un RIA reçoit donc une annuelle et une seule, quel que soit le régime.\n\nTEXTE VAGUE : « périodicité appropriée », mot pour mot de `R. 4224-17` ; `periodicite: \"autre\"` reste le rythme du texte, `rythmeRetenu` porte l'annuelle PAR DÉFAUT (ADR-039 (b)), affichée comme défaut. Un rythme plus serré (contrat, assureur) se saisit en prescription et l'emporte dès qu'il est au moins aussi strict.\n\nNATURE ÉCHÉANCE RÉCURRENTE : « entretenus et vérifiés » sont des actes qui reviennent, pas un état. La ligne naît « à planifier » (ADR-036), sans retard rétroactif.\n\nRÉALISATEURS : le texte n'en nomme aucun ; le préventeur dit « entretien et vérification ». `personne_competente` et `personne_qualifiee`, comme l'annuelle du même acte ailleurs. Criticité 4, celle de la ligne ERP.",
  },
  {
    id: "incendie-travail-desenfumage-entretien-verification",
    domaine: "incendie",
    libelle:
      "Entretien et vérification des installations de désenfumage, annuels par défaut (travail, hors ERP)",
    description:
      "Les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée (R. 4224-17). Le texte ne fixe pas cette périodicité : Rojer retient par défaut au moins une fois par an pour les installations de désenfumage — un plancher, pas un rythme lu dans un texte. En ERP, la vérification annuelle du désenfumage est écrite par le règlement de sécurité (DF 10) et fait l'objet de sa propre ligne : celle-ci ne s'y ajoute pas.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4224-17 (installations et dispositifs techniques et de sécurité des lieux de travail, entretenus et vérifiés suivant une périodicité appropriée)",
        article: "R. 4224-17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532197",
        note: "« Les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée. » Relu sur l'API Légifrance (sandbox) le 2026-10-07 (LEGIARTI000018532197, en vigueur depuis le 2008-05-01). Le texte ne nomme aucun équipement : y ranger cet équipement est une LECTURE (`relecture-jc-2026-10/reponses.md` Q1), celle du préventeur.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    rythmeRetenu: {
      motif: "defaut_annuel",
      periodicite: "annuelle",
      texteVague: "périodicité appropriée",
    },
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_competente", "personne_qualifiee"],
    criticite: 4,
    transmet: [],
    // Partition avec la ligne ERP, dont le rythme est écrit (ADR-039).
    typologies: { travail: true, erp: false },
    categoriesEquipement: ["DESENFUMAGE"],
    notesInternes:
      "CRÉÉE LE 2026-10-07 (C59 lot 3, item 6 c ; relecture du préventeur, ADR-039). Le préventeur, p. 10 du référentiel annoté, en marge de la vérification annuelle du désenfumage en ERP : « idem code du travail : préco ». Avant ce lot, un employeur non-ERP qui déclarait un désenfumage ne recevait RIEN (`hors-referentiel.test.ts` : `aucune_obligation_applicable`). `R. 4224-17` vise « les installations et dispositifs techniques et de sécurité des lieux de travail » sans en nommer aucun — le désenfumage en est un par LECTURE. Les articles du Code du travail qui imposent le désenfumage à la construction (R. 4216-13 et suivants, maître d'ouvrage) n'ont pas été rouverts ici : ils ne portent pas l'entretien.\n\nANTI-DOUBLON : `typologies: { travail: true, erp: false }`. En ERP, `incendie-erp-desenfumage-annuelle` (DF 10 § 2, « La périodicité des vérifications est de un an ») porte un rythme ÉCRIT, servi à tout ERP — 5ᵉ catégorie comprise, par sur-application assumée. Le désenfumage reçoit donc une annuelle et une seule, quel que soit le régime. La triennale de DF 10 § 3 (lot 4) ne concerne que l'ERP.\n\nTEXTE VAGUE : « périodicité appropriée », mot pour mot de `R. 4224-17` ; `periodicite: \"autre\"` reste le rythme du texte, `rythmeRetenu` porte l'annuelle PAR DÉFAUT (ADR-039 (b)), affichée comme défaut. Un rythme plus serré (contrat, assureur) se saisit en prescription et l'emporte dès qu'il est au moins aussi strict.\n\nNATURE ÉCHÉANCE RÉCURRENTE : « entretenus et vérifiés » sont des actes qui reviennent, pas un état. La ligne naît « à planifier » (ADR-036), sans retard rétroactif.\n\nRÉALISATEURS : le texte n'en nomme aucun ; le préventeur dit « entretien et vérification ». `personne_competente` et `personne_qualifiee`, comme l'annuelle du même acte ailleurs. Criticité 4, celle de la ligne ERP.",
  },
  {
    id: "incendie-travail-alarme-entretien-verification",
    domaine: "incendie",
    libelle:
      "Entretien et vérification de l'équipement d'alarme incendie, annuels par défaut (travail, hors ERP)",
    description:
      "Les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée (R. 4224-17). Le texte ne fixe pas cette périodicité : Rojer retient par défaut au moins une fois par an pour l'équipement d'alarme — sa maintenance et sa vérification par une personne compétente —, un plancher, pas un rythme lu dans un texte. Elle vaut pour toute alarme présente, quel que soit l'effectif. L'essai semestriel du bon fonctionnement des signaux, que l'exploitant fait lui-même, est un autre acte et garde sa propre ligne. En ERP, la vérification annuelle du système de sécurité incendie et de l'alarme est écrite par le règlement de sécurité (MS 73) et fait l'objet de sa propre ligne : celle-ci ne s'y ajoute pas.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4224-17 (installations et dispositifs techniques et de sécurité des lieux de travail, entretenus et vérifiés suivant une périodicité appropriée)",
        article: "R. 4224-17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532197",
        note: "« Les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée. » Relu sur l'API Légifrance (sandbox) le 2026-10-07 (LEGIARTI000018532197, en vigueur depuis le 2008-05-01). Le texte ne nomme aucun équipement : y ranger l'équipement d'alarme est une LECTURE, celle du préventeur (texte collé sur la ligne « Alarme sonore », annotation du 2026-10-05).",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    rythmeRetenu: {
      motif: "defaut_annuel",
      periodicite: "annuelle",
      texteVague: "périodicité appropriée",
    },
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_competente", "personne_qualifiee"],
    criticite: 4,
    transmet: [],
    // Partition avec `incendie-erp-ssi-annuelle` (MS 73, rythme écrit) : une
    // alarme n'a pas deux annuelles du même acte, quel que soit le régime.
    typologies: { travail: true, erp: false },
    categoriesEquipement: ["ALARME_INCENDIE"],
    notesInternes:
      "CRÉÉE LE 2026-10-08 (C66). Demandée par le préventeur, deux fois. Grille du 30/09, p. 34, en face de l'installation de l'alarme sonore (`incendie-travail-alarme-sonore`, R. 4227-34) : « pas d'obligation moins de 51 personnes si présent maintenance vérification annuelle ». Réponse du 2026-10-05, p. 2, en face de la ligne « Alarme sonore » : le texte de R. 4224-17 collé en note (« Les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée. […] »). Décision de la propriétaire du 2026-10-08 : « on s'en tient à ce que dit Julien ». Lecture : l'équipement d'alarme est un dispositif de sécurité du lieu de travail au sens de R. 4224-17 ; le seuil de 51 personnes vaut pour l'obligation d'ÊTRE ÉQUIPÉ, pas pour l'entretien d'une alarme présente — la ligne naît de l'appareil déclaré, sans seuil.\n\nLE MOTIF DE NON-ENCODAGE DE C59 (lot 3, item 6 a) EST ÉCARTÉ, rayé et daté sur `signalisation-etablissement-entretien` et dans la réserve de R. 4224-17 au corpus. Il disait : la semestrielle de l'arrêté du 4 novembre 1993, art. 15, écrite, l'emporte sur ce qu'elle couvre, l'alarme sonore comprise. CE N'EST PAS LE MÊME ACTE, et c'est ce qui permet la ligne sans doublon. L'article 15 fait vérifier, au moins chaque semestre, « le bon fonctionnement et la réelle efficacité » des SIGNAUX lumineux et acoustiques : un ESSAI du signal, par l'exploitant, une ligne pour l'établissement (`signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle`). Le préventeur demande la MAINTENANCE de l'équipement d'alarme, et sa vérification annuelle — entretien de la centrale, des déclencheurs, des diffuseurs et de leur alimentation, par une personne compétente : l'acte de R. 4224-17 (« entretenus et vérifiés »), sur l'appareil déclaré. Les deux coexistent comme l'autonomie et l'efficacité d'un BAES (arrêté du 14 décembre 2011 / art. 15) : deux objets, deux fondements, deux porteurs. Recouvrement partiel assumé sur le mot « vérifiés » ; le semestre écrit garde sa ligne, le défaut annuel ne la remplace pas. Vérifié en appelant le référentiel le 2026-10-08 : avant cette ligne, aucune obligation ne datait l'entretien de l'appareil `ALARME_INCENDIE` chez un employeur hors ERP (la catégorie figurait aux « catégories vides » du bureau, `engine.test.ts`). L'alimentation de secours des signalisations a sa propre annuelle écrite (art. 15, seconde phrase) : elle reste à elle.\n\nANTI-DOUBLON : `typologies: { travail: true, erp: false }`, comme `incendie-travail-ria-entretien-verification`, `incendie-travail-desenfumage-entretien-verification` et `cuisson-travail-appareils-entretien-verification`. En ERP, `incendie-erp-ssi-annuelle` (MS 73 § 2, « SSI et équipement d'alarme incendie ») porte un rythme ÉCRIT, servi à tout ERP — 5ᵉ comprise, par sur-application assumée ; un rythme écrit l'emporte toujours. Une alarme reçoit donc une annuelle et une seule, quel que soit le régime (`extincteurs-partition.test.ts`).\n\nTEXTE VAGUE : « périodicité appropriée », mot pour mot de `R. 4224-17` ; `periodicite: \"autre\"` reste le rythme du texte, `rythmeRetenu` porte l'annuelle PAR DÉFAUT (ADR-039 (b)), affichée comme défaut. NATURE ÉCHÉANCE RÉCURRENTE : la ligne naît « à planifier » (ADR-036), avec le délai de grâce de l'ADR-040 chez un dossier existant. RÉALISATEURS : le texte n'en nomme aucun ; ceux des sœurs (`personne_competente`, `personne_qualifiee`). Criticité 4, celle de l'installation de l'alarme (`incendie-travail-alarme-sonore`) et de la semestrielle des signaux.",
  },
  {
    // 2026-09-27, lot 2 (7 bis G2, M1). L'objet de R. 4227-29 — être DOTÉ
    // d'extincteurs — n'était porté que par une obligation d'appareil : un
    // établissement qui n'a déclaré aucun extincteur ne recevait rien.
    id: "incendie-travail-extincteurs-dotation",
    domaine: "incendie",
    libelle: "Établissement doté d'extincteurs en nombre suffisant (travail)",
    description:
      "« Le premier secours contre l'incendie est assuré par des extincteurs en nombre suffisant et maintenus en bon état de fonctionnement. Il existe au moins un extincteur portatif à eau pulvérisée d'une capacité minimale de 6 litres pour 200 mètres carrés de plancher. Il existe au moins un appareil par niveau. Lorsque les locaux présentent des risques d'incendie particuliers, notamment des risques électriques, ils sont dotés d'extincteurs dont le nombre et le type sont appropriés aux risques. » (R. 4227-29) Cette ligne porte la DOTATION de l'établissement ; le maintien en état de chaque appareil déclaré est porté à part.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-29",
        article: "R. 4227-29",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532079/",
        note: "Relu sur l'API Légifrance le 2026-09-27 (LEGIARTI000018532079, en vigueur depuis le 2008-05-01) — texte cité dans la description.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "incendie_secours", sous: "eteindre" },
    realisateurs: ["exploitant"],
    criticite: 5,
    transmet: [],
    porteur: "etablissement",
    typologies: { travail: true },
    equipementsEnContexte: ["EXTINCTEUR"],
    notesInternes:
      "VERBATIM RELU SUR L'API LE 2026-09-27 (lot 2, audit de bout en bout, 7 bis G2 M1). R. 4227-29 impose d'abord d'ÊTRE DOTÉ — un extincteur portatif de 6 litres pour 200 m², un par niveau, des appareils adaptés aux risques particuliers. Le référentiel ne le portait que par `incendie-travail-moyens-lutte`, portée par l'équipement EXTINCTEUR : un établissement de travail sans extincteur déclaré — exactement celui qui en manque — ne recevait aucune ligne. Mesuré en appelant le moteur : un bureau sans équipement, rien ; avec un EXTINCTEUR, une ligne.\n\nPOURQUOI UNE LIGNE NEUVE ET PAS LE RÉANCRAGE DE `incendie-travail-moyens-lutte`. Les notesInternes de `signalisation-incendie-moyens-lutte` écrivent que le maintien en état se constate APPAREIL PAR APPAREIL, et que les deux lignes d'équipement se lisent côte à côte : une décision écrite, que ce lot ne défait pas. La dotation, elle, est un fait de l'ÉTABLISSEMENT. Politique sœur : `incendie-travail-alarme-sonore` (lot 1, R. 4227-34 — « l'obligation est d'AVOIR l'alarme ; la conditionner à une alarme déclarée la ferait disparaître exactement chez qui n'en a pas »), et la consigne réancrée le 2026-08-31. `EXTINCTEUR` en contexte seulement.\n\nÉtat matériel : `pieceAttendue: null`. Aucun rythme dans le texte. Criticité 5, celle de la ligne d'appareil. Code du travail : GN 10 ne la concerne pas.",
  },
  {
    id: "incendie-travail-consigne-affichee",
    relectureDue: {
      le: "2027-01-01",
      motif:
        "~~R. 4227-37 porte une version future au 1er janvier 2027 (décret n° 2025-1100, art. 3), dans le cadre du transfert des dispositions « bâtiments à usage professionnel » vers le CCH. Le champ d'application de la consigne — et donc celui des exercices de R. 4227-39, qui en dépend par renvoi — peut en être modifié. Relire R. 4227-37, R. 4227-34, et les articles R. 144-16 et R. 144-17 créés à la même date.~~ [2026-10-14, relu en avance sur l'API Légifrance (décision de la propriétaire du même jour) : la version au 1er janvier 2027 (LEGIARTI000052645197, décret n° 2025-1100, art. 3) reprend MOT POUR MOT le premier alinéa — champ de R. 4227-34, consigne, locaux de plus de cinq personnes et de R. 4227-24 ; seule la dernière phrase, celle des instructions d'évacuation, change de renvoi. R. 4227-34, R. 4227-38 et R. 4227-40 n'ont aucune version future (recherche au 2027-01-02). Le champ de cette ligne et celui des exercices ne bougent pas. ~~R. 144-16 et R. 144-17 du CCH parlent du registre de sécurité des bâtiments neufs ou rénovés, pas de la consigne~~ [2026-10-14, revue indépendante, relu sur l'API : seul R. 144-16 (LEGIARTI000052645003) porte sur le registre de sécurité des bâtiments à usage professionnel ; R. 144-17 (LEGIARTI000052645001) renvoie à l'arrêté du règlement de sécurité les conditions dans lesquelles, « avant leur mise en service, les moyens de prévention et de lutte contre l'incendie font l'objet d'un contrôle soit par une personne qualifiée, soit par un organisme agréé ». Ni l'un ni l'autre ne porte sur la consigne] : ils restent dans `TEXTES_A_VENIR`. CE QUI RESTE À FAIRE LE 1er JANVIER 2027, et pas avant — une `versionConstatee` ne peut pas être dans le futur : passer l'URL de R. 4227-37 sur LEGIARTI000052645197 et sa `versionConstatee` à « 2027-01-01 », puis retirer ce rendez-vous.]",
    },
    domaine: "incendie",
    libelle: "Consigne de sécurité incendie établie et affichée",
    description:
      "Dans les établissements mentionnés à l'article R. 4227-34 (plus de cinquante personnes occupées ou réunies habituellement, ou manipulation de matières visées par R. 4227-22, quel que soit l'effectif), une consigne de sécurité incendie est établie et affichée de manière très apparente : dans chaque local de plus de cinq personnes et dans les locaux à matières inflammables, sinon dans chaque local ou dégagement desservant un groupe de locaux. Elle indique le matériel d'extinction et de secours, les personnes chargées de l'activer, de diriger l'évacuation des travailleurs et du public, les mesures pour les personnes handicapées, les moyens d'alerte, les personnes chargées d'aviser les sapeurs-pompiers, l'adresse et le numéro du service de secours, et le devoir, pour toute personne apercevant un début d'incendie, de donner l'alarme et de mettre en œuvre les moyens de premier secours sans attendre les travailleurs spécialement désignés (R. 4227-38). « La consigne de sécurité incendie est communiquée à l'inspection du travail. » (R. 4227-40) Les autres établissements établissent de simples instructions d'évacuation. Dans un établissement recevant du public des quatre premières catégories, le règlement de sécurité veut en outre ces consignes destinées aux personnels conformes à la norme NF S 60-303, constamment mises à jour et affichées sur supports fixes et inaltérables, et qu'elles indiquent aussi l'accueil et le guidage des sapeurs-pompiers (MS 47). Dans un restaurant ou débit de boissons (type N) des quatre premières catégories, le règlement de sécurité ajoute des consignes spéciales, portées fréquemment à la connaissance du personnel, qui doivent lui rappeler les interdictions suivantes : « faire sécher près des appareils de cuisson des chiffons, des torchons et des serviettes, projeter de la graisse ou de l'huile dans les foyers pour y provoquer des \"coups de feu\", entreposer des emballages vides (même momentanément) dans un local ouvert au public, etc. » (N 20) ; « fréquemment » ne fixe aucun rythme, et Rojer n'en date aucun.",
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
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-40",
        article: "R. 4227-40",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532053/",
        note: "« La consigne de sécurité incendie est communiquée à l'inspection du travail. » Relu sur l'API le 2026-09-27 (lot 2), en vigueur depuis le 2008-05-01. Même champ que la consigne.",
        versionConstatee: "2008-05-01",
      },
      {
        // 2026-10-14, revue indépendante : contexte — le même écrit, exigé
        // par le règlement de sécurité dans tout ERP des catégories 1 à 4.
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 47 (consignes destinées aux personnels, constamment mises à jour et affichées) — livre II, établissements des quatre premières catégories seulement",
        article: "MS 47",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021231059",
        note: "« Des consignes précises, conformes à la norme NF S 60-303 du 20 septembre 1987 relative aux plans et consignes de protection contre l'incendie, destinées aux personnels de l'établissement, constamment mises à jour, et affichées sur supports fixes et inaltérables doivent indiquer : […] » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable, égalité avec la production non vérifiée) : LEGIARTI000021231059, en vigueur depuis le 2010-01-23 (arrêté du 24 septembre 2009). La norme n'est pas lue.",
        versionConstatee: "2010-01-23",
      },
      {
        // 2026-10-14, point 5 de la décision de la propriétaire : contexte,
        // jamais fondement — N 20 ne vaut qu'en type N, catégories 1 à 4.
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. N 20 (consignes spéciales portées fréquemment à la connaissance du personnel) — livre II, titre II, type N : restaurants et débits de boissons des quatre premières catégories seulement",
        article: "N 20",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024752327",
        note: "« Des consignes spéciales, portées fréquemment à la connaissance du personnel, doivent lui rappeler les interdictions suivantes : faire sécher près des appareils de cuisson des chiffons, des torchons et des serviettes, projeter de la graisse ou de l'huile dans les foyers pour y provoquer des \"coups de feu\", entreposer des emballages vides (même momentanément) dans un local ouvert au public, etc. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024752327, seule version, en vigueur depuis le 1982-08-12 (arrêté du 21 juin 1982). Cité en contexte : il ne vaut qu'en type N des quatre premières catégories, et la phrase de la description le dit.",
        versionConstatee: "1982-08-12",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "consigne de sécurité incendie",
    usageEcran: { groupe: "incendie_secours", sous: "alerter" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: { travail: true, personnesPresentesMin: 51, champR422734: true },
    equipementsEnContexte: ["EXTINCTEUR", "ALARME_INCENDIE"],
    notesInternes:
      "Amendement 2026-08-25 (relecture Légifrance R. 4227-34, -37, -38) : la consigne affichée n'est due que dans les établissements de R. 4227-34, par renvoi exprès de R. 4227-37 ; hors de ce champ le texte ne demande que des « instructions » d'évacuation. L'obligation était encodée sans seuil (sur-application à tout employeur) et sa description exigeait une « mise à jour à chaque changement notable » qui ne figure dans aucun des deux articles — retirée. La périodicité annuelle est une convention de rappel, aucun texte ne fixe de périodicité à la consigne. ~~R. 4227-37 porte une version future au 01/01/2027 : à relire à cette date.~~ [2026-10-14 : relue en avance sur l'API ; le premier alinéa, qui fonde cette ligne, ne change pas — voir `relectureDue`.]\n\nAMENDEMENT 2026-08-27, même audit. L'obligation affichait une échéance ANNUELLE en ne citant que R. 4227-37, qui ne porte aucune périodicité — vérifié sur toute la section. Aucun texte n'impose de réafficher ou de réviser la consigne chaque année.\n\n`periodicite` passe à `autre`. L'affichage de la consigne est une obligation PERMANENTE, pas une échéance : elle est due tant que l'établissement entre dans le champ de R. 4227-34, et elle se met à jour quand l'organisation change — pas à date fixe. Ce qui est bien périodique, dans la même sous-section, ce sont les exercices et essais semestriels de R. 4227-39, portés par `incendie-travail-exercice-semestriel`.\n\nAMENDEMENT 2026-08-31, lot « faux négatifs d'ancrage ». `categoriesEquipement: [EXTINCTEUR, ALARME_INCENDIE]` est retiré au profit du porteur établissement (ADR-022). R. 4227-37 relu au verbatim ce jour : il ne mentionne aucun équipement. Le champ de l'obligation est celui de R. 4227-34, et il est DÉJÀ encodé — `personnesPresentesMin: 51` et `champR422734`. La liste d'équipements ne restreignait donc rien de ce que le texte restreint : elle ajoutait une condition que le texte n'écrit pas, et qui produisait un faux négatif chez tout établissement du champ de R. 4227-34 n'ayant déclaré ni extincteur ni alarme. Les deux catégories passent en `equipementsEnContexte`, à titre indicatif — c'est bien le matériel que la consigne doit désigner (R. 4227-38 1°), mais le désigner n'est pas en avoir déclaré un dans l'outil.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue: \"consigne de sécurité incendie\"` (ADR-026). R. 4227-37 fait ÉTABLIR la consigne avant de la faire afficher : c'est un écrit, et son contenu est fixé par R. 4227-38. Deux affichages voisins n'en sont pas — l'affichage des coordonnées (D. 4711-1) et l'avis d'accès au DUERP (R. 4121-4) portent `pieceAttendue: null`, parce que ce que le texte exige y est l'affichage lui-même, pas la détention d'une pièce.\n\nAMENDEMENT 2026-09-01, lot « traçabilité ». `R. 4227-38` était nommé dans la prose de `reference` (« R. 4227-37 et R. 4227-38 ») et dans la description, mais la clé `article` ne désignait que le 37 : l'article était donc irrattachable au corpus, où il n'existait pas. Ouvert à la source ce jour (LEGIARTI000024769384, version en vigueur depuis le 10 novembre 2011, sans terme programmé — contrairement à R. 4227-37 qui, lui, s'arrête au 1er janvier 2027). Il entre au corpus avec son verbatim intégral et devient une `ReferenceLegale` à part entière ; `reference` se réduit à « R. 4227-37 » pour le premier élément, qui reste l'article fondateur. Aucun champ d'empreinte n'est touché : `referencesLegales` en est hors, et R. 4227-38 ne porte ni champ d'application ni périodicité propres.\n\nAMENDEMENT 2026-10-14 — N 20, point 5 de la décision de la propriétaire. N 20 (type N, catégories 1 à 4) fait porter « fréquemment » à la connaissance du personnel des consignes spéciales d'exploitation. « Fréquemment » est un rythme vague, et l'ADR-039 ne lui donne pas le défaut annuel : ce serait rater l'esprit du mot, et la propriétaire a écarté une ligne neuve. N 20 entre donc ici EN CONTEXTE (jamais en fondement, `referencesLegales[0]` reste R. 4227-37), avec une phrase de description.\n\nLA FORME DE CETTE PHRASE, ET POURQUOI. Le modèle n'a aucun moyen de rendre une phrase de description conditionnelle à l'établissement : `description` est une chaîne, la même pour tous ceux qui reçoivent la ligne. La condition est donc écrite DANS la phrase — « Dans un restaurant ou débit de boissons (type N) des quatre premières catégories » —, en fin de description, après le régime du Code du travail : un bureau ou un magasin qui reçoit la ligne lit une phrase qui dit elle-même ne pas le viser. La référence porte la même borne dans son libellé (garde `conformite.test.ts`, « une référence du titre II dit son champ »). Ce que la forme ne garantit pas : un restaurant N1–N4 dont l'exploitant n'est pas employeur ne reçoit pas cette ligne (porteur `travail`) ; N 20 s'adresse au personnel, donc à un employeur, et le cas est vide. Un restaurant N1–N4 qui emploie reçoit la ligne — mesuré en appelant le moteur le 2026-10-14 : en 3ᵉ catégorie sans réserve, le plancher de public de la catégorie franchissant le seuil de R. 4227-34 ; en 4ᵉ « à confirmer » tant que les personnes présentes ne sont pas déclarées (N 1 fait pourtant commencer le chapitre à deux cents personnes, mais le moteur ne lit pas les seuils par type).",
  },
  {
    // 2026-09-27, analyse de la réponse absente, § 1 et étape 6 — décision de
    // la propriétaire (« je valide tout le reste »). Le complément de la
    // consigne, que le texte écrit dans la même phrase et que le référentiel
    // ne portait pas.
    id: "incendie-travail-instructions-evacuation",
    relectureDue: {
      le: "2027-01-01",
      motif:
        "~~R. 4227-37 et R. 4216-2 portent tous deux un terme au 1er janvier 2027 (décret n° 2025-1100) : la version future de R. 4227-37 renvoie, pour les « autres établissements », au deuxième alinéa de l'article R. 141-7 du CCH. Relire les deux, et vérifier que le champ reste le complément de R. 4227-34.~~ [2026-10-14, relu en avance sur l'API Légifrance (décision de la propriétaire du même jour). Version au 1er janvier 2027 (LEGIARTI000052645197, décret n° 2025-1100, art. 3) : « Dans les autres établissements, des instructions sont établies, permettant d'assurer l'évacuation des personnes présentes dans les locaux dans les conditions prévues au deuxième alinéa de l'article R. 141-7 du code de la construction et de l'habitation. » L'obligation et son champ ne changent pas : toujours le complément de R. 4227-34, dont le premier alinéa est repris mot pour mot. Seul le renvoi des CONDITIONS change. Le nota, recollé de l'API : « Ils s'appliquent : 1° Aux opérations de construction ou de rénovation de bâtiments à usage professionnel pour lesquelles la demande d'autorisation d'urbanisme est déposée à compter du 1er janvier 2027 ; 2° Aux opérations ne nécessitant pas d'autorisation d'urbanisme, lorsque les travaux débutent à partir du 1er janvier 2027. » R. 4216-2 s'arrête au 1er janvier 2027 sans version suivante. R. 141-7 du CCH est en vigueur depuis le 2026-07-01 (LEGIARTI000052644871). La description le dit depuis le 2026-10-14. CE QUI RESTE À FAIRE LE 1er JANVIER 2027, et pas avant — une `versionConstatee` ne peut pas être dans le futur : passer l'URL de R. 4227-37 sur LEGIARTI000052645197, sa `versionConstatee` à « 2027-01-01 », sa note sur la phrase nouvelle, puis retirer ce rendez-vous. Deux points de lecture restent ouverts, sans effet sur ce que le dirigeant doit faire : quel renvoi vaut pour un bâtiment antérieur à 2027, et quel est le « deuxième alinéa » de R. 141-7 (compté à la lettre, c'est le 1°, la stabilité au feu) — journal des vérifications, C69.]",
    },
    domaine: "incendie",
    libelle: "Instructions d'évacuation établies",
    description:
      "Hors du champ de l'article R. 4227-34 — moins de cinquante et une personnes habituellement présentes, et aucune manipulation de matières explosives ou inflammables —, le texte ne demande pas la consigne de sécurité incendie affichée, mais « des instructions […] permettant d'assurer l'évacuation des personnes présentes dans les locaux », dans les conditions de l'article R. 4216-2 : l'évacuation rapide de la totalité des occupants, ou leur évacuation différée lorsqu'elle est rendue nécessaire, dans des conditions de sécurité maximale. À compter du 1er janvier 2027, pour les opérations de construction ou de rénovation de bâtiments à usage professionnel dont la demande d'autorisation d'urbanisme est déposée à partir de cette date ou, pour les opérations qui ne nécessitent pas d'autorisation d'urbanisme, dont les travaux débutent à partir de cette date, le texte renvoie pour ces conditions au deuxième alinéa de l'article R. 141-7 du code de la construction et de l'habitation (décret n° 2025-1100 du 19 novembre 2025). Tant que l'une des deux réponses manque sur la fiche, c'est la consigne qui s'affiche, « à confirmer ».",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-37",
        article: "R. 4227-37",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769379/",
        note: "« Dans les autres établissements, des instructions sont établies, permettant d'assurer l'évacuation des personnes présentes dans les locaux dans les conditions prévues au 1° de l'article R. 4216-2. » Second alinéa, relu sur l'API Légifrance le 2026-09-27 (LEGIARTI000024769379, en vigueur du 2011-11-10 au 2027-01-01).",
        versionConstatee: "2011-11-10",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4216-2",
        article: "R. 4216-2",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769367/",
        note: "« Les bâtiments et les locaux sont conçus et réalisés de manière à permettre en cas de sinistre : 1° L'évacuation rapide de la totalité des occupants ou leur évacuation différée, lorsque celle-ci est rendue nécessaire, dans des conditions de sécurité maximale ; […] » Relu sur l'API Légifrance le 2026-09-27 (LEGIARTI000024769367, en vigueur du 2011-11-10 au 2027-01-01). Il ne donne que les conditions de l'évacuation : l'obligation vient de R. 4227-37.",
        versionConstatee: "2011-11-10",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "instructions d'évacuation",
    usageEcran: { groupe: "incendie_secours", sous: "evacuer" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: { travail: true, personnesPresentesMin: 51, horsChampR422734: true },
    notesInternes:
      "VERBATIM RELU SUR L'API LÉGIFRANCE LE 2026-09-27 (analyse `docs/revues/analyse-reponse-absente-2026-09-27.md`, § 1). R. 4227-37 fait deux choses dans une phrase chacune : la consigne affichée dans le champ de R. 4227-34, des instructions d'évacuation « dans les autres établissements ». Le référentiel ne portait que la première ; un bureau de huit salariés ne recevait ni l'une ni l'autre.\n\nPOLITIQUE SŒUR : la paire de l'exclusion par type (`typesExclus` / `types`, GE 4 § 1) et la règle du non-renseigné (ADR-022 § 7) — la forme qui porte la règle générale survit au silence, l'allègement ne se donne pas sur une absence supposée. Ici la consigne est la règle du champ et le silence la retient « à confirmer » ; les instructions sont l'allègement, servies seulement quand la fiche ÉTABLIT le hors-champ (`horsChampR422734` : seuil non atteint ET matières « non »). Les deux lignes s'excluent par construction : aucun établissement ne reçoit les deux.\n\nÉcrit, pas un état matériel : « des instructions sont établies » — même lecture que la consigne « établie », d'où `pieceAttendue`. Aucune périodicité dans le texte. Criticité 3, comme la consigne.\n\nL'API ne rend pas R. 4227-37 ni R. 4216-2 par leur numéro (`getArticleWithIdAndNum` → null) : leur version en vigueur est `ABROGE_DIFF`, terme au 2027-01-01. Relus par leur identifiant.",
  },
  {
    // 2026-09-27, même analyse, § 1 et étape 6. L'objet même de R. 4227-34 —
    // être équipé d'une alarme sonore —, que le corpus relevait comme manque
    // (`arrete-1993-11-04-signalisation.ts`) : seules les vérifications en
    // découlaient au référentiel.
    id: "incendie-travail-alarme-sonore",
    domaine: "incendie",
    libelle: "Système d'alarme sonore installé",
    description:
      "Les établissements où peuvent se trouver occupées ou réunies habituellement plus de cinquante personnes, public compris, et ceux, quel que soit leur effectif, où sont manipulées et mises en œuvre des matières explosives ou inflammables, sont équipés d'un système d'alarme sonore (R. 4227-34). L'alarme générale est donnée par bâtiment quand l'établissement en compte plusieurs, isolés entre eux (R. 4227-35) ; son signal ne se confond avec aucun autre, il est audible de tout point du bâtiment pendant le temps de l'évacuation, avec une autonomie d'au moins cinq minutes (R. 4227-36). L'arrêté du 4 novembre 1993 (art. 14) en fixe le type : « Un équipement d'alarme au moins de type 3 doit être installé dans les établissements dont l'effectif est supérieur à 700 personnes et dans ceux dont l'effectif est supérieur à 50 personnes lorsque sont entreposées ou manipulées des substances ou mélanges visés à l'article R. 4227-22 du code du travail. Un équipement d'alarme au moins de type 4 doit être installé dans les autres établissements visés à l'article R. 4227-34 du code du travail. »",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-34",
        article: "R. 4227-34",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532067/",
        note: "« Les établissements dans lesquels peuvent se trouver occupées ou réunies habituellement plus de cinquante personnes, ainsi que ceux, quelle que soit leur importance, où sont manipulées et mises en œuvre des matières inflammables mentionnées à l'article R. 4227-22 sont équipés d'un système d'alarme sonore. » Relu sur l'API Légifrance le 2026-09-27 (LEGIARTI000018532067, en vigueur depuis le 2008-05-01).",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-35",
        article: "R. 4227-35",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532065/",
        note: "« L'alarme sonore générale est donnée par bâtiment si l'établissement comporte plusieurs bâtiments isolés entre eux. » Relu sur l'API le 2026-09-27.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-36",
        article: "R. 4227-36",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532063/",
        note: "« Le signal sonore d'alarme générale est tel qu'il ne permet pas la confusion avec d'autres signalisations utilisées dans l'établissement. Il est audible de tout point du bâtiment pendant le temps nécessaire à l'évacuation, avec une autonomie minimale de cinq minutes. » Relu sur l'API le 2026-09-27.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 4 novembre 1993, art. 14",
        article: "Arrêté 1993-11-04 art. 14",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000028480696",
        note: "Le TYPE de l'équipement d'alarme (type 3 au-delà de 700 personnes, et au-delà de 50 personnes quand les matières de R. 4227-22 sont entreposées ou manipulées ; type 4 dans les autres établissements de R. 4227-34). Relu sur l'API le 2026-09-27 (lot 2) ; ne change pas le champ de l'obligation.",
        versionConstatee: "2014-01-19",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "incendie_secours", sous: "alerter" },
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    porteur: "etablissement",
    typologies: { travail: true, personnesPresentesMin: 51, champR422734: true },
    equipementsEnContexte: ["ALARME_INCENDIE"],
    notesInternes:
      "VERBATIM RELU SUR L'API LÉGIFRANCE LE 2026-09-27 (R. 4227-34 à -36). R. 4227-34 est l'article de champ auquel la consigne (R. 4227-37) et les exercices (R. 4227-39) renvoient, mais son objet propre — ÊTRE ÉQUIPÉ d'une alarme sonore — n'était porté par aucune obligation : le corpus le relevait (`arrete-1993-11-04-signalisation.ts`, « l'INSTALLATION de l'alarme n'est portée par aucune obligation »).\n\nPOLITIQUE SŒUR : la consigne affichée (`incendie-travail-consigne-affichee`), réancrée sur l'établissement le 2026-08-31 (lot « faux négatifs d'ancrage ») parce qu'une liste d'équipements ajoutait une condition que le texte n'écrit pas. Même raison ici, et plus forte : l'obligation est d'AVOIR l'alarme ; la conditionner à une alarme déclarée la ferait disparaître exactement chez qui n'en a pas. `ALARME_INCENDIE` n'est qu'en contexte. Même champ, et même traitement du silence (règle du non-renseigné : matières muettes ⇒ « à confirmer »).\n\nÉtat matériel, pas un écrit : `pieceAttendue: null`. R. 4227-35 et -36 en donnent les caractéristiques ; ils ne créent pas d'obligation autonome. Criticité 4 : sans alarme, l'évacuation n'est pas déclenchée.",
  },
  {
    // C45 (2026-09-27). Premier des quatre « à encoder » de l'évaluation des
    // manques du même jour, décision de la propriétaire.
    id: "incendie-travail-chiffons-impregnes-recipients-clos",
    // ADR-042 (2026-10-08) : niveau audit — au référentiel, hors du quotidien.
    niveau: "audit",
    domaine: "incendie",
    libelle:
      "Chiffons, cotons et papiers imprégnés enfermés après usage dans des récipients métalliques clos et étanches",
    description:
      "« Les chiffons, cotons et papiers imprégnés de liquides inflammables ou de matières grasses sont, après usage, enfermés dans des récipients métalliques clos et étanches. » L'article vise les matières grasses comme les liquides inflammables : un torchon de cuisine imbibé d'huile en relève. Il ne pose ni condition d'effectif, ni échéance.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4227-26",
        article: "R. 4227-26",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532089",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    // Niveau audit (ADR-042) : le moteur ne la rend jamais, l'écran ne la liste
    // pas — pas de rangement (2026-10-17, revue indépendante). ~~prevenir~~
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: { travail: true },
    notesInternes:
      "SANS CONDITION DEPUIS LE 2026-10-08, même jour, seconde décision de la propriétaire : la question `chiffonsImpregnes` est retirée de toutes les surfaces (parcours, fiche, relance) — elle ne servait qu'à cette ligne. ~~`typologies: { travail: true }`~~ → `{ travail: true }` : l'article ne pose aucun seuil, la ligne vaut pour tout employeur en lieu de travail, et la rubrique « Niveau audit » de « Ce que Rojer ne couvre pas » la nomme à chacun sans dépendre d'une réponse. La phrase de la description qui renvoyait à la question (« Cette ligne s'affiche parce que vous avez répondu oui… ») est retirée. La colonne `Etablissement.chiffonsImpregnes` reste en base, inerte (aucune migration).\n\nNIVEAU AUDIT DEPUIS LE 2026-10-08 (ADR-042). Le préventeur, p. 35 du référentiel annoté : « à supprimer » ; il « ne veut pas qu'on tombe dans l'audit ». Décision de la propriétaire du même jour : « certes c'est une obligation mais Rojer est un outil de gestion au quotidien et les chiffons par exemple c'est too much ; on garde dans le référentiel mais avec une mention audit et qu'il ne soit plus actif dans l'app ; le label audit aura son sens le jour où on poussera plus loin Rojer ». Ce n'est PAS un retrait (`OBLIGATIONS_RETIREES`) ni un hors-périmètre : R. 4227-26 reste lu, retenu, cité ; l'obligation reste due. Le moteur ne la sert plus — ni « Ce qui doit être en place », ni « à confirmer » — et la page « Ce que Rojer ne couvre pas » la nomme ~~à tout établissement qui n'a pas répondu « non » à la question des chiffons~~ [2026-10-08 : à tout lieu de travail, la question étant retirée]. Effet en base : la ligne existante cesse de s'appliquer — archivée si elle porte une trace, supprimée sinon ; une déclaration « en place » reste en base, sans ligne pour l'afficher. ~~La question `chiffonsImpregnes` reste posée : elle décide encore de la rubrique « Niveau audit ».~~ [2026-10-08 : retirée, voir en tête.] RÉACTIVER : retirer `niveau` et monter la version.\n\nVERBATIM RELU SUR LÉGIFRANCE LE 2026-09-27 (C45), page de l'article, structure demandée à l'aveugle puis questions fermées : « Les chiffons, cotons et papiers imprégnés de liquides inflammables ou de matières grasses sont, après usage, enfermés dans des récipients métalliques clos et étanches. » Version en vigueur depuis le 2008-05-01, création par le décret n° 2008-244 du 7 mars 2008, aucune modification affichée. Le mot « torchons » n'est PAS dans le texte : la description le donne comme exemple, hors des guillemets.\n\n~~POURQUOI UNE QUESTION ET PAS LE CODE NAF. L'article ne dépend ni de `R. 4227-22` ni de l'activité déclarée : sa phrase est autonome. Le déclencheur est un fait que seul le dirigeant connaît, demandé une fois sur la fiche établissement (`Etablissement.chiffonsImpregnes`, trois états). « Non » retire la ligne ; « je ne sais pas » et le silence la retiennent « à confirmer » (règle du non-renseigné, `evaluerChiffonsImpregnes`).~~ [2026-10-08 : question et critère retirés, voir en tête ; ni question, ni code NAF — l'article ne pose aucun seuil.] Rien à dater ni à saisir ensuite : « à quel moment on déclare un chiffon ? » — jamais.\n\nÉTAT PERMANENT, `periodicite: \"autre\"` : le texte n'écrit aucune durée, il prescrit un geste après chaque usage. Aucune pièce attendue : rien ne se remet à un tiers. `typologies.travail` : l'article est au livre II de la quatrième partie du Code du travail, il vise les lieux de travail.\n\nCriticité 3 : l'auto-échauffement des textiles gras est une cause d'incendie connue (d'après le corpus), mais le manquement ne met pas en danger à lui seul comme un moyen de secours absent.",
  },
  {
    id: "incendie-travail-exercice-semestriel",
    relectureDue: {
      le: "2027-01-01",
      motif:
        "Cette obligation ne porte pas son champ : elle le tient de la consigne de R. 4227-37, qui le tient lui-même de R. 4227-34. ~~Or R. 4227-37 affiche « Version en vigueur du 10/11/2011 au 01/01/2027 » — son terme emporte donc le champ des exercices. Relire R. 4227-37 dans sa version au 1er janvier 2027, puis vérifier si `personnesPresentesMin: 51` et `champR422734` restent la bonne traduction.~~ [2026-10-14, relu en avance sur l'API : la version au 1er janvier 2027 de R. 4227-37 (LEGIARTI000052645197) reprend mot pour mot le premier alinéa, et R. 4227-34 et R. 4227-39 n'ont aucune version future — `personnesPresentesMin: 51` et `champR422734` restent la bonne traduction.] Relire aussi R. 4227-2, second article du chapitre VII à porter un terme à cette date, et absent du référentiel.",
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
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 51 (exercices d'instruction du personnel organisés par l'exploitant) — livre II, établissements des quatre premières catégories",
        article: "MS 51",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317798",
        note: "« Des exercices d'instruction du personnel doivent être organisés sous la responsabilité de l'exploitant. La date de ceux-ci doit être portée sur le registre de sécurité de l'établissement. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020317798, en vigueur depuis le 2009-02-27. Aucun rythme : celui de la ligne est le semestre de R. 4227-39.",
        versionConstatee: "2009-02-27",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 67 § 3 (personnel informé de la signification du signal d'alarme générale) — livre II, établissements des quatre premières catégories",
        article: "MS 67",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317741",
        note: "« § 3. Le personnel de l'établissement doit être informé de la signification du signal sonore d'alarme générale et du signal sonore d'alarme générale sélective, si ce dernier existe. Cette information doit être complétée éventuellement par des exercices périodiques d'évacuation. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020317741, seule version, en vigueur depuis le 1980-08-15.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: "registre des exercices et essais",
    usageEcran: null,
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
      "RATTACHEMENTS DU 2026-10-17 (sous-lot C, découpage validé par c6) — références seules. MS 51 (exercices d'instruction du personnel, date au registre) et MS 67 § 3 (information du personnel sur le signal d'alarme, « complétée éventuellement par des exercices périodiques ») sont, en ERP des quatre premières catégories, l'acte de cette ligne. TEMPORALITÉ : rythme écrit (R. 4227-39, « au moins tous les six mois ») ; MS 51 n'en écrit aucun, et « éventuellement » ne rend pas l'exercice de MS 67 obligatoire — aucun défaut annuel. CE QUE LE RATTACHEMENT NE COUVRE PAS : la ligne est bornée à `travail: true` et au seuil de 51 personnes présentes (public et personnel comptés, `matching/personnes-presentes.ts`). Un ERP des catégories 1 à 4 qui déclare moins de 51 personnes présentes — possible en 4ᵉ catégorie pour les types dont le seuil de la 5ᵉ est bas — ne reçoit pas MS 51 ; aucune norme n'est citée par ces articles.\n\n" +
      "Seuil encodé (amendement 2026-08) : sans seuil, la règle s'appliquait à un salon de coiffure de deux personnes alors que sa propre description citait un seuil. « Plus de cinquante » ⇒ 51, bornes incluses.\n\nAmendement 2026-08-25 (relecture Légifrance R. 4227-22, -34, -37, -39) : le champ de R. 4227-39 est celui de R. 4227-34 par double renvoi (39 → consigne 37 → établissements 34). Il est disjonctif — « plus de cinquante personnes […] ainsi que ceux, quelle que soit leur importance, où sont manipulées et mises en œuvre des matières inflammables mentionnées à l'article R. 4227-22 » — et compte les personnes « occupées ou réunies », public compris (R. 4227-38 3° distingue « les travailleurs et le public »). `effectifMin: 51` (salariés seuls) est remplacé par `personnesPresentesMin: 51` (personnes présentes, repli sur l'effectif salarié si non déclaré) et `champR422734: true` (branche matières R. 4227-22, déclarée par le dirigeant). Le déclencheur ALARME_INCENDIE reste une heuristique : l'alarme est une conséquence de R. 4227-34, pas sa condition.\n\nAMENDEMENT 2026-08-31, lot « faux négatifs d'ancrage ». La phrase ci-dessus avait raison et n'avait pas été suivie d'effet : le déclencheur ALARME_INCENDIE est retiré, l'obligation passe au porteur établissement (ADR-022). R. 4227-34 relu au verbatim ce jour, et il tranche seul : les établissements de son champ « SONT ÉQUIPÉS d'un système d'alarme sonore ». L'alarme y est le CONTENU d'une obligation, pas la condition d'une autre. Ancrer l'exercice semestriel dessus revenait à ne l'exiger que de ceux qui avaient déjà obéi — et à laisser sans aucune ligne d'exercice l'établissement de plus de cinquante personnes qui n'a rien déclaré, c'est-à-dire précisément celui qui est en défaut. C'est le faux négatif le plus lourd du lot : criticité 4, échéance semestrielle réelle, et zéro ligne affichée.\n\nCe qui NE change pas : le champ. `personnesPresentesMin: 51` et `champR422734` restent la seule restriction, et ils portent le double renvoi 39 → 37 → 34. Le salon de coiffure de deux personnes ne reçoit toujours rien. ALARME_INCENDIE passe en `equipementsEnContexte`.",
  },
  {
    id: "incendie-registre-securite",
    domaine: "incendie",
    libelle: "Tenue du registre de sécurité",
    description:
      "En établissement recevant du public, le registre de sécurité porte les renseignements indispensables à la bonne marche du service de sécurité et comprend, outre les pièces attendues aux articles R. 141-10 et R. 141-11 : les dates des travaux d'aménagement et de transformation, leur nature et les noms des entrepreneurs ; l'état nominatif et hiérarchique des personnes appartenant au service de sécurité ; les diverses consignes établies en cas d'incendie, y compris les consignes d'évacuation prenant en compte les différents types de handicap ; les dates des divers contrôles et vérifications ainsi que les observations auxquelles ceux-ci ont donné lieu ; les dates des exercices de sécurité incendie. Côté Code du travail, tout employeur conserve, datés et portant l'identité de qui les a faits, les documents de ses vérifications et contrôles ainsi que les observations et mises en demeure de l'inspection du travail, sauf dispositions particulières ceux des cinq dernières années. Dans les établissements où peuvent se trouver habituellement plus de cinquante personnes, ou où sont manipulées et mises en œuvre des matières inflammables mentionnées à l'article R. 4227-22, la date des essais et exercices périodiques et les observations auxquelles ils ont donné lieu sont en outre consignées sur un registre tenu à la disposition de l'inspection du travail.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "L. 4711-1 — mentions obligatoires des pièces de vérification",
        article: "L. 4711-1",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903383",
        note: "« Les attestations, consignes, résultats et rapports relatifs aux vérifications et contrôles mis à la charge de l'employeur au titre de la santé et de la sécurité au travail comportent des mentions obligatoires déterminées par voie réglementaire. » Verbatim relevé le 2026-08-31 par un agent, relu en première main le 2026-09-26 sur la page de l'article (version en vigueur depuis le 01/05/2008). Aucune condition d'effectif, d'équipement ni de classement ERP : c'est l'un des deux articles qui fondent réellement la branche `travail: true`.",
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
        source: "CODE_TRAVAIL",
        reference: "R. 4227-39",
        article: "R. 4227-39",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769386",
        note: "Consignation sur registre des essais et exercices périodiques, avec leur date et les observations auxquelles ils ont donné lieu. DANS LE SEUL CHAMP DE R. 4227-34 : l'article s'ouvre sur « La consigne de sécurité incendie prévoit », et cette consigne n'est due, par R. 4227-37, que « dans les établissements mentionnés à l'article R. 4227-34 » (plus de cinquante personnes, ou matières inflammables de R. 4227-22). Il n'est donc PAS le fondement de cette ligne, qui vaut pour tout employeur (L. 4711-1, L. 4711-2) et tout ERP (CCH R. 143-44) : relégué au rang de contexte le 2026-09-26 (C39), et il reste le fondement de `incendie-travail-exercice-semestriel`.",
        versionConstatee: "2011-11-10",
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
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. GE 3 § 3 (registre présentable à la commission, consignes d'évacuation prenant en compte les handicaps) — livre II, établissements des quatre premières catégories",
        article: "GE 3",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021231100",
        note: "« § 3. L'exploitant doit être en mesure de présenter à la commission le registre de sécurité prévu à l'article R. 123-51 du code de la construction et de l'habitation. Ce registre contiendra notamment les consignes d'évacuation prenant en compte les différents types de handicap. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000021231100, en vigueur depuis le 2010-01-23.",
        versionConstatee: "2010-01-23",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. GE 10 (date, nom du vérificateur et objet des vérifications inscrits au registre ; relevé annexé) — livre II, établissements des quatre premières catégories",
        article: "GE 10",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020380181",
        note: "« La date, le nom du vérificateur et l'objet des vérifications doivent être inscrits au registre de sécurité. Un relevé des vérifications effectuées doit être annexé au registre de sécurité. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020380181, en vigueur depuis le 2007-11-19.",
        versionConstatee: "2007-11-19",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 51 (date des exercices d'instruction portée au registre) — livre II, établissements des quatre premières catégories",
        article: "MS 51",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317798",
        note: "« Des exercices d'instruction du personnel doivent être organisés sous la responsabilité de l'exploitant. La date de ceux-ci doit être portée sur le registre de sécurité de l'établissement. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020317798, en vigueur depuis le 2009-02-27.",
        versionConstatee: "2009-02-27",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 52 § 1 (mise à jour du registre par l'exploitant ou son représentant) — livre II, établissements des quatre premières catégories",
        article: "MS 52",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021838325",
        note: "« § 1. Pendant la présence du public, l'exploitant ou son représentant doit se trouver dans l'établissement pour : […] -assurer la mise à jour du registre de sécurité prévu à l'article R. 123-51 du code de la construction et de l'habitation. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000021838325, en vigueur depuis le 2010-05-16. La présence elle-même est portée par `incendie-erp-exploitant-present-public`.",
        versionConstatee: "2010-05-16",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 75 (dossier technique des moyens de secours annexé au registre ; documents classés après chaque intervention) — livre II, établissements des quatre premières catégories",
        article: "MS 75",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020344703",
        note: "« L'exploitant est tenu de : - produire, à l'occasion de la visite de réception […], le dossier technique des installations annexé au registre de sécurité de l'établissement […] ; - classer ensuite dans ce registre tous les documents, rapports, attestations qui doivent être rédigés et lui être remis après tout examen ou intervention quelconque sur l'installation. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020344703, seule version, en vigueur depuis le 1980-08-15.",
        versionConstatee: "1980-08-15",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. CH 17 § 2 (certificat de conformité d'un réservoir fixe de combustible liquide consigné au registre) — livre II, établissements des quatre premières catégories",
        article: "CH 17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052225053",
        note: "« Un exemplaire du certificat de conformité est gardé par l'installateur et un second est consigné dans le registre de sécurité de l'établissement. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000052225053, en vigueur depuis le 2026-01-01 (arrêté du 1er septembre 2025, art. 45).",
        versionConstatee: "2026-01-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4323-102 — rapports d'un vérificateur extérieur annexés au registre",
        article: "R. 4323-102",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531290",
        note: "« Lorsque les vérifications périodiques sont réalisées par des personnes n'appartenant pas à l'établissement, les rapports établis à la suite de ces vérifications sont annexés au registre de sécurité. A défaut, les indications précises relatives à la date des vérifications, à la date de remise des rapports correspondants et à leur archivage dans l'établissement sont portées sur le registre de sécurité. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000018531290, seule version, en vigueur depuis le 2008-05-01. Article des équipements de protection individuelle vérifiés (R. 4323-99 à R. 4323-103).",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "registre de sécurité",
    usageEcran: { groupe: "installations", sous: null },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: { travail: true, erp: true },
    equipementsEnContexte: ["EXTINCTEUR", "ALARME_INCENDIE"],
    notesInternes:
      "RATTACHEMENTS DU 2026-10-17 (sous-lot C du plan « mise à jour du référentiel », découpage validé par c6) — références seules, aucun changement de condition ni de rythme. Les actes du titre Ier qui versent une pièce au registre ou en fixent le contenu sont l'acte de cette ligne : GE 3 § 3 (consignes d'évacuation prenant en compte les handicaps, déjà dites en description), GE 10 (date, vérificateur, objet ; relevé annexé), MS 51 (date des exercices d'instruction), MS 52 § 1 (mise à jour par l'exploitant présent), MS 75 (dossier technique des moyens de secours, documents classés après chaque intervention), CH 17 § 2 (certificat de conformité d'un réservoir fixe de combustible liquide). R. 4323-102 (rapports d'un vérificateur extérieur des EPI annexés au registre) suit la même règle (Q6 de c6) : au corpus `code-travail-epi`, il passe de `sans_objet` à `retenu`. TEMPORALITÉ : état permanent, sans rythme ; aucun de ces articles ne renvoie à une norme.\n\n" +
      "Obligation permanente (pas d'échéance périodique). Modélisée sur travail=true en MVP : en pratique tout établissement du scope V2 emploie au moins un salarié (L. 4711-5 CT). Les références CCH R. 143-44 (ERP) et R. 146-35 (IGH) restent citées pour information. Corrigé à l'audit 2026-08 : R. 146-21 était cité à tort — cet article traite du silence de l'administration sur une demande d'agrément et a été abrogé par le décret 2025-1100 ; le registre de sécurité IGH est à R. 146-35.\n\nLIMITE CONNUE, NON CORRIGÉE ICI — restaurée le 2026-08-27. Cette note a été écrite le 2026-08-26 (commit 7736869) et perdue : un rebase a laissé ce commit derrière, et sa rapatriation partielle n'en a rien repris ici. Elle disait, et c'était juste : `categoriesEquipement` ancre cette obligation à un extincteur ou une alarme DÉCLARÉS. Un établissement qui n'a déclaré ni l'un ni l'autre ne reçoit AUCUNE ligne « tenue du registre », alors que le registre est dû sans condition d'équipement. Même cause pour `incendie-travail-exercice-semestriel`, ancrée sur ALARME_INCENDIE.\n\nCe qui a changé depuis : la note concluait que corriger ce faux négatif « suppose de rendre le calendrier capable de porter une obligation sans équipement — décision de schéma, à instruire séparément ». C'est fait (ADR-022). Le modèle ne bloque plus ; ces deux obligations peuvent passer au porteur établissement. Elles ne l'ont PAS été dans ce lot, tenu aux deux articles dont le verbatim était relevé en première main (PE 4 § 2, R. 4222-20). C'est le lot suivant, et il est court.\n\nAUTRE PERTE DU MÊME REBASE, non réparée ici et signalée pour qu'elle ne se reperde pas : le commit 7736869 portait aussi trois corrections réglementaires à cette obligation, relevées sur Légifrance le 2026-08-26. (1) R. 143-44 a été RÉÉCRIT au 1er juillet 2026 par le décret n° 2025-1100 ; la description ci-dessus reprend la version antérieure et ignore le 5° (dates des exercices de sécurité incendie) ainsi que le renvoi aux articles R. 141-10 et R. 141-11. (2) `typologies` devait gagner `erp: true` : R. 143-44 fonde le registre en ERP par lui-même, indépendamment de la qualité d'employeur. (3) R. 146-35 (IGH) reste cité sans `igh: true` parce que l'IGH est hors périmètre, non parce que la référence serait décorative. Réparer ces trois points modifie le champ d'application d'une obligation en production : c'est une relecture réglementaire, pas un effet de bord du chantier du porteur.\n\nAMENDEMENT 2026-08-31, lot « faux négatifs d'ancrage ». C'est le lot annoncé ci-dessus, et il fait deux choses.\n\n(A) LE PORTEUR. `categoriesEquipement: [EXTINCTEUR, ALARME_INCENDIE]` est retiré, `porteur: etablissement`. R. 143-44 relu au verbatim le 2026-08-31 dans sa version en vigueur depuis le 2026-07-01 : « DANS LES ÉTABLISSEMENTS SOUMIS AUX PRESCRIPTIONS DU PRÉSENT CHAPITRE, il doit être tenu un registre de sécurité [...] » Le champ est le chapitre ERP tout entier, 5ᵉ catégorie comprise ; l'article ne nomme aucun équipement. Côté travail, L. 4711-1 et L. 4711-2 relus le même jour ne posent pas davantage de condition d'équipement. Les deux catégories passent en `equipementsEnContexte`.\n\n(B) LA BRANCHE TRAVAIL REPOSAIT SUR UNE FACULTÉ. Constat non prévu par le brief de ce lot, et c'est le plus gênant des deux. Les seules références Code du travail portées ici étaient R. 4227-39 — dont le champ est celui de R. 4227-34, donc PAS tout employeur — et L. 4711-5, qui dispose que « l'employeur EST AUTORISÉ À réunir ces informations dans un registre unique ». Une autorisation ne fonde rien. `travail: true` s'appliquait donc à tout employeur sans qu'aucune des références citées ne l'établisse pour lui. L. 4711-1, L. 4711-2, D. 4711-2 et D. 4711-3 sont ajoutés : ce sont eux qui obligent tout employeur, sans seuil, à tenir datées et à conserver cinq ans les pièces des vérifications. La typologie ne bouge pas ; ce qui la fonde est désormais écrit. L. 4711-5 reste cité, requalifié en toutes lettres.\n\nCE QUI ÉTAIT DÉJÀ RÉPARÉ, contrairement à ce que la note ci-dessus annonce. Les points (1) et (2) de la « autre perte du même rebase » ont été traités avant ce lot : la description porte bien le 5° et le renvoi à R. 141-10 / R. 141-11, et `typologies` porte bien `erp: true`. Vérifié ligne à ligne contre le verbatim du 2026-08-31. Le point (3) tient toujours : R. 146-35 reste cité sans `igh: true` parce que l'IGH est hors périmètre. La note qui les annonçait comme non réparés est restée en place après leur correction — c'est elle qui m'a fait ouvrir R. 143-44, ce qui est le comportement voulu, mais une note qui décrit un état révolu finit par faire refaire le travail.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue: \"registre de sécurité\"` (ADR-026). Un registre tenu, pas un acte à refaire.\n\nPAS DE `champR422734`, ET C'EST VOULU — EXAMINÉ LE 2026-09-26 (C39). La question : cette ligne cite R. 4227-39 comme la consigne (R. 4227-37) et l'exercice, qui portent `personnesPresentesMin: 51` et `champR422734` ; faut-il l'aligner ? NON. R. 4227-39 relu sur Légifrance (LEGIARTI000024769386, en vigueur depuis le 10/11/2011) : il s'ouvre sur « La consigne de sécurité incendie prévoit… » et finit par « Leur date et les observations […] sont consignées sur un registre tenu à la disposition de l'inspection du travail ». R. 4227-37 relu (en vigueur du 10/11/2011 au 01/01/2027) : « Dans les établissements mentionnés à l'article R. 4227-34, une consigne de sécurité incendie est établie ». R. 4227-34 relu (en vigueur depuis le 01/05/2008) : « plus de cinquante personnes […] ainsi que ceux, quelle que soit leur importance, où sont manipulées […] des matières inflammables ». LE TEXTE DIT que le registre DE R. 4227-39 est dans ce champ (le renvoi passe par « la consigne », ce qui est une lecture, mais la même que celle des deux sœurs : `incendie-travail-consigne-affichee`, notes « la consigne affichée n'est due que dans les établissements de R. 4227-34 », et `incendie-travail-exercice-semestriel`, notes « le champ de R. 4227-39 est celui de R. 4227-34 par double renvoi »). MAIS cette ligne-ci n'est pas le registre de R. 4227-39 : c'est le registre de sécurité, que fondent L. 4711-1, L. 4711-2, D. 4711-2 et D. 4711-3 chez tout employeur, sans seuil (amendement (B) ci-dessus, 2026-08-31), et CCH R. 143-44 dans tout ERP, 5ᵉ catégorie comprise. Le registre des essais et exercices, dans le champ de R. 4227-34, est déjà porté par `incendie-travail-exercice-semestriel`, dont la `pieceAttendue` est le « registre des exercices et essais ». Aligner ferait perdre la ligne à tout employeur de cinquante personnes ou moins sans matières inflammables et à tout ERP de 5ᵉ catégorie sous le seuil — un faux négatif muet, et la réconciliation SUPPRIMERAIT les lignes sans trace. Ce qui a changé ici : R. 4227-39 cesse d'être `referencesLegales[0]` — la convention du type en fait « l'article qui fonde », et le guide « Par métier » l'affichait comme la référence du registre d'un bureau de cinq —, L. 4711-1 prend sa place ; la description dit ce que tout employeur doit, puis ce que les seuls établissements de R. 4227-34 doivent en plus. Typologies inchangées, empreinte inchangée.",
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
      "Une fois par mois, l'employeur vérifie le passage à la position de fonctionnement en cas de défaillance de l'alimentation normale et l'allumage de toutes les lampes, ainsi que l'efficacité de la commande de mise en position de repos à distance et de la remise automatique en position de veille au retour de l'alimentation normale. Le résultat est porté au registre. Sur une installation constituée de blocs autonomes à système automatique de test intégré (SATI), ces opérations peuvent être effectuées automatiquement. Une notice descriptive des conditions de maintenance et de fonctionnement, avec les caractéristiques des pièces de rechange, est annexée au registre (arrêté du 14 décembre 2011, art. 11).",
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
    usageEcran: null,
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
      "Une fois tous les six mois, l'employeur vérifie l'autonomie d'au moins une heure de l'éclairage de sécurité. Dans les établissements comportant des périodes de fermeture, l'opération est conduite de telle manière qu'au début de chaque période d'ouverture l'installation ait retrouvé l'autonomie prescrite. Le résultat est porté au registre. Une notice descriptive des conditions de maintenance et de fonctionnement, avec les caractéristiques des pièces de rechange, est annexée au registre (arrêté du 14 décembre 2011, art. 11).",
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
    usageEcran: null,
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
      "Une fois par mois, l'exploitant s'assure du passage à la position de fonctionnement en cas de défaillance de l'alimentation normale et de l'allumage de toutes les lampes, ainsi que de l'efficacité de la commande de mise en position de repos à distance et de la remise automatique en position de veille au retour de l'alimentation normale. Le résultat est consigné au registre de sécurité. Sur une installation constituée de blocs autonomes à système automatique de test intégré (SATI), ces opérations peuvent être effectuées automatiquement. Cet article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range l'éclairage parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents. Le calendrier y maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EC 14 § 3 — livre II, établissements des quatre premières catégories",
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
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["BAES"],
    notesInternes:
      "Ajoutée 2026-08 après lecture du texte : EC 14 § 3 impose à l'exploitant d'ERP exactement les deux fréquences de l'article 11 de l'arrêté du 14 décembre 2011. La note de `incendie-travail-eclairage-securite-essai-mensuel` affirmait que `incendie-erp-baes-annuelle` « prenait le relais » — un relais qui remplaçait quatorze actes annuels par un seul. L'exception SATI (NF C 71-820, mai 1999) n'est pas encodée en condition : aucune propriété d'équipement ne porte encore la question, ici comme du côté travail.\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».",
  },
  {
    id: "incendie-erp-eclairage-securite-autonomie-semestrielle",
    domaine: "incendie",
    libelle: "Vérification semestrielle de l'autonomie de l'éclairage de sécurité (ERP)",
    description:
      "Une fois tous les six mois, l'exploitant s'assure de l'autonomie d'au moins une heure de l'éclairage de sécurité. Dans les établissements comportant des périodes de fermeture, l'opération est conduite de telle manière qu'au début de chaque période d'ouverture au public l'installation ait retrouvé l'autonomie prescrite. Le résultat est consigné au registre de sécurité. Cet article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range l'éclairage parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents. Le calendrier y maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EC 14 § 3 — livre II, établissements des quatre premières catégories",
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
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["BAES"],
    notesInternes:
      "Même fondement et même partition que `incendie-erp-eclairage-securite-essai-mensuel` : voir ses notes internes. Les deux périodicités d'EC 14 § 3 sont scindées en deux obligations pour la même raison que du côté travail — le modèle ne porte qu'une périodicité par obligation, et il s'agit de deux actes distincts (contrôle visuel d'allumage / décharge complète sur batterie).\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».",
  },

  // ---------------------------------------------------------------------------
  // ERP — Moyens de secours (MS)
  // ---------------------------------------------------------------------------
  {
    id: "incendie-erp-extincteurs-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des extincteurs (ERP)",
    description:
      "Un extincteur fait l'objet d'une vérification annuelle et d'une révision tous les dix ans, par une personne ou un organisme compétent. L'appareil porte une étiquette identifiable apposée par le vérificateur, indiquant l'année et le mois des vérifications. Un plan d'implantation des extincteurs et un relevé des vérifications sont portés au registre de sécurité. Ces deux rythmes sont fixés par le livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, le règlement ne reprend pas cet article et fixe l'entretien et la vérification des moyens de secours « tous les trois ans au plus » (PE 4 § 2). Le calendrier y maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 38 § 4 — livre II, établissements des quatre premières catégories",
        article: "MS 38",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020317639/",
        note: "« Un extincteur doit faire l'objet d'une vérification annuelle et d'une révision tous les dix ans par une personne ou un organisme compétent. Il doit être marqué d'une étiquette clairement identifiable apposée par la personne ou l'organisme ayant réalisé cette dernière. Les années et les mois des vérifications doivent apparaître sur l'étiquette. Un plan d'implantation des extincteurs et un relevé des vérifications doivent être portés au registre de sécurité. » Le § 2 traite du marquage de l'appareil, pas de sa vérification : il était cité à tort.",
        versionConstatee: "2008-10-08",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 73 § 2 — livre II, établissements des quatre premières catégories",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317755/",
        versionConstatee: "1980-08-15",
      },
      // C59 lot 3 : la norme en seconde référence — le rythme reste celui de
      // MS 38 § 4, écrit par le texte ; la norme dit comment la maintenance se fait.
      REFERENCE_NF_S_61_919_ANNUELLE,
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    // 2026-10-07 (relecture du préventeur) : ~~["personne_qualifiee",
    // "organisme_agree"]~~. MS 38 § 4 dit « par une personne ou un organisme
    // compétent » : aucun agrément n'est exigé. Voir les notes.
    realisateurs: ["personne_competente"],
    criticite: 5,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["EXTINCTEUR"],
    notesInternes:
      "Sur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.\n\nCE QUE L'ÉCRAN DIT DE LA 5ᵉ CATÉGORIE — 2026-09-26 (C39). La sur-application est MAINTENUE, comportement inchangé (politique des sœurs du livre II : désenfumage, SSI, BAES, groupe électrogène, RIA, CH 58). Mais « visible et documentée » ne l'était qu'à moitié : la documentation vivait ici, dans une note que personne ne lit, et tout ce qu'un exploitant de 5ᵉ voyait — « Ce qui fonde cette obligation » sur la fiche, la référence du guide « Par métier » (commerce, restauration), la raison du pré-remplissage des équipements — citait « MS 38 § 4 » sans dire que cet article ne vaut, au titre du texte, que pour les quatre premières catégories. La `reference` le dit désormais (« — livre II, établissements des quatre premières catégories »), et la description nomme PE 4 § 2, « tous les trois ans au plus », et le fait que le calendrier maintient l'échéance en 5ᵉ. Textes relus le 2026-09-26 : chemin de MS 38 sur Légifrance (« Livre II : Dispositions applicables aux établissements des quatre premières catégories »), PE 1 § 1 (« Les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre », en vigueur depuis le 27/08/1990). Libellé, typologies, périodicité : inchangés, empreinte inchangée.\n\nRÉALISATEUR CORRIGÉ LE 2026-10-07 (relecture du préventeur, plan du lot 1, item 2). La ligne portait `[\"personne_qualifiee\", \"organisme_agree\"]` ; MS 38 § 4 écrit « par une personne ou un organisme compétent », relu le 2026-10-07 par l'API PISTE en BAC À SABLE (LEGIARTI000020382888, version du 2008-10-08, aucune version future). L'agrément n'est pas exigé : `organisme_agree` est retiré, et `personne_qualifiee` avec lui, le texte ne disant pas « qualifiée ». Reste `personne_competente`, le mot du texte. AUCUNE VALEUR NE DIT « ORGANISME COMPÉTENT » : `Realisateur` n'a pas de valeur pour un organisme sans agrément ni accréditation ; le libellé affiché est « Personne compétente », et la description garde « par une personne ou un organisme compétent ». Ajouter une valeur à l'énumération supposerait une migration Prisma (enum `Realisateur`) : non fait."
  },
  {
    id: "incendie-erp-ssi-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des systèmes de sécurité incendie (SSI) en ERP",
    description:
      "Les systèmes de sécurité incendie, notamment les SSI de catégorie A et B (détection, alarme, compartimentage, désenfumage), font l'objet d'un contrôle annuel par un technicien compétent. Cet article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range les moyens de secours parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents ; PE 4 § 1 impose en outre, dans les établissements avec locaux à sommeil, un contrat annuel d'entretien des systèmes de détection automatique d'incendie. Le calendrier y maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification annuelle) — livre II, établissements des quatre premières catégories",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317755/",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee", "organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["ALARME_INCENDIE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait un « arrêté du 2 mai 2005 (SSI) » ; ce texte régit le personnel SSIAP, pas les systèmes de sécurité incendie. Référence retirée.\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».",
  },
  {
    id: "incendie-erp-extincteurs-revision-decennale",
    domaine: "incendie",
    libelle: "Révision décennale des extincteurs (ERP)",
    description:
      "Outre sa vérification annuelle, un extincteur fait l'objet d'une révision tous les dix ans par une personne ou un organisme compétent. L'appareil porte une étiquette clairement identifiable apposée par celui qui a réalisé cette révision, et les années et les mois des vérifications doivent apparaître sur l'étiquette. Ce rythme est fixé par le livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, le règlement ne reprend pas cet article et fixe l'entretien et la vérification des moyens de secours « tous les trois ans au plus » (PE 4 § 2). Le calendrier y maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 38 § 4 (révision décennale) — livre II, établissements des quatre premières catégories",
        article: "MS 38",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020317639/",
        note: "« Un extincteur doit faire l'objet d'une vérification annuelle et d'une révision tous les dix ans par une personne ou un organisme compétent. Il doit être marqué d'une étiquette clairement identifiable apposée par la personne ou l'organisme ayant réalisé CETTE DERNIÈRE. » Article rouvert à la source le 2026-09-01 avant l'encodage, version en vigueur du 08/10/2008 : le § 4 porte DEUX rythmes dans une seule phrase, et l'étiquette se rattache grammaticalement à la révision — « cette dernière » —, pas à la vérification annuelle.",
        versionConstatee: "2008-10-08",
      },
      // C59 lot 3 : la norme en seconde référence — le rythme reste celui de
      // MS 38 § 4, écrit par le texte ; la norme dit comment la révision se fait.
      REFERENCE_NF_S_61_919_REVISION,
    ],
    periodicite: "decennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    // 2026-10-07 (relecture du préventeur) : ~~["personne_qualifiee",
    // "organisme_agree"]~~. MS 38 § 4 dit « par une personne ou un organisme
    // compétent » : aucun agrément n'est exigé. Voir les notes.
    realisateurs: ["personne_competente"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["EXTINCTEUR"],
    notesInternes:
      "AJOUTÉE LE 2026-09-01 (lot C). Le § 4 de MS 38 porte deux rythmes — « une vérification annuelle ET une révision tous les dix ans » — et le référentiel n'en portait qu'un : `incendie-erp-extincteurs-annuelle` prend l'annuelle, sa description NOMMAIT la décennale, et aucune échéance ne la datait. Le corpus le déclarait en réserve depuis le relevé du même jour.\n\nPOURQUOI UNE LIGNE À PART ET NON UN CHAMP SUR L'AUTRE. Ce sont deux actes, à deux dates, avec deux preuves : la vérification annuelle laisse une ligne sur l'étiquette, la révision décennale est un démontage de l'appareil, et un extincteur qui l'a subie porte une étiquette apposée par celui qui l'a faite. Le modèle n'a d'ailleurs aucun moyen de porter deux rythmes sur une obligation — c'est la limite que le cadrage du 2026-09-01 nomme en section B, et elle vaut ici aussi ; la différence est qu'ici les deux rythmes portent sur deux actes distincts, ce qui rend la scission juste plutôt que palliative.\n\nHORS ERP, LA JUMELLE EST AU NIVEAU AUDIT DEPUIS LE 2026-10-17 (ADR-042, décision de la propriétaire du même jour) : `incendie-travail-extincteurs-revision-atelier-decennale` sort du quotidien, son rythme ne venant que de la norme NF S 61-919. CETTE LIGNE-CI RESTE SERVIE : en ERP, la révision tous les dix ans est écrite par le règlement de sécurité lui-même (MS 38 § 4). La partition `erp: false` / `erp` ne bouge pas.\n\nCRITICITÉ 4 ET NON 5, à la différence de l'annuelle : un extincteur non révisé depuis onze ans reste un extincteur vérifié il y a moins d'un an. Le risque immédiat est celui que porte l'annuelle.\n\nSUR-APPLICATION EN 5ᵉ CATÉGORIE, la même que l'annuelle et pour la même raison — MS 38 relève du Livre II, écarté par PE 1 § 1, et le Livre III n'y renvoie pas. Elle est héritée telle quelle et non aggravée : la ligne suit exactement le périmètre de `incendie-erp-extincteurs-annuelle`, dont les notes portent l'analyse complète. Si cette dernière est un jour restreinte, celle-ci doit l'être du même mouvement.\n\nCE QUE LE DIRIGEANT VERRA : rien avant dix ans après la première révision déclarée, et une échéance « à planifier » tant qu'aucune date n'est connue. C'est le comportement ordinaire d'une périodicité longue, pas un défaut.\n\nCE QUE L'ÉCRAN DIT DE LA 5ᵉ CATÉGORIE — 2026-09-26 (C39). Même mouvement que `incendie-erp-extincteurs-annuelle`, dont c'est la jumelle sur le même § 4. La sur-application est MAINTENUE, comportement inchangé (politique des sœurs du livre II : désenfumage, SSI, BAES, groupe électrogène, RIA, CH 58). Mais « visible et documentée » ne l'était qu'à moitié : la documentation vivait ici, dans une note que personne ne lit, et tout ce qu'un exploitant de 5ᵉ voyait — « Ce qui fonde cette obligation » sur la fiche, la référence du guide « Par métier » (commerce, restauration), la raison du pré-remplissage des équipements — citait « MS 38 § 4 » sans dire que cet article ne vaut, au titre du texte, que pour les quatre premières catégories. La `reference` le dit désormais (« — livre II, établissements des quatre premières catégories »), et la description nomme PE 4 § 2, « tous les trois ans au plus », et le fait que le calendrier maintient l'échéance en 5ᵉ. Textes relus le 2026-09-26 : chemin de MS 38 sur Légifrance (« Livre II : Dispositions applicables aux établissements des quatre premières catégories »), PE 1 § 1 (« Les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre », en vigueur depuis le 27/08/1990). Libellé, typologies, périodicité : inchangés, empreinte inchangée.\n\nRÉALISATEUR CORRIGÉ LE 2026-10-07 (relecture du préventeur, plan du lot 1, item 2). La ligne portait `[\"personne_qualifiee\", \"organisme_agree\"]` ; MS 38 § 4 écrit « par une personne ou un organisme compétent », relu le 2026-10-07 par l'API PISTE en BAC À SABLE (LEGIARTI000020382888, version du 2008-10-08, aucune version future). L'agrément n'est pas exigé : `organisme_agree` est retiré, et `personne_qualifiee` avec lui, le texte ne disant pas « qualifiée ». Reste `personne_competente`, le mot du texte. AUCUNE VALEUR NE DIT « ORGANISME COMPÉTENT » : `Realisateur` n'a pas de valeur pour un organisme sans agrément ni accréditation ; le libellé affiché est « Personne compétente », et la description garde « par une personne ou un organisme compétent ». Ajouter une valeur à l'énumération supposerait une migration Prisma (enum `Realisateur`) : non fait.",
  },
  {
    id: "incendie-erp-ssi-triennale",
    domaine: "incendie",
    libelle: "Vérification triennale des SSI de catégorie A ou B (ERP)",
    description:
      "En plus de la vérification annuelle, les systèmes de sécurité incendie de catégories A et B doivent être vérifiés tous les trois ans par une personne ou un organisme agréé (MS 73 § 2). Cette ligne est servie à tout système d'alarme déclaré tant que la question « Ce SSI est-il de catégorie A ou B ? » n'a pas reçu de réponse : elle reste au calendrier au silence, et disparaît sur un « non ».",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification triennale par organisme agréé des SSI de catégorie A ou B)",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317755/",
        note: "« De plus, les systèmes de sécurité incendie de catégories A et B et les systèmes d'extinction automatique du type sprinkleur doivent être vérifiés tous les trois ans par une personne ou un organisme agréé. » (§ 2, seconde phrase). Relu le 2026-10-07 sur l'API Légifrance (PISTE, bac à sable), LEGIARTI000020317755, en vigueur depuis le 15/08/1980.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: { categories: ["N1", "N2", "N3", "N4"] },
    },
    categoriesEquipement: ["ALARME_INCENDIE"],
    conditions: [
      {
        type: "equipement_propriete_non_infirmee",
        categorie: "ALARME_INCENDIE",
        propriete: "estSsiCategorieAouB",
      },
    ],
    notesInternes:
      "CONDITION A/B AJOUTÉE LE 2026-10-07 (lot 4, relecture du préventeur du 05/10). Le libellé disait « SSI de catégorie A ou B » depuis l'origine et la ligne n'en portait aucune condition : elle tombait sur toute ALARME_INCENDIE déclarée en ERP des quatre premières catégories, quelle que soit la catégorie du SSI — la sur-application que la réserve de `DF 10` au corpus citait en preuve depuis le 2026-09-01. `MS 73 § 2`, relu le 2026-10-07 : « les systèmes de sécurité incendie de catégories A et B et les systèmes d'extinction automatique du type sprinkleur doivent être vérifiés tous les trois ans par une personne ou un organisme agréé ».\n\nFORME `non_infirmee`, ET CE N'EST PAS UN CHOIX. Ligne déjà publiée, criticité 4 : la règle du dépôt (`conformite.test.ts`) impose une forme qui survit au silence. Toutes les alarmes déjà déclarées gardent donc la triennale tant que le dirigeant n'a pas répondu « non » à « Ce SSI est-il de catégorie A ou B ? » ; la sur-application ne disparaît qu'à la réponse, et elle est désormais corrigeable par lui.\n\nCE QUE LA LIGNE NE PORTE TOUJOURS PAS : les SPRINKLEURS, que le même § 2 soumet à la même triennale. Aucune catégorie d'équipement ne les déclare ; ce n'est pas l'objet de ce lot.\n\nRÉALISATEUR : le texte écrit « par une personne ou un organisme agréé » ; la ligne dit `organisme_agree` seul. Relevé, non modifié ici. [2026-10-07, C60, revue indépendante — RÉSERVE ÉCRITE] Le réalisateur reste `organisme_agree` FAUTE DE VALEUR : l'énumération `Realisateur` n'a pas de « personne agréée » (`personne_qualifiee` et `personne_competente` ne disent pas l'agrément, et les y ranger élargirait ce que le texte permet). La description, elle, dit le texte entier. Même défaut que celui corrigé pour MS 38 § 4 au lot 1, où « une personne ou un organisme compétent » avait sa valeur, `personne_competente`.\n\nLIBELLÉ, 2026-10-07 (C60) : ~~« Vérification triennale approfondie des SSI de catégorie A ou B (ERP) »~~ — « approfondie » n'est pas dans MS 73 § 2, qui dit « vérifiés tous les trois ans ». La description dit désormais ce qui se passe au silence de la question A/B (ligne servie, forme `non_infirmee`)."
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
    usageEcran: null,
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
      "L'éclairage de sécurité (blocs autonomes d'éclairage de sécurité et source centrale) est vérifié annuellement par un technicien compétent. Les essais que l'exploitant conduit lui-même — mensuel et semestriel — font l'objet de leurs propres échéances. Ces articles relèvent du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range l'éclairage parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents. Le calendrier y maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EC 15 — livre II, établissements des quatre premières catégories",
        article: "EC 15",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000020317463",
        note: "« Vérifications. — Les installations d'éclairage doivent être vérifiées dans les conditions de l'article EL 19. » Version en vigueur depuis le 15 août 1980. EC 15 ne fixe donc aucune périodicité : il renvoie, et c'est EL 19 qui porte les conditions. Texte relu le 23 août 2026.",
        versionConstatee: "1980-08-15",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EL 19 — livre II, établissements des quatre premières catégories",
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
    usageEcran: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["BAES"],
    notesInternes:
      "Régime ERP de l'éclairage de sécurité, volet « vérification technique par un tiers ». Il se coordonne avec le régime travail (arrêté du 14 décembre 2011) par l'article 1er de celui-ci, qui laisse le règlement de sécurité ERP gouverner les locaux et dégagements accessibles au public : les deux obligations « travail » portent donc `erp: false`. Cette ligne n'est PAS l'équivalent ERP de l'article 11 — ce sont `incendie-erp-eclairage-securite-essai-mensuel` et `-autonomie-semestrielle`, fondés sur EC 14 § 3, qui le sont. La référence citait « EC 14 et EC 15 » : EC 14 ne fonde aucune vérification annuelle, il fonde les deux essais de l'exploitant, et EC 15 est un pur renvoi à EL 19. Réserve ouverte : EL 19 n'a pas encore été confronté au mot près, faute d'accès automatisé au corps des articles de cet arrêté.\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».",
  },
  {
    id: "incendie-erp-desenfumage-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des installations de désenfumage (ERP)",
    description:
      "Les dispositifs de désenfumage (DENFC, volets, clapets, amenées d'air) des ERP font l'objet d'une vérification annuelle par un technicien compétent. Cet article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 1 fait vérifier les installations de désenfumage à la construction et avant l'ouverture, par des personnes ou des organismes agréés, dans les établissements avec locaux à sommeil ; la liste de PE 4 § 2 (« tous les trois ans au plus ») ne nomme pas le désenfumage et se termine par « etc. ». Le calendrier y maintient pourtant cette échéance, par sur-application assumée. L'article DF 9 fait aussi ENTRETENIR « périodiquement » le désenfumage par un personnel compétent — sources de sécurité, éléments mécaniques et électriques, système de sécurité : c'est un autre geste que la vérification, et Rojer ne le suit pas.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. DF 10 § 2 (la périodicité des vérifications est de un an) — livre II, établissements des quatre premières catégories",
        article: "DF 10",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000020382687",
        note: "« § 2. La périodicité des vérifications est de un an. » Relu le 2026-10-07 sur l'API Légifrance (PISTE, bac à sable), LEGIARTI000020382687, en vigueur depuis le 28/10/2007, sans version future. Le § 3 — triennale par organisme agréé quand existent un désenfumage mécanique et un SSI de catégorie A ou B — est porté par `incendie-erp-desenfumage-triennale-mecanique-ssi`.",
        versionConstatee: "2007-10-28",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. DF 9 (entretien périodique du désenfumage par un personnel compétent) — livre II, établissements des quatre premières catégories",
        article: "DF 9",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020304547",
        note: "« Il doit être procédé périodiquement par un personnel compétent aux opérations suivantes : - entretien des sources de sécurité selon les dispositions de l'article EL 18 ; - entretien courant des éléments mécaniques et électriques selon les prescriptions des constructeurs ; - entretien du système de sécurité selon les dispositions de l'article MS 68 et suivant la notice du constructeur. Les règles d'exploitation et de maintenance sont définies à l'article MS 69 et dans la norme NF S 61-933. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020304547, en vigueur depuis le 2004-07-01.",
        versionConstatee: "2004-07-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["DESENFUMAGE"],
    notesInternes:
      "RATTACHEMENT DU 2026-10-17 (sous-lot C, plan § 4 : « pas de seconde ligne ») — référence de CONTEXTE. DF 9 fait ENTRETENIR le désenfumage « périodiquement » ; cette ligne le fait VÉRIFIER chaque année (DF 10 § 2). L'entretien est un autre geste, que Rojer NE SUIT PAS : la description le dit (revue indépendante du 2026-10-17). TEMPORALITÉ : DF 9 a un rythme vague (« périodiquement ») ; le défaut annuel de l'ADR-039 ne s'applique pas ici, faute de ligne qui porte l'entretien — la périodicité de cette ligne est le rythme ÉCRIT de DF 10 § 2. NORME CITÉE NON LUE : DF 9 renvoie à la NF S 61-933 pour les règles d'exploitation et de maintenance ; elle n'est pas au corpus `normes`, aucune référence `NORME` n'est posée et aucun rythme n'en est tiré.\n\n" +
      "Sur-application assumée en 5ᵉ catégorie (constatée 2026-08-26, dépouillement du Livre III). L'article cité relève du Livre II du règlement de sécurité — « Dispositions applicables aux établissements des quatre premières catégories » — et PE 1 § 1 dispose que « les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre ». Le Livre III a été dépouillé article par article : PE 26 n'ouvre le Livre II que sur MS 39, PE 27 que sur MS 70, ni l'un ni l'autre n'étant un article de vérification. L'article cité ne fonde donc PAS cette obligation en N5. Ce qui la fonde en N5 est PE 4 § 2 — « tous les trois ans au plus », par techniciens compétents — et, chez un employeur, le Code du travail, qui s'applique indépendamment du classement ERP. La ligne est MAINTENUE volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement.\n\nÉtat au 2026-08-27 (ADR-022) : le référentiel sait désormais le porter — `incendie-erp-pe4-entretien-installations-techniques` existe, portée par l'établissement, triennale, et elle atteint tous les ERP y compris ceux qui n'ont rien déclaré. La condition annoncée ci-dessus est donc à moitié levée, et à moitié seulement. Ce qui manque est un point de DROIT, pas de modèle : cette ligne-ci n'est pas seulement fondée sur le Livre II, sa note dit qu'elle l'est aussi, chez un employeur, sur le Code du travail — lequel s'applique indépendamment du classement ERP. Tant que cela n'a pas été vérifié article par article sur Légifrance, retirer la ligne supprimerait chez l'utilisateur une échéance dont on n'a PAS établi qu'elle n'est pas due, et le ferait en silence : sans rapport ni action attachés, la réconciliation la supprime physiquement (ADR-012). La relecture réglementaire de ces six lignes est un chantier distinct, à mener avec la skill de veille ; ce n'est pas un effet de bord du chantier du porteur.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».\n\nPRÉCISÉE AU § 2 LE 2026-10-07 (lot 4, relecture du préventeur du 05/10). La référence citait « DF 10 » sans paragraphe, et l'URL pointait le texte entier. Elle désigne désormais le § 2, qui porte seul l'annuelle (« La périodicité des vérifications est de un an. »), et l'article lui-même. Rythme, réalisateur, périmètre : inchangés. Le § 3 a désormais sa ligne, `incendie-erp-desenfumage-triennale-mecanique-ssi` ; cette annuelle n'est PAS conditionnée par lui — voir les notes de la triennale sur le cumul, que le texte n'écrit pas."
  },
  {
    id: "incendie-erp-desenfumage-triennale-mecanique-ssi",
    domaine: "incendie",
    libelle:
      "Vérification triennale par organisme agréé du désenfumage mécanique, en présence d'un SSI de catégorie A ou B (ERP des 4 premières catégories)",
    description:
      "Lorsque l'établissement dispose à la fois d'une installation de désenfumage mécanique et d'un système de sécurité incendie (SSI) de catégorie A ou B, les vérifications du désenfumage sont effectuées tous les trois ans par un organisme agréé. Cette vérification triennale s'ajoute à la vérification annuelle, qui reste au calendrier : le texte n'écrit pas ce cumul, c'est la lecture retenue. L'article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. La ligne n'apparaît qu'après la réponse « oui » à la question « désenfumage mécanique », posée sur l'appareil ; la réponse « non » à la question de la fiche de l'établissement sur le SSI de catégorie A ou B la retire, et tant que cette question reste sans réponse la ligne s'affiche « à confirmer ».",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. DF 10 § 3 (désenfumage mécanique et SSI de catégorie A ou B : vérifications tous les trois ans par un organisme agréé) — livre II, établissements des quatre premières catégories",
        article: "DF 10",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000020382687",
        note: "« § 3. Lorsque existent une installation de désenfumage mécanique et un système de sécurité incendie de catégorie A ou B, les vérifications sont effectuées tous les trois ans par un organisme agréé. » Relu le 2026-10-07 sur l'API Légifrance (PISTE, bac à sable), LEGIARTI000020382687, en vigueur depuis le 28/10/2007, sans version future.",
        versionConstatee: "2007-10-28",
      },
    ],
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: { categories: ["N1", "N2", "N3", "N4"] },
      // 2026-10-12 : la présence d'un SSI A/B se lit sur la fiche de
      // l'établissement (décision de la propriétaire du 2026-10-08), plus sur
      // chaque désenfumage. ~~`equipement_propriete_non_infirmee` sur
      // `etablissementASsiCategorieAouB`~~.
      ssiCategorieAouB: true,
    },
    categoriesEquipement: ["DESENFUMAGE"],
    conditions: [
      {
        type: "equipement_propriete_booleenne",
        categorie: "DESENFUMAGE",
        propriete: "estDesenfumageMecanique",
        valeur: true,
      },
    ],
    notesInternes:
      "CRÉÉE LE 2026-10-07 (lot 4, relecture du préventeur du 05/10). Le corpus portait `DF 10 § 3` en réserve depuis le 2026-09-01, avec trois causes de non-encodage : (1) le moteur ne sait pas faire un ET entre deux catégories d'équipement, (2) rien ne dit la catégorie d'un SSI, (3) le cumul avec l'annuelle n'était pas tranché. Les trois sont levées ou contournées, et chacune l'est par un choix écrit ici.\n\nLE CUMUL N'EST PAS DANS LE TEXTE. `DF 10 § 3` écrit « les vérifications sont effectuées tous les trois ans par un organisme agréé » et ne dit ni qu'il remplace le § 2, ni qu'il s'y ajoute. À la question posée le 30/09 (« la triennale par organisme agréé remplace-t-elle l'annuelle du § 2, ou s'y ajoute-t-elle ? »), le préventeur a répondu, à la relecture du 05/10 : « elle s'y ajoute ». C'est SA LECTURE, retenue par la propriétaire ; le référentiel l'encode donc en ligne distincte, sans toucher à `incendie-erp-desenfumage-annuelle`, et la description dit au dirigeant que c'est une lecture. Si une source contraire était produite, c'est l'annuelle qu'il faudrait borner par `infirmee` sur les mêmes deux questions, pas cette ligne qu'il faudrait retirer.\n\n~~(1) LE « ET » ENTRE DEUX INSTALLATIONS : QUESTION POSÉE AU DÉSENFUMAGE LUI-MÊME. `matchEquipements` évalue les conditions sur l'équipement déclencheur et lui seul ; une condition portant sur un AUTRE équipement du parc (« l'établissement a-t-il une ALARME_INCENDIE répondant oui à `estSsiCategorieAouB` ? ») demanderait une variante neuve de `ConditionApplication`, une branche au moteur, sa sémantique du silence à inventer (aucune alarme déclarée ? une alarme sans réponse ?), et sa répercussion sur la grille, la fiche et `reponses-exigees`. Le lot ne l'a pas fait : la question « l'établissement dispose-t-il d'un SSI de catégorie A ou B ? » est posée sur le désenfumage (`etablissementASsiCategorieAouB`). Elle a aussi un mérite propre : le SSI n'a pas à être déclaré au parc pour que la ligne naisse, alors qu'une condition sur le parc l'aurait exigé. Son coût, écrit pour être repris : la réponse se donne deux fois, ici et sur l'alarme, et rien ne vérifie qu'elles concordent.~~ [2026-10-12, `lot/suites-0810` — décision de la propriétaire du 2026-10-08 (« ok pour tes recos », point 9 : « SSI A ou B : une seule question sur la fiche établissement, au lieu d'une par désenfumage ») : la présence d'un SSI A/B est un fait de l'établissement, `Etablissement.ssiCategorieAouB` (migration additive `20261012140000`, qui reprend les réponses données au désenfumage, le « oui » primant), lue par le critère de typologie `ssiCategorieAouB` — sans condition sur un autre appareil, et sans que le SSI ait à être déclaré au parc. La question de l'alarme (« Ce SSI est-il de catégorie A ou B ? », `incendie-erp-ssi-triennale`, MS 73 § 2) reste posée par appareil : rien ne vérifie toujours qu'elle concorde avec la fiche.]\n\n(2) LA CATÉGORIE DU SSI : UN BOOLÉEN SUFFIT. La réserve disait que la catégorie est une énumération (A à E) et que le trois-états ne suffisait pas. Pour ce que les textes en font — `DF 10 § 3` et `MS 73 § 2` ne distinguent que « A ou B » du reste —, la question fermée « de catégorie A ou B ? » porte exactement l'information utile, sans migration ni énumération.\n\nLE SILENCE, ET POURQUOI LES DEUX QUESTIONS NE LE TRAITENT PAS PAREIL. Ligne NEUVE : personne ne peut la perdre, et l'annuelle — qui reste due quoi qu'on réponde — couvre l'appareil par défaut. La règle du dépôt (`conformite.test.ts`, « une obligation criticité ≥ 4 ne se conditionne pas sur le silence ») ne l'oblige donc à rien, et le choix se fait sur « qui verrait l'erreur » :\n— `estDesenfumageMecanique` en opt-in (`booleenne`). Servir la triennale au silence la ferait tomber sur tout désenfumage d'ERP des quatre premières catégories, naturel compris, soit un faux positif de masse sur une visite d'organisme agréé ; c'est le précédent de `aeration-travail-recyclage-semestriel`. ~~Le prix : un désenfumage mécanique jamais qualifié n'a pas la triennale. La question reste « Pas encore répondu » sur la fiche de l'appareil.~~ [2026-10-12, `lot/suites-0810` — décision de la propriétaire du 2026-10-08 (point 5, « réponse exigée ») : la réponse est EXIGÉE à la déclaration et à la modification d'un désenfumage, là où le « oui » fait naître cette ligne — ERP des quatre premières catégories, sauf « non » au SSI A/B sur la fiche (`QUESTIONS_EXIGEES_PAR_DECISION`, `equipements/reponses-exigees.ts`) ; un appareil ancien resté muet est relancé sur la fiche de l'établissement. La forme `booleenne` reste : le silence d'un appareil d'avant la décision ne sert toujours pas la triennale.]\n— ~~`etablissementASsiCategorieAouB` en opt-out (`non_infirmee`).~~ [2026-10-12 : la question est sur la fiche, `ssiCategorieAouB`, et garde le même sens — seul un « non » retire, le silence retient « à confirmer » (ADR-022).] Une fois le mécanique déclaré, la population est petite et la sur-application est visible et se corrige par un « non » ; la sous-application, elle, ne se verrait qu'au passage de la commission. C'est le même sens que la condition A/B posée le même jour sur `incendie-erp-ssi-triennale`.\n\nPÉRIMÈTRE N1 À N4, par lecture du champ : `DF 10` est au Livre II, que `PE 1 § 1` écarte en 5ᵉ catégorie, et le Livre III ne le rouvre pas (PE 4 § 1 ne vise que la vérification à la construction et avant l'ouverture, en locaux à sommeil). Ligne neuve, donc sans l'héritage de sur-application de l'annuelle — même raisonnement que `incendie-erp-alarme-verification-hebdomadaire`.\n\n`realisateurs: [\"organisme_agree\"]` : le texte écrit « par un organisme agréé », sans alternative. Criticité 4, celle de l'annuelle dont elle complète l'objet."
  },
  {
    id: "incendie-erp-ria-annuelle",
    domaine: "incendie",
    libelle: "Vérification annuelle des robinets d'incendie armés (RIA) en ERP",
    description:
      "Les robinets d'incendie armés, installations fixes de lutte contre l'incendie (MS 14 à MS 17), sont vérifiés au moins une fois par an en cours d'exploitation (MS 73 § 2), dans les conditions de la section II du chapitre Ier du titre Ier du règlement de sécurité. Cet article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range les moyens de secours parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents. Le calendrier y maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. MS 73 (appareils et installations fixes) — livre II, établissements des quatre premières catégories",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317755/",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["RIA"],
    notesInternes:
      "Amendement 2026-08-25 : la catégorie d'équipement `RIA` existe désormais (enum Prisma + migration 20260825130000). Un RIA déclaré déclenche l'obligation sans condition. La branche EXTINCTEUR bornée par `aRobinetsIncendieArmes` (forme non_infirmee, criticité 4) est TRANSITOIRE : elle protège les établissements existants qui ont répondu « oui » sur leurs extincteurs, jusqu'à la reprise de données (scripts/reprise-ria.ts) qui crée un équipement RIA à partir de chaque extincteur ainsi marqué. Critère de retrait de la branche : plus aucun équipement EXTINCTEUR ne porte la clé `aRobinetsIncendieArmes` en base — retirer alors « EXTINCTEUR » des catégories, la condition, et la question du formulaire. Un établissement qui aurait à la fois un extincteur « oui » et un RIA déclaré reçoit deux lignes d'ici là.\n\nSources relues ce jour : MS 73 § 2 (LEGIARTI000020317755) fonde la vérification annuelle des installations fixes ; MS 38 ne vise que les extincteurs et ne fonde pas les RIA ; MS 68 ne vise que le SSI. R. 4227-30 CT fonde la présence des RIA « si nécessaire » côté employeur, sans périodicité. En 5ᵉ catégorie, PE 4 § 2 (version au 01/07/2026) prévoit « tous les trois ans au plus » par techniciens compétents : l'annuelle est une sur-application assumée en N5, cohérente avec le traitement des extincteurs. La mention « contrôle visuel trimestriel » (norme NF S 62-201, non opposable) a été retirée.\n\nCRITÈRE DE RETRAIT SOLDÉ LE 2026-09-03, ET IL MANQUAIT UN TIERS. La note ci-dessus prescrivait trois retraits : « EXTINCTEUR » des catégories, la condition, ET LA QUESTION DU FORMULAIRE. Les deux premiers ont été faits le 2026-08-25 (commit ff87f4b), dont le message relate la reprise appliquée en production le jour même — cinq RIA créés, cinq lignes de calendrier réaffectées en conservant leurs statuts, plus aucun extincteur porteur de la clé, vérifié en base après écriture et sauvegarde ciblée prise avant. Le critère était donc rempli. Le troisième retrait a été oublié : la question « Votre établissement dispose-t-il de robinets d'incendie armés (RIA) ? » est restée posée sur CHAQUE extincteur déclaré, neuf jours durant, alors qu'elle ne bornait plus rien. Mesuré en appelant le moteur le 2026-09-03 : `true`, `false` et l'absence de réponse rendent le même jeu d'obligations, à l'identité près.\n\nCE QUE LE RETRAIT COÛTE, ET POURQUOI IL SE FAIT QUAND MÊME. Rien n'est perdu côté calcul — la catégorie `RIA` porte l'obligation seule depuis le 2026-08-25. Ce qui disparaît est une réponse historique éventuelle dans le JSON `caracteristiques` d'un extincteur ; le commit ff87f4b atteste qu'il n'en reste aucune en base, et `serialiserCaracteristiques` la retirerait de toute façon à la première édition de l'appareil. En regard, une question qui ne décide de rien est pire qu'absente : le dirigeant y répond en croyant que ça compte. C'est mot pour mot la raison qui a fait retirer `dessertLocauxSommeil` le 2026-09-01, et c'est la même règle. Les RIA se déclarent par leur catégorie propre.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».",
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
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    porteur: "etablissement",
    typologies: {
      erp: { categories: ["N5"] },
      locauxSommeilPublic: true,
    },
    notesInternes:
      "POUR INFORMATION DEPUIS LE 2026-10-08 (C64 ; décision 2 de la synthèse de revue, option A, sans migration ; le préventeur : « une information »). `initiative: \"administration\"` : la ligne reste visible avec son rythme quinquennal, se peint « Pour information — visite à l'initiative de l'administration », et n'est plus comptée comme une échéance de l'exploitant — ni retard, ni « à faire », ni indice. Le procès-verbal se dépose et se trace au registre. ~~Réalisateur affiché : « Organisme agréé »~~ : `realisateurs` garde `organisme_agree` faute de valeur dans l'enum Prisma, l'affichage dit « Commission de sécurité ». La phrase suivante disait déjà tout cela en 2026-08 ; elle restait sans effet sur aucun compteur.\n\nVisite commissionnelle : n'est pas à la charge de l'exploitant au sens opérationnel (initiée par l'administration) mais est à tracer dans le registre. Échéance quinquennale en première approche.\n\nAmendement 2026-08 : la restriction « locaux à sommeil » figurait dans le libellé et la description mais n'était encodée nulle part — l'obligation tombait donc sur tout ERP de 5ᵉ catégorie déclarant une alarme, restaurants et commerces compris. Elle est désormais bornée par la propriété `dessertLocauxSommeil`.\n\nPourquoi une condition d'équipement et non une restriction `types` : la présence de locaux à sommeil est une caractéristique de l'établissement qui traverse les types (un bâtiment de type W peut comporter un logement de fonction, un type O n'est pas nécessairement de 5ᵉ catégorie). Encoder une liste de types équivaudrait à trancher, sans source article par article, quels types d'exploitation comportent des locaux à sommeil — ce que la règle n°6 interdit. Le libellé de l'obligation mentionne aussi les « installations spécifiques », second cas de visite périodique qui n'est pas modélisé : la condition ne couvre que la branche « locaux à sommeil ».\n\nForme `non_infirmee` (criticité 4, obligation déjà publiée) : les établissements existants gardent la ligne jusqu'à une réponse « non » explicite, plutôt que de la perdre en silence à la prochaine régénération.\n\nAmendement 2026-08-26 : l'obligation portait une périodicité QUINQUENNALE qu'aucun texte ne fonde, et deux références dont aucune ne l'établissait. Trois lectures indépendantes le confirment. R. 143-34 traite des vérifications techniques à la charge de l'exploitant, pas des visites de commission — il est remplacé par R. 143-41, qui les fonde. GE 4 fixe bien des périodicités, mais pour les 1ʳᵉ à 4ᵉ catégories seulement : son tableau ne comporte aucune ligne de 5ᵉ catégorie, et il relève du Livre II, écarté par PE 1 § 1. Il est conservé en référence pour montrer précisément cela. Aucun article du Livre III n'organise de visite périodique de commission. La règle des cinq ans circule dans les guides préfectoraux et remonterait à la circulaire du 22 juin 1995 relative aux CCDSA — non lue au verbatim, et de toute façon non opposable. `periodicite` passe donc à `autre` : la ligne subsiste, parce que les visites existent et se tracent au registre, mais le produit cesse d'afficher une échéance que le droit ne donne pas.\n\nRECTIFIÉ LE 2026-08-26, quelques heures après l'amendement ci-dessus, qui était FAUX sur un point. Il affirmait qu'« aucun article du Livre III n'organise de visite périodique de commission ». PE 37 le fait, et fixe cinq ans. La quinquennale n'était donc pas sans fondement : elle en avait un, que je n'avais pas trouvé, et la description d'origine le disait presque — elle liait déjà la visite aux locaux à sommeil. Je l'ai remplacée par une affirmation d'absence au lieu de chercher plus loin. Ne pas avoir trouvé la source n'est pas la preuve qu'il n'y en a pas.\n\n`periodicite` reste `autre`, mais cette fois pour une raison nommée : PE 37 ne vise QUE les établissements comportant, pour le public, des locaux à sommeil. Le modèle n'a aucun attribut d'établissement pour cette distinction. Poser `quinquennale` sur tous les ERP de 5ᵉ catégorie sur-appliquerait à la boutique et au bureau ; laisser `autre` sous-applique à l'hôtel et à la chambre d'hôtes. Le manque est déclaré sur PE 37 dans le corpus, et l'attribut reste à créer.\n\nEXAMINÉE ET NON REBRANCHÉE — 2026-08-31, lot « faux négatifs d'ancrage ». Le brief de ce lot attendait un passage au porteur établissement. Il ne peut pas se faire, et voici ce qui l'en empêche.\n\nLe faux négatif est RÉEL : R. 143-41, relu au verbatim ce jour (version en vigueur depuis le 2021-07-01), dit « CES ÉTABLISSEMENTS doivent faire l'objet [...] de visites périodiques de contrôle et de visites inopinées effectuées par la commission de sécurité compétente », l'antécédent étant les établissements soumis au chapitre. Aucun équipement n'y figure. Un hôtel qui n'a pas déclaré d'alarme ne reçoit donc aucune ligne, alors qu'il est visité tous les cinq ans.\n\nMais le rebranchement produirait le faux positif symétrique, et plus large. PE 37, relu au verbatim ce jour, est intitulé « Contrôle des établissements de 5e catégorie comportant des locaux à sommeil » et ne vise que « les établissements comportant, POUR LE PUBLIC, des locaux à sommeil ». C'est le SEUL article du Livre III qui organise une visite périodique en 5ᵉ catégorie — GE 4 ne couvre que les 1ʳᵉ à 4ᵉ, et relève du Livre II écarté par PE 1 § 1. La restriction « locaux à sommeil » ne module donc pas un rythme : elle décide de l'EXISTENCE de la visite périodique. La retirer ferait naître une échéance chez chaque restaurant et chaque boutique de 5ᵉ catégorie.\n\nOr `ObligationPorteeParEtablissement` interdit `conditions` — à raison : une condition porte sur une propriété d'équipement, et il n'y aurait plus d'équipement pour la porter. Aujourd'hui la caractéristique `dessertLocauxSommeil` vit sur l'ALARME_INCENDIE, ce qui est un pis-aller : les locaux à sommeil sont un attribut de l'ÉTABLISSEMENT, pas de son alarme.\n\nLe déblocage est donc un attribut d'établissement — quelque chose comme `comporteLocauxSommeilPublic` — c'est-à-dire une migration de schéma. Ce lot n'y touche pas : `prisma/schema.prisma` est explicitement hors de son périmètre. La question est remontée à la session qui l'a délégué, avec ce constat.\n\nEn attendant, l'ancrage d'origine est CONSERVÉ tel quel. Entre un faux négatif borné aux établissements à locaux à sommeil sans alarme déclarée et un faux positif sur tous les ERP de 5ᵉ catégorie, on garde le premier — et on l'écrit ici plutôt que de le corriger de travers.\n\nNATURE : ÉCHÉANCE RÉCURRENTE (ADR-026), ET LE COUPLE AVEC `periodicite: \"autre\"` EST ICI UN MANQUE, PAS UNE DESCRIPTION. Troisième cas d'école de l'audit du 2026-08-31. La description ci-dessus est explicite : PE 37 fixe CINQ ANS pour les établissements de 5ᵉ catégorie comportant des locaux à sommeil, et la condition `dessertLocauxSommeil` restreint déjà cette ligne à ceux-là. Le rythme est donc écrit, et la périodicité devrait pouvoir être `quinquennale`. Elle ne l'est pas encore, et ce lot ne la change pas : PE 37 n'a pas été relu à la source dans ce lot, et une périodicité se pose sur un verbatim, jamais sur une description. À reprendre avec la relecture réglementaire, en gardant que le maire ou le préfet peut augmenter la fréquence par arrêté — ce qui relève d'une prescription particulière (ADR-035), pas du référentiel.\n\nSECONDE RÉSERVE, indépendante : la visite est initiée par l'administration, pas par l'exploitant. Une déclaration « en place » n'aurait aucun sens sur cette ligne ; ce qui se trace est la visite quand elle a eu lieu.\n\n⚠ AMENDEMENT 2026-08-31, SOIR — `periodicite` PASSE À `quinquennale`. CE QUI SUIT REMPLACE LES DEUX JUSTIFICATIONS CI-DESSUS (« reste `autre` » du 2026-08-26, et la réserve ADR-026). Elles sont conservées parce qu'elles racontent comment on s'est trompé deux fois de suite sur cet article, pas parce qu'elles décrivent encore le choix fait.\n\nLE FONDEMENT. PE 37, version en vigueur depuis le 2004-11-24 : « Ces établissements doivent être visités TOUS LES CINQ ANS par la commission de sécurité compétente ; la fréquence de ces visites peut être augmentée, s'il est jugé nécessaire, par arrêté du maire ou du préfet, après avis de la commission. » C'est un rythme, pas un plafond — le texte n'écrit pas « au moins ». La seconde phrase ouvre un raccourcissement par acte administratif individuel : c'est une prescription particulière (ADR-035), qui surcharge la périodicité sur un dossier donné, et non une raison de n'en poser aucune au référentiel.\n\nTROIS RELEVÉS INDÉPENDANTS ET CONCORDANTS, tous en première main : celui du 2026-08-26 porté par `referencesLegales[2].note` ci-dessus, celui du corpus (`arrete-1980-livre-3.ts`, PE 37), et celui de la session de coordination le 2026-08-31 au soir. La date de version — 24 novembre 2004 — a été recoupée une quatrième fois sur Légifrance ce jour ; le CORPS de l'article n'a pas pu l'être, la page rendant sa table des matières sans le texte et l'URL d'article répondant 403. C'est dit ici plutôt que passé sous silence : la valeur repose sur trois lectures humaines concordantes, pas sur une quatrième vérification automatique.\n\nPOURQUOI LA JUSTIFICATION DU 2026-08-26 NE TIENT PLUS — ET POURQUOI CE N'EST PAS POUR LA RAISON QU'ON CROIT. Elle disait : « Poser `quinquennale` sur tous les ERP de 5ᵉ catégorie sur-appliquerait à la boutique et au bureau. » On serait tenté de répondre que la condition `dessertLocauxSommeil` restreint déjà la ligne aux établissements que PE 37 vise. **C'est faux, et il faut le dire précisément.** La condition est de forme `equipement_propriete_non_infirmee` : elle est satisfaite TANT QUE l'utilisateur n'a pas répondu « non ». La ligne tombe donc sur tout ERP de 5ᵉ catégorie ayant déclaré une alarme et n'ayant pas encore répondu à la question — c'est-à-dire, aujourd'hui, sur la boutique et le bureau exactement comme le craignait la note.\n\nCE QUI CHANGE VRAIMENT, c'est la NATURE de cette sur-application, et c'est une règle que ce dépôt a déjà écrite. Avec `autre`, elle était MUETTE : le générateur sautait la ligne, aucun écran ne la montrait, et personne ne pouvait la corriger puisque personne ne la voyait. Avec `quinquennale`, elle devient une échéance datée, visible au calendrier, et **corrigeable par une réponse « non »** — la question est posée au formulaire d'équipement, avec cette aide : « Un restaurant, un commerce ou un bureau sans hébergement : répondez « non ». » C'est mot pour mot la doctrine que `ConditionApplication` énonce pour la forme `non_infirmee` : « sur une obligation de criticité élevée, une sur-application visible et corrigeable par une réponse « non » est toujours préférable à un faux négatif muet ». La valeur est posée sur ce fondement-là, pas sur l'idée que la condition suffirait.\n\nCE QUE CELA PRODUIT, SANS ENJOLIVER : à la prochaine régénération, tout établissement de 5ᵉ catégorie ayant déclaré une alarme sans répondre à la question voit apparaître une ligne « Visite périodique de la commission de sécurité », criticité 4, « à planifier » et urgente — y compris s'il n'a aucun local à sommeil. Répondre « non » à la question la fait disparaître. C'est assumé ; ce n'est pas indolore.\n\nL'AMPLEUR, MESURÉE PLUTÔT QU'ESTIMÉE — DEUX SUR DEUX. Le 2026-09-01, sur le jeu de démonstration : les deux dossiers sont des restaurants ERP de type N, 5ᵉ catégorie, chacun avec une ALARME_INCENDIE déclarée et `dessertLocauxSommeil` **vide** — pas « non », vide. `determineObligationsApplicables` rend la ligne pour les deux. Ce n'est pas un cas limite, c'est le cas NORMAL : rien n'oblige un dirigeant à répondre à cette question, et un parc repris ou importé n'y aura jamais répondu. Le taux à attendre sur le parc réel est donc proche de 100 % des ERP de 5ᵉ catégorie ayant déclaré une alarme, jusqu'à ce que chacun réponde « non ».\n\nLe chiffre est écrit ici, et pas seulement la réserve, pour une raison précise : une sur-application assumée qui ne dit pas son ampleur se redécouvre plus tard et se prend pour un bug. Quelqu'un verra deux restaurants sur deux porter une échéance de visite commissionnelle et croira à un défaut d'ancrage. C'en est un — il est nommé au (1) et au (2) ci-dessous —, mais il est CHOISI, et il se corrige d'un clic du côté de l'utilisateur, pas d'un correctif du côté du produit.\n\nDEUX RÉSERVES D'ANCRAGE, INCHANGÉES PAR CET AMENDEMENT — elles existaient à l'identique avant, et ne sont pas corrigées ici.\n\n(1) FAUX NÉGATIF, déjà documenté plus haut : un hôtel qui n'a déclaré aucune ALARME_INCENDIE ne reçoit rien, alors que PE 37 le vise. Le déblocage est un attribut d'établissement (`comporteLocauxSommeilPublic`), donc une migration et une donnée à collecter.\n\n(2) FAUX POSITIF, NON DOCUMENTÉ JUSQU'ICI, et c'est l'apport de cet amendement : PE 37 écrit « des locaux à sommeil POUR LE PUBLIC ». `dessertLocauxSommeil` ne distingue pas le sommeil du public de celui du personnel — et la note du 2026-08 invoque justement un logement de fonction pour justifier le choix d'une condition d'équipement plutôt qu'une restriction par type. Or un logement de fonction occupé par le personnel n'est pas un local à sommeil pour le public. **La condition est donc plus large que l'article**, dans un second sens, indépendant du précédent. L'aide du formulaire dit « logement de fonction ouvert au public », ce qui est plus juste que le nom du champ ; le nom, lui, reste trompeur. Nommé, non corrigé : le resserrer suppose de reposer la question à des utilisateurs qui y ont déjà répondu.\n\n⚠ AMENDEMENT 2026-09-01, LOT A11 — L'ATTRIBUT EXISTE, ET LES DEUX RÉSERVES CI-DESSUS SONT LEVÉES. Tout ce qui précède décrit un état révolu ; c'est conservé parce que la note dit comment on s'est trompé quatre fois sur cet article, pas parce qu'elle décrit encore le choix fait.\n\nCE QUI CHANGE. `Etablissement.comporteLocauxSommeilPublic` existe (migration 20260901180000). L'obligation passe au PORTEUR ÉTABLISSEMENT ; `categoriesEquipement: [ALARME_INCENDIE]` et la condition `equipement_propriete_non_infirmee` sur `dessertLocauxSommeil` sont retirées, remplacées par `typologies.locauxSommeilPublic: true`.\n\n(1) LE FAUX NÉGATIF EST CORRIGÉ. R. 143-41 et PE 37 visent l'établissement ; aucun des deux ne nomme d'équipement. Un hôtel qui n'a déclaré aucune alarme reçoit désormais la ligne. C'est exactement la correction que le lot « faux négatifs d'ancrage » a faite le 2026-08-31 sur le registre de sécurité, les exercices d'évacuation et la consigne incendie — celle-ci était la quatrième, et elle avait été EXAMINÉE ET REFUSÉE ce jour-là faute de colonne. La colonne est là.\n\n(2) LE FAUX POSITIF « POUR LE PUBLIC » EST CORRIGÉ AUSSI. `dessertLocauxSommeil` ne distinguait pas le sommeil du public de celui du personnel ; la question posée à la fiche établissement le dit en toutes lettres — « Un logement de fonction occupé par vous ou par un salarié ne compte pas : le texte vise le sommeil du public. » PE 37 écrit « comportant, POUR LE PUBLIC, des locaux à sommeil » : la condition n'est plus plus large que l'article.\n\nCE QUE LA SUR-APPLICATION DEVIENT, sans enjoliver. Elle ne disparaît pas, elle change d'assiette et de public. Avant : tout ERP de 5ᵉ catégorie AYANT DÉCLARÉ UNE ALARME et n'ayant pas répondu. Après : tout ERP de 5ᵉ catégorie n'ayant pas répondu, alarme ou non — donc davantage de dossiers, jusqu'à ce que chacun réponde « non ». C'est le prix assumé de la règle du non-renseigné, et c'est le bon sens d'erreur : la ligne est visible au calendrier et se retire d'une réponse, là où l'oubli d'un hôtel ne se voyait de nulle part.\n\nLA CARACTÉRISTIQUE D'ÉQUIPEMENT `dessertLocauxSommeil` EST RETIRÉE, elle ne survit pas en dormant. Elle n'existait que pour cette obligation — `equipements/schema.ts` le disait en tête de fichier — et une question qui ne décide plus de rien est pire qu'absente : le dirigeant y répond en croyant que ça compte. Les réponses déjà données ne sont PAS reprises dans la nouvelle colonne : les deux questions ne sont pas la même, et recopier l'une dans l'autre fabriquerait une réponse que personne n'a donnée.\n\nLA PÉRIODICITÉ NE BOUGE PAS. `quinquennale`, sur le fondement de l'amendement du 2026-08-31 au soir. PE 37 a été relu à la source le 2026-09-01 pour ce lot : le corps de l'article est cette fois rendu par Légifrance, et il dit bien « Ces établissements doivent être visités tous les cinq ans par la commission de sécurité compétente », version en vigueur du 24 novembre 2004. La seconde phrase — « la fréquence de ces visites peut être augmentée [...] par arrêté du maire ou du préfet » — n'a PAS été rendue par cette lecture-ci ; elle reste établie par les trois relevés antérieurs concordants, et rien dans la lecture du jour ne la contredit. Elle relève de toute façon d'une prescription particulière (ADR-035), pas du référentiel.",
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
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    porteur: "etablissement",
    typologies: {
      erp: { categories: ["N5"] },
      locauxSommeilPublic: true,
    },
    equipementsEnContexte: ["ALARME_INCENDIE"],
    notesInternes:
      "Créée le 2026-09-01 (lot A11). PE 4 § 1 était nommé depuis le 2026-08-27 dans la `reserve` de PE 4 au corpus, avec sa cause : « il attend l'attribut `Etablissement.locauxSommeil`, qui n'existe pas ». L'attribut existe.\n\nPOURQUOI `annuelle` ET `echeance_recurrente`, ET NON UN ÉTAT PERMANENT. Le mot « annuel » est DANS le texte — il n'est ni déduit, ni conventionnel. Il qualifie le contrat, c'est-à-dire sa durée : un contrat annuel arrive à terme et se renouvelle. L'acte est donc dû, puis redû, à intervalle d'un an, ce qui est la définition d'`echeance_recurrente` (ADR-026). Le classer `etat_permanent` aurait fait d'un contrat expiré un état qu'on croit acquis, et c'est exactement le cas que le dirigeant doit voir arriver.\n\nCE QUI N'EST PAS ENCODÉ, et c'est la moitié du même paragraphe. La vérification de la détection, du désenfumage et des installations électriques « à la construction et avant l'ouverture par des personnes ou des organismes agréés » est un contrôle d'OUVERTURE. Le référentiel a bien `mise_en_service_uniquement` et la nature `ponctuelle`, mais l'acte y est attaché à la vie d'un objet ou d'une personne — la mise en service d'un appareil, l'affectation à un poste — et non à l'ouverture de l'établissement, que le produit ne date pas. Un dirigeant qui exploite depuis dix ans n'a rien à en faire, et lui inscrire une ligne « à faire » sur un acte antérieur à son dossier serait faux. Nommé, non encodé — même traitement que le chapeau « installations de gaz neuves ou modifiées » de PE 4, déjà déclaré à part.\n\nLA RÉFÉRENCE EST PLUS LARGE QUE L'ATTRIBUT, ET IL FAUT LE DIRE. PE 4 § 1 écrit « les établissements avec locaux à sommeil », SANS la précision « pour le public » que PE 37 porte. L'obligation est pourtant conditionnée à `comporteLocauxSommeilPublic`, comme les trois autres lignes du chapitre : un établissement dont les seuls locaux à sommeil seraient réservés au personnel ne la recevrait donc pas, alors que la lettre de PE 4 § 1 ne l'en dispense pas expressément. Ce qui n'a PAS été établi dans ce lot, et qui trancherait la question : si les locaux à sommeil du règlement de sécurité ERP s'entendent nécessairement de ceux ouverts au public — un logement de fonction étant traité comme un tiers isolé de l'établissement —, alors il n'y a pas d'écart du tout. Faute d'avoir lu ce qui le dirait, l'écart est nommé ici plutôt que passé sous silence, et il est borné : un seul cas, celui des locaux à sommeil strictement réservés au personnel.\n\nRÉALISATEUR `exploitant` : ce que le texte lui impose est de SOUSCRIRE, pas d'entretenir. L'entretien est fait par le titulaire du contrat, et le produit n'a pas à le lui prescrire.",
  },
  {
    id: "incendie-erp-5-sommeil-consigne-chambres",
    domaine: "incendie",
    libelle:
      "Consigne d'incendie affichée dans chaque chambre (ERP 5ᵉ avec locaux à sommeil)",
    description:
      "Dans les établissements de 5ᵉ catégorie comportant des locaux à sommeil, une consigne d'incendie est affichée dans chaque chambre. Elle est rédigée en français et complétée par une bande dessinée illustrant les consignes. L'article PE 33 appartient aux dispositions applicables aux établissements de 5ᵉ catégorie, approuvées par l'arrêté du 22 juin 1990, en vigueur depuis le 27 août 1990 ; sa rédaction actuelle est en vigueur depuis le 4 novembre 2011. Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « § 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité. »",
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
    usageEcran: { groupe: "incendie_secours", sous: "evacuer" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: {
      erp: { categories: ["N5"] },
      locauxSommeilPublic: true,
    },
    notesInternes:
      "Créée le 2026-09-01 (lot A11). PE 33 était classé `non_couvert` au motif que l'attribut « locaux à sommeil » n'existait pas.\n\nÀ NE PAS CONFONDRE AVEC `incendie-travail-consigne-affichee`, ni avec `habitation-consignes-plans-intervention`. Les trois font afficher une consigne, aucune ne dit la même chose. Celle du Code du travail (R. 4227-37) est due à l'employeur dont l'établissement entre dans le champ de R. 4227-34, et son contenu est fixé par R. 4227-38 ; celle de l'arrêté de 1986 est due au propriétaire d'un immeuble d'habitation ; celle-ci est due à l'exploitant d'un ERP de 5ᵉ catégorie avec hébergement, DANS CHAQUE CHAMBRE, et elle est la seule des trois que le texte exige illustrée par une bande dessinée — parce que son destinataire est un client qui dort là et ne lit peut-être pas le français. Un même établissement peut recevoir deux de ces lignes ; ce ne sont pas deux fois la même affiche.\n\n`pieceAttendue` NON NULLE, comme `habitation-consignes-plans-intervention` et pour le même motif : ce qui est dû est un écrit affiché, et une case cochée sans consigne au mur serait la déclaration-qui-ressemble-à-une-preuve que l'écran d'états permanents interdit.\n\nLE § 1 N'EST PAS REPRIS. « L'exploitant doit tenir à jour un registre de sécurité. Ce document doit pouvoir être présenté à chaque visite de la commission de sécurité. » C'est le registre que `incendie-registre-securite` porte déjà, fondé sur R. 143-44 CCH — dont le champ est « les établissements soumis aux prescriptions du présent chapitre », 5ᵉ catégorie comprise. Créer une seconde ligne « registre » pour les seuls établissements à locaux à sommeil ferait croire à deux registres là où le texte n'en impose qu'un.",
  },
  {
    id: "incendie-erp-5-sommeil-plans-affiches",
    domaine: "incendie",
    libelle:
      "Plan de l'établissement, plans d'orientation et de repérage affichés (ERP 5ᵉ avec locaux à sommeil)",
    description:
      "Dans les établissements de 5ᵉ catégorie comportant des locaux à sommeil, trois affichages sont dus : un plan de l'établissement dans le hall d'entrée, un plan d'orientation simplifié à chaque étage près de l'accès aux escaliers, et un plan sommaire de repérage de chaque chambre par rapport aux dégagements à utiliser en cas d'incendie, fixé dans chaque chambre. L'article PE 35 appartient aux dispositions applicables aux établissements de 5ᵉ catégorie, approuvées par l'arrêté du 22 juin 1990, en vigueur depuis le 27 août 1990 ; sa rédaction est celle d'origine. Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « § 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité. »",
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
    usageEcran: { groupe: "incendie_secours", sous: "evacuer" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    porteur: "etablissement",
    typologies: {
      erp: { categories: ["N5"] },
      locauxSommeilPublic: true,
    },
    notesInternes:
      "Créée le 2026-09-01 (lot A11). PE 35 était classé `non_couvert` au motif que l'attribut « locaux à sommeil » n'existait pas.\n\nUNE LIGNE POUR TROIS PARAGRAPHES, et c'est un choix. Les trois plans sont trois affichages du même acte — cartographier l'établissement pour quelqu'un qui s'y réveille la nuit — dus au même moment, au même exploitant, et constatés du même regard. Les scinder aurait produit trois cases à cocher là où le dirigeant fait une commande unique à son imprimeur. Le libellé et la `pieceAttendue` nomment les trois pour qu'aucun ne se perde dans le regroupement.\n\nRENVOI NON OUVERT, DÉCLARÉ COMME TEL. Le § 1 exige un plan « conforme aux dispositions de l'article MS 41 ». MS 41 relève du LIVRE II, que PE 1 § 1 écarte sauf renvoi exprès — et c'en est un, donc il s'applique. Il n'a PAS été ouvert dans ce lot : la description dit donc qu'un plan est dû dans le hall, sans dire ce que MS 41 exige de son contenu. À rouvrir si l'on veut décrire le plan et pas seulement l'imposer.\n\nCE QUI DISTINGUE CETTE LIGNE DE PE 34, resté `sans_objet`. PE 34 impose que les dégagements soient POURVUS de symboles de sécurité conformes à la norme NF X 08-003, et que les portes inutilisables soient fermées à clé ou munies d'un ferme-porte : c'est une règle d'équipement du bâtiment, de la même famille que PE 24 (éclairage) et PE 26 (dotation en extincteurs), tous deux `sans_objet` depuis le premier dépouillement. PE 35, lui, fait PRODUIRE ET AFFICHER un écrit par l'exploitant — même espèce que les affichages du lot 8 (`D. 4711-1`, `R. 4121-4`), encodés en états permanents. La ligne de partage est celle-là, et elle est écrite ici pour qu'on n'ait pas à la redevinner.",
  },

  {
    id: "incendie-erp-5-instruction-personnel",
    domaine: "incendie",
    libelle:
      "Personnel instruit des conduites à tenir en cas d'incendie et entraîné à la manœuvre des moyens de secours (ERP de 5ᵉ catégorie)",
    description:
      "Dans un établissement recevant du public de 5ᵉ catégorie, le personnel doit être instruit sur les conduites à tenir en cas d'incendie et être entraîné à la manœuvre des moyens de secours. L'article PE 27 appartient aux dispositions applicables aux établissements de 5ᵉ catégorie, approuvées par l'arrêté du 22 juin 1990, en vigueur depuis le 27 août 1990 ; sa rédaction actuelle est en vigueur depuis le 1er mai 2026 (arrêté du 4 février 2026). Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « § 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité. »",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 27 § 5 (instruction et entraînement du personnel)",
        article: "PE 27",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766984",
        note: "« Le personnel doit être instruit sur les conduites à tenir en cas d'incendie et être entraîné à la manœuvre des moyens de secours. » Version en vigueur depuis le 1er mai 2026, modifiée par l'arrêté du 4 février 2026, art. 1. Paragraphe relevé lettre à lettre le 2026-09-21.",
        versionConstatee: "2026-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "incendie_secours", sous: "eteindre" },
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    // ~~`{ categories: ["N5"] }`~~ — 2026-10-13 : l'hôtel (type O) sort de
    // cette ligne. `PO 7` donne à ce même acte un rythme — deux séances
    // d'instruction et d'entraînement par an — et `PO 12` l'applique aux
    // hôtels existants avec `PE 27 § 5`. Un état permanent et une échéance
    // semestrielle sur le même acte feraient deux lignes pour une formation :
    // `incendie-hotel-po-instruction-personnel-semestrielle` porte les trois
    // textes.
    typologies: { erp: { categories: ["N5"], typesExclus: ["O"] } },
    porteur: "etablissement",
    groupeExclusif: "erp5-instruction-personnel",
    notesInternes:
      NOTE_GROUPE_5E +
      "LA SEULE OBLIGATION MANQUANTE QUE RIEN NE BLOQUAIT (registre de dette, `cause: \"libre\"`). Le corpus la portait depuis le 2026-08-26 avec ce blocage : « l'article n'écrit aucune périodicité, et en inventer une serait décider à la place du texte ». L'argument était juste et il est devenu sans objet : depuis l'ADR-026 le référentiel porte cinquante états permanents sans rythme. Une obligation sans périodicité n'est pas une obligation qu'on ne sait pas écrire.\n\nAUCUN RYTHME, ET IL NE FAUT PAS LUI EN PRÊTER. Le § 2 du même article dit que l'information du personnel sur le signal d'alarme « peut être complétée par des exercices périodiques d'évacuation » — FACULTATIF, et à ne pas confondre avec l'exercice semestriel de `R. 4227-39`, que le Code du travail n'impose qu'au-delà de cinquante personnes. Un restaurant de six salariés doit CETTE ligne et pas l'autre.\n\n`pieceAttendue: null` : le texte fait instruire et entraîner, il ne demande ni registre ni attestation.\n\nUNE SUR-APPLICATION CONNUE : un ERP de 5ᵉ catégorie peut n'avoir aucun personnel (une salle mise à disposition, que le § 1 du même article organise). La ligne lui est présentée quand même ; la typologie ne sait pas conjuguer « ERP de 5ᵉ catégorie ET employeur » (les régimes positifs forment une disjonction), et l'écran des états permanents n'a pas de « sans objet ».\n\nCriticité 4, celle de `incendie-travail-exercice-semestriel` : c'est ce qui décide, le jour d'un feu, de ce que fait la personne qui est là.\n\nGN 10, OUVERT LE 2026-09-21 : le règlement « ne s'applique pas aux établissements existants », sauf administratif, contrôles, vérifications et entretien — et cette obligation n'est rien de tout cela. Elle est pourtant servie à ~~TOUT ERP de 5ᵉ catégorie~~ tout ERP de 5ᵉ catégorie autre qu'un hôtel [2026-10-13 : le type O a sa ligne semestrielle, `incendie-hotel-po-instruction-personnel-semestrielle`, qui porte la même sur-application] : le moteur ne lit pas `dateAutorisationOuverture`. ~~« la date d'entrée en vigueur du paragraphe n'est pas relevée »~~ — RELEVÉE le 2026-09-21 : le paragraphe figure dans PE 27 depuis sa création par l'arrêté du 22 juin 1990, en vigueur le 27 AOÛT 1990 (six versions de l'article lues sur Légifrance). ~~La sur-application ne touche donc que les établissements ouverts avant cette date et jamais modifiés — une minorité, que le produit ne sait pas reconnaître.~~ [2026-09-26 : c'est une LECTURE — `GN 10` ne date pas l'« existant » ; voir C23 du journal.] Sur-application VISIBLE et assumée ~~, écrite dans la description que le dirigeant lit~~ [2026-09-26 : la description ne conclut plus ; elle cite `GN 10`, ses deux paragraphes, et la date du type PE] ; la décision de la borner est au dossier des décisions (A6). Voir `corpus/arrete-1980-livre-1.ts`, entrée GN 10.",
  },

  {
    id: "incendie-hotel-po-instruction-personnel-semestrielle",
    domaine: "incendie",
    libelle:
      "Séances d'instruction et d'entraînement du personnel, deux fois par an (hôtel de 5ᵉ catégorie)",
    description:
      "Dans un hôtel de 5ᵉ catégorie, « le personnel doit participer deux fois par an à des séances d'instruction et d'entraînement de façon compatible avec les conditions d'exploitation, compte tenu, le cas échéant, de son rythme saisonnier » (PO 7). Comme dans tout établissement de 5ᵉ catégorie, « le personnel doit être instruit sur les conduites à tenir en cas d'incendie et être entraîné à la manœuvre des moyens de secours » (PE 27 § 5) : Rojer suit les deux textes sur cette seule ligne. Pour les hôtels existants, PO 12 dispose : « Les dispositions des articles PE 27 (§ 5) et PO 7 sont applicables. »",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PO 7 (instruction et entraînement du personnel)",
        article: "PO 7",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024770976",
        note: "« Le personnel doit participer deux fois par an à des séances d'instruction et d'entraînement de façon compatible avec les conditions d'exploitation, compte tenu, le cas échéant, de son rythme saisonnier. » Version en vigueur depuis le 30 octobre 2011, relue par l'API Légifrance le 2026-09-27 (C51) et le 2026-10-13, texte inchangé.",
        versionConstatee: "2011-10-30",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PO 12 (hôtels existants)",
        article: "PO 12",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024771138",
        note: "« Les dispositions des articles PE 27 (§ 5) et PO 7 sont applicables. » Relevé en première main le 2026-08-26, relu par l'API Légifrance le 2026-10-13 (bac à sable). PO 7 vaut donc pour les hôtels existants.",
        versionConstatee: "2011-10-30",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 27 § 5 (instruction et entraînement du personnel)",
        article: "PE 27",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766984",
        note: "« Le personnel doit être instruit sur les conduites à tenir en cas d'incendie et être entraîné à la manœuvre des moyens de secours. » Version en vigueur depuis le 1er mai 2026, modifiée par l'arrêté du 4 février 2026, art. 1. Paragraphe relevé lettre à lettre le 2026-09-21.",
        versionConstatee: "2026-05-01",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { erp: { categories: ["N5"], types: ["O"] } },
    porteur: "etablissement",
    groupeExclusif: "erp5-instruction-personnel",
    notesInternes:
      NOTE_GROUPE_5E +
      "Créée le 2026-10-13, décision de la propriétaire (voir `incendie-hotel-po-controle-biennal-installations`). Le corpus portait PO 7 et PO 12 en `obligation_manquante` au motif que « l'obligation ne porte sur aucun équipement » — levé depuis l'ADR-022, comme pour PE 27 § 5.\n\nUNE LIGNE, ET NON DEUX. PO 12 applique ensemble PE 27 § 5 et PO 7. Le premier fait instruire et entraîner le personnel sans rythme ; le second donne à ce même acte deux séances par an. Un état permanent et une échéance semestrielle sur la même formation feraient deux lignes pour un acte : `incendie-erp-5-instruction-personnel` exclut donc le type O (`typesExclus`), et celle-ci cite les trois textes. L'état permanent n'apporte rien que la séance datée ne prouve mieux.\n\nRYTHME SAISONNIER. « Compte tenu, le cas échéant, de son rythme saisonnier » module le moment des séances, pas leur nombre : deux par an. Un hôtel fermé six mois les place dans sa saison ; le calendrier ne le sait pas et propose un semestre glissant. Sens d'erreur : une date à déplacer, visible.\n\nÀ NE PAS CONFONDRE avec l'exercice semestriel de `R. 4227-39` (Code du travail, au-delà de cinquante personnes) : un exercice d'évacuation n'est pas une séance d'instruction. Un hôtel qui franchit le seuil doit les deux.",
  },

  {
    id: "incendie-erp-5-consignes-affichees",
    domaine: "incendie",
    libelle:
      "Consignes incendie affichées bien en vue : numéro des sapeurs-pompiers, adresse du centre de secours, dispositions immédiates (ERP de 5ᵉ catégorie)",
    description:
      "Dans un établissement recevant du public de 5ᵉ catégorie, des consignes précises, affichées bien en vue, doivent indiquer le numéro d'appel des sapeurs-pompiers, l'adresse du centre de secours le plus proche et les dispositions immédiates à prendre en cas de sinistre. L'article PE 27 appartient aux dispositions applicables aux établissements de 5ᵉ catégorie, approuvées par l'arrêté du 22 juin 1990, en vigueur depuis le 27 août 1990 ; sa rédaction actuelle est en vigueur depuis le 1er mai 2026 (arrêté du 4 février 2026). Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « § 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité. »",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. PE 27 § 4 (consignes affichées)",
        article: "PE 27",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766984",
        note: "« Des consignes précises, affichées bien en vue, doivent indiquer : le numéro d'appel des sapeurs-pompiers ; l'adresse du centre de secours le plus proche ; les dispositions immédiates à prendre en cas de sinistre. » Version en vigueur depuis le 1er mai 2026, modifiée par l'arrêté du 4 février 2026, art. 1. Paragraphe relevé lettre à lettre le 2026-09-21.",
        versionConstatee: "2026-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "consignes incendie affichées",
    usageEcran: { groupe: "incendie_secours", sous: "alerter" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: ["N5"] } },
    porteur: "etablissement",
    notesInternes:
      "TROUVÉE EN OUVRANT L'ARTICLE POUR SON § 5, le 2026-09-21. Le corpus ne nommait de l'article que l'alinéa facultatif sur les exercices — qui est au § 2 c), et non au § 4 comme l'ancien motif l'écrivait — ; la consigne affichée du § 4 n'était relevée nulle part. C'est pourtant une obligation entière, sans seuil, de tout ERP de 5ᵉ catégorie.\n\nÀ NE PAS CONFONDRE avec `incendie-travail-consigne-affichee` (`R. 4227-37`) : celle-là est une consigne du Code du travail, due au-delà de cinquante personnes, avec huit rubriques (`R. 4227-38`). Celle-ci est du règlement de sécurité, due dès la 5ᵉ catégorie, avec trois mentions. Un restaurant de six salariés et trente couverts doit celle-ci et pas l'autre ; au-delà de cinquante personnes il doit les deux, et un même affichage peut porter les deux contenus — ce que le produit ne dit pas, n'ayant pas à le dire.\n\n`pieceAttendue` NOMMÉE : l'obligation EST un écrit affiché.\n\nCriticité 3, celle de `incendie-travail-consigne-affichee`.\n\nGN 10, OUVERT LE 2026-09-21 : le règlement « ne s'applique pas aux établissements existants », sauf administratif, contrôles, vérifications et entretien — et cette obligation n'est rien de tout cela. Elle est pourtant servie à TOUT ERP de 5ᵉ catégorie : le moteur ne lit pas `dateAutorisationOuverture`. ~~« la date d'entrée en vigueur du paragraphe n'est pas relevée »~~ — RELEVÉE le 2026-09-21 : le paragraphe figure dans PE 27 depuis sa création par l'arrêté du 22 juin 1990, en vigueur le 27 AOÛT 1990 (six versions de l'article lues sur Légifrance). ~~La sur-application ne touche donc que les établissements ouverts avant cette date et jamais modifiés — une minorité, que le produit ne sait pas reconnaître.~~ [2026-09-26 : c'est une LECTURE — `GN 10` ne date pas l'« existant » ; voir C23 du journal.] Sur-application VISIBLE et assumée ~~, écrite dans la description que le dirigeant lit~~ [2026-09-26 : la description ne conclut plus ; elle cite `GN 10`, ses deux paragraphes, et la date du type PE] ; la décision de la borner est au dossier des décisions (A6). Voir `corpus/arrete-1980-livre-1.ts`, entrée GN 10.",
  },

  // ---------------------------------------------------------------------------
  // Livre II, titre II — types M, N, O, W, catégories 1 à 4 (2026-10-14)
  // ---------------------------------------------------------------------------

  {
    id: "incendie-erp-personnel-designe-moyens-secours",
    domaine: "incendie",
    libelle:
      "Personnel spécialement désigné et entraîné à la mise en œuvre des moyens de secours (ERP des quatre premières catégories : restaurants, magasins, hôtels, bureaux, salles de danse, bibliothèques, musées)",
    description:
      "Dans un restaurant ou débit de boissons (type N), un hôtel ou autre établissement d'hébergement (type O) ou une administration, banque ou bureau (type W) des quatre premières catégories, des employés — des personnes, pour le type W — spécialement désignés doivent être entraînés à la mise en œuvre des moyens de secours (N 17, O 18, W 13). Dans un magasin ou centre commercial (type M), « des agents, entraînés à la manœuvre des moyens de secours contre l'incendie et à l'évacuation du public, doivent être désignés par l'exploitant » (M 29 § 1) ; au-delà du seuil de public que fixe le même article, la surveillance est assurée à la place par des agents de sécurité incendie (M 29 § 2 à § 4), que Rojer ne suit pas. Dans une salle de danse ou de jeux (type P) et dans un musée (type Y), « des employés spécialement désignés doivent être entraînés à la mise en oeuvre des moyens de secours dans les établissements ne possédant pas de service de sécurité incendie » (P 21 § 2, Y 19 § 2). Dans une bibliothèque ou un centre de documentation (type S), « des personnes spécialement désignées par l'exploitant doivent être entraînées à la mise en oeuvre des moyens d'extinction » (S 15 § 3). " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. N 17 (employés spécialement désignés, entraînés à la mise en œuvre des moyens de secours) — livre II, titre II, type N, établissements des quatre premières catégories",
        article: "N 17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024752266",
        note: "« Des employés, spécialement désignés, doivent être entraînés à la mise en oeuvre des moyens de secours. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024752266, seule version, en vigueur depuis le 1982-08-12 (arrêté du 21 juin 1982).",
        versionConstatee: "1982-08-12",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. M 29 § 1 (agents désignés par l'exploitant, entraînés à la manœuvre des moyens de secours et à l'évacuation du public, effectif du public de moins de 4 000 personnes) — livre II, titre II, type M, établissements des quatre premières catégories",
        article: "M 29",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034988398",
        note: "« Paragraphe 1. Dans les établissements où l'effectif du public reçu est inférieur à 4 000 personnes, des agents, entraînés à la manœuvre des moyens de secours contre l'incendie et à l'évacuation du public, doivent être désignés par l'exploitant. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000034988398, en vigueur depuis le 2017-07-01 (arrêté du 13 juin 2017, art. 13). Les § 2 à § 5 — agents SSIAP au-delà de 4 000 personnes — ne sont pas portés : réserve du corpus.",
        versionConstatee: "2017-07-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. O 18 (employés spécialement désignés, entraînés à la mise en œuvre des moyens de secours) — livre II, titre II, type O, établissements des quatre premières catégories",
        article: "O 18",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024760450",
        note: "« Des employés, spécialement désignés, doivent être entraînés à la mise en œuvre des moyens de secours. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024760450, en vigueur depuis le 2012-01-01 (arrêté du 25 octobre 2011).",
        versionConstatee: "2012-01-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. W 13 (personnes spécialement désignées, entraînées à la mise en œuvre des moyens de secours) — livre II, titre II, type W, établissements des quatre premières catégories",
        article: "W 13",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025177328",
        note: "« Des personnes, spécialement désignées, doivent être entraînées à la mise en oeuvre des moyens de secours. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000025177328, seule version, en vigueur depuis le 1983-05-21 (arrêté du 21 avril 1983).",
        versionConstatee: "1983-05-21",
      },
      {
        // 2026-10-17, sous-lot D du plan « mise à jour du référentiel ».
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. P 21 § 2 (employés spécialement désignés, entraînés à la mise en œuvre des moyens de secours, sans service de sécurité incendie) — livre II, titre II, type P, établissements des quatre premières catégories",
        article: "P 21",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025000798",
        note: "« § 2. Des employés spécialement désignés doivent être entraînés à la mise en oeuvre des moyens de secours dans les établissements ne possédant pas de service de sécurité incendie. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000025000798, seule version, en vigueur depuis le 1983-09-04 (arrêté du 7 juillet 1983).",
        versionConstatee: "1983-09-04",
      },
      {
        // 2026-10-17, sous-lot D du plan « mise à jour du référentiel ».
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. S 15 § 3 (personnes spécialement désignées par l'exploitant, entraînées à la mise en œuvre des moyens d'extinction) — livre II, titre II, type S, établissements des quatre premières catégories",
        article: "S 15",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025173722",
        note: "« § 3. Des personnes spécialement désignées par l'exploitant doivent être entraînées à la mise en oeuvre des moyens d'extinction. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000025173722, seule version, en vigueur depuis le 2005-03-29 (arrêté du 22 novembre 2004).",
        versionConstatee: "2005-03-29",
      },
      {
        // 2026-10-17, sous-lot D du plan « mise à jour du référentiel ».
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. Y 19 § 2 (employés spécialement désignés, entraînés à la mise en œuvre de moyens de secours, sans service de sécurité incendie) — livre II, titre II, type Y, établissements des quatre premières catégories",
        article: "Y 19",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025176784",
        note: "« § 2. Des employés, spécialement désignés, doivent être entraînés à la mise en oeuvre de moyens de secours dans les établissements ne possédant pas de service de sécurité incendie. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000025176784, seule version, en vigueur depuis le 1995-10-18 (arrêté du 12 juin 1995).",
        versionConstatee: "1995-10-18",
      },
      {
        // 2026-10-14, revue indépendante : contexte, tous types des catégories 1 à 4.
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 48 § 1 (formation des personnes désignées par l'exploitant, conduite à son initiative et sous sa responsabilité) — livre II, établissements des quatre premières catégories",
        article: "MS 48",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021838329",
        note: "« § 1. Les personnes désignées par l'exploitant, mentionnées au paragraphe 1.a de l'article MS 46 pour assurer la sécurité contre l'incendie, doivent avoir reçu une formation conduite à l'initiative et sous la responsabilité de l'exploitant. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable, égalité avec la production non vérifiée) : LEGIARTI000021838329, en vigueur depuis le 2010-05-16 (arrêté du 11 décembre 2009).",
        versionConstatee: "2010-05-16",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 72 § 1 (personnel initié à la mise en œuvre des moyens d'extinction et d'alerte, information maintenue dans le temps) — livre II, établissements des quatre premières catégories",
        article: "MS 72",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317756",
        note: "« § 1. Tous les appareils ou dispositifs d'extinction et d'alerte doivent être soigneusement entretenus et maintenus en permanence en bon état de fonctionnement. Le personnel de l'établissement doit être initié à leur mise en œuvre. Cette information doit être maintenue dans le temps. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020317756, seule version, en vigueur depuis le 1980-08-15. L'entretien des appareils déclarés est porté par leurs lignes ; le § 2 (pancartes de manœuvre, NF X 08-003) est une dotation.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "incendie_secours", sous: "eteindre" },
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    // ~~types: ["M", "N", "O", "W"]~~ — 2026-10-17, sous-lot D : + P, S, Y.
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2], types: ["M", "N", "O", "W", "P", "S", "Y"] } },
    porteur: "etablissement",
    notesInternes:
      "RATTACHEMENTS DU 2026-10-17 (sous-lot D du plan « mise à jour du référentiel », découpage validé par c6). P 21 § 2, S 15 § 3 et Y 19 § 2 disent le même acte que N 17 et W 13 — désigner et entraîner — pour les salles de danse et de jeux, les bibliothèques et les musées des quatre premières catégories : types P, S et Y ajoutés, libellé élargi, textes cités dans la description. S 15 dit « moyens d'extinction » là où les autres disent « moyens de secours » : cité tel quel. P 21 § 2 et Y 19 § 2 portent, comme N 17 ne le fait pas, « dans les établissements ne possédant pas de service de sécurité incendie » : Rojer ne suit pas ce service (phrase de l'axe `categorie_erp`), ne sait donc pas si l'établissement en a un, et sert la ligne à tous — sur-application visible, le service d'agents la rendant sans objet. Les § 1 de P 21 et Y 19 (un service d'agents « peut être imposé par la commission de sécurité ») sont des prescriptions d'autorité (ADR-035), non suivies. Empreinte : typologies et libellé.\n\n" +
      "RATTACHEMENT DU 2026-10-17 (sous-lot C ; décision Q2 de c6) — référence seule. MS 72 § 1 fait initier le personnel à la mise en œuvre des moyens d'extinction et d'alerte : rattaché à cette ligne, comme le prévoit le plan. TEMPORALITÉ : état permanent, sans rythme ; « cette information doit être maintenue dans le temps » ne devient PAS un défaut annuel, comme pour PE 27 § 5, sa sœur de 5ᵉ (décision de c6). Aucune norme citée au § 1 (NF X 08-003, au § 2, porte sur les panneaux). LE TROU, DIT : la ligne est bornée aux types M, N, O, W ; MS 72 vaut pour tous les types des catégories 1 à 4. Le sous-lot D l'étend à P, S, Y, le sous-lot G à L ; J et U seront refusés à l'accueil ; R, T, V et X restent sans MS 72 en catégories 1 à 4. ET L'ASSIETTE N'EST PAS LA MÊME (revue indépendante du 2026-10-17) : MS 72 fait initier « le personnel de l'établissement » tout entier ; cette ligne ne vise que le personnel spécialement désigné et entraîné. Le rattachement couvre donc l'acte pour les désignés, pas l'initiation des autres membres du personnel.\n\n" +
      "CRÉÉE LE 2026-10-14, point 1 de la décision de la propriétaire. Patron : `incendie-erp-5-instruction-personnel` (PE 27 § 5), même acte en 5ᵉ catégorie — état permanent sans rythme, `pieceAttendue: null` (le texte fait désigner et entraîner, il ne demande ni liste ni attestation), criticité 4.\n\n" +
      "UNE LIGNE POUR QUATRE ARTICLES. N 17, O 18 et W 13 disent la même phrase, à « employés » / « personnes » près ; M 29 § 1 dit la même chose avec deux précisions — la désignation est le fait de l'exploitant, et l'entraînement porte aussi sur l'évacuation du public. Même acte, même débiteur, même constat : quatre lignes auraient fait quatre cases pour une seule désignation, et un établissement n'en reçoit de toute façon qu'une ~~(un seul `typeErp`)~~ [2026-10-17, ADR-045 : même à plusieurs types — la ligne sort une fois, et son fondement cite l'article de chacun des types déclarés, N 17 et O 18 pour un hôtel-restaurant].\n\n" +
      "M 29 AU-DELÀ DE 4 000 PERSONNES. Le § 1 ne vaut que sous 4 000 ; au-delà, les § 2 à § 4 exigent des agents de sécurité incendie (SSIAP) en nombre fixé par tranche. Rojer ne connaît pas l'effectif du public et sert la ligne à tout magasin N1–N4 : au-dessus de 4 000, la ligne dit moins que le texte, et la description le dit. Le SSIAP est en réserve de M 29 au corpus. Le texte ne dit rien de l'effectif d'exactement 4 000 (« inférieur » / « supérieur ») ; la ligne le retient.\n\n" +
      "SANS RECOUVREMENT : `incendie-erp-5-instruction-personnel` et `incendie-hotel-po-instruction-personnel-semestrielle` sont bornées à N5 ; celle-ci à N1–N4.\n\n" +
      NOTE_TITRE_2_COMMUNE,
  },

  {
    id: "incendie-erp-interdiction-fumer-affichee",
    domaine: "incendie",
    libelle:
      "Interdiction de fumer affichée bien en évidence (ERP des quatre premières catégories : magasins, hôtels, bureaux, salles d'exposition, établissements sportifs couverts)",
    description:
      "Dans un magasin ou centre commercial (type M) des quatre premières catégories, il est formellement interdit de fumer dans les locaux de vente (M 44) et dans les locaux à risques importants — locaux de stockage et de manipulation des matériaux d'emballage, dépôts de déchets d'emballage, réserves autres que les réserves d'approche (M 47) —, et il est interdit de fumer dans l'ensemble des réserves et dans les locaux de réception, d'emballage, d'expédition et leurs annexes (M 58). Dans une administration, une banque ou un bureau (type W), il est interdit de fumer dans les locaux à risques particuliers (W 16). Dans un hôtel ou autre établissement d'hébergement (type O), il est formellement interdit de fumer dans les réserves, lingeries, etc. et, en général, dans les locaux présentant des risques particuliers d'incendie (O 21 § 1). Dans une salle d'exposition (type T), l'interdiction de fumer doit être affichée bien en évidence dans les locaux à risques particuliers visés à l'article T 13 (T 52 § 3). Chaque fois, l'interdiction doit être affichée bien en évidence. Dans un établissement sportif couvert (type X), « il est interdit de fumer dans les locaux sportifs, les vestiaires-douches, les locaux de matériel et les gradins. Une signalisation appropriée doit rappeler cette interdiction dans les locaux intéressés » (X 25). Pour les types W, O et T, le texte vise les locaux à risques particuliers : Rojer ne sait pas si l'établissement en compte, et présente la ligne à tous. " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. M 44 (défense de fumer dans les locaux de vente, affichée bien en évidence) — livre II, titre II, type M, établissements des quatre premières catégories",
        article: "M 44",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024931940",
        note: "« Il est formellement interdit de fumer dans les locaux de vente. Cette prescription doit être affichée bien en évidence. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024931940, seule version, en vigueur depuis le 1982-02-03 (arrêté du 22 décembre 1981).",
        versionConstatee: "1982-02-03",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. M 47 § 2 (défense de fumer dans les locaux à risques importants) — livre II, titre II, type M, établissements des quatre premières catégories",
        article: "M 47",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024932040",
        note: "« § 2. Il est formellement interdit de fumer dans les locaux. Cette prescription doit être affichée bien en évidence. » Les locaux sont ceux du § 1 : « les locaux de stockage et de manipulation des matériaux d'emballage visés à l'article M 48, ainsi que les dépôts de déchets d'emballage ; les réserves, à l'exception des réserves d'approche qui sont assimilées aux risques des locaux de vente ». Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024932040, seule version, en vigueur depuis le 1982-02-03.",
        versionConstatee: "1982-02-03",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. M 58 (défense de fumer dans les réserves et les locaux de réception, d'emballage, d'expédition) — livre II, titre II, type M, établissements des quatre premières catégories",
        article: "M 58",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024932062",
        note: "« Il est interdit de fumer dans l'ensemble des réserves et dans les locaux de réception, d'emballage, d'expédition et leurs annexes. Cette prescription doit être affichée bien en évidence. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024932062, seule version, en vigueur depuis le 1982-02-03.",
        versionConstatee: "1982-02-03",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. W 16 (défense de fumer dans les locaux à risques particuliers) — livre II, titre II, type W, établissements des quatre premières catégories",
        article: "W 16",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025177346",
        note: "« Il est interdit de fumer dans les locaux à risques particuliers. Cette prescription doit être affichée bien en évidence. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000025177346, seule version, en vigueur depuis le 1983-05-21. Les locaux à risques particuliers du type W sont classés par W 4 (archives et stockage de papier, imprimerie ; réserves, reprographie, conservation de documents informatiques, dépôts d'au moins 150 litres de liquides inflammables).",
        versionConstatee: "1983-05-21",
      },
      {
        // 2026-10-17, sous-lot D du plan « mise à jour du référentiel ».
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. T 52 § 3 (interdiction de fumer affichée dans les locaux à risques particuliers visés à l'article T 13) — livre II, titre II, type T, établissements des quatre premières catégories",
        article: "T 52",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025201384",
        note: "« § 3. Dans les locaux à risques particuliers, visés à l'article T 13, l'interdiction de fumer doit être affichée bien en évidence. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000025201384, seule version, en vigueur depuis le 1988-01-15 (arrêté du 18 novembre 1987).",
        versionConstatee: "1988-01-15",
      },
      {
        // 2026-10-17, sous-lot D du plan « mise à jour du référentiel ».
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. X 25 (interdiction de fumer dans les locaux sportifs, les vestiaires-douches, les locaux de matériel et les gradins, rappelée par une signalisation) — livre II, titre II, type X, établissements des quatre premières catégories",
        article: "X 25",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025164550",
        note: "« Il est interdit de fumer dans les locaux sportifs, les vestiaires-douches, les locaux de matériel et les gradins. Une signalisation appropriée doit rappeler cette interdiction dans les locaux intéressés. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000025164550, seule version, en vigueur depuis le 1982-07-08 (arrêté du 4 juin 1982).",
        versionConstatee: "1982-07-08",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. O 21 § 1 (interdiction de fumer dans les réserves, lingeries et locaux à risques particuliers) — livre II, titre II, type O, établissements des quatre premières catégories",
        article: "O 21",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024760444",
        note: "« § 1. Il est rappelé qu'il est formellement interdit de fumer dans les réserves, lingeries, etc. et, en général, dans les locaux présentant des risques particuliers d'incendie. Cette interdiction doit être affichée bien en évidence. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024760444, en vigueur depuis le 2012-01-01 (arrêté du 25 octobre 2011).",
        versionConstatee: "2012-01-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "interdiction de fumer affichée",
    usageEcran: { groupe: "incendie_secours", sous: "prevenir" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    // ~~types: ["M", "O", "W"]~~ — 2026-10-17, sous-lot D : + T, X.
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2], types: ["M", "O", "W", "T", "X"] } },
    porteur: "etablissement",
    notesInternes:
      "RATTACHEMENTS DU 2026-10-17 (sous-lot D du plan « mise à jour du référentiel », découpage validé par c6). T 52 § 3 (salles d'exposition, locaux à risques de T 13 : réserves, réception des marchandises, ateliers d'entretien et de réparation) et X 25 (établissements sportifs couverts ; décision Q1 de la propriétaire, plan § 11) disent le même acte : afficher, ou rappeler par une signalisation, l'interdiction de fumer. Types T et X ajoutés, libellé élargi. T, comme W et O, vise des locaux à risques que Rojer ne connaît pas : même sur-application nommée. X 25 vise des locaux qu'un établissement sportif a par définition. CATÉGORIES 1 À 4 SEULEMENT : PX 1 importe en 5ᵉ catégorie « les dispositions techniques du chapitre XII » ; que X 25 en soit une n'est pas tranché, et la ligne n'est PAS étendue à la petite salle de sport (décision de c6 du 2026-10-17 ; réserve écrite au corpus, X 25 et PX 1). Le sous-lot E (Code du sport) ne touche pas cette ligne. Empreinte : typologies et libellé.\n\n" +
      "CRÉÉE LE 2026-10-14, point 2 de la décision de la propriétaire. État permanent d'établissement : le texte fait AFFICHER une interdiction, c'est un écrit au mur (`pieceAttendue` nommée, comme `incendie-erp-5-consignes-affichees`).\n\n" +
      "UNE LIGNE POUR CINQ ARTICLES. Pour le type M, trois articles visent trois familles de locaux (vente, risques importants, réserves et locaux d'expédition) ; pour W et O, un article chacun. L'acte est le même — afficher l'interdiction là où elle vaut — et un établissement ne reçoit la ligne qu'une fois. Le type N n'a pas d'article de ce genre : il n'est pas dans `types`.\n\n" +
      "SUR-APPLICATION NOMMÉE, W ET O (décision de la propriétaire). W 16 et O 21 § 1 visent les locaux à risques particuliers ; Rojer ne sait pas si l'établissement en a. La ligne est servie à tous les établissements de ces types, et la description le dit. Sens d'erreur : une affiche demandée à qui n'a pas de tel local — visible, et sans coût de tiers. Pour M, les locaux de vente existent par définition : pas de sur-application.\n\n" +
      "~~L'interdiction générale de fumer dans les lieux à usage collectif relève du code de la santé publique, que ce lot n'a pas ouvert : cette ligne ne porte que le règlement de sécurité.~~ [2026-10-17, sous-lot D : le code de la santé publique est ouvert (corpus `csp-tabac`) et sa signalisation générale portée À PART, par `signalisation-interdiction-fumer-csp` (R. 3512-7, tout local fermé et couvert de travail ou recevant du public, décision de la propriétaire). Cette ligne-ci reste celle du règlement de sécurité : l'interdiction affichée dans des LOCAUX À RISQUES désignés d'un ERP des quatre premières catégories. Objets différents ; rangées à deux endroits de l'écran (« Incendie et secours — Prévenir » ici, « Le quotidien — Informer et former » là), libellés distincts.]\n\n" +
      NOTE_TITRE_2_COMMUNE,
  },

  {
    id: "incendie-erp-schema-organisation-securite",
    domaine: "incendie",
    libelle:
      "Schéma d'organisation globale de la sécurité annexé au registre de sécurité (magasins et centres commerciaux, ERP des quatre premières catégories)",
    description:
      "Dans un magasin ou centre commercial (type M) des quatre premières catégories, « le directeur de l'établissement ou le responsable unique de sécurité (RUS) annexe au registre de sécurité un schéma d'organisation globale de la sécurité de l'établissement. Ce document précise plus particulièrement les obligations en matière de dimensionnement du service de sécurité incendie tel que défini à l'article M 29 ainsi que les actions prioritaires à mettre en œuvre pour assurer la sécurité du public et les modalités de la réalisation d'une évacuation générale de l'établissement » (M 31). " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. M 31 (schéma d'organisation globale de la sécurité annexé au registre de sécurité) — livre II, titre II, type M, établissements des quatre premières catégories",
        article: "M 31",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034988400",
        note: "« Le directeur de l'établissement ou le responsable unique de sécurité (RUS) annexe au registre de sécurité un schéma d'organisation globale de la sécurité de l'établissement. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000034988400, en vigueur depuis le 2017-07-01 (arrêté du 13 juin 2017, art. 14).",
        versionConstatee: "2017-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "schéma d'organisation globale de la sécurité",
    usageEcran: { groupe: "organisation", sous: null },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2], types: ["M"] } },
    porteur: "etablissement",
    notesInternes:
      "CRÉÉE LE 2026-10-14, point 3 de la décision de la propriétaire. Document, état permanent : l'écrit est l'obligation (`pieceAttendue` nommée), annexé au registre de sécurité que `incendie-registre-securite` porte déjà. Aucun rythme : le texte ne dit pas quand le refaire.\n\n" +
      "LE DÉBITEUR : « le directeur de l'établissement ou le responsable unique de sécurité (RUS) ». Le RUS est celui d'un groupement d'établissements — le centre commercial (M 1 § 3). Rojer ne sait pas si le magasin est dans un centre commercial : la ligne est présentée à l'exploitant du magasin, qui est le directeur de son établissement. `realisateurs: [\"exploitant\"]`.\n\n" +
      "LE CONTENU renvoie au dimensionnement du service de sécurité de M 29 : sous 4 000 personnes, les agents désignés que `incendie-erp-personnel-designe-moyens-secours` porte ; au-delà, le SSIAP, que Rojer ne suit pas (réserve de M 29).\n\n" +
      NOTE_TITRE_2_COMMUNE,
  },

  {
    id: "incendie-erp-hotel-consigne-chambres",
    domaine: "incendie",
    libelle:
      "Consigne d'incendie du modèle réglementaire affichée dans chaque chambre ou appartement (hôtel, ERP des quatre premières catégories)",
    description:
      "Dans un hôtel ou autre établissement d'hébergement (type O) des quatre premières catégories, une consigne d'incendie, du modèle joint en annexe du chapitre, est affichée dans chaque chambre ou appartement. Elle est rédigée en français et complétée par une bande dessinée illustrant les consignes ; sa rédaction en langue française peut être complétée par sa traduction dans les langues parlées par les usagers habituels. Elle attire l'attention du public sur l'interdiction d'utiliser les ascenseurs en cas d'incendie, à l'exception de ceux conformes aux dispositions de l'article AS 4 du règlement de sécurité qui sont réservés à l'évacuation des personnes handicapées (O 21 § 2). Le modèle annexé dit la conduite à tenir : en cas d'incendie dans la chambre, si le feu ne peut être maîtrisé, gagner la sortie en refermant la porte et en suivant le balisage, et prévenir la réception ; à l'audition du signal d'alarme, gagner la sortie si les dégagements sont praticables, sinon rester dans la chambre et manifester sa présence à la fenêtre en attendant les sapeurs-pompiers. " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. O 21 § 2 (consigne d'incendie du modèle annexé, affichée dans chaque chambre ou appartement) — livre II, titre II, type O, établissements des quatre premières catégories",
        article: "O 21",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024760444",
        note: "« § 2. Une consigne d'incendie, du modèle joint en annexe, est affichée dans chaque chambre ou appartement. Elle est rédigée en français et complétée par une bande dessinée illustrant les consignes. Sa rédaction en langue française peut être complétée par sa traduction dans les langues parlées par les usagers habituels. Cette consigne attire l'attention du public sur l'interdiction d'utiliser les ascenseurs en cas d'incendie, à l'exception de ceux conformes aux dispositions de l'article AS 4 du règlement de sécurité qui sont réservés à l'évacuation des personnes handicapées. » Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024760444, en vigueur depuis le 2012-01-01 (arrêté du 25 octobre 2011).",
        versionConstatee: "2012-01-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, annexe II du chapitre O (conduite à tenir en cas d'incendie, modèle de la consigne de l'article O 21) — livre II, titre II, type O, établissements des quatre premières catégories",
        article: "O annexe II",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024758877",
        note: "« Conduite à tenir en cas d'incendie relative à l'application de l'article O 21 ». Relue le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024758877, seule version, en vigueur depuis le 2012-01-01 (créée par l'arrêté du 25 octobre 2011).",
        versionConstatee: "2012-01-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "consigne d'incendie affichée dans chaque chambre ou appartement",
    usageEcran: { groupe: "incendie_secours", sous: "evacuer" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2], types: ["O"] } },
    porteur: "etablissement",
    notesInternes:
      "CRÉÉE LE 2026-10-14, point 4 de la décision de la propriétaire. Patron : `incendie-erp-5-sommeil-consigne-chambres` (PE 33 § 2), même acte en 5ᵉ catégorie. Deux différences, toutes deux écrites par le texte : le modèle de la consigne est fixé (annexe II du chapitre, résumée en description), et la consigne doit rappeler l'interdiction des ascenseurs. La traduction est une faculté (« peut »), pas une obligation.\n\n" +
      "PAS DE `locauxSommeilPublic` : O 21 vise tout établissement du type O, et un hôtel a des chambres par définition. La sœur de 5ᵉ, elle, est servie à tout ERP de 5ᵉ à locaux à sommeil, quel que soit son type.\n\n" +
      "LE PLAN D'ÉVACUATION, dernière phrase du même paragraphe, a sa propre ligne (`incendie-erp-hotel-plans-evacuation-niveaux`) : deux affichages, deux emplacements — la chambre, le niveau.\n\n" +
      NOTE_TITRE_2_COMMUNE,
  },

  {
    id: "incendie-erp-hotel-plans-evacuation-niveaux",
    domaine: "incendie",
    libelle:
      "Plan d'évacuation apposé à chaque niveau, près du cheminement habituel (hôtel, ERP des quatre premières catégories)",
    description:
      "Dans un hôtel ou autre établissement d'hébergement (type O) des quatre premières catégories, « un plan d'évacuation dont les caractéristiques correspondent à celles des plans d'évacuation de la norme NF S 60-303 septembre 1987) relative aux plans et consignes de protection contre l'incendie est apposé à chaque niveau à proximité du cheminement habituel » (O 21 § 2 ; la parenthèse est ouverte ainsi dans le texte). Rojer n'a pas lu cette norme et ne dit pas ce qu'elle exige du plan. " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. O 21 § 2, dernière phrase (plan d'évacuation à chaque niveau) — livre II, titre II, type O, établissements des quatre premières catégories",
        article: "O 21",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024760444",
        note: "« Un plan d'évacuation dont les caractéristiques correspondent à celles des plans d'évacuation de la norme NF S 60-303 septembre 1987) relative aux plans et consignes de protection contre l'incendie est apposé à chaque niveau à proximité du cheminement habituel. » Recopié tel que l'API le rend, parenthèse non ouverte comprise. Relu le 2026-10-14 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024760444, en vigueur depuis le 2012-01-01.",
        versionConstatee: "2012-01-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "plan d'évacuation apposé à chaque niveau",
    usageEcran: { groupe: "incendie_secours", sous: "evacuer" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2], types: ["O"] } },
    porteur: "etablissement",
    notesInternes:
      "CRÉÉE LE 2026-10-14, point 4 de la décision de la propriétaire. Patron : `incendie-erp-5-sommeil-plans-affiches` (PE 35), la ligne des plans de la 5ᵉ catégorie. O 21 n'exige qu'un plan, à chaque niveau ; PE 35 en exige trois (hall, étage, chambre). Les deux ne se recouvrent pas : PE 35 est borné à N5, celle-ci à N1–N4.\n\n" +
      "LA NORME NF S 60-303 est NOMMÉE par le texte, non lue : elle n'est pas au corpus `normes`, et aucune référence `NORME` n'est posée (ADR-039 : une norme ne se cite comme norme que lue). La description le dit.\n\n" +
      NOTE_TITRE_2_COMMUNE,
  },

  // ---------------------------------------------------------------------------
  // Livre II, titre Ier — états permanents des catégories 1 à 4 (sous-lot C,
  // 2026-10-17). Le contrat du système de sécurité incendie et la présence
  // qualifiée sont ici ; le contrat des portes automatiques est dans
  // `portes-portails.ts`, les consignes de l'arrêt d'urgence de cuisson dans
  // `cuisson-hotte.ts`.
  // ---------------------------------------------------------------------------

  {
    id: "incendie-erp-plan-intervention-entrees",
    domaine: "incendie",
    libelle:
      "Plan d'intervention pour les sapeurs-pompiers apposé à chaque entrée de bâtiment (ERP des quatre premières catégories)",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, « un plan schématique, sous forme de pancarte inaltérable, doit être apposé à chaque entrée de bâtiment de l'établissement pour faciliter l'intervention des sapeurs-pompiers » (MS 41, rédaction en vigueur depuis le 23 janvier 2010). Il représente au minimum le sous-sol, le rez-de-chaussée et chaque étage ou l'étage courant ; y figurent, outre les dégagements, les espaces d'attente sécurisés et les cloisonnements principaux, l'emplacement des locaux techniques et des autres locaux à risques particuliers, des dispositifs et commandes de sécurité, des organes de coupure des fluides et des sources d'énergie, et des moyens d'extinction fixes et d'alarme. Le texte renvoie, pour ses caractéristiques, à la norme NF S 60-303 du 20 septembre 1987, que Rojer n'a pas lue. " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 41 (plan schématique apposé à chaque entrée de bâtiment) — livre II, établissements des quatre premières catégories",
        article: "MS 41",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021231064",
        note: "« Un plan schématique, sous forme de pancarte inaltérable, doit être apposé à chaque entrée de bâtiment de l'établissement pour faciliter l'intervention des sapeurs-pompiers. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000021231064, en vigueur depuis le 2010-01-23.",
        versionConstatee: "2010-01-23",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "plan d'intervention apposé à chaque entrée de bâtiment",
    usageEcran: { groupe: "incendie_secours", sous: "evacuer" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2] } },
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme. NORME CITÉE NON LUE : MS 41 renvoie à la NF S 60-303 (20 septembre 1987) pour les caractéristiques du plan — un contenu, pas un rythme ; elle n'est pas au corpus `normes`.\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C, ligne 1 du plan). La classe GN 10 / A6 qui la retenait est tranchée pour MS 41 et MS 70 § 5 par la propriétaire le 2026-10-17 (constats, § 4) : servis aux N1–N4 avec la phrase GN 10, dans « Ce qui doit être en place ».\n\n" +
      "SANS RECOUVREMENT : en 5ᵉ avec locaux à sommeil, `incendie-erp-5-sommeil-plans-affiches` (PE 35 § 1, qui exige un plan « conforme aux dispositions de l'article MS 41 ») ; à l'hôtel N1–N4, `incendie-erp-hotel-plans-evacuation-niveaux` (O 21) porte des plans d'ÉVACUATION par niveau, destinés aux occupants — pas ce plan d'INTERVENTION, destiné aux secours. Un hôtel N1–N4 reçoit donc les deux, et ce sont deux affichages.\n\n" +
      "LA NORME NF S 60-303 est NOMMÉE par le texte, non lue : aucune référence `NORME` n'est posée (ADR-039). La description le dit.\n\nÉCRAN : « Évacuer », la famille de sa sœur de 5ᵉ (`incendie-erp-5-sommeil-plans-affiches`, PE 35, qui renvoie à MS 41) — une seule famille pour les deux plans (revue indépendante du 2026-10-17).\n\n" +
      NOTE_TITRE_1_COMMUNE,
  },

  {
    id: "incendie-erp-modalites-appel-pompiers-affichees",
    domaine: "incendie",
    libelle:
      "Modalités d'appel des sapeurs-pompiers affichées près du dispositif d'alerte (ERP des quatre premières catégories)",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, « les modalités d'appel des sapeurs-pompiers sont affichées de façon apparente, permanente et inaltérable près des dispositifs d'alerte ou à défaut à l'entrée principale de l'établissement » (MS 70 § 5, rédaction en vigueur depuis le 20 septembre 2023). Cet affichage ne remplace pas celui des coordonnées des services de secours d'urgence que le Code du travail fait afficher par tout employeur (D. 4711-1) : il se place près des dispositifs d'alerte ou, à défaut, à l'entrée principale de l'établissement. " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 70 § 5 (modalités d'appel des sapeurs-pompiers affichées) — livre II, établissements des quatre premières catégories",
        article: "MS 70 § 5 — modalités d'appel des sapeurs-pompiers affichées",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048088146",
        note: "« § 5. Les modalités d'appel des sapeurs-pompiers sont affichées de façon apparente, permanente et inaltérable près des dispositifs d'alerte ou à défaut à l'entrée principale de l'établissement. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000048088146, en vigueur depuis le 2023-09-20. Les § 1 à § 4 décrivent le dispositif d'alerte (dotation).",
        versionConstatee: "2023-09-20",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "modalités d'appel des sapeurs-pompiers affichées",
    usageEcran: { groupe: "incendie_secours", sous: "alerter" },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2] } },
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme ; aucune norme ni arrêté d'application cité par MS 70 § 5.\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C, ligne 2 du plan), décision de la propriétaire du même jour (constats, § 4).\n\n" +
      "LIGNE PROPRE, PAS UNE RÉFÉRENCE DE PLUS À D. 4711-1 : la ligne du Code du travail vise tout employeur, un lieu indifférent et un objet plus large (service de santé au travail, inspection, secours). MS 70 § 5 vise un lieu précis — près du dispositif d'alerte — et un objet précis. Les rattacher aurait étendu le libellé de l'une au champ de l'autre.\n\n" +
      "SANS RECOUVREMENT : en 5ᵉ, `incendie-erp-5-consignes-affichees` (PE 27 § 4) fait afficher le numéro d'appel des sapeurs-pompiers ; elle est bornée à N5.\n\n" +
      NOTE_TITRE_1_COMMUNE,
  },

  {
    id: "incendie-erp-personnel-qualifie-detection",
    domaine: "incendie",
    libelle:
      "Personnel qualifié présent pendant l'ouverture au public, en présence d'une détection (repère : SSI de catégorie A ou B) — ERP 1 à 4",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, « les installations de détection impliquent, pendant la présence du public, l'existence dans les établissements concernés d'un personnel permanent, qualifié, susceptible d'alerter les sapeurs-pompiers et de mettre en œuvre les moyens de lutte contre l'incendie » (MS 57 § 1). Le tableau de signalisation d'un équipement d'alarme de type 1 ou 2 est installé « à un emplacement non accessible au public et surveillé pendant les heures d'exploitation », et une temporisation de l'alarme générale n'est admise que si l'établissement dispose, pendant la présence du public, « d'un personnel qualifié pour exploiter immédiatement l'alarme restreinte » (MS 66 § 1 et § 5). Les signalisations de l'alimentation de sécurité sont reportées, à défaut de poste de sécurité, dans un emplacement « habituellement surveillé pendant la présence du public » (EL 17). Rojer sert cette ligne quand l'établissement a déclaré une alarme incendie et n'a pas répondu « non » à la question du système de sécurité incendie de catégorie A ou B. Les catégories de système (A à E) et les types d'équipement d'alarme (1, 2 a, 2 b, 3, 4) sont définis par des normes auxquelles le règlement renvoie (MS 53 § 2, MS 62 § 1) et que Rojer n'a pas lues. Selon ces normes, telles que Rojer les comprend sans les avoir lues, un système de catégorie B n'a pas toujours de détection automatique — la ligne lui est alors servie au-delà de MS 57 —, et une alarme de type 2 b peut relever d'une autre catégorie que A ou B — elle ne reçoit alors pas la ligne, bien que MS 66 la vise. " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 57 § 1 (personnel permanent et qualifié pendant la présence du public, dès qu'une détection est installée) — livre II, établissements des quatre premières catégories",
        article: "MS 57",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317737",
        note: "« § 1. Les installations de détection impliquent, pendant la présence du public, l'existence dans les établissements concernés d'un personnel permanent, qualifié, susceptible d'alerter les sapeurs-pompiers et de mettre en œuvre les moyens de lutte contre l'incendie. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020317737, seule version, en vigueur depuis le 1980-08-15. Le § 2 (éliminer les fausses alarmes) est une obligation de résultat sans acte.",
        versionConstatee: "1980-08-15",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 66 § 1 et § 5 (tableau de signalisation surveillé ; temporisation admise avec un personnel qualifié présent) — livre II, établissements des quatre premières catégories",
        article: "MS 66",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317742",
        note: "« § 1. Le tableau de signalisation de l'équipement d'alarme des types 1 et 2 doit être installé à un emplacement non accessible au public et surveillé pendant les heures d'exploitation de l'établissement. […] § 5. La temporisation ne doit être admise que lorsque l'établissement dispose, pendant la présence du public, d'un personnel qualifié pour exploiter immédiatement l'alarme restreinte. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable) : LEGIARTI000020317742, seule version, en vigueur depuis le 1980-08-15. Les § 2 à § 4 et § 6 sont des règles de conception de l'équipement.",
        versionConstatee: "1980-08-15",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. EL 17 (signalisations reportées dans un emplacement surveillé pendant la présence du public) — livre II, établissements des quatre premières catégories",
        article: "EL 17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020314202",
        note: "« Les signalisations suivantes doivent être reportées au poste de sécurité ou, à défaut, dans un local ou emplacement non accessible au public et habituellement surveillé pendant la présence du public : - coupure des dispositifs de charge prévus à l'article EL 8, § 3 ; - défauts d'isolement […] » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable) : LEGIARTI000020314202, seule version, en vigueur depuis le 1980-08-15. Le report est une règle d'installation ; la surveillance de l'emplacement est l'état permanent porté ici (ligne de partage 10).",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "organisation", sous: null },
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: { categories: [...CATEGORIES_LIVRE_2] },
      ssiCategorieAouB: true,
    },
    siEquipementDeclare: ["ALARME_INCENDIE"],
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme (une présence pendant l'exploitation). MS 66 § 4 renvoie aux « normes en vigueur visant les systèmes de sécurité incendie » pour le niveau d'accès de la commande — une règle de conception, sans effet sur cette ligne ; aucune norme lue.\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C, ligne 3 du plan ; décision Q5 de la propriétaire : servie aux SSI de catégorie A ou B, sur-application dite en description). Patron : `elec-erp-presence-personne-qualifiee` (EL 18 § 2), état permanent de présence (ligne de partage 10), `pieceAttendue: null` — le texte fait être présent, il ne demande aucune pièce.\n\n" +
      "LIBELLÉ (contrôle visuel de c6, 2026-10-17) : ~~« Personnel qualifié présent pendant l'ouverture au public, avec un système de sécurité incendie de catégorie A ou B »~~ — le titre disait la condition de Rojer, la pastille (MS 57) le déclencheur du texte. Il dit désormais les deux : la détection, que le texte vise, et la catégorie du SSI, par laquelle Rojer la repère. L'empreinte bouge. [Relecture de c6, même jour : ~~« dès qu'une détection automatique est installée — repérée par un système de sécurité incendie de catégorie A ou B »~~ — environ 200 caractères, « repérée par » flou, « automatique » absent du texte (« installations de détection »). Libellé retenu : « … en présence d'une détection (repère : SSI de catégorie A ou B) — ERP 1 à 4 ».]\n\nTROIS ARTICLES, UN ÉTAT. MS 57 § 1 (détection), MS 66 § 1 et § 5 (tableau surveillé, temporisation) et EL 17 (emplacement surveillé) disent la même chose : quelqu'un de qualifié est là pendant l'exploitation pour exploiter l'alarme. Trois lignes auraient fait trois cases pour une seule présence (proposition du corpus pour MS 66 et EL 17, reprise ici).\n\n" +
      "LA CONDITION, ET CE QU'ELLE MANQUE. Rojer ne connaît ni la détection ni le type d'alarme ; il connaît l'alarme déclarée (`siEquipementDeclare: ALARME_INCENDIE`) et la réponse à la question du SSI de catégorie A ou B (`ssiCategorieAouB`, règle du non-renseigné : le silence retient « à confirmer », un « non » retire). LES DEUX CLASSEMENTS VIENNENT DE NORMES NON LUES (revue indépendante du 2026-10-17) : MS 53 § 2 renvoie aux « normes en vigueur » pour les catégories A à E du SSI, MS 62 § 1 à « la norme relative aux équipements d'alarme » pour les types 1 à 4 (relus le 2026-10-17 par l'API, PISTE, bac à sable). Ce qui suit est la correspondance usuelle entre les deux, NON vérifiée sur la norme, et dite comme telle en description. (1) SUR-APPLICATION : un SSI de catégorie B n'aurait pas toujours de détection automatique ; MS 57 ne le vise pas, MS 66 si (alarme de type 2 a). Dite en description. (2) SOUS-APPLICATION : une alarme de type 2 b relèverait d'une catégorie de système autre que A ou B ; MS 66 la vise et la ligne ne la sert pas. Dite en description ; aucune question n'est ajoutée pour un cas que la majorité ne connaît pas (ligne de partage 5). (3) EL 17 vaut aussi sans SSI, dès qu'il y a une alimentation de sécurité à contrôleur d'isolement ; aucune catégorie ne la désigne.\n\n" +
      "SANS RECOUVREMENT avec `incendie-erp-personnel-designe-moyens-secours` (personnel désigné et ENTRAÎNÉ, types M, N, O, W) : celle-ci porte la PRÉSENCE pendant l'exploitation, celle-là la désignation et l'entraînement.\n\n" +
      NOTE_TITRE_1_COMMUNE,
  },

  {
    id: "incendie-erp-ssi-contrat-entretien",
    domaine: "incendie",
    libelle:
      "Contrat d'entretien du système de sécurité incendie de catégorie A ou B, annexé au registre de sécurité (ERP des quatre premières catégories)",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, « les systèmes de sécurité incendie de catégories A et B doivent toujours faire l'objet d'un contrat d'entretien » ; le contrat précise la périodicité des interventions et prévoit la réparation rapide ou l'échange des éléments défaillants, et « la preuve de l'existence de ce contrat […] doit pouvoir être fournie et être transcrite sur le registre de sécurité » (MS 68). Toute installation de détection fait l'objet d'un contrat d'entretien avec un installateur qualifié, qui inclut les essais fonctionnels — définis, par renvoi de MS 56 § 4, au paragraphe 7.3 du fascicule du cahier des clauses techniques générales relatif aux installations de détection incendie, que Rojer n'a pas lu ; ce contrat et la notice descriptive des conditions d'entretien et de fonctionnement sont annexés au registre de sécurité (MS 58 § 3 et § 4). Le rythme des interventions est celui du contrat : le texte n'en fixe aucun. Rojer sert cette ligne quand l'établissement a déclaré une alarme incendie et n'a pas répondu « non » à la question du système de sécurité incendie de catégorie A ou B.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 68 (contrat d'entretien des SSI de catégories A et B, preuve transcrite au registre de sécurité) — livre II, établissements des quatre premières catégories",
        article: "MS 68",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317749",
        note: "« Toutefois, les systèmes de sécurité incendie de catégories A et B doivent toujours faire l'objet d'un contrat d'entretien. Dans tous les cas, le contrat passé avec les personnes physiques ou morales, ou les consignes données au technicien attaché à l'établissement, doivent préciser la périodicité des interventions et prévoir la réparation rapide ou l'échange des éléments défaillants. La preuve de l'existence de ce contrat ou des consignes écrites doit pouvoir être fournie et être transcrite sur le registre de sécurité. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000020317749, seule version, en vigueur depuis le 1980-08-15.",
        versionConstatee: "1980-08-15",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 58 § 3 et § 4 (contrat d'entretien de la détection, annexé au registre de sécurité avec la notice) — livre II, établissements des quatre premières catégories",
        article: "MS 58 § 3 et § 4 — contrat d'entretien de la détection, annexé au registre",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317731",
        note: "« § 3. Toute installation de détection doit faire l'objet d'un contrat d'entretien avec un installateur qualifié. Ce contrat doit inclure les essais fonctionnels prévus à l'article MS 56, paragraphe 3, deuxième tiret. § 4. Ce contrat d'entretien ainsi que la notice descriptive des conditions d'entretien et de fonctionnement doivent être annexés au registre de sécurité. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable) : LEGIARTI000020317731, seule version, en vigueur depuis le 1980-08-15.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "contrat d'entretien du système de sécurité incendie, annexé au registre",
    usageEcran: { groupe: "installations", sous: null },
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: {
      erp: { categories: [...CATEGORIES_LIVRE_2] },
      ssiCategorieAouB: true,
    },
    siEquipementDeclare: ["ALARME_INCENDIE"],
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme — MS 68 renvoie la périodicité des interventions au contrat lui-même, que Rojer ne lit pas ; pas de défaut annuel, l'acte imposé étant d'avoir un contrat. MS 58 § 3 renvoie aux essais fonctionnels de MS 56 § 3, que MS 56 § 4 définit au paragraphe 7.3 du fascicule du cahier des clauses techniques générales « installations de détection incendie » — un CONTENU du contrat, pas un rythme ; ce fascicule n'est pas lu, il est nommé en description et aucune référence `NORME` n'est posée. Aucune norme citée par MS 58 § 3-4 ni MS 68.\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C, ligne 4 du plan) : MS 58 § 3-4 et MS 68 fondus. Patron : `incendie-erp-5-sommeil-contrat-entretien-sdi` (PE 4 § 1), sans son rythme — PE 4 § 1 écrit « contrat annuel », MS 58 et MS 68 n'écrivent aucune durée, et renvoient la périodicité des interventions au contrat lui-même (constats du 2026-10-17, § 3 : « aucun rythme »). Pas de défaut annuel : ce qui est imposé est d'AVOIR un contrat, pas de refaire un acte (notes-cadre, ligne de partage 9).\n\n" +
      "LA CONDITION. La détection (MS 58) appartient au SSI de catégorie A ; MS 68 vise A et B. L'union est « SSI de catégorie A ou B » : `ssiCategorieAouB` (le silence retient « à confirmer »), sur une alarme déclarée. Un SSI de catégorie C, D ou E reste entretenu (MS 68, premier alinéa) par un technicien compétent ou l'installateur, contrat OU consignes écrites : Rojer ne le suit pas sur cette ligne, la vérification annuelle (`incendie-erp-ssi-annuelle`) restant servie.\n\n" +
      "GN 10 N'EST PAS CITÉ : c'est de l'entretien, que GN 10 § 1 maintient pour l'établissement existant.\n\n" +
      "TIERS : le réalisateur est l'exploitant (il tient le contrat) ; le domaine `incendie` appelle déjà un prestataire par ses vérifications (`appelleUnTiers`).\n\n" +
      NOTE_TITRE_1_COMMUNE,
  },

  {
    id: "incendie-erp-eclairage-securite-notice-registre",
    domaine: "incendie",
    libelle:
      "Notice de maintenance de l'éclairage de sécurité annexée au registre de sécurité (ERP des quatre premières catégories)",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, « une notice descriptive des conditions de maintenance et de fonctionnement est annexée au registre de sécurité. Elle comporte les caractéristiques des pièces de rechange » (EC 13, rédaction en vigueur depuis le 16 mai 2010). L'entretien des blocs autonomes « peut être réalisé dès qu'une anomalie est constatée », et ces opérations d'entretien sont consignées dans le registre de sécurité. Le même article fait disposer en permanence de lampes de rechange correspondant aux modèles utilisés : Rojer ne suit pas ce stock. Rojer sert cette ligne quand un bloc autonome d'éclairage de sécurité (BAES) est déclaré ; le texte vise aussi un éclairage de sécurité alimenté par une source centralisée, qui n'a pas de catégorie dans Rojer et ne fait pas naître la ligne.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. EC 13 (notice de maintenance annexée au registre de sécurité ; entretiens consignés) — livre II, établissements des quatre premières catégories",
        article: "EC 13 — notice annexée au registre et entretiens consignés",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021838317",
        note: "« - une notice descriptive des conditions de maintenance et de fonctionnement est annexée au registre de sécurité. Elle comporte les caractéristiques des pièces de rechange. L'entretien des blocs autonomes peut être réalisé dès qu'une anomalie est constatée. […] Ces opérations d'entretien doivent être consignées dans le registre de sécurité. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000021838317, en vigueur depuis le 2010-05-16.",
        versionConstatee: "2010-05-16",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "notice de maintenance de l'éclairage de sécurité, annexée au registre",
    usageEcran: { groupe: "installations", sous: null },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2] } },
    siEquipementDeclare: ["BAES"],
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme ; l'entretien des blocs autonomes « peut être réalisé dès qu'une anomalie est constatée » — une faculté, ni rythme ni déclencheur imposé. EC 13 ne cite aucune norme ; les rythmes écrits de l'éclairage de sécurité (EC 14, EC 15) sont portés par leurs lignes.\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C, ligne 5 du plan). Trois prescriptions dans EC 13 : (1) les lampes de rechange — un STOCK, même famille que la dernière phrase de MS 69, hors cadre (ADR-027), dit en description ; (2) la notice annexée — l'état permanent porté ici ; (3) la consignation des entretiens au registre — l'acte du registre que le produit tient, dit en description sans ligne propre ; l'entretien lui-même « peut être réalisé dès qu'une anomalie est constatée », une FACULTÉ ouverte par le texte, pas un fait ni un déclencheur imposé (revue indépendante du 2026-10-17).\n\n" +
      "PORTEUR ÉTABLISSEMENT SUR `BAES` DÉCLARÉ : une notice vaut pour l'installation d'éclairage de sécurité, pas pour chaque bloc. `siEquipementDeclare` fait naître la ligne d'un BAES déclaré. SOUS-APPLICATION DITE : EC 13 vise l'éclairage de sécurité « alimenté par une source centralisée ou constitué de blocs autonomes » ; la source centralisée n'a pas de catégorie, et un établissement qui n'a qu'elle ne reçoit pas la ligne (dit en description).\n\n" +
      "GN 10 N'EST PAS CITÉ : maintenance et entretien, que GN 10 § 1 maintient.\n\n" +
      "SANS RECOUVREMENT : les essais et vérifications de l'éclairage de sécurité en ERP (`incendie-erp-eclairage-securite-essai-mensuel`, `-autonomie-semestrielle`, `incendie-erp-baes-annuelle`, EC 14 et EC 15) sont des échéances ; celle-ci est la pièce.\n\n" +
      NOTE_TITRE_1_COMMUNE,
  },

  {
    id: "incendie-erp-avis-controle-affiche",
    domaine: "incendie",
    libelle:
      "Avis relatif au contrôle de la sécurité affiché près de l'entrée principale (ERP des quatre premières catégories)",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, « il doit être affiché d'une façon apparente, près de l'entrée principale, un \" avis \" relatif au contrôle de la sécurité ». Cet avis, du modèle CERFA 20 3230, est rempli par l'exploitant et sous sa responsabilité à partir de l'autorisation d'ouverture — type, catégorie, effectif maximal du public autorisé, dates de la visite de réception et de l'autorisation d'ouverture —, puis visé par l'autorité qui a délivré cette autorisation (GE 5, rédaction en vigueur depuis le 1er juillet 2021).",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. GE 5 (avis relatif au contrôle de la sécurité, affiché près de l'entrée principale) — livre II, établissements des quatre premières catégories",
        article: "GE 5",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046362358",
        note: "« Dans tous les établissements assujettis aux dispositions du présent titre, il doit être affiché d'une façon apparente, près de l'entrée principale, un \" avis \" relatif au contrôle de la sécurité. Cet avis, du modèle ci-après, est dûment rempli par l'exploitant et sous sa responsabilité en fonction des renseignements figurant dans l'autorisation d'ouverture, puis visé par l'autorité ayant délivré cette autorisation (CERFA 20 3230). » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000046362358, en vigueur depuis le 2021-07-01.",
        versionConstatee: "2021-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "avis relatif au contrôle de la sécurité, affiché",
    usageEcran: { groupe: "organisation", sous: null },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2] } },
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme ; GE 5 renvoie au modèle CERFA 20 3230 (contenu de l'avis), aucune norme.\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C, ligne 7 du plan). Sa sœur de 5ᵉ catégorie avec locaux à sommeil est `incendie-erp-5-sommeil-avis-controle-affiche` (GE 5 par PE 37) : deux lignes, parce qu'une typologie ne dit pas « N1 à N4, OU N5 avec locaux à sommeil ».\n\n" +
      "GN 10 N'EST PAS CITÉ : l'avis est une pièce de la procédure de contrôle (autorisation d'ouverture, visite de réception), et GN 10 § 1 maintient les « dispositions à caractère administratif » et les contrôles pour l'établissement existant (motif du corpus, seconde revue du 2026-10-17).\n\n" +
      NOTE_TITRE_1_COMMUNE,
  },

  {
    id: "incendie-erp-5-sommeil-avis-controle-affiche",
    domaine: "incendie",
    libelle:
      "Avis relatif au contrôle de la sécurité affiché près de l'entrée principale (ERP 5ᵉ avec locaux à sommeil)",
    description:
      "Dans un établissement recevant du public de 5ᵉ catégorie qui comporte, pour le public, des locaux à sommeil, l'article GE 5 du règlement de sécurité est applicable (PE 37) : « il doit être affiché d'une façon apparente, près de l'entrée principale, un \" avis \" relatif au contrôle de la sécurité ». Cet avis, du modèle CERFA 20 3230, est rempli par l'exploitant à partir de l'autorisation d'ouverture — type, catégorie, effectif maximal du public autorisé, dates de la visite de réception et de l'autorisation d'ouverture —, puis visé par l'autorité qui a délivré cette autorisation.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PE 37 (GE 5 applicable aux établissements de 5ᵉ catégorie comportant, pour le public, des locaux à sommeil)",
        article: "PE 37",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024770572",
        note: "« Le premier paragraphe et le premier alinéa du deuxième paragraphe de l'article GE 2 du règlement de sécurité, ainsi que ses articles GE 3, GE 5 et GE 6 sont applicables aux établissements comportant, pour le public, des locaux à sommeil. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000024770572, en vigueur depuis le 2004-11-24.",
        versionConstatee: "2004-11-24",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. GE 5 (avis relatif au contrôle de la sécurité) — livre II, rendu applicable en 5ᵉ catégorie avec locaux à sommeil par PE 37",
        article: "GE 5",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046362358",
        note: "« Dans tous les établissements assujettis aux dispositions du présent titre, il doit être affiché d'une façon apparente, près de l'entrée principale, un \" avis \" relatif au contrôle de la sécurité. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable) : LEGIARTI000046362358, en vigueur depuis le 2021-07-01.",
        versionConstatee: "2021-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "avis relatif au contrôle de la sécurité, affiché",
    usageEcran: { groupe: "organisation", sous: null },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: ["N5"] }, locauxSommeilPublic: true },
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme ; GE 5 renvoie au modèle CERFA 20 3230 (contenu de l'avis), aucune norme. Le rythme quinquennal de PE 37 est celui de la visite, porté par `incendie-erp-5-visite-commission`.\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C, ligne 8 du plan). FONDÉE SUR PE 37, qui rend GE 5 applicable : le renvoi est EXPRÈS, l'exception que PE 1 § 1 réserve. Pas une sur-application du livre II en 5ᵉ, et la référence GE 5 le dit.\n\n" +
      "PE 37 ÉCRIT « pour le public, des locaux à sommeil » : la condition est `locauxSommeilPublic`, comme `incendie-erp-5-visite-commission` qui se fonde sur le même article.\n\n" +
      "GN 10 N'EST PAS CITÉ : pièce administrative de la procédure de contrôle.\n\n" +
      "Sœur : `incendie-erp-avis-controle-affiche` (N1–N4). Sans recouvrement : les deux typologies sont disjointes par la catégorie.",
  },

  {
    id: "incendie-erp-exploitant-present-public",
    domaine: "incendie",
    libelle:
      "Exploitant ou son représentant présent dans l'établissement pendant la présence du public (ERP des quatre premières catégories)",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, « pendant la présence du public, l'exploitant ou son représentant doit se trouver dans l'établissement » pour décider des éventuelles premières mesures de sécurité, ouvrir tous les locaux communs ou recevant du public aux membres de la commission de sécurité lors de ses visites, et assurer la mise à jour du registre de sécurité (MS 52 § 1, rédaction en vigueur depuis le 16 mai 2010). La commission de sécurité peut admettre, lorsque les conditions d'exploitation le justifient, que l'exploitant ou son représentant ne soit pas en permanence dans l'établissement, s'il est joignable en permanence et en mesure de le rejoindre dans les délais les plus courts, et si des consignes claires sont données au service de sécurité incendie présent sur le site (MS 52 § 2). " +
      GN_10_PHRASE,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 52 (présence de l'exploitant ou de son représentant pendant la présence du public) — livre II, établissements des quatre premières catégories",
        article: "MS 52",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021838325",
        note: "« § 1. Pendant la présence du public, l'exploitant ou son représentant doit se trouver dans l'établissement pour : -décider des éventuelles premières mesures de sécurité ; -assurer l'accès à tous les locaux communs ou recevant du public aux membres de la commission de sécurité lors des visites de sécurité […] ; -assurer la mise à jour du registre de sécurité […]. § 2. Lorsque les conditions d'exploitation le justifient, il peut être admis par la commission de sécurité compétente que l'exploitant ou son représentant ne soit pas en permanence dans l'établissement sous réserve : -d'être joignable en permanence et en mesure de rejoindre l'établissement dans les délais les plus courts ; -que des consignes claires soient données au service de sécurité incendie présent sur le site. » Relu le 2026-10-17 par l'API Légifrance (PISTE, bac à sable ; égalité avec la production non vérifiée) : LEGIARTI000021838325, en vigueur depuis le 2010-05-16.",
        versionConstatee: "2010-05-16",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    usageEcran: { groupe: "organisation", sous: null },
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { erp: { categories: [...CATEGORIES_LIVRE_2] } },
    porteur: "etablissement",
    notesInternes:
      "TEMPORALITÉ : état permanent, sans rythme (une présence pendant l'ouverture) ; aucune norme citée.\n\n" +
      "CRÉÉE LE 2026-10-17 (sous-lot C, hors des neuf lignes du plan) : décision de c6 du même jour (Q1). MS 52 § 1 porte deux actes : la PRÉSENCE de l'exploitant ou de son représentant pendant la présence du public — un état permanent (ligne de partage 10, politique sœur EL 18 § 2), porté ici — et la mise à jour du registre, rattachée à `incendie-registre-securite`. Pas une niche : tout établissement des quatre premières catégories.\n\n" +
      "LA DISPENSE DU § 2 n'a pas d'attribut : elle est décidée par la commission, au cas par cas. Elle est dite en description ; la ligne reste servie (règle du non-renseigné : un allègement conditionné à un fait non déclaré ne s'applique pas).\n\n" +
      "`pieceAttendue: null` : le texte fait être présent, il ne demande aucune pièce. GN 10 cité (Q7) : organisation, ni administratif, ni contrôle, ni entretien.\n\n" +
      NOTE_TITRE_1_COMMUNE,
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
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    typologies: { erp: { categories: ["N1", "N2"], typesExclus: ["V"] } },
    porteur: "etablissement",
    groupeExclusif: "ge4-visite-cat1-2",
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
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    typologies: { erp: { categories: ["N1", "N2"], types: ["V"] } },
    porteur: "etablissement",
    groupeExclusif: "ge4-visite-cat1-2",
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
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    typologies: {
      erp: {
        categories: ["N3"],
        typesExclus: ["M", "N", "S", "T", "V", "W", "X", "Y"],
      },
    },
    porteur: "etablissement",
    groupeExclusif: "ge4-visite-cat3",
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
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    typologies: {
      erp: {
        categories: ["N3"],
        types: ["M", "N", "S", "T", "V", "W", "X", "Y"],
      },
    },
    porteur: "etablissement",
    groupeExclusif: "ge4-visite-cat3",
    notesInternes:
      "LIGNE 4 SUR 6 DU TABLEAU DE GE 4 § 1 — 3ᵉ catégorie, types M, N, S, T, V, W, X, Y.\n\nCASES COUVERTES : huit colonnes sur quinze, soit la cardinalité officielle 8 (voir la note commune ci-dessous).\n\nY EST ICI, ET IL N'EST PAS UNE EXCEPTION. La note de corpus corrigée par ce lot faisait du type Y le seul à sortir du rythme de trois ans ; il suit en réalité exactement le régime de M, N, S, T, W et X — trois ans en 1ʳᵉ et 2ᵉ catégories, cinq ans en 3ᵉ et 4ᵉ.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  {
    id: "incendie-erp-visite-commission-cat4-triennale",
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements de 4ᵉ catégorie sont visités TOUS LES TROIS ANS par la commission de sécurité lorsqu'ils relèvent des types que le tableau de l'article GE 4 § 1 y maintient à trois ans : structures d'accueil pour personnes âgées ou handicapées (J), hôtels et pensions de famille (O), établissements de soins (U). Les établissements d'enseignement et colonies (type R) suivent le même rythme de trois ans lorsqu'ils hébergent du public pour la nuit, et un rythme de cinq ans lorsqu'ils n'en hébergent pas : le tableau leur donne deux colonnes, et le produit leur donne deux lignes distinctes." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    typologies: {
      erp: {
        categories: ["N4"],
        // R EST SORTI DE CETTE LIGNE LE 2026-09-08, et il est le seul type que
        // le tableau dédouble : ses deux régimes sont portés par les deux
        // lignes qui suivent, croisées avec l'attribut d'hébergement. Ce qui
        // reste protégé ici par `typesExclus` est ce qui n'a pas de colonne au
        // tableau — les huit types spéciaux — et l'ERP dont le type n'est pas
        // renseigné.
        typesExclus: ["L", "M", "N", "P", "R", "S", "T", "V", "W", "X", "Y"],
      },
    },
    porteur: "etablissement",
    groupeExclusif: "ge4-visite-cat4",
    notesInternes:
      "LIGNE 5 SUR 7 DU TABLEAU DE GE 4 § 1 — 4ᵉ catégorie, types J, O et U.\n\nCASES COUVERTES : trois colonnes sur quinze — J, O, U. La quatrième case triennale de cette ligne de catégorie est R (1), l'enseignement AVEC hébergement, portée depuis le 2026-09-08 par `incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale` ; les deux lignes ensemble font la cardinalité officielle 4 (voir la note commune ci-dessous). Y retombent aussi, par `typesExclus`, les huit types spéciaux sans colonne au tableau et l'ERP dont le type n'est pas renseigné.\n\n~~LE MANQUE À COMBLER EST NOMMÉ : un attribut d'établissement disant si l'exploitation comporte des locaux d'hébergement. Il n'existe pas ; le poser est une migration de schéma, hors du périmètre de ce lot. Tant qu'il n'existe pas, cette ligne garde R et la ligne quinquennale de 4ᵉ catégorie ne le prend pas.~~ [RAYÉ LE 2026-09-08, ET LA MANIÈRE DONT CE MOTIF EST MORT VAUT D'ÊTRE GARDÉE. L'attribut existait DÉJÀ quand cette phrase a été écrite : `Etablissement.comporteLocauxSommeilPublic` est arrivé le 2026-09-02 à 08h49 (commit 8646305 ; sa migration s'appelle `20260901180000`, et c'est le NOM du dossier qui dit 09-01, pas la date du commit), et cette ligne a été écrite le même jour à 09h30 (commit 2565a25). Les deux ne sont ancêtres l'un de l'autre DANS AUCUN SENS : deux branches parallèles, réunies plus tard dans `integration/2026-09-02-final`. Le motif était donc exact sur sa branche, et faux au merge, sans qu'une ligne de ce fichier soit touchée — un lot voisin l'a falsifié. C'est le second cas en deux jours après `R. 4512-3`, et il dit ce que la règle de conduite restée sur la branche `garde-fous-tests` (non fusionnée) ne couvrait pas encore : rouvrir le code avant de rapporter un manque attrape la ligne qui a vieilli, pas celle-ci ; ce qui attrape celle-ci est de relire AU MERGE les motifs d'impossibilité des deux branches réunies.]\n\nCE QUI EST ENCODÉ DEPUIS, ET OÙ ÇA S'ARRÊTE. La distinction R (1) / R (2) n'ajoute aucune lettre à `TypeErp` — GN 1 § 1 n'écrit qu'un seul R, et les deux colonnes du tableau sont deux régimes d'une même ligne, séparés par un fait que le § 4 du même article définit : « les seuls locaux destinés au sommeil du public la nuit ». C'est l'objet même de `comporteLocauxSommeilPublic`, dont la question posée au dirigeant est « comporte-t-il, POUR LE PUBLIC, des locaux à sommeil ». Le croisement s'écrit donc sans rien inventer, et il n'est fait QU'EN 4ᵉ CATÉGORIE : c'est la seule où le tableau sépare les deux R (trois ans contre cinq). En 1ʳᵉ, 2ᵉ et 3ᵉ, les deux colonnes portent trois ans, la question n'y change rien, et y scinder une ligne serait ajouter un risque sans rien gagner.\n\nLES QUATRE CASES DU TABLEAU SONT CELLES QUE LA NOTE DE CORPUS FAUSSE AURAIT EFFACÉES. Elle disait « cinq ans en 4ᵉ catégorie hors Y » ; l'encoder aurait mis à cinq ans un EHPAD (J), un hôtel (O), un internat (R avec hébergement) et un établissement de soins (U) que le texte visite tous les trois ans.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  {
    id: "incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale",
    succedeA: ["incendie-erp-visite-commission-cat4-triennale"],
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements d'enseignement, de formation et les centres de vacances (type R) de 4ᵉ catégorie QUI HÉBERGENT du public pour la nuit — internat, colonie, centre de vacances — sont visités TOUS LES TROIS ANS par la commission de sécurité. Le tableau de l'article GE 4 § 1 leur donne une colonne distincte de celle des mêmes établissements sans hébergement, visités tous les cinq ans. Tant que vous n'avez pas indiqué si votre établissement héberge, c'est ce rythme de trois ans qui est retenu : le plus court des deux, jamais le plus long." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "triennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    typologies: {
      erp: { categories: ["N4"], types: ["R"] },
      locauxSommeilPublic: true,
    },
    porteur: "etablissement",
    groupeExclusif: "ge4-visite-cat4",
    notesInternes:
      "LIGNE 5 BIS SUR 7 DU TABLEAU DE GE 4 § 1 — 4ᵉ catégorie, colonne R (1), l'enseignement AVEC hébergement.\n\nCASE COUVERTE : une colonne sur quinze. Avec les trois de la ligne 5 (J, O, U), elle fait la cardinalité officielle 4 de la ligne triennale de 4ᵉ catégorie.\n\nPOURQUOI CETTE LIGNE PORTE `types` ET NON `typesExclus`, ALORS QUE TOUTES LES TRIENNALES PORTENT LE COMPLÉMENT. Le motif du complément est écrit à la note commune : une restriction `types` rejette l'ERP dont le type n'est pas renseigné, et l'aurait privé de toute visite. Ici ce risque n'existe pas, parce que la ligne 5 garde le complément : un R non renseigné n'est pas concerné par cette ligne, mais il n'est pas non plus laissé sans rien — c'est la ligne 5 qui le prend, à trois ans. Le seul établissement que cette ligne-ci doit attraper est celui dont le type EST renseigné à R.\n\nC'EST `locauxSommeilPublic: true` QUI TIENT LE CAS DU SILENCE, ET IL LE TIENT DANS LE BON SENS. `evaluerLocauxSommeil` (`matching/engine.ts`) retient l'obligation quand l'attribut n'est pas renseigné, en le disant — « présence de locaux à sommeil pour le public non renseignée, obligation retenue par prudence, à confirmer ». Un R de 4ᵉ catégorie qui n'a pas répondu reçoit donc TROIS ANS, comme avant la scission ; c'est la ligne quinquennale jumelle, portée par `locauxSommeilPublic: false`, qui exige une réponse explicite. La règle du non-renseigné joue ainsi ses deux faces sur la même paire de lignes : on ne retire rien sur un silence, et on n'allège jamais sur un silence.\n\nET C'EST CE QUI FAIT QUE LA SCISSION NE DÉPEND PAS DU PARCOURS D'ACCUEIL. Le wizard ne pose pas la question (mesuré le 2026-09-08 : aucune occurrence dans `components/onboarding`, et `lib/onboarding/actions.ts` n'écrit pas le champ ; deux décisions du 2026-09-01 et du 2026-09-03 ont retiré du parcours les questions de technicien). Un dossier neuf naît donc à `null`, et `null` rend exactement le comportement d'avant. Mieux : la raison « à confirmer » que cette ligne produit est affichée au guide (`ChezVous.tsx`), qui est le premier endroit où la question se pose à quelqu'un qui a une raison d'y répondre.\n\nBORNÉE À LA 4ᵉ CATÉGORIE, ET C'EST TOUT LE TABLEAU QUI LE DIT : R (1) et R (2) portent tous deux trois ans en 1ʳᵉ, 2ᵉ et 3ᵉ. La distinction n'y change rien, et l'y encoder ajouterait un critère qui ne peut que se tromper.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  {
    id: "incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale",
    succedeA: ["incendie-erp-visite-commission-cat4-triennale"],
    domaine: "incendie",
    libelle: "Visite périodique de la commission de sécurité (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les établissements d'enseignement, de formation et les centres de loisirs (type R) de 4ᵉ catégorie QUI N'HÉBERGENT PAS de public pour la nuit sont visités TOUS LES CINQ ANS par la commission de sécurité, selon le tableau de l'article GE 4 § 1. Ce rythme de cinq ans suppose que l'absence d'hébergement ait été déclarée : tant que la question n'a pas de réponse, c'est le rythme de trois ans qui s'applique." +
      DESCRIPTION_GE4_RESERVES,
    referencesLegales: REFERENCES_GE4,
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    typologies: {
      erp: { categories: ["N4"], types: ["R"] },
      locauxSommeilPublic: false,
    },
    porteur: "etablissement",
    groupeExclusif: "ge4-visite-cat4",
    notesInternes:
      "LIGNE 6 BIS SUR 7 DU TABLEAU DE GE 4 § 1 — 4ᵉ catégorie, colonne R (2), l'enseignement SANS hébergement.\n\nCASE COUVERTE : une colonne sur quinze. Avec les dix de la ligne 6, elle fait la cardinalité officielle 11 de la ligne quinquennale de 4ᵉ catégorie — celle qui manquait jusqu'au 2026-09-08.\n\nC'EST LA SEULE LIGNE DES SEPT QUI ALLONGE UN DÉLAI PAR RAPPORT À L'ÉTAT ANTÉRIEUR DU PRODUIT, et c'est pourquoi elle exige une déclaration. Un centre de formation de 4ᵉ catégorie passait jusqu'ici en trois ans par sur-application assumée ; il passe à cinq, ce que le tableau dit depuis 2014. Mais `locauxSommeilPublic: false` ne s'applique QU'À UNE ABSENCE DÉCLARÉE : `evaluerLocauxSommeil` refuse l'allègement tant que l'attribut n'est pas renseigné. Personne ne gagne deux ans de délai par son silence — il faut avoir répondu « non ».\n\nLE § 3 N'EST PAS CE QUI FONDE CES CINQ ANS, et la confusion serait facile puisqu'il parle lui aussi d'hébergement. Le § 3 est une FACULTÉ SOUS PLAFOND — après deux visites consécutives favorables, un établissement sans hébergement peut voir son délai « prolongé dans la limite de cinq ans », sur proposition de la commission —, il suppose un historique que le produit n'observe pas, et il ne vise aucun type en particulier. Cette ligne-ci vient d'une CASE DU TABLEAU du § 1 : type R, 4ᵉ catégorie, cinq ans. Deux tests interdisent qu'une quinquennale se fonde sur le § 3, et l'un d'eux vérifie que la case invoquée existe bien au tableau pour ce type, cette catégorie ET ce régime d'hébergement.\n\nBORNÉE À LA 4ᵉ CATÉGORIE : en 1ʳᵉ, 2ᵉ et 3ᵉ, le tableau met R (2) à trois ans comme R (1). Y porter cette ligne allongerait un délai que le texte n'allonge pas — l'erreur exacte que le référentiel refuse.\n\n" +
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
    usageEcran: null,
    realisateurs: ["organisme_agree"],
    initiative: "administration",
    criticite: 4,
    transmet: [],
    typologies: {
      erp: {
        categories: ["N4"],
        types: ["L", "M", "N", "P", "S", "T", "V", "W", "X", "Y"],
      },
    },
    porteur: "etablissement",
    groupeExclusif: "ge4-visite-cat4",
    notesInternes:
      "LIGNE 6 SUR 7 DU TABLEAU DE GE 4 § 1 — 4ᵉ catégorie, types L, M, N, P, S, T, V, W, X, Y.\n\nCASES COUVERTES : dix colonnes sur quinze. ~~La cardinalité officielle de cette ligne est ONZE, et l'écart est nommé : la onzième est R (2), l'enseignement sans hébergement, que le produit ne sait pas distinguer de R (1) et qu'il laisse donc à trois ans sur la ligne triennale de 4ᵉ catégorie. C'est le seul écart volontaire de l'encodage, et il va dans le sens court.~~ [RAYÉ LE 2026-09-08 : LA ONZIÈME CASE EST ENCODÉE. Elle est portée par `incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale`, qui croise le type R avec l'absence DÉCLARÉE de locaux à sommeil pour le public. Elle n'est pas venue ici : la porter sur cette ligne aurait imposé le critère d'hébergement aux dix autres types, dont aucun n'en dépend au tableau — un M ou un W ayant déclaré des locaux à sommeil aurait alors perdu sa ligne. Le motif de l'écart — « le produit ne sait pas distinguer » — était déjà faux le jour où il a été écrit, l'attribut ayant été posé quarante minutes plus tôt sur une branche parallèle ; le détail est à la ligne triennale jumelle.] L'écart de cette ligne est donc nul, et les onze cases de la ligne quinquennale de 4ᵉ catégorie sont couvertes par deux obligations.\n\n" +
      NOTE_GE4_TABLEAU,
  },

  // ---------------------------------------------------------------------------
  // IGH — retiré le 2026-10-07 (périmètre, relecture préventeur du 30/09,
  // décision de la propriétaire du 07/10) : `incendie-igh-moyens-secours-annuelle`
  // et `incendie-igh-charge-calorifique-quinquennale` sont dans
  // `OBLIGATIONS_RETIREES`. Leurs identifiants ne doivent jamais être réemployés.
  // ---------------------------------------------------------------------------

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
    usageEcran: null,
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
        note: "« Le propriétaire est tenu de présenter toutes les justifications utiles concernant l'entretien et la vérification des installations sur demande des agents assermentés et commissionnés à cet effet. » Relevé le 2026-09-01.",
        versionConstatee: "1986-03-05",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "registre de sécurité",
    usageEcran: { groupe: "installations", sous: null },
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
    usageEcran: { groupe: "incendie_secours", sous: "evacuer" },
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    porteur: "etablissement",
    typologies: { habitation: true },
    notesInternes:
      "Créée le 2026-09-01. À ne pas confondre avec `incendie-travail-consigne-affichee`, fondée sur R. 4227-37 et s. du Code du travail et due à l'employeur : celle-ci est due au propriétaire d'un immeuble d'habitation, y compris sans aucun salarié, et son contenu est différent — le Code du travail ne demande pas de plan des sous-sols ni l'emplacement des prises de colonnes sèches.\n\nPAS DE RESTRICTION DE FAMILLE : l'article 100 n'en mentionne aucune. Une maison individuelle de 1ʳᵉ famille n'a ni hall d'entrée ni accès commun aux escaliers, si bien que l'affichage y est matériellement sans objet — mais c'est une conséquence de fait, pas une dispense écrite, et l'encoder en `familles` ferait dire au texte ce qu'il ne dit pas. Le moteur retenant l'obligation lorsque la famille n'est pas renseignée, un propriétaire de maison individuelle peut voir la ligne : elle est visible, donc corrigible en renseignant la famille, ce qui est le sens qui a été donné à cette dissymétrie.\n\nDEUX RÉGIMES DANS UN SEUL ARTICLE, et l'obligation ne les sépare pas. L'affichage des consignes est d'origine (1986). La liste des cinq éléments du plan d'intervention a été ajoutée par l'arrêté du 19 juin 2015, dont l'article d'application la réserve aux bâtiments dont le permis de construire a été déposé après le 1er octobre 2015. Le modèle porte bien une année de permis de construire côté établissement, mais `TypologieApplication` ne sait pas conditionner sur elle. La ligne est donc écrite au régime le plus complet : un propriétaire d'immeuble antérieur à 2015 se verra demander un plan d'intervention que l'arrêté ne lui impose pas dans cette forme. Sur-application assumée et bornée — le contenu du plan, pas l'affichage lui-même — plutôt que de taire la liste, auquel cas les immeubles postérieurs à 2015 ne sauraient pas ce qu'on attend d'eux.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue` non nulle (ADR-026). Ce qui est dû est un écrit affiché : une case cochée sans consigne au mur serait la déclaration-qui-ressemble-à-une-preuve que l'écran d'états permanents interdit.",
  },
];
