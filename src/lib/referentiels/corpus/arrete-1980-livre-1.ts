// Corpus : arrêté du 25 juin 1980, **Livre Ier** — les dispositions qui
// s'appliquent à TOUS les établissements recevant du public, quelle que soit
// leur catégorie.
//
// POURQUOI UN TROISIÈME FICHIER PLUTÔT QU'UNE ENTRÉE DANS UN DES DEUX AUTRES.
// `arrete-1980-livre-2.ts` couvre les quatre premières catégories,
// `arrete-1980-livre-3.ts` la cinquième (règles PE) : leurs `portee`
// respectives disent l'une et l'autre à quel GROUPE elles s'adressent, et
// GN 1 ne s'adresse à aucun des deux en particulier — c'est lui qui les
// définit. `PE 1 § 1`, au Livre III, écarte le Livre II en 5ᵉ catégorie ;
// aucune de ces deux exclusions ne touche le Livre Ier. Ranger GN 1 sous
// « quatre premières catégories » ou sous « cinquième » aurait rendu faux le
// champ d'application de l'article le jour où quelqu'un le relit.
//
// CE QUE CE CORPUS SERT, ET IL EST LE PREMIER DANS CE CAS. Les autres corpus
// existent parce qu'une OBLIGATION cite leurs articles. GN 1 n'en fonde
// aucune : il ne prescrit pas d'échéance, il porte la **nomenclature des
// types d'ERP**, c'est-à-dire l'énumération `TypeErp` du modèle. Le référentiel
// n'en a pas besoin ; le modèle de données, si. Et c'est précisément ce qui a
// manqué : l'ADR-004 a écrit cette liste de mémoire, sous la forme
// « enum M, N, U, R, … (~20 valeurs) », et le tilde a survécu deux ans sans
// que personne ne confronte la liste au texte. Elle en oubliait un type.
//
// La garde qui empêche la répétition est `types-erp.test.ts` : elle DÉRIVE la
// liste attendue du verbatim ci-dessous plutôt que de la redéclarer. Si cette
// entrée bouge, le modèle doit bouger avec elle, dans les deux sens.

import type { Corpus } from "./types";

export const ARRETE_1980_LIVRE_1: Corpus = {
  id: "arrete-1980-livre-1",
  intitule:
    "Arrêté du 25 juin 1980, Livre Ier — dispositions applicables à tous les établissements recevant du public",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020303816/",
  etendue: "articles_cites",
  portee:
    "Dispositions générales (GN 1 à GN 15) applicables à tous les ERP, des deux groupes. Ni PE 1 § 1 — qui écarte le Livre II en 5ᵉ catégorie — ni aucune autre exclusion ne les restreint. Ce corpus porte à ce jour trois articles : GN 1, pour ce qu'il définit — la nomenclature des types, dont l'énumération `TypeErp` du modèle est censée être le reflet —, GN 10, l'article de champ, et GN 13, que l'écran du permis de feu cite et que le référentiel ne porte pas (`non_couvert`). Les douze autres articles du Livre Ier ne sont pas dépouillés et ne figurent pas ici — l'étendue `articles_cites` le dit.",
  articles: [
    {
      ref: "GN 1",
      intitule: "Classement des établissements",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000045143487",
      versionEnVigueur: "2022-02-10",
      modifiePar: {
        texte:
          "Arrêté du 7 février 2022 modifiant l'arrêté du 25 juin 1980 (NOR INTE2137489A). Il touche quatre articles : L 1 (relèvement des seuils d'assujettissement de certains types L), PE 2 (remplacement du tableau des seuils du premier groupe), N 2 (seconde modalité de calcul de l'effectif des zones de restauration assise, par déclaration du nombre de places) et GN 1 lui-même, où le libellé du type L passe de « salles à usage multiple » à « ou polyvalentes ». AUCUNE LETTRE N'EST AJOUTÉE NI RETIRÉE PAR CE TEXTE : la modification de GN 1 est purement rédactionnelle, elle porte sur le libellé de L. Le type J, lui, est entré au règlement bien avant — il figure dans la version consolidée depuis l'arrêté du 19 novembre 2001.",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045141670",
      },
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Article de DÉFINITION, et la seule source de la nomenclature des types d'ERP. Son § 1 énumère VINGT-DEUX types en deux groupes — quatorze pour les établissements installés dans un bâtiment (a), huit pour les établissements spéciaux (b). Son § 2 classe par ailleurs les établissements en deux GROUPES (1ʳᵉ à 4ᵉ catégories / 5ᵉ), pose la règle de calcul de l'effectif admis, et impose à l'exploitant d'informer le maire quand l'effectif déclaré varie au point de remettre en cause le niveau de sécurité. Ses § 3 et § 4 sont des définitions de vocabulaire — dont celle d'« hébergement », qui vaut pour tout le règlement : « les seuls locaux destinés au sommeil du public la nuit ».\n\nLE § 1 N'EST PAS SUBDIVISÉ EN R (1) / R (2). Le texte ne connaît qu'un seul R, « Etablissements d'éveil, d'enseignement, de formation, centres de vacances, centres de loisirs sans hébergement ». La distinction « R (1) avec hébergement » / « R (2) sans hébergement » que porte le tableau de GE 4 § 1 est une distinction de RÉGIME au sein d'une même ligne de tableau, pas un type de la nomenclature : elle croise le type R avec le fait d'héberger, que le § 4 définit ici. Y répondre par deux valeurs d'énumération inventerait un type que le texte n'écrit pas ; ce que la question appelle est un attribut d'établissement (cf. `comporteLocauxSommeilPublic`), et il n'est pas branché sur GE 4 à ce jour.",
      // LE VERBATIM DU § 1, ET IL EST DE LA DONNÉE, PAS DE L'ORNEMENT.
      // `types-erp.test.ts` le PARSE pour en tirer les vingt-deux lettres et
      // les confronter à l'énumération `TypeErp`, à `TYPES_ERP`, à `TYPE_ERP`
      // et à `LABEL_TYPE_ERP`. Une lettre retirée d'ici fait tomber le test en
      // nommant ce qui ne colle plus. C'est ce qui distingue cette garde d'une
      // liste exhaustive recopiée : elle ne se répare pas en réalignant deux
      // copies, seulement en corrigeant celle qui s'écarte du texte.
      //
      // La casse est celle de Légifrance, qui n'accentue pas les capitales
      // (« Etablissements »). Ne pas la « corriger » : le verbatim est un
      // relevé, pas une rédaction.
      citationCle:
        "§ 1. Les établissements sont classés en types, selon la nature de leur exploitation :\n" +
        "a) Etablissements installés dans un bâtiment :\n" +
        "J Structures d'accueil pour personnes âgées et personnes handicapées ;\n" +
        "L Salles d'auditions, de conférences, de réunions, de spectacles ou polyvalentes ;\n" +
        "M Magasins de vente, centres commerciaux ;\n" +
        "N Restaurants et débits de boissons ;\n" +
        "O Hôtels et pensions de famille ;\n" +
        "P Salles de danse et salles de jeux ;\n" +
        "R Etablissements d'éveil, d'enseignement, de formation, centres de vacances, centres de loisirs sans hébergement ;\n" +
        "S Bibliothèques, centres de documentation ;\n" +
        "T Salles d'expositions ;\n" +
        "U Etablissements sanitaires ;\n" +
        "V Etablissements de culte ;\n" +
        "W Administrations, banques, bureaux ;\n" +
        "X Etablissements sportifs couverts ;\n" +
        "Y Musées ;\n" +
        "b) Etablissements spéciaux :\n" +
        "PA Etablissements de plein air ;\n" +
        "CTS Chapiteaux, tentes et structures ;\n" +
        "SG Structures gonflables ;\n" +
        "PS Parcs de stationnement couverts ;\n" +
        "GA Gares ;\n" +
        "OA Hôtels-restaurants d'altitude ;\n" +
        "EF Etablissements flottants ;\n" +
        "REF Refuges de montagne.\n" +
        "§ 2. a) En outre, pour l'application du règlement de sécurité, les établissements recevant du public sont classés en deux groupes : - le premier groupe comprend les établissements de 1re, 2e, 3e et 4e catégories ; - le deuxième groupe comprend les établissements de la 5e catégorie. " +
        "b) L'effectif des personnes admises est déterminé suivant les dispositions particulières à chaque type d'établissement. Il comprend : - d'une part, l'effectif des personnes constituant le public ; - d'autre part, l'effectif des autres personnes se trouvant à un titre quelconque dans les locaux accessibles ou non au public et ne disposant pas de dégagements indépendants de ceux mis à la disposition du public. Toutefois, pour les établissements de 5e catégorie, ce dernier effectif n'intervient pas pour le classement. " +
        "c) Lorsque l'effectif déclaré ayant permis de classer l'établissement subit une augmentation ou une diminution de nature à remettre en cause le niveau de sécurité, l'exploitant doit en informer le maire.\n" +
        "§ 3. Pour la suite du présent règlement, le terme : \"établissement\", employé sans autre qualification de sa nature, a le sens \"d'établissement recevant du public\".\n" +
        "§ 4. Pour la suite du présent règlement, les expressions \"local destiné au sommeil\", \"local réservé au sommeil\" et \"hébergement\" désignent les seuls locaux destinés au sommeil du public la nuit.",
      statut: "sans_objet",
      motif:
        "Aucune échéance n'en découle : GN 1 classe et définit, il ne prescrit aucune vérification périodique. C'est le cas type du statut — « définition, renvoi, règle ponctuelle sans récurrence ».\n\nUNE SEULE OBLIGATION D'EXPLOITANT Y FIGURE, ET ELLE EST PONCTUELLE : le § 2 c) impose d'informer le maire quand l'effectif déclaré varie au point de remettre en cause le niveau de sécurité. Elle ne se planifie pas — son fait générateur est un changement d'exploitation, pas une date —, et le produit n'observe pas l'effectif déclaré en préfecture. Elle est nommée ici pour qu'on n'ait pas à rouvrir l'article pour la retrouver, pas parce qu'elle serait couverte.\n\nCE QUE CETTE ENTRÉE SERT VRAIMENT est ailleurs que dans le référentiel : son § 1 est la source de l'énumération `TypeErp` du modèle, et `types-erp.test.ts` en dérive la liste attendue. Le dépouillement n'était pas fait — l'ADR-004 avait écrit la liste de mémoire, à « ~20 valeurs », et il en manquait une (J).\n\nLE LIVRE Ier N'EST PAS DÉPOUILLÉ, GN 1 MIS À PART. Quatorze articles (GN 2 à GN 15) restent hors de ce corpus, dont GN 6 (isolement), GN 8 (aménagements) et GN 13 (dispositions applicables aux établissements existants), qu'aucune obligation ne cite aujourd'hui et dont personne n'a vérifié qu'ils n'en imposent pas. `etendue: \"articles_cites\"` l'annonce ; cette réserve le nomme, pour qu'on ne lise pas la présence d'un corpus « Livre Ier » comme la preuve que le Livre Ier a été lu.\n\nÀ SIGNALER AU PROCHAIN LECTEUR : l'arrêté du 19 février 2026, déjà relevé dans `veille-textes.ts`, « modifie GN 4 et GN 16 (nouveau) ». Un GN 16 nouveau veut dire que le chapitre s'étend au-delà de GN 15 ; il n'est pas dans ce corpus et n'a pas été ouvert.",
    },
    {
      ref: "GN 10",
      intitule: "Application du règlement aux établissements existants",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020303853",
      versionEnVigueur: "2010-01-23",
      modifiePar: { texte: "Arrêté du 24 septembre 2009 - art. (V)" },
      luLe: "2026-09-26",
      lecture: "agent_verbatim",
      prescrit:
        "Borne TOUT le règlement : sauf pour ses dispositions administratives, de contrôle, de vérification technique et d'entretien, il ne s'applique pas aux établissements existants. En cas de travaux, il ne vaut que pour les parties modifiées, sauf aggravation du risque d'ensemble.",
      citationCle:
        "§ 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité.",
      statut: "sans_objet",
      motif:
        "ARTICLE DE CHAMP, JAMAIS OUVERT AVANT LE 2026-09-21 — zéro occurrence de « GN 10 » dans tout le dépôt —, et il décide de l'application de tout ce que le référentiel tire de ce règlement. Trouvé en cherchant si le § 6 de `PE 27` valait pour un établissement existant.\n\nCE QU'IL NE CHANGE PAS : la quasi-totalité des obligations ERP du référentiel sont des VÉRIFICATIONS, des CONTRÔLES ou de l'ENTRETIEN — exactement ce que l'article excepte. Elles valent pour tous, et le registre de sécurité est une disposition administrative.\n\nCE QU'IL TOUCHE, mesuré en appelant le référentiel : cinq états permanents fondés sur ce règlement ne sont ni un contrôle, ni une vérification, ni un entretien — `incendie-erp-5-consignes-affichees` et `incendie-erp-5-instruction-personnel` (PE 27 § 4 et § 5), `incendie-erp-5-sommeil-consigne-chambres` (PE 33), `incendie-erp-5-sommeil-plans-affiches` (PE 35), `elec-erp-presence-personne-qualifiee` (EL 18). ~~Pour un établissement EXISTANT à l'entrée en vigueur de la disposition, ce règlement ne les impose pas de plein droit.~~ [2026-09-26 : qualification rayée — `GN 10`, relu en entier, ne date pas l'« existant » ; le rattacher à l'entrée en vigueur de chaque disposition est une lecture.] `PO 12` le confirme par l'exemple : il réimporte NOMMÉMENT « PE 27 (§ 5) » pour les hôtels existants — ce qui n'aurait aucun sens si le § 5 leur était déjà applicable.\n\nCE QUE LE PRODUIT NE SAIT PAS : l'âge de l'établissement au regard de chaque disposition. `Etablissement.dateAutorisationOuverture` existe et le moteur ne la lit pas ; ~~il faudrait en outre la date d'entrée en vigueur de chaque paragraphe, que personne n'a relevée~~ — RELEVÉES le 2026-09-21 : `PE 27` § 4 et § 5, `PE 33` § 2 et `PE 35` datent tous de l'arrêté du 22 juin 1990, en vigueur le 27 AOÛT 1990 ; `EL 18` § 2, dans sa rédaction actuelle, au plus tard du 7 avril 2002 (arrêté du 19 novembre 2001 — Légifrance a écrasé l'état antérieur). Pour les HÔTELS existants, `PO 8 § 1`, `PO 11` et `PO 12` réimportent nommément PE 27, PE 33 et PE 35 : GN 10 ne les en dispense pas. ~~La sur-application ne touche donc que des établissements ouverts avant 1990 et jamais modifiés.~~ [2026-09-26 : même lecture, rayée.] Les cinq lignes sont donc servies à TOUS les établissements du type — sur-application visible, du côté que ce dépôt choisit partout (« l'incertitude ne réduit jamais la couverture ») —, ~~et leur description le dit~~ [2026-09-26 : seules les deux lignes de `PE 27` citent `GN 10` ; `PE 33`, `PE 35` et `EL 18` n'en disent rien — à reprendre avec la décision A6]. La décision de demander la date, ou de retirer ces lignes aux établissements anciens, appartient à la propriétaire (dossier des décisions, A6).",
    },
    {
      ref: "GN 13",
      intitule: "Travaux dangereux",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020303866",
      // Tel que la page l'affiche le 2026-09-26 : « Version en vigueur depuis
      // le 15/08/1980 », « Modifié par Arrêté du 7 juillet 1983, v. init. ».
      // La date de version antérieure au texte modificateur est celle de
      // Légifrance ; relevée, pas corrigée.
      versionEnVigueur: "1980-08-15",
      modifiePar: { texte: "Arrêté du 7 juillet 1983, v. init." },
      luLe: "2026-09-26",
      lecture: "agent_verbatim",
      prescrit:
        "Interdit à l'exploitant d'effectuer ou de faire effectuer, en présence du public, des travaux qui mettraient le public en danger ou gêneraient son évacuation.",
      citationCle:
        "L'exploitant ne peut effectuer ou faire effectuer, en présence du public, des travaux qui feraient courir un danger quelconque à ce dernier ou qui apporteraient une gêne pour son évacuation.",
      statut: "non_couvert",
      motif:
        "Consigné le 2026-09-26 parce que l'écran du permis de feu en affiche le texte entre guillemets, et qu'aucun corpus ne le portait : l'extrait n'était confronté à rien (`verbatim/extraits-affiches.test.ts`). Un seul alinéa, section 4 « Travaux » du Livre Ier. C'est une INTERDICTION qui vise tout exploitant d'ERP, donc la cible du produit — restaurant, commerce, bureau recevant du public —, et que le référentiel ne porte pas : ni pièce ni rythme, rien ne s'en inscrit au calendrier. Il ne prescrit pas de permis de feu — l'écran le dit déjà.",
      declareA:
        "src/app/etablissements/[id]/permis-feu/page.tsx — la pastille « Art. GN 13 · Règlement ERP » de la carte « Pourquoi cette page », qui en affiche le texte mot pour mot, avec son lien Légifrance.",
      historique:
        "Classé `sans_objet` le 2026-09-26 (752933f, motif argumenté en 8e40d19), reclassé `non_couvert` le même jour après contre-lecture. Le précédent du dépôt tranche : `R. 4323-63`, interdiction qui vise elle aussi la cible et que le référentiel ne porte pas, est `non_couvert`, et `corpus.test.ts` dit que le reclasser en `sans_objet` serait « une rustine », « en niant une obligation qui existe ». Le motif de 8e40d19 — `sans_objet` parce que l'écran affiche le texte — confondait une ADRESSE (ce que `declareA` porte) avec l'absence d'obligation.",
    },
  ],
};
