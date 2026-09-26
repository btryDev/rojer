// Corpus : code de la construction et de l'habitation — les articles qui
// CLASSENT, pour la sécurité incendie, les établissements recevant du public
// et les immeubles de grande hauteur.
//
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI CE CORPUS EXISTE, ET POURQUOI IL N'EST PAS RANGÉ AILLEURS
// ─────────────────────────────────────────────────────────────────────────────
//
// Comme `arrete-1980-livre-1.ts`, il ne sert AUCUNE obligation. Les deux
// articles qu'il porte ne prescrivent rien à un exploitant : ils définissent
// le vocabulaire dans lequel un dossier se décrit lui-même. Ce vocabulaire est
// le modèle de données — `enum CategorieErp` et `enum ClasseIgh` —, et
// `docs/chantiers-ouverts.md` § 9 dit ce qui arrive quand personne ne le
// confronte à sa source : la première liste ouverte, `TypeErp`, en oubliait un
// membre depuis deux ans.
//
// LES DEUX SOURCES PRÉSUMÉES ÉTAIENT FAUSSES, ET C'EST LE RÉSULTAT PRINCIPAL
// DE CE FICHIER.
//
//   • Les CATÉGORIES d'ERP étaient attribuées à l'article `GN 2` de l'arrêté
//     du 25 juin 1980. `GN 2` a été ouvert : il traite du « classement des
//     groupements d'établissements ou des établissements en plusieurs
//     bâtiments voisins non isolés entre eux » — comment additionner les
//     effectifs de plusieurs exploitations, pas quelles catégories existent.
//     Le règlement de sécurité ne pose nulle part la liste des catégories ; il
//     l'emploie. Elle est au CODE, article `R. 143-19`.
//
//   • Les CLASSES d'IGH étaient attribuées à l'arrêté du 30 décembre 2011.
//     Son titre Ier a été ouvert : `GH 1` renvoie explicitement au code de la
//     construction « pour les prescriptions générales communes aux diverses
//     classes », et aucun de ses articles n'énumère les classes — son titre III
//     ORGANISE des chapitres par classe (dont un chapitre « GH W » unique qui
//     couvre GH W 1 et GH W 2), ce qui n'est pas la même chose que définir la
//     nomenclature. Elle est au CODE, article `R. 146-4`.
//
// Dans les deux cas, le règlement de sécurité APPLIQUE une nomenclature que le
// code POSE. Chercher la liste dans l'arrêté revenait à lire l'usage au lieu
// de la définition — et pour l'IGH, cela a coûté trois classes au modèle.
//
// Ranger ces deux articles dans un corpus existant aurait rendu faux le champ
// d'application de celui-ci. `cch-registre-securite.ts` annonce « les articles
// du CCH fondant le registre de sécurité en ERP et en IGH » ; `cch-ascenseurs.ts`
// annonce la section des ascenseurs. Ni l'un ni l'autre ne classe quoi que ce
// soit.
//
// ─────────────────────────────────────────────────────────────────────────────
// LES VERBATIMS SONT DE LA DONNÉE, PAS DE L'ORNEMENT
// ─────────────────────────────────────────────────────────────────────────────
//
// `categories-erp.test.ts` et `classes-igh.test.ts` PARSENT les `citationCle`
// ci-dessous pour en dériver la liste attendue, et la confrontent aux
// déclarations du modèle. Retirer une ligne d'un verbatim fait tomber le test
// en nommant ce qui ne colle plus. C'est ce qui distingue cette garde d'une
// liste exhaustive recopiée : elle ne se répare pas en réalignant deux copies,
// seulement en corrigeant celle qui s'écarte du texte — ou en rouvrant
// Légifrance.
//
// La casse et la ponctuation sont celles de Légifrance, tiret d'énumération
// collé au mot compris (« -1re catégorie »), et l'espace de « GHW 1 » /
// « GHW 2 » aussi. Ne pas les « corriger » : un verbatim est un relevé, pas
// une rédaction.

import type { Corpus } from "./types";

/**
 * Le décret de recodification qui a créé les trois articles ci-dessous.
 *
 * SANS `url`, ET C'EST UNE RÉPONSE, PAS UN OUBLI. L'identifiant JORFTEXT du
 * décret n'a pas été relevé : la première URL construite de tête
 * (`JORFTEXT000043809445`) a été ouverte et rend « Pas de contenu disponible ».
 * Une URL plausible mais fausse vaut moins que pas d'URL — elle envoie le
 * lecteur suivant sur une page vide en lui laissant croire que la référence a
 * été vérifiée. Le titre, lui, est celui que Légifrance affiche en tête des
 * trois articles.
 */
const DECRET_2021_872 = {
  texte:
    "Décret n° 2021-872 du 30 juin 2021 recodifiant la partie réglementaire du livre Ier du code de la construction et de l'habitation et fixant les conditions de mise en œuvre des solutions d'effet équivalent. Il n'a rien ajouté ni retiré aux deux nomenclatures : il a renuméroté R. 123-19 en R. 143-19 et R. 122-5 en R. 146-4. Les trois articles portent tous la mention « Création Décret n°2021-872 du 30 juin 2021 » et aucun texte modificateur postérieur.",
};

export const CCH_CLASSEMENT_ERP_IGH: Corpus = {
  id: "cch-classement-erp-igh",
  intitule:
    "Code de la construction et de l'habitation — classement des ERP en catégories et des IGH en classes",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818891/",
  etendue: "articles_cites",
  portee:
    "Trois articles de DÉFINITION du titre IV du livre Ier (sécurité des personnes contre les risques d'incendie), et rien d'autre. R. 143-19 pose les cinq catégories d'ERP, dont `enum CategorieErp` est censée être le reflet. R. 146-3 borne ce qu'est un immeuble de grande hauteur et R. 146-4 en énumère les dix classes, dont `enum ClasseIgh` est censée être le reflet. Aucun des trois ne prescrit quoi que ce soit à un exploitant. LE RESTE DU TITRE IV N'EST PAS DÉPOUILLÉ ICI : le chapitre III (ERP) compte une centaine d'articles et le chapitre VI (IGH) trente-cinq ; ceux que le référentiel cite vivent dans `cch-registre-securite.ts`. `etendue: \"articles_cites\"` le dit, et la présence d'un corpus « classement » ne prouve rien sur ce que ces chapitres imposent par ailleurs.",
  articles: [
    {
      ref: "CCH R. 143-19",
      intitule: "Classement des établissements recevant du public en catégories",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818977",
      versionEnVigueur: "2021-07-01",
      modifiePar: DECRET_2021_872,
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Article de DÉFINITION, et la seule source de la nomenclature des catégories d'ERP. Il en pose CINQ, par tranches d'effectif décroissantes, et la cinquième n'est pas une tranche : elle se définit par renvoi à R. 143-14 et au seuil que le règlement de sécurité fixe TYPE PAR TYPE — c'est pourquoi son libellé ne peut pas porter de chiffre. Il pose aussi la règle de calcul : l'effectif du public se détermine d'après le nombre de places assises, la surface réservée au public, la déclaration contrôlée du chef d'établissement, ou l'ensemble de ces indications ; le règlement de sécurité en précise le détail par nature d'établissement.\n\nCE QUE L'ARTICLE DIT DU PERSONNEL, ET QUI N'EST PAS CE QUE LE PRODUIT EN DIT. Sa première phrase classe « d'après l'effectif du public ET DU PERSONNEL », et son troisième alinéa ajoute qu'« il y a lieu de majorer l'effectif du public de celui du personnel n'occupant pas des locaux indépendants qui posséderaient leurs propres dégagements ». `GN 1 § 2 b)` écarte ce cumul pour la seule 5ᵉ catégorie. Or `src/lib/etablissements/labels.ts` affirme que les seuils « comptent le public admis, jamais les salariés ». L'écart est relevé, PAS corrigé ici : il porte sur la règle de CALCUL de l'effectif, pas sur la liste des catégories, et le corriger déplacerait la frontière 4ᵉ/5ᵉ de dossiers déjà saisis. À instruire pour lui-même.",
      citationCle:
        "Les établissements sont, en outre, quel que soit leur type, classés en catégories, d'après l'effectif du public et du personnel. L'effectif du public est déterminé, suivant le cas, d'après le nombre de places assises, la surface réservée au public, la déclaration contrôlée du chef de l'établissement ou d'après l'ensemble de ces indications.\n" +
        "Les règles de calcul à appliquer sont précisées, suivant la nature de chaque établissement, par le règlement de sécurité.\n" +
        "Pour l'application des règles de sécurité, il y a lieu de majorer l'effectif du public de celui du personnel n'occupant pas des locaux indépendants qui posséderaient leurs propres dégagements.\n" +
        "Les catégories sont les suivantes :\n" +
        "-1re catégorie : au-dessus de 1 500 personnes ;\n" +
        "-2e catégorie : de 701 à 1 500 personnes ;\n" +
        "-3e catégorie : de 301 à 700 personnes ;\n" +
        "-4e catégorie : 300 personnes et au-dessous, à l'exception des établissements compris dans la 5e catégorie ;\n" +
        "-5e catégorie : établissements faisant l'objet de l'article R. 143-14 dans lesquels l'effectif du public n'atteint pas le chiffre minimum fixé par le règlement de sécurité pour chaque type d'exploitation.",
      statut: "sans_objet",
      motif:
        "Aucune échéance n'en découle : l'article classe, il ne prescrit aucune vérification périodique. C'est le cas type du statut — « définition, renvoi, règle ponctuelle sans récurrence ».\n\nCE QU'IL SERT EST AILLEURS QUE DANS LE RÉFÉRENTIEL : il est la source de l'énumération `CategorieErp` du modèle, et `categories-erp.test.ts` en dérive la liste attendue ainsi que les seuils affichés au dirigeant. CONFRONTATION FAITE LE 2026-09-03, ET LA LISTE EST JUSTE : cinq catégories au texte, cinq au modèle, aucune en trop, aucune manquante — c'est la seule des trois listes ouvertes ce jour-là dont la source présumée était fausse SANS que le modèle le soit. Les seuils des libellés (1 500 / 701 / 301 / 700 / 300) collent au texte, chiffre pour chiffre.\n\nRÉSERVE, écrite pour ne pas la redécouvrir : l'article se lit avec `GN 2` de l'arrêté du 25 juin 1980, qui règle le classement d'un GROUPEMENT d'exploitations — plusieurs activités dans un même bâtiment non isolées entre elles forment un seul ERP, dont la catégorie s'obtient en additionnant les effectifs. Le modèle ne porte qu'une catégorie par établissement et ne sait pas représenter un groupement ; ce n'est pas un défaut de la liste, c'est une question de modélisation qui n'a pas été instruite.",
    },
    {
      ref: "CCH R. 143-38",
      intitule: "Visite de réception et autorisation d'ouverture",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819025",
      versionEnVigueur: "2021-07-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "Avant l'ouverture au public (ou la réouverture après plus de dix mois de fermeture), la commission procède à une visite de réception ; l'exploitant demande au maire l'autorisation d'ouverture, sauf pour les établissements de 5ᵉ catégorie sans locaux d'hébergement pour le public.",
      citationCle:
        "L'exploitant demande au maire l'autorisation d'ouverture, sauf dans le cas des établissements visés au premier alinéa de l'article R. 143-14 qui ne comportent pas de locaux d'hébergement pour le public.",
      statut: "sans_objet",
      motif:
        "Règle ponctuelle d'ouverture, sans récurrence : rien à inscrire au calendrier d'un établissement ouvert. Consignée le 2026-09-26 parce que les écrans la citent : la catégorie d'un ERP « figure sur l'arrêté d'ouverture ou le procès-verbal de la commission de sécurité » était dit à tous, alors qu'un établissement de 5ᵉ catégorie sans hébergement peut n'avoir pas de procès-verbal de la commission de sécurité. Relu de première main : trois alinéas ; seule la phrase citée l'a été mot pour mot (l'outil de lecture a refusé la recopie intégrale), le reste en résumé. « Création Décret n° 2021-872 du 30 juin 2021 », en vigueur le 1er juillet 2021 : aucune modification, `modifiePar: null`.",
    },
    {
      ref: "CCH R. 122-5",
      intitule: "Autorisation d'ouverture d'un établissement recevant du public",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052644820",
      versionEnVigueur: "2025-11-21",
      modifiePar: {
        texte:
          "Décret n° 2025-1100 du 19 novembre 2025 fixant les conditions de mise en œuvre des solutions d'effet équivalent liées à la sécurité contre l'incendie, transférant des dispositions réglementaires concernant la sécurité incendie des bâtiments à usage professionnel (BUP) dans le code de la construction et de l'habitation et modifiant certaines procédures d'instruction — art. 1.",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052611335",
      },
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "I : l'autorisation d'ouverture prévue à L. 122-5 est délivrée au nom de l'État, sur l'attestation de R. 122-30 quand les travaux ont fait l'objet d'un permis de construire, sinon après avis de la commission, qui visite les établissements de 1ʳᵉ à 4ᵉ catégorie. II : la demande « au titre de l'incendie » n'est pas exigée en 5ᵉ catégorie sans locaux d'hébergement pour le public.",
      citationCle:
        "La demande d'autorisation d'ouverture prévue à l'article L. 122-5 au titre de l'incendie n'est pas exigée pour les établissements classés dans la 5e catégorie selon les dispositions de l'article R. 143-19 et qui ne comportent pas de locaux d'hébergement pour le public.",
      statut: "sans_objet",
      motif:
        "Règle ponctuelle d'ouverture, sans récurrence : rien à inscrire au calendrier d'un établissement ouvert. Consignée le 2026-09-26 parce que les écrans la citent, À LA PLACE de R. 143-38 : la contre-lecture de C36 a montré que « un établissement de 5ᵉ catégorie sans hébergement n'a pas d'autorisation d'ouverture à demander » disait plus que le droit. L. 122-5 (version du 28 mai 2026, lu) subordonne l'ouverture de TOUT ERP à une autorisation, après contrôle de L. 161-1 (accessibilité) et, selon l'effectif et la nature, de L. 141-2 et L. 143-2 ; le II du présent article ne dispense la 5ᵉ sans hébergement que de la demande « au titre de l'incendie ». Les écrans disent donc cela et rien de plus : ils ne concluent plus que l'établissement « peut n'avoir ni l'un ni l'autre ». Lecture : la phrase citée confirmée mot pour mot en deux lectures ciblées (la première a corrigé « en application de » en « selon les dispositions de ») ; le I est résumé, l'outil l'ayant rendu en paraphrase.",
    },
    {
      ref: "CCH R. 146-3",
      intitule: "Définition de l'immeuble de grande hauteur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819081",
      versionEnVigueur: "2021-07-01",
      modifiePar: DECRET_2021_872,
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Article de CHAMP : il dit ce qu'est un immeuble de grande hauteur — plancher bas du dernier niveau à plus de 50 mètres pour l'habitation, à plus de 28 mètres pour tout le reste, mesuré depuis le niveau du sol le plus haut utilisable par les engins de secours. Il pose aussi l'exception qui fait naître la classe GHZ : l'immeuble à usage principal d'habitation entre 28 et 50 mètres n'est PAS un IGH lorsque ses locaux non résidentiels remplissent les conditions d'isolement fixées par le règlement — et l'est, en GHZ, lorsqu'ils ne les remplissent pas.",
      citationCle:
        "I. - Constitue un immeuble de grande hauteur, pour l'application du présent chapitre, tout corps de bâtiment dont le plancher bas du dernier niveau est situé, par rapport au niveau du sol le plus haut utilisable pour les engins des services publics de secours et de lutte contre l'incendie :\n" +
        "- à plus de 50 mètres pour les immeubles à usage d'habitation, tels qu'ils sont définis par l'article R. 111-1 ;\n" +
        "- à plus de 28 mètres pour tous les autres immeubles.\n" +
        "Ne constitue pas un immeuble de grande hauteur l'immeuble à usage principal d'habitation dont le plancher bas du dernier niveau est situé à plus de 28 mètres et au plus à 50 mètres, et dont les locaux autres que ceux à usage d'habitation répondent, pour ce qui concerne le risque incendie, à des conditions d'isolement par rapport aux locaux à usage d'habitation, fixées par l'arrêté mentionné à l'article R. 146-5.\n" +
        "II. - Fait partie intégrante de l'immeuble de grande hauteur l'ensemble des éléments porteurs et des sous-sols de l'immeuble.",
      statut: "sans_objet",
      motif:
        "Article de champ d'application : il ne prescrit rien à personne. Dépouillé pour la même raison que l'article 1er de l'arrêté du 31 janvier 1986 — il BORNE la nomenclature de l'article suivant, et la borne compte pour le modèle. En deçà de ces hauteurs, le bâtiment relève de l'arrêté du 31 janvier 1986 (habitation) ou du régime ERP, pas d'une classe d'IGH. C'est ce qui rend `ClasseIgh` fermée, et non arbitrairement tronquée : il n'y a pas de classe « en attente » sous le seuil.\n\nIL EXPLIQUE AUSSI POURQUOI GHZ N'EST PAS « UN IMMEUBLE MIXTE ». Le libellé « GHZ · Mixte » que portait le produit passait à côté du fait décisif : GHZ est un immeuble à usage PRINCIPAL D'HABITATION, entre 28 et 50 mètres, dont les autres locaux ne sont pas isolés. Un syndic de copropriété de quarante mètres avec des commerces en pied d'immeuble cherchait « habitation » dans la liste, trouvait GHA, et se déclarait dans la mauvaise classe.",
    },
    {
      ref: "CCH R. 146-4",
      intitule: "Classement des immeubles de grande hauteur en classes",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819083",
      versionEnVigueur: "2021-07-01",
      modifiePar: DECRET_2021_872,
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Article de DÉFINITION, et la seule source de la nomenclature des classes d'IGH. Son I énumère DIX classes. Deux traits que le modèle ignorait :\n\n(1) LES BUREAUX SONT DEUX CLASSES, PAS UNE. Le texte n'écrit nulle part une classe « GHW » : il écrit `GHW 1` — plancher bas de plus de 28 mètres et au plus 50 mètres, sous les conditions du règlement — et `GHW 2` — plancher bas de plus de 50 mètres. La confusion vient du RÈGLEMENT et non du code : le titre III de l'arrêté du 30 décembre 2011 groupe les deux sous un chapitre unique « GH W », et `GH 4 § 3` les cite ensemble. Un chapitre de règlement n'est pas une classe.\n\n(2) `GHTC` — TOUR DE CONTRÔLE — EXISTE. Elle manquait aux cinq déclarations du modèle.\n\nITGH est bien une classe de cet article, et non un régime séparé : le texte la range dans la même énumération, avec sa définition propre (plancher bas à plus de 200 mètres). Le II renvoie au règlement de sécurité pour l'immeuble affecté à plusieurs usages différents ; ce n'est pas une onzième classe.",
      citationCle:
        "I.-Les immeubles de grande hauteur sont répartis dans les classes suivantes :\n" +
        "GHA : immeubles à usage d'habitation ;\n" +
        "GHO : immeubles à usage d'hôtel ;\n" +
        "GHR : immeubles à usage d'enseignement ;\n" +
        "GHS : immeubles à usage de dépôt d'archives ;\n" +
        "GHTC : immeubles à usage de tour de contrôle ;\n" +
        "GHU : immeubles à usage sanitaire ;\n" +
        "GHW 1 : immeubles à usage de bureaux répondant aux conditions fixées par le règlement prévu à l'article R. 122-4 et dont la hauteur du plancher bas tel qu'il est défini à l'article R. 146-3 est supérieure à 28 mètres et inférieure ou égale à 50 mètres ;\n" +
        "GHW 2 : immeubles à usage de bureaux dont la hauteur du plancher bas tel qu'il est défini ci-dessus est supérieure à 50 mètres ;\n" +
        "GHZ : immeubles à usage principal d'habitation dont la hauteur du plancher bas est supérieure à 28 mètres et inférieure ou égale à 50 mètres et comportant des locaux autres que ceux à usage d'habitation ne répondant pas aux conditions d'indépendance fixées par les arrêtés prévus aux articles R. 142-1 et R. 146-5 ;\n" +
        "ITGH : immeuble de très grande hauteur. Constitue un immeuble de très grande hauteur tout corps de bâtiment dont le plancher bas du dernier niveau est situé à plus de 200 mètres par rapport au niveau du sol le plus haut utilisable pour les engins des services publics de secours et de lutte contre l'incendie.\n" +
        "II.-Lorsqu'un immeuble est affecté à plusieurs usages différents, les dispositions applicables sont définies par le règlement de sécurité prévu à l'article R. 146-5.",
      statut: "sans_objet",
      motif:
        "Aucune échéance n'en découle : l'article classe, il ne prescrit rien. C'est le cas type du statut.\n\nCE QU'IL SERT EST LE MODÈLE, ET LA CONFRONTATION DU 2026-09-03 A TROUVÉ TROIS MANQUES ET UN MEMBRE DE TROP. Le texte écrit dix classes ; `enum ClasseIgh` en portait huit. Manquaient `GHTC`, `GHW1` et `GHW2` ; figurait en trop un `GHW` que le code n'écrit nulle part. Le membre en trop n'est pas moins grave que les manquants : un exploitant de tour de bureaux cochait « GHW · Bureaux » et enregistrait une valeur qui n'est pas une classe, sans que la hauteur — le seul fait qui sépare GHW 1 de GHW 2 — soit jamais demandée. LES TROIS MANQUANTS SONT ENTRÉS ; LE MEMBRE EN TROP SORT EN DEUX TEMPS. `GHTC`, `GHW1` et `GHW2` ont été ajoutés partout, par une migration strictement additive. `GHW`, lui, a disparu le même jour de tous les CHOIX — le schéma Zod de création et d'onboarding, la grille du parcours d'entrée, le menu du formulaire —, si bien que plus personne ne peut en créer, mais il RESTE dans l'énumération PostgreSQL. Retirer une valeur d'un type énuméré réécrit la colonne et impose de donner un sort aux lignes qui la portent ; `GHW` n'a pas d'équivalent — il ne dit pas si le plancher bas est à 40 mètres (GHW 1) ou à 60 (GHW 2) — et NULL serait une perte. On ignore s'il existe de telles lignes, et `pnpm build` joue `prisma migrate deploy` : le retrait s'exécuterait en production au prochain déploiement, sur des données que personne n'a vues. Le comptage devient concluant une fois ce palier déployé, puisque le compte ne peut plus remonter. Condition de déclenchement du temps 2, migration à écrire et sort des lignes existantes : `docs/chantiers-ouverts.md` § 9 bis. `classes-igh.test.ts` dérive la liste d'ici et ne tolère `GHW` que par une dérogation nommée, qui ne couvre que les deux déclarations décrivant ce que la base peut CONTENIR et jamais celles qui disent ce qu'on peut DÉCLARER.\n\nUNE NORMALISATION, ET ELLE EST DÉCLARÉE : le texte écrit « GHW 1 » avec une espace, qu'aucune valeur d'énumération PostgreSQL ni TypeScript ne peut porter. Le test retire les espaces INTERNES au sigle, et rien d'autre. C'est la seule transformation entre le verbatim ci-dessus et la liste attendue.\n\nRÉSERVE : le RÉGIME des IGH reste hors périmètre produit — `src/lib/perimetre/exclusions.ts` refuse le cumul ERP + IGH, et l'arrêté du 30 décembre 2011 n'est dépouillé que d'un article. Compléter la nomenclature ne couvre pas davantage l'IGH ; cela permet seulement à un dossier de dire juste ce qu'il est.",
    },
  ],
};
