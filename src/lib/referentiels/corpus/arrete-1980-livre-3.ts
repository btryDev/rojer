// Arrêté du 25 juin 1980, Livre III — établissements de 5e catégorie.
//
// Premier corpus dépouillé de bout en bout, le 26 août 2026. C'est le corpus
// qui gouverne 100 % de la base d'utilisateurs : tous les établissements sont
// des ERP de 5e catégorie.
//
// Le résultat tient en une phrase : sur 58 articles, UN SEUL crée une
// obligation périodique pour un établissement des secteurs couverts — PE 4.
// Hors hôtels, le Livre III ne fixe aucune autre fréquence chiffrée à un
// exploitant de restaurant, de commerce ou de bureau. Toute ligne de calendrier
// que le produit porte pour ces secteurs vient donc d'ailleurs — PE 4, le Code
// du travail — et doit le dire.
//
// ~~UN SEUL article porte le statut `obligation_manquante` : PE 27~~ [2026-09-21 : PE 27 est `retenu` pour ses § 4 et § 5 ; les manquantes de ce fichier sont `PO 1 § 3`, `PO 7` et `PO 12`. Ce qui suit décrit l'état d'avant.] PE 27, dont le § 5
// fait instruire le personnel sans écrire de périodicité. Ce n'est pas un
// défaut du dépouillement, c'est son produit.
//
// La phrase d'origine en annonçait deux, « PE 4 et PE 27 ». Elle était déjà
// fausse quand elle a été écrite : PE 4 est `retenu` depuis l'ADR-022, avec
// une `reserve` — ce que le statut `retenu` sert précisément à dire. Corrigée
// le 2026-09-01, en même temps que la réserve de PE 4 était levée : son § 1
// est encodé depuis que `Etablissement.comporteLocauxSommeilPublic` existe.
//
// LE CHAPITRE III A CHANGÉ DE VISAGE LE 2026-09-01. Ses neuf articles étaient
// tous `non_couvert`, sous un motif unique — l'attribut « locaux à sommeil »
// n'existait pas. Relus à la source une fois l'attribut posé : deux sont
// retenus (PE 33, PE 35), quatre sont `hors_perimetre` / `construction`
// (PE 28 à PE 31), trois sont `sans_objet` (PE 32, PE 34, PE 36) comme PE 24
// et PE 26 le sont depuis le premier jour.
//
// LES CHAPITRES « AVEC HÉBERGEMENT » POUR J, U ET R, RELUS LE 2026-10-16 (API
// PISTE, bac à sable). La table des matières du livre III n'en a que deux :
// le chapitre III (locaux réservés au sommeil, PE 28 à PE 37), commun à tous
// les types, et le chapitre V (petits établissements de soins, PU 1 à PU 6).
// IL N'Y A PAS DE CHAPITRE PROPRE À J NI À R : les six chapitres du livre III
// sont I (dispositions générales), II (règles techniques), III (sommeil), IV
// (hôtels, PO), V (soins, PU), VI (établissements sportifs, PX). Une structure
// pour personnes âgées ou un internat de 5ᵉ catégorie relèvent donc des
// chapitres I à III. PE 28 à PE 36 : versions inchangées, classement inchangé.
// PU 1 à PU 6 : le renvoi de PU 5 à U 51 – U 64, « non dépouillé » depuis le
// 2026-08-26, est ouvert ; les six articles quittent `non_couvert` et sont
// reclassés un par un (l'ancien motif est rayé dans `historique`).

import type { Corpus } from "./types";

export const CORPUS_PE: Corpus = {
  id: "arrete-1980-livre-3",
  intitule:
    "Arrêté du 25 juin 1980, Livre III — Dispositions applicables aux établissements de 5e catégorie",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374770/",
  etendue: "integral",
  portee:
    "Règles PE, PO, PU et PX. Gouverne tous les ERP du deuxième groupe, donc l'intégralité de la base d'utilisateurs du produit.",
  articles: [
    {
      ref: "PE 1",
      intitule: "Objet. - Textes applicables",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020374786",
      versionEnVigueur: "1990-08-27",
      modifiePar: null,
      // ~~luLe: "2026-09-26", lecture: "premiere_main"~~ — relu le 2026-10-07
      // par l'API PISTE en BAC À SABLE (C60) : LEGIARTI000020374786, seule
      // version, en vigueur depuis le 1990-08-27. Texte inchangé.
      luLe: "2026-10-07",
      lecture: "api_legifrance",
      citationCle:
        "Le présent livre complète les dispositions du livre Ier du règlement de sécurité. Il fixe les prescriptions applicables aux établissements classés dans le deuxième groupe, visé à l'article GN 1 (§ 2 a). Les dispositions du livre II ne sont pas applicables sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre.",
      statut: "sans_objet",
      motif:
        "Article de champ d'application : il énonce que le Livre III complète le Livre Ier, vise le deuxième groupe (GN 1 § 2 a) et écarte le Livre II sauf renvoi exprès. Il n'impose rien à l'exploitant, mais c'est lui qui commande le classement de tout le reste du corpus. [2026-10-07, C60] Cité en référence par les lignes AS 9 : premier fondement de leur borne aux catégories 1 à 4 (`ascenseur-erp-verification-quinquennale-as9`, `ascenseur-erp-verification-remise-en-service-as9`), ~~et du renvoi exprès qui ouvre AS 9 aux hôtels de 5ᵉ catégorie par PO 1 § 3 (`ascenseur-hotel-5-verification-quinquennale-as9`, `ascenseur-hotel-5-verification-remise-en-service-as9`)~~ [2026-10-08, C64 : ces deux lignes sont supprimées — le préventeur borne AS 9 aux N1-N4 ; la lecture de PO 1 § 3 reste une question posée au préventeur, en réserve à PO 1]. Il reste `sans_objet` : il ne prescrit rien, il dit où le reste s'applique.",
    },
    {
      ref: "PE 2",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374770/",
      prescrit:
        "Définit qui est assujetti au Livre III et allège le régime des plus petits. § 3 : les ERP de 5e catégorie SANS locaux à sommeil et les locaux professionnels recevant du public situés dans un bâtiment d'habitation ou un immeuble de bureaux, s'ils reçoivent au plus 19 personnes de public, ne sont assujettis qu'aux articles PE 4, PE 10 B, PE 24 § 1, PE 26 § 1 et PE 27. PE 4 y figure : aucune TPE n'échappe au triennal des installations techniques. Aucune obligation propre, aucune périodicité.",
      citationCle:
        "Sont assujettis aux seules dispositions des articles PE 4, PE 10 B, PE 24 § 1, PE 26 § 1 et PE 27, s'ils reçoivent au plus 19 personnes constituant le public : - les établissements recevant du public de 5e catégorie sans locaux à sommeil ; - les locaux professionnels recevant du public situés dans les bâtiments d'habitation ou dans les immeubles de bureaux.",
      intitule: "Etablissements assujettis",
      versionEnVigueur: "2026-01-01",
      modifiePar: { texte: "Arrêté du 1er décembre 2025 - art. 2" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "sans_objet",
      motif:
        "Définit les seuils d'assujettissement et réduit, au § 3, le régime des établissements sans locaux à sommeil recevant au plus 19 personnes aux seuls PE 4, PE 10 B, PE 24 § 1, PE 26 § 1 et PE 27. Aucune obligation propre, mais PE 4 y figure : aucune TPE n'échappe au triennal.",
    },
    {
      ref: "PE 3",
      intitule: "Calcul de l'effectif",
      versionEnVigueur: "1990-08-27",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "sans_objet",
      motif:
        "Méthode de calcul de l'effectif théorique du public. Aucune action récurrente.",
    },
    {
      ref: "PE 4",
      intitule: "Vérifications techniques",
      versionEnVigueur: "2026-07-01",
      // Relevé par un agent le 2026-09-21 en cherchant les dates de PE 27 : l'article
      // 13 de cet arrêté rend la rédaction nouvelle de PE 4 « applicable à partir
      // du 1er juillet 2026 ». C'est bien la version que cette entrée porte, lue
      // de première main le 2026-08-27 ; il ne manquait que le nom du texte.
      // Relu le 2026-09-27 (C41) : la page affiche « Modifié par Arrêté du 1er
      // décembre 2025 - art. 3 » et « - art. 4 ». Citation inchangée, § 2 recopié
      // à l'identique.
      modifiePar: {
        texte: "Arrêté du 1er décembre 2025 (NOR INTE2529354A) - art. 3 et art. 4 ; art. 13 pour la date d'application",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053020948",
      },
      luLe: "2026-09-27",
      lecture: "premiere_main",
      citationCle:
        "§ 2. Tous les trois ans au plus, l'exploitant doit procéder, ou faire procéder, par des techniciens compétents, aux opérations d'entretien et de vérification des installations et des équipements techniques de son établissement (chauffage, éclairage, installations électriques, installations de gaz, appareils de cuisson, circuits d'extraction de l'air vicié, des buées et des graisses des grandes cuisines, des offices de remise en température et des îlots, ascenseurs, moyens de secours, etc.).",
      statut: "retenu",
      obligations: [
        // L'obligation portée par l'établissement (ADR-022), qui prend le § 2
        // pour ce qu'il dit : l'ensemble des installations techniques.
        "incendie-erp-pe4-entretien-installations-techniques",
        // 2026-10-13 : le § 2 à l'hôtel (type O), au rythme de PO 1 § 3 —
        // deux ans plutôt que trois ; la ligne triennale exclut le type O.
        "incendie-hotel-po-controle-biennal-installations",
        // Le § 1, encodé le 2026-09-01 avec l'attribut « locaux à sommeil ».
        "incendie-erp-5-sommeil-contrat-entretien-sdi",
        // Une seule entrée, et c'est le résultat du chantier, pas une
        // amputation. Les deux fragments qui citaient aussi PE 4 § 2 en
        // fondement — `elec-erp-cat5-quinquennale` et
        // `cuisson-gaz-installations-triennale` — ont été RETIRÉS le
        // 2026-08-27 : ils n'avaient pas de fondement propre, et l'obligation
        // ci-dessus porte l'article entier (ADR-022). Voir
        // `OBLIGATIONS_RETIREES` dans `conformite/index.ts`.
      ],
      reserve:
        "Le § 2 est encodé depuis l'ADR-022 (porteur établissement, triennal). LE § 1 L'EST DEPUIS LE 2026-09-01 : l'attribut d'établissement qu'il attendait — `comporteLocauxSommeilPublic` — existe, et `incendie-erp-5-sommeil-contrat-entretien-sdi` porte le contrat annuel d'entretien du système de détection automatique d'incendie. La réserve qui figurait ici disait « il attend l'attribut `Etablissement.locauxSommeil`, qui n'existe pas » ; elle est levée.\n\nRESTE DEUX CHOSES, ET AUCUNE DES DEUX N'EST UNE ÉCHÉANCE RÉCURRENTE. (1) La première phrase du § 1 fait vérifier la détection, le désenfumage et les installations électriques « à la construction et avant l'ouverture par des personnes ou des organismes agréés » : c'est un contrôle d'ouverture, et le produit ne date pas l'ouverture d'un établissement qu'il prend en cours d'exploitation. (2) Le chapeau ajouté par l'arrêté du 1er décembre 2025, applicable au 2026-07-01, soumet les installations de gaz neuves ou modifiées aux vérifications de PE 10 B : contrôle à la construction ou après travaux, pas instruit. Les deux sont de la même espèce, et c'est la raison pour laquelle ils restent dehors ensemble.\n\nLE § 3 N'EST PAS UNE ÉCHÉANCE, ET C'EST ÉCRIT ICI DEPUIS LE 2026-09-28 (audit de bout en bout, D12 ; le refus n'était écrit que dans une revue). « L'exploitant peut être mis en demeure, après avis de la commission de sécurité, de faire procéder à des vérifications techniques par des personnes ou des organismes agréés lorsque des non-conformités graves ont été constatées en cours d'exploitation » (API, LEGIARTI000053027822) : une procédure que l'exploitant subit, pas une échéance qu'il tient — même classement que l'arrêté du 21 décembre 2004, art. 7, et que GE 8 § 3. La mise en demeure reçue peut se saisir comme prescription particulière (ADR-035).",
    },
    {
      ref: "PE 5",
      intitule: "Structures, patios et puits de lumière",
      versionEnVigueur: "1997-04-10",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 6",
      intitule: "Isolement. - Parc de stationnement",
      versionEnVigueur: "2006-07-08",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 7",
      intitule: "Accès des secours",
      versionEnVigueur: "2026-01-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 8",
      intitule: "Enfouissement",
      versionEnVigueur: "1990-08-27",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "sans_objet",
      motif:
        "Article de pur renvoi aux articles CO 39 § 1 et CO 40. Ne prescrit rien en propre.",
    },
    {
      ref: "PE 9",
      intitule: "Locaux présentant des risques particuliers",
      versionEnVigueur: "2026-01-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 10",
      intitule:
        "Stockage d'hydrocarbures (A) et installations de gaz combustibles (B)",
      versionEnVigueur: "2026-07-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "sans_objet",
      motif:
        "Fixe les conditions de stockage des hydrocarbures et la conformité des installations de gaz, avec vérification à la construction ou après travaux — pas de récurrence. Le triennal des installations de gaz vient de PE 4 § 2. Attention : « PE 10 B » désigne une subdivision, pas un article distinct.",
    },
    {
      ref: "PE 11",
      intitule: "Dégagements",
      versionEnVigueur: "2004-07-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "sans_objet",
      motif:
        "Règles d'évacuation et obligation permanente de non-encombrement des dégagements. Permanente et non datée : ne se traduit pas en échéance.",
    },
    {
      ref: "PE 12",
      intitule: "Conduits et gaines",
      versionEnVigueur: "1990-08-27",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 13",
      intitule: "Comportement au feu des matériaux",
      versionEnVigueur: "2010-06-16",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 14",
      intitule: "Évacuation des fumées",
      versionEnVigueur: "2004-07-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "sans_objet",
      motif:
        "Impose l'existence et la manœuvrabilité des dispositifs de désenfumage, sans essai ni vérification récurrente. ~~Le désenfumage figure en revanche dans la liste triennale de PE 4 § 2.~~ [2026-09-27, C39 : faux. PE 4 relu sur Légifrance le 2026-09-26 (en vigueur depuis le 01/07/2026) : la liste du § 2 — chauffage, éclairage, installations électriques, installations de gaz, appareils de cuisson, circuits d'extraction, ascenseurs, moyens de secours, « etc. » — ne nomme pas le désenfumage. C'est le § 1 qui le nomme, pour une vérification « à la construction et avant l'ouverture » par des personnes ou organismes agréés, dans les seuls établissements avec locaux à sommeil.]",
    },
    {
      ref: "PE 15",
      intitule: "Règles d'installation et dispositions générales (cuisson)",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766677",
      versionEnVigueur: "2006-03-01",
      modifiePar: {
        texte: "Arrêté du 10 octobre 2005, v. init.",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000240955",
      },
      luLe: "2026-09-27",
      lecture: "premiere_main",
      citationCle:
        "§ 1. Les dispositions de la présente section sont applicables aux installations d'appareils de cuisson ou de remise en température destinés à la restauration situés dans les locaux accessibles ou non au public. Toutefois, les installations autorisées dans les établissements de 4e catégorie sont également autorisées dans les établissements de 5e catégorie de même type. Dans ce cas, leur mise en œuvre devra être réalisée dans les conditions définies au livre II, titre Ier, chapitre X.",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif:
        "Lu en entier le 2026-09-27 (§ 1 à § 7) : champ de la section, définitions (appareils de cuisson, de remise en température, « grande cuisine » au-delà de 20 kW, office, îlot, module), marquage CE, fixation, arrêt d'urgence, interdiction des combustibles F+. Aucun rythme, aucun entretien, aucune vérification. CE QUE LE TEXTE DIT, ET CE QUI RESTE UNE LECTURE (C41, relu le 2026-09-27). Le texte dit : le renvoi vise la « mise en œuvre » d'installations « autorisées dans les établissements de 4e catégorie », et « dans ce cas » seulement. Il ne définit pas « mise en œuvre » et ne nomme ni l'entretien ni la vérification. Au livre II, l'entretien et la vérification ne sont pas mêlés aux règles d'installation : au chapitre X, ils forment la « Section 7 : Entretien et vérifications » (GC 21, GC 22), après six sections d'installation (dispositions générales, grandes cuisines, offices, îlots, modules, appareils des locaux accessibles ou non) ; au chapitre V, la « Section 9 : Entretien et vérification » (CH 57, CH 58). Aucun intitulé de section de ces deux chapitres ne dit « mise en œuvre ». Y lire l'entretien et la vérification annuels du livre II est donc une lecture que le découpage du chapitre ne soutient pas ; l'exclure en est une aussi, plus proche du texte. Le rythme que le livre III impose en 5ᵉ sur ces objets est PE 4 § 2 (trois ans au plus), porté par `incendie-erp-pe4-entretien-installations-techniques`. Aucune applicabilité ne change : les lignes du livre II servies aux N5 restent une sur-application assumée, et leur description nomme désormais la ligne triennale.",
    },
    {
      ref: "PE 16",
      intitule: "Grandes cuisines",
      versionEnVigueur: "2008-08-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "sans_objet",
      motif:
        "Caractéristiques constructives des grandes cuisines et du circuit d'extraction. Exige que les éléments de rétention des graisses « puissent être facilement nettoyés », sans aucune fréquence : le nettoyage périodique des circuits d'extraction ne vient pas d'ici mais de PE 4 § 2.",
    },
    {
      ref: "PE 17",
      intitule: "Office de remise en température",
      versionEnVigueur: "2006-03-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 18",
      intitule: "Îlots de cuisson installés dans les salles",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766742",
      versionEnVigueur: "2008-08-30",
      modifiePar: { texte: "Arrêté du 21 mai 2008, v. init." },
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-17 par l'API (PISTE, bac à sable).
      luLe: "2026-10-17",
      lecture: "api_legifrance",
      citationCle: "Un personnel de service doit être présent pendant le fonctionnement des appareils.",
      historique: "2026-10-17 — revue de `lot/ref-a-corpus-titre-1`, ligne de partage 10 (une présence requise pendant le fonctionnement est un ÉTAT PERMANENT, décision de c6) ; trouvé par la garde de présence, qui lit aussi les motifs. Ancien classement : ~~statut sans_objet ; motif : Conditions d'exploitation d'un îlot de cuisson, dont la présence de personnel pendant le fonctionnement — obligation continue, pas une échéance.~~\n\n2026-10-17 — sous-lot C (`lot/ref-c-incendie-n1-n4`) : ~~`obligation_manquante`, cause `libre`~~ → `non_couvert`. 2026-10-17, sous-lot C (découpage validé par c6) : annoncé au matériel avec GC 15, pas de ligne — règle de niche (ligne de partage 5). La phrase de l'aide est posée au rebase sur le sous-lot B (décision Q3 de c6).",
      statut: "non_couvert",
      motif: "Îlots de cuisson installés en salle, en 5ᵉ catégorie (le pendant de GC 15 au livre II) : enceinte interdite au public, appareils non laissés en libre utilisation, énergie gaz ou électrique, puissance limitée, captation des buées (règles d'installation et d'usage). Et un ÉTAT PERMANENT : « Un personnel de service doit être présent pendant le fonctionnement des appareils » (ligne de partage 10, politique sœur EL 18 § 2). « Obligation continue, pas une échéance » était le motif ancien : c'est précisément ce qu'est un état permanent. Touche la cible restaurant. PROPOSITION pour le sous-lot C : la même ligne que GC 15, étendue à la 5ᵉ catégorie. ~~À faire au sous-lot C ; transitoirement au § 9.~~ [2026-10-17, sous-lot C (découpage validé par c6) : annoncé au matériel avec GC 15, pas de ligne — règle de niche (ligne de partage 5). La phrase de l'aide est posée au rebase sur le sous-lot B (décision Q3 de c6).]",
      declareA: "Formulaire de déclaration d'un équipement, aide de la catégorie « Appareil de cuisson ERP » (`src/lib/equipements/labels.ts`, `DESCRIPTION_CATEGORIE.APPAREIL_CUISSON_ERP`) : « Rojer ne suit pas la présence d'un personnel de service pendant le fonctionnement des appareils d'un îlot de cuisson installé dans une salle de restauration (art. GC 15 et PE 18) »",
    },
    {
      ref: "PE 19",
      intitule:
        "Appareils installés dans les locaux accessibles ou non au public",
      versionEnVigueur: "2006-03-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 20",
      intitule: "Généralités (chauffage, ventilation)",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766756",
      versionEnVigueur: "2004-05-22",
      // La page de l'article n'affiche aucune mention « Modifié par »
      // (relevé le 2026-09-27) : réponse déclarée, pas une absence.
      modifiePar: null,
      luLe: "2026-09-27",
      lecture: "premiere_main",
      citationCle:
        "§ 1. Les installations visées à la présente section doivent être réalisées dans les conditions définies dans la suite du présent règlement. § 2. Toutefois, les installations autorisées dans les établissements de 4e catégorie sont également autorisées dans les établissements de 5e catégorie du même type. Dans ce cas, leur mise en œuvre devra être réalisée dans les conditions définies au livre II, titre Ier, chapitre V.",
      statut: "sans_objet",
      motif:
        "Article d'articulation renvoyant au Livre II pour les installations admises en 4e catégorie. Ne prescrit rien en propre. Lu en entier le 2026-09-27 : deux paragraphes, rien d'autre. CE QUE LE TEXTE DIT, ET CE QUI RESTE UNE LECTURE (C41, relu le 2026-09-27). Le texte dit : le renvoi vise la « mise en œuvre » d'installations « autorisées dans les établissements de 4e catégorie », et « dans ce cas » seulement. Il ne définit pas « mise en œuvre » et ne nomme ni l'entretien ni la vérification. Au livre II, l'entretien et la vérification ne sont pas mêlés aux règles d'installation : au chapitre X (renvoi de PE 15), ils forment la « Section 7 : Entretien et vérifications » (GC 21, GC 22), après six sections d'installation (dispositions générales, grandes cuisines, offices, îlots, modules, appareils des locaux accessibles ou non) ; au chapitre V (renvoi de PE 20), la « Section 9 : Entretien et vérification » (CH 57, CH 58). Aucun intitulé de section de ces deux chapitres ne dit « mise en œuvre ». Y lire l'entretien et la vérification annuels du livre II est donc une lecture que le découpage du chapitre ne soutient pas ; l'exclure en est une aussi, plus proche du texte. Le rythme que le livre III impose en 5ᵉ sur ces objets est PE 4 § 2 (trois ans au plus), porté par `incendie-erp-pe4-entretien-installations-techniques`. Aucune applicabilité ne change : les lignes du livre II servies aux N5 restent une sur-application assumée, et leur description nomme désormais la ligne triennale.",
    },
    {
      ref: "PE 21",
      intitule: "Installations d'appareils à combustion",
      versionEnVigueur: "2026-01-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 22",
      intitule: "Circuits aérauliques",
      versionEnVigueur: "2025-08-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 23",
      intitule: "Installation de ventilation mécanique contrôlée",
      versionEnVigueur: "2025-08-01",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 24",
      intitule: "Installations électriques, éclairage",
      versionEnVigueur: "2024-05-24",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "sans_objet",
      motif:
        "Impose des installations prévenant les risques d'incendie (NF C 15-100 réputée satisfaisante) et un éclairage de sécurité d'évacuation. Aucune périodicité : la vérification périodique de l'électricité vient de PE 4 § 2 côté ERP et du Code du travail côté employeur.",
    },
    {
      ref: "PE 25",
      intitule: "Règles générales (ascenseurs)",
      versionEnVigueur: "2023-08-25",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "hors_perimetre",
      exclusion: "construction",
    },
    {
      ref: "PE 26",
      intitule: "Moyens de secours",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766855",
      versionEnVigueur: "2008-10-08",
      modifiePar: { texte: "Arrêté du 26 juin 2008, v. init." },
      // Relu le 2026-09-26 sur sa page propre, deux lectures (C35) : le § 1
      // renvoie à MS 39 et ne mentionne ni MS 38, ni « vérification », ni
      // « annuel ». ~~Cité par la description de `resto-incendie`.~~ [Retiré
      // de cette description le même jour, sur contre-lecture : la périodicité
      // en ERP relève du module de conformité. Le relevé reste.]
      // ~~luLe: "2026-09-26", lecture: "premiere_main"~~ — relu le 2026-10-07
      // par l'API PISTE en BAC À SABLE, § 1 à § 3 (relecture du préventeur) :
      // LEGIARTI000024766855, en vigueur depuis le 2008-10-08, aucune version
      // future.
      luLe: "2026-10-07",
      lecture: "api_legifrance",
      prescrit:
        "Trois paragraphes. § 1 : au moins un extincteur portatif installé dans les conditions de MS 39, en atténuation de cet article — un appareil pour 300 m² et un par niveau. § 2 : colonnes sèches dans les escaliers protégés des établissements dont le plancher bas le plus élevé est à plus de 18 m de la voie accessible aux engins des sapeurs-pompiers. § 3 : l'appareil ou le dispositif d'extinction non apparent est signalé par un panneau conforme aux signaux normalisés de localisation (norme NF X 08-003). PE 26 n'ouvre le Livre II que sur MS 39.",
      citationCle:
        "§ 1. Les établissements doivent être dotés d'au moins un extincteur portatif installé dans les conditions définies par l'article MS 39 et en atténuation de cet article avec un minimum d'un appareil pour 300 mètres carrés et un appareil par niveau. […] § 3. Lorsqu'un appareil ou un dispositif d'extinction n'est pas apparent, il doit être signalé par un panneau conforme aux signaux normalisés d'indication de localisation d'un équipement de lutte contre l'incendie ou d'un autre moyen d'alarme ou d'alerte définis à la norme NF X 08-003 relative aux couleurs et signaux de sécurité.",
      statut: "retenu",
      obligations: ["signalisation-erp-5-extincteurs-identification"],
      reserve:
        "DEUX PARAGRAPHES RESTENT SANS LIGNE. (1) La DOTATION du § 1 — un appareil pour 300 m², un par niveau — n'est portée par aucune ligne d'ERP (seul le Code du travail a sa ligne de dotation, `incendie-travail-extincteurs-dotation`) ; seule l'installation « dans les conditions définies par l'article MS 39 » est portée, par `signalisation-erp-5-extincteurs-identification`. (2) Le § 2, colonnes sèches au-delà de 18 m, est une règle de construction que le parc ne déclare pas (aucune catégorie « colonne sèche »). Lecture du 2026-10-07 en BAC À SABLE PISTE : égalité avec la production non vérifiée.",
      historique:
        "2026-10-07 — ~~statut: \"sans_objet\", motif: « Impose au moins un extincteur portatif installé selon MS 39, un appareil pour 300 m² et un par niveau. C'est une règle de dotation et de dimensionnement, sans récurrence. Point décisif du dépouillement : PE 26 n'ouvre le Livre II que sur MS 39, qui n'est pas un article de vérification. »~~ Classement levé à la relecture du préventeur (« Idem ERP cat N1 à N5 MS39 PE26 ») : le § 3, jamais relevé jusque-là (la citation s'arrêtait au § 1), et le renvoi du § 1 à MS 39 fondent un état permanent — l'identification des moyens d'extinction —, que le statut `sans_objet` ignorait parce qu'il ne cherchait qu'une récurrence.",
    },
    {
      ref: "PE 27",
      intitule: "Alarme, alerte, consignes",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766984",
      versionEnVigueur: "2026-05-01",
      modifiePar: { texte: "Arrêté du 4 février 2026 - art. 1" },
      luLe: "2026-09-26",
      lecture: "agent_verbatim",
      prescrit:
        "Alarme, alerte et consignes des ERP de 5ᵉ catégorie, en SIX paragraphes. § 1 : présence permanente d'un membre du personnel ou d'un responsable quand l'établissement est ouvert au public, avec deux dérogations et une convention possible. § 2 : un système d'alarme — dont c) le personnel informé du signal sonore, e) le système maintenu en bon état. § 3 : la liaison avec les sapeurs-pompiers (MS 70). § 4 : des consignes affichées, trois mentions. § 5 : le personnel instruit et entraîné. § 6 : un plan d'intervention apposé à l'entrée.",
      citationCle:
        "§ 4. Des consignes précises, affichées bien en vue, doivent indiquer : - le numéro d'appel des sapeurs-pompiers ; - l'adresse du centre de secours le plus proche ; - les dispositions immédiates à prendre en cas de sinistre. § 5. Le personnel doit être instruit sur les conduites à tenir en cas d'incendie et être entraîné à la manœuvre des moyens de secours.",
      statut: "retenu",
      obligations: [
        "incendie-erp-5-instruction-personnel",
        "incendie-erp-5-consignes-affichees",
        // 2026-10-13 : le § 5 à l'hôtel, avec PO 7 et PO 12.
        "incendie-hotel-po-instruction-personnel-semestrielle",
      ],
      reserve:
        "QUATRE PARAGRAPHES RESTENT DEHORS — ET LE PREMIER ÉTAT DE CETTE RÉSERVE EN OUBLIAIT UN. Écrite le 2026-09-21 au matin, elle disait « trois paragraphes », § 1 à § 3 : j'avais demandé à l'outil de lecture les « § 1 à § 5 », et il a répondu dans le cadre que je lui donnais. L'article en compte SIX ; la contre-lecture l'a vu, et je l'ai vérifié en demandant cette fois « combien de paragraphes, et lequel est le dernier ». Ne jamais souffler à une lecture la structure qu'on en attend.\n\n(1) LE § 6, LE PLAN D'INTERVENTION, relevé lettre à lettre le 2026-09-21 : « A l'entrée de chaque établissement, un plan schématique doit être apposé pour faciliter l'intervention des sapeurs-pompiers. Ce plan dit plan d'intervention doit représenter au minimum le sous-sol, le rez-de-chaussée, chaque étage ou l'étage courant de l'établissement. Doivent y figurer, outre les dégagements et les cloisonnements principaux, l'emplacement : des divers locaux techniques et autres locaux à risques particuliers ; des dispositifs et commandes de sécurité ; des organes de coupure des fluides ; des organes de coupure des sources d'énergie ; des moyens d'extinction fixes et d'alarme. » C'est un écrit affiché, sans seuil — de la même espèce que le § 4, que le référentiel porte. NON ENCODÉ. ~~« l'arrêté du 4 février 2026, que personne n'a ouvert »~~ : OUVERT le 2026-09-21 (JORFTEXT000053886207, trois articles) — il ne touche QUE le § 1 (la dérogation des dix-neuf personnes, et les lettres a) et b)). Le § 6 n'en vient pas. Ce qui le retient est `GN 10`, ouvert le même jour : le règlement « ne s'applique pas aux établissements existants » hors administratif, contrôles, vérifications et entretien, et un plan à apposer n'est rien de cela. ~~« Les § 4 et § 5 sont des actes d'exploitation, encodés sans distinction de date comme PE 4 § 2 »~~ — l'argument ne tenait pas : `PE 4 § 2` EST un entretien, donc excepté par GN 10 ; les § 4 et § 5 ne le sont pas, et ils sur-appliquent aux établissements anciens, ce que leur description dit désormais. N'en pas ajouter un troisième tant que la propriétaire n'a pas tranché la classe entière (dossier des décisions, A6) : le plan d'intervention coûte un relevé des locaux, pas une affiche.\n\nLES DATES, RELEVÉES LE 2026-09-21 (six versions de l'article lues sur les pages de section datées) — et elles changent tout pour le § 6. PE 27 est créé par l'arrêté du 22 juin 1990, en vigueur le 27 août 1990, et compte six paragraphes depuis l'origine. Les § 4 et § 5 y sont depuis ce jour-là (rédaction actuelle depuis le 16 mai 2010, arrêté du 11 décembre 2009 — « le plus proche », « les conduites »). Le § 6, LUI, NE VISAIT JUSQU'AU 31 DÉCEMBRE 2025 QUE « les établissements implantés en étage ou en sous-sol ». C'est l'article 12 de l'arrêté du 1er décembre 2025 (NOR INTE2529354A, en vigueur le 1er janvier 2026) qui écrit « A l'entrée de chaque établissement » ; son article 13 ne prévoit rien pour les établissements existants, donc `GN 10` joue à plein. Un ERP de 5ᵉ catégorie de plain-pied ouvert avant 2026 n'est pas tenu au plan d'intervention. L'encoder pour tous aurait sur-appliqué à la quasi-totalité du parc : le refus d'encoder était juste, et il l'est désormais pour une raison datée.\n\n(2) LE § 2, L'ALARME, relevé lettre à lettre : c) « Le personnel de l'établissement doit être informé de la caractéristique du signal sonore d'alarme générale. Cette information peut être complétée par des exercices périodiques d'évacuation » ; e) « Le système d'alarme doit être maintenu en bon état de fonctionnement. » Deux obligations sans condition. Le c) est un acte envers le personnel, voisin du § 5 sans s'y confondre ; le e) est à rapprocher de `incendie-erp-ssi-annuelle` (MS 73), seule ligne d'alarme que le référentiel porte pour la 5ᵉ catégorie, et qui suppose une alarme DÉCLARÉE au parc. Ni l'un ni l'autre n'est encodé.\n\n(3) LE § 1, LA PRÉSENCE PERMANENTE : « Un membre du personnel ou un responsable au moins doit être présent en permanence lorsque l'établissement est ouvert au public. » Deux dérogations — les établissements recevant moins de vingt personnes sans locaux à sommeil ; ceux qui limitent l'accès à dix-neuf personnes et respectent un cahier des charges ministériel — et une convention de surveillance par les utilisateurs. À lire en entier avant d'écrire une ligne.\n\n(4) LE § 3, L'ALERTE : liaison avec les sapeurs-pompiers « par tout moyen de communication conforme à l'article MS 70 », atténuée pour les établissements sans locaux à sommeil.\n\nLECTURE : la page propre de l'article ne rend qu'une table des matières (piège n° 2 du journal) ; tout vient de la page de SECTION, interrogée paragraphe par paragraphe.",
      historique:
        "L'entrée quand elle était `obligation_manquante` (2026-08-26 → 2026-09-21). Son motif : Impose au § 5 que « le personnel doit être instruit sur les conduites à tenir en cas d'incendie et être entraîné à la manœuvre des moyens de secours », sans périodicité écrite, pour tous les ERP de 5e catégorie. Le référentiel ne porte aucune ligne de formation du personnel côté ERP. Le § 4 c précise que l'information « peut être complétée par des exercices périodiques d'évacuation » — facultatif, à ne pas confondre avec R. 4227-39. N'ouvre le Livre II que sur MS 70. Réécrit par l'arrêté du 4 février 2026. — Son blocage : Porteur d'échéance : l'obligation naît de l'établissement, pas d'un équipement. Corrigé le 2026-08-27 (ADR-022) : ce n'est plus le modèle qui bloque — `categoriesEquipement` n'est plus requis et `Verification.equipementId` est nullable. PE 27 § 5 est une obligation d'établissement, et le porteur existe. Ce qui bloque encore est ce que dit le motif : l'article n'écrit aucune périodicité, et en inventer une serait décider à la place du texte."
    },
    {
      ref: "PE 28",
      intitule: "Structure et planchers coupe-feu",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020374788",
      versionEnVigueur: "1990-08-27",
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000020374788, version en vigueur depuis le 1990-08-27, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif:
        "Structure stable au feu et planchers coupe-feu de degré une demi-heure, sauf établissement à simple rez-de-chaussée. C'est une exigence de résistance au feu de l'ouvrage : elle s'adresse au constructeur, et un exploitant ne peut ni la refaire ni la constater à date. RECLASSÉ LE 2026-09-01 (lot A11). L'article était `non_couvert`, au motif que « l'attribut « locaux à sommeil » n'existe pas en base ». `Etablissement.comporteLocauxSommeilPublic` existe désormais, et le motif avec lui est devenu faux : ce qui empêche d'encoder cet article n'a jamais été l'attribut, c'est ce que l'article impose. Le chapitre III a été relu à la source ce jour, article par article, avant de reclasser.",
    },
    {
      ref: "PE 29",
      intitule: "Cloisons et portes des locaux réservés au sommeil",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024756257",
      versionEnVigueur: "1990-08-27",
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000024756257, version en vigueur depuis le 1990-08-27, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif:
        "Degré coupe-feu des cloisons séparant les chambres, portes pare-flammes de degré une demi-heure équipées d'un ferme-porte. Même espèce que PE 28 : caractéristiques de l'ouvrage et de ses menuiseries, posées à la construction. RECLASSÉ LE 2026-09-01 (lot A11). L'article était `non_couvert`, au motif que « l'attribut « locaux à sommeil » n'existe pas en base ». `Etablissement.comporteLocauxSommeilPublic` existe désormais, et le motif avec lui est devenu faux : ce qui empêche d'encoder cet article n'a jamais été l'attribut, c'est ce que l'article impose. Le chapitre III a été relu à la source ce jour, article par article, avant de reclasser.",
    },
    {
      ref: "PE 30",
      intitule: "Couloirs",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769415",
      versionEnVigueur: "2002-04-07",
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000024769415, version en vigueur depuis le 2002-04-07, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif:
        "Distance maximale de 35 mètres entre une porte de chambre et un escalier, recoupement des couloirs par portes pare-flammes, désenfumage des escaliers et circulations. Dimensionnement des dégagements : l'exclusion `construction` le nomme expressément. RECLASSÉ LE 2026-09-01 (lot A11). L'article était `non_couvert`, au motif que « l'attribut « locaux à sommeil » n'existe pas en base ». `Etablissement.comporteLocauxSommeilPublic` existe désormais, et le motif avec lui est devenu faux : ce qui empêche d'encoder cet article n'a jamais été l'attribut, c'est ce que l'article impose. Le chapitre III a été relu à la source ce jour, article par article, avant de reclasser.",
    },
    {
      ref: "PE 31",
      intitule: "Cheminées à foyer ouvert",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024756305",
      versionEnVigueur: "1990-08-27",
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000024756305, version en vigueur depuis le 1990-08-27, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif:
        "Les cheminées à foyer ouvert fonctionnant au bois sont admises après avis de la commission de sécurité. L'article ouvre une possibilité d'aménagement sous condition d'avis ; il n'impose aucun acte périodique à l'exploitant. ~~Le ramonage, lui, est dû ailleurs et le référentiel le porte.~~ [2026-09-26 : faux pour ce qui concerne cet article — le référentiel ne porte pas le ramonage des conduits de fumée et cheminées (`CH 57`) : la ligne qui le cite en fait une référence de contexte, et sa note dit qu'il « n'est PAS l'acte que cette obligation planifie ». Seul le ramonage des circuits d'extraction des cuisines (`GC 21`) a une ligne.] RECLASSÉ LE 2026-09-01 (lot A11). L'article était `non_couvert`, au motif que « l'attribut « locaux à sommeil » n'existe pas en base ». `Etablissement.comporteLocauxSommeilPublic` existe désormais, et le motif avec lui est devenu faux : ce qui empêche d'encoder cet article n'a jamais été l'attribut, c'est ce que l'article impose. Le chapitre III a été relu à la source ce jour, article par article, avant de reclasser.",
    },
    {
      ref: "PE 32",
      intitule: "Détection automatique d'incendie et système d'alarme",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024770703",
      versionEnVigueur: "2011-10-30",
      // ~~luLe: "2026-09-01", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000024770703, version en vigueur depuis le 2011-10-30, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle:
        "les établissements doivent être équipés d'un système de sécurité incendie de catégorie A tel que défini à l'article MS 53 et conforme aux dispositions des articles MS 58 et MS 59",
      statut: "sans_objet",
      motif:
        "Règle de DOTATION, sans récurrence : un SSI de catégorie A, sans temporisation, avec des détecteurs sensibles aux fumées et aux gaz de combustion implantés dans les circulations horizontales communes — sauf établissement à simple rez-de-chaussée dont les locaux à sommeil débouchent directement sur l'extérieur. Même classement que PE 24 (installations électriques et éclairage) et PE 26 (extincteurs), pour la même raison : le produit ne modélise pas la conformité de l'installation, il suit les actes qu'elle appelle. L'entretien du système, lui, est dû par PE 4 § 1 et le référentiel le porte depuis ce jour. RECLASSÉ LE 2026-09-01 (lot A11). L'article était `non_couvert`, au motif que « l'attribut « locaux à sommeil » n'existe pas en base ». `Etablissement.comporteLocauxSommeilPublic` existe désormais, et le motif avec lui est devenu faux : ce qui empêche d'encoder cet article n'a jamais été l'attribut, c'est ce que l'article impose. Le chapitre III a été relu à la source ce jour, article par article, avant de reclasser.\n\nÀ SAVOIR SI L'ON REVIENT DESSUS : l'exception du § 1 repose sur un fait que le modèle ne porte pas — « simple rez-de-chaussée dont les locaux réservés au sommeil débouchent directement sur l'extérieur ». Ce serait un second attribut d'établissement, distinct de celui de ce lot.",
    },
    {
      ref: "PE 33",
      intitule: "Registre de sécurité, consignes",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769472",
      versionEnVigueur: "2011-11-04",
      // ~~luLe: "2026-09-01", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000024769472, version en vigueur depuis le 2011-11-04, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle:
        "Une consigne d'incendie doit être affichée dans chaque chambre ; elle est rédigée en français et complétée par une bande dessinée illustrant les consignes.",
      statut: "retenu",
      obligations: ["incendie-erp-5-sommeil-consigne-chambres"],
      historique:
        "Le § 2 est encodé depuis le 2026-09-01 (lot A11). Le § 1 — « L'exploitant doit tenir à jour un registre de sécurité. Ce document doit pouvoir être présenté à chaque visite de la commission de sécurité. » — n'a PAS d'obligation propre, et c'est délibéré : `incendie-registre-securite` le porte déjà, fondée sur R. 143-44 CCH, dont le champ est « les établissements soumis aux prescriptions du présent chapitre », 5ᵉ catégorie comprise. En créer une seconde pour les seuls établissements à locaux à sommeil ferait croire à deux registres là où le texte n'en impose qu'un. Cette entrée ne cite pas cette obligation-là parce qu'elle ne cite pas PE 33 en fondement : la citer ici ferait dire au corpus qu'un article fonde une ligne qui ne le connaît pas.",
    },
    {
      ref: "PE 34",
      intitule: "Signalisations",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024769510",
      versionEnVigueur: "2003-05-07",
      // ~~luLe: "2026-09-01", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000024769510, version en vigueur depuis le 2003-05-07, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle:
        // 2026-10-16 : la citation de l'agent s'arrêtait sur « NF X 08-003. » ; le texte poursuit la phrase. Recopiée de l'API.
        "§ 1. Les portes, les escaliers et les différents cheminements qui conduisent à l'extérieur de l'établissement doivent être pourvus de symboles de sécurité, visibles de jour comme de nuit, conformes aux dispositions de la norme NF X 08-003 relative aux couleurs et signaux de sécurité, à l'exception des signaux normalisés pour sortie et issue de secours n°s 50041, 50042 et 50044 dont l'utilisation est interdite dans les établissements recevant du public.",
      statut: "sans_objet",
      motif:
        "Règle d'équipement du bâtiment, sans récurrence : les dégagements sont POURVUS de symboles de sécurité, et les portes que le public ne doit pas emprunter en cas d'incendie sont fermées à clé ou munies d'un ferme-porte. Même famille que PE 24, PE 26 et PE 32. La ligne de partage avec PE 35, retenu, est écrite dans les `notesInternes` de `incendie-erp-5-sommeil-plans-affiches` : PE 34 fait ÉQUIPER l'ouvrage, PE 35 fait PRODUIRE ET AFFICHER un écrit par l'exploitant. RECLASSÉ LE 2026-09-01 (lot A11). L'article était `non_couvert`, au motif que « l'attribut « locaux à sommeil » n'existe pas en base ». `Etablissement.comporteLocauxSommeilPublic` existe désormais, et le motif avec lui est devenu faux : ce qui empêche d'encoder cet article n'a jamais été l'attribut, c'est ce que l'article impose. Le chapitre III a été relu à la source ce jour, article par article, avant de reclasser.",
    },
    {
      ref: "PE 35",
      intitule: "Affichages",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024758405",
      versionEnVigueur: "1990-08-27",
      // ~~luLe: "2026-09-01", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000024758405, version en vigueur depuis le 1990-08-27, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle:
        "Un plan sommaire de repérage de chaque chambre par rapport aux dégagements à utiliser en cas d'incendie doit être fixé dans chaque chambre.",
      statut: "retenu",
      obligations: ["incendie-erp-5-sommeil-plans-affiches"],
      reserve:
        "Les trois paragraphes sont encodés en une seule obligation — plan de l'établissement au hall, plan d'orientation par étage, plan de repérage par chambre —, et le regroupement est motivé dans ses `notesInternes`. CE QUI RESTE : le § 1 exige un plan « conforme aux dispositions de l'article MS 41 ». MS 41 relève du Livre II, que PE 1 § 1 écarte SAUF renvoi exprès — et c'en est un, donc il s'applique. Il n'a pas été ouvert. L'obligation impose donc le plan sans décrire ce que MS 41 exige de son contenu.",
    },
    {
      ref: "PE 36",
      intitule: "Éclairage de sécurité",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024770568",
      versionEnVigueur: "2010-05-16",
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE, avec les chapitres « avec hébergement » demandés pour J, U et R : LEGIARTI000024770568, version en vigueur depuis le 2010-05-16, celle déjà notée. Le classement ne change pas.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      statut: "sans_objet",
      motif:
        "Règle de dotation en éclairage de sécurité — blocs autonomes ou source centralisée, éclairage d'évacuation renforcé dans les escaliers et circulations. Aucune périodicité : c'est le pendant exact de PE 24, classé `sans_objet` pour la même raison dès le premier dépouillement. Les vérifications de l'éclairage de sécurité, elles, sont portées par le référentiel et fondées ailleurs. RECLASSÉ LE 2026-09-01 (lot A11). L'article était `non_couvert`, au motif que « l'attribut « locaux à sommeil » n'existe pas en base ». `Etablissement.comporteLocauxSommeilPublic` existe désormais, et le motif avec lui est devenu faux : ce qui empêche d'encoder cet article n'a jamais été l'attribut, c'est ce que l'article impose. Le chapitre III a été relu à la source ce jour, article par article, avant de reclasser.",
    },
    {
      ref: "PE 37",
      intitule:
        "Contrôle des établissements de 5ᵉ catégorie comportant des locaux à sommeil",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024770572",
      // ~~url de la section LEGISCTA000020374774~~ — 2026-10-16 : l'article par son LEGIARTI.
      versionEnVigueur: "2004-11-24",
      // Page de l'article : « Création Arrêté du 8 novembre 2004, v. init. ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      // ~~luLe: "2026-09-01", lecture: "premiere_main"~~ — relu le 2026-10-16 par
      // l'API PISTE en BAC À SABLE (texte rendu ce jour-là avec les chapitres de
      // types ; ~~revue indépendante du 2026-10-17~~ porté au corpus le
      // 2026-10-17, après la revue indépendante qui l'a relevé) :
      // LEGIARTI000024770572, seule version, en vigueur depuis le 2004-11-24.
      // L'API rend l'article EN ENTIER, suite de la phrase des cinq ans
      // comprise — voir la fin de la réserve.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      prescrit:
        "Rend applicables aux établissements de 5e catégorie comportant, POUR LE PUBLIC, des locaux à sommeil : GE 2 § 1 et le premier alinéa de GE 2 § 2, GE 3, GE 5 et GE 6 ; et impose une visite de la commission de sécurité TOUS LES CINQ ANS, fréquence que le maire ou le préfet peut augmenter après avis de la commission. C'est un rythme, pas un plafond, et le seul du Livre III pour une visite de commission.",
      citationCle:
        "Le premier paragraphe et le premier alinéa du deuxième paragraphe de l'article GE 2 du règlement de sécurité, ainsi que ses articles GE 3, GE 5 et GE 6 sont applicables aux établissements comportant, pour le public, des locaux à sommeil. Ces établissements doivent être visités tous les cinq ans par la commission de sécurité compétente ; la fréquence de ces visites peut être augmentée, s'il est jugé nécessaire, par arrêté du maire ou du préfet, après avis de la commission.",
      statut: "retenu",
      obligations: ["incendie-erp-5-visite-commission", "incendie-erp-5-sommeil-avis-controle-affiche"],
      reserve:
        "AMENDEMENT 2026-08-31, SOIR. Cet article était classé `obligation_manquante`, `bloquePar: \"attribut-locaux-a-sommeil\"`, au motif que « poser la quinquennale sur tous les ERP de 5ᵉ catégorie sur-appliquerait à la boutique et au bureau ». Le statut était devenu faux : le référentiel PORTE l\'obligation — `incendie-erp-5-visite-commission` —, et elle porte la quinquennale que cet article écrit. C\'est un rythme, pas un plafond, et le SEUL du Livre III pour une visite de commission.\n\nDEUX RÉSERVES ONT VÉCU ICI ENTRE LE 2026-08-31 ET LE 2026-09-01, ET ELLES SONT CLOSES. (1) L\'ANCRAGE : l\'obligation se déclenchait sur une ALARME_INCENDIE déclarée, un hôtel sans alarme ne recevait rien. (2) « POUR LE PUBLIC » : la caractéristique `dessertLocauxSommeil` ne distinguait pas le sommeil du public de celui du personnel. Les deux tenaient à la même cause — l\'absence d\'attribut d\'établissement — et le lot A11 l\'a posé : `Etablissement.comporteLocauxSommeilPublic`. L\'obligation est passée au porteur établissement, la caractéristique d\'équipement est retirée, et la question posée au dirigeant dit en toutes lettres qu\'un logement de fonction ne compte pas.\n\nRELECTURE DU 2026-09-01, ET ELLE OUVRE UNE RÉSERVE NEUVE QUE PERSONNE N\'AVAIT VUE. Le corps de l\'article a été rendu par Légifrance ce jour, version en vigueur du 24 novembre 2004, et il ne commence pas par la phrase des cinq ans : « Le premier paragraphe et le premier alinéa du deuxième paragraphe de l\'article GE 2 du règlement de sécurité, ainsi que ses articles GE 3, GE 5 et GE 6 sont applicables aux établissements comportant, pour le public, des locaux à sommeil. »\n\nC\'EST UN RENVOI EXPRÈS AU LIVRE II, au sens de PE 1 § 1 — donc quatre articles du Livre II s\'appliquent bel et bien à ces établissements, alors que le Livre II est écarté par défaut en 5ᵉ catégorie. GE 6 est dépouillé et retenu (`elec-erp-mise-en-service`). ~~GE 2, GE 3 ET GE 5 N\'ONT JAMAIS ÉTÉ OUVERTS~~ [2026-10-17 : ouverts par la lecture du titre Ier (`lot/ref-a-corpus-titre-1`) ; GE 5 est porté en 5ᵉ avec locaux à sommeil par `incendie-erp-5-sommeil-avis-controle-affiche` (sous-lot C), PE 37 en fondement] : ils ne figurent pas au corpus du Livre II, qui est `articles_cites` et ne prétend donc pas les couvrir. Ce que ces trois articles imposent aux établissements à locaux à sommeil n\'est pas établi, et la quinquennale n\'en dépend pas — elle vient de la seconde phrase de PE 37.\n\nC\'est la règle de lecture du corpus qui attrape ce cas, et elle mérite d\'être citée : un article d\'habilitation lu sans énumérer ce qu\'il habilite est l\'une des trois familles de manques du 2026-08-31. Celui-ci est nommé plutôt que refermé.\n\nLA PHRASE DES CINQ ANS, ENFIN. « Ces établissements doivent être visités tous les cinq ans par la commission de sécurité compétente », relevé ce jour. La suite — « ; la fréquence de ces visites peut être augmentée, s\'il est jugé nécessaire, par arrêté du maire ou du préfet, après avis de la commission » — ~~N\'A PAS été rendue par cette lecture-ci ; elle reste établie par trois relevés antérieurs concordants, et rien dans la lecture du jour ne la contredit.~~ [2026-10-16 : rendue par l\'API, mot pour mot, et désormais dans `citationCle`.] Elle relève de toute façon d\'une prescription particulière (ADR-035), pas du référentiel.",
    },
    {
      ref: "PO 1",
      intitule: "Généralités",
      versionEnVigueur: "2011-10-30",
      // ~~luLe: "2026-08-26", lecture: "premiere_main"~~ — relu le 2026-10-07
      // par l'API PISTE en BAC À SABLE (C60) : LEGIARTI000024770707, en
      // vigueur depuis le 2011-10-30. Texte inchangé.
      luLe: "2026-10-07",
      lecture: "api_legifrance",
      statut: "retenu",
      obligations: [
        "incendie-hotel-po-controle-annuel-electricite",
        // Le volet biennal du § 3 (2026-10-13) a son entrée à part, « PO 1 § 3
        // — contrôle biennal des installations techniques », qui le nomme.
        // ~~2026-10-07 (C60) : le renvoi du § 3 à AS 9 pour les ascenseurs —
        // `ascenseur-hotel-5-verification-quinquennale-as9`,
        // `ascenseur-hotel-5-verification-remise-en-service-as9`~~ — 2026-10-08
        // (C64) : lignes supprimées avant d'avoir été servies, le préventeur
        // borne AS 9 aux N1–N4. La lecture du renvoi reste en `reserve`.
      ],
      reserve:
        "RENVOI DU § 3 À AS 9 POUR LES ASCENSEURS — QUESTION POSÉE AU PRÉVENTEUR ; IL BORNE AS 9 AUX N1-N4 (2026-10-08, C64 ; « AS9 applicable qu'au ERP N1 à N4 (organisme agréé) », annotation recopiée au C60). La lecture du texte, faite au C60 et non reniée : PE 1 § 1 écarte le livre II en 5ᵉ catégorie « sauf celles relevant d'articles expressément mentionnés dans la suite du présent livre », et PO 1 § 3 mentionne AS 9 expressément (« Le contrôle des ascenseurs relève des dispositions particulières précisées dans le cadre de l'article AS 9 du règlement »). Rojer suit le préventeur : aucune ligne AS 9 pour l'hôtel de 5ᵉ catégorie ; ses ascenseurs restent suivis par les lignes du CCH (contrôle technique quinquennal, entretien), qui valent pour tout ascenseur. Décision de la propriétaire du 2026-10-08 (« on respecte les décisions de Julien »).",
      historique:
        "C51 (2026-09-27), relu par l'API Légifrance (pnpm legifrance:verifier) : versionEnVigueur 2018-01-01 → 2011-10-30 : la version en vigueur date du 30 octobre 2011 (arrêté du 26 octobre 2011, lien MODIFICATION « (V) ») ; l'API ne connaît aucune version du 1er janvier 2018 pour cet article. Texte inchangé.",
      citationCle:
        "« § 3. L'ensemble des installations techniques doit être contrôlé par un technicien compétent tous les deux ans, à l'exception des installations électriques et des systèmes de détection incendie qui doivent être contrôlés annuellement. Le contrôle des ascenseurs relève des dispositions particulières précisées dans le cadre de l'article AS 9 du règlement. »",
      prescrit:
        "Chapitre IV — hôtels (type O) de 5ᵉ catégorie. Trois rythmes : biennal sur l'ensemble des installations techniques, annuel sur les installations électriques et les systèmes de détection incendie, renvoi à AS 9 pour les ascenseurs. Le volet électrique est porté depuis le 2026-08-26 : il comblait un vrai trou, `elec-erp-cat1-4-annuelle` s'arrêtant aux quatre premières catégories. Le volet détection est déjà couvert par `incendie-erp-ssi-annuelle`, qui vaut pour tous les ERP. Le volet biennal est déclaré à part. Lu en première main le 2026-08-26. ~~[2026-10-07, C60] Le renvoi aux ascenseurs est porté : `ascenseur-hotel-5-verification-quinquennale-as9` et sa jumelle de remise en service. PE 1 § 1 n'ouvre le livre II en 5ᵉ que sur renvoi exprès ; celui-ci en est un.~~ [2026-10-08, C64 : les deux lignes sont supprimées avant d'avoir été servies — le préventeur borne AS 9 aux N1-N4 ; la lecture du renvoi reste en `reserve`.]",
    },
    {
      ref: "PO 1 § 3 — contrôle biennal des installations techniques",
      intitule: "Le volet biennal, qui porte sur « l'ensemble »",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      historique:
        "C51 (2026-09-27), relu par l'API Légifrance (pnpm legifrance:verifier) : versionEnVigueur 2018-01-01 → 2011-10-30 : la version en vigueur date du 30 octobre 2011 (arrêté du 26 octobre 2011, lien MODIFICATION « (V) ») ; l'API ne connaît aucune version du 1er janvier 2018 pour cet article. Texte inchangé.\n\n2026-10-13 — ENCODÉE, décision de la propriétaire : l'hôtel entre dans la cible redéfinie le 2026-10-12, et le chapitre PO est le seul de ses manques à être encodé (exception à « encodage terminé »). Portée par `incendie-hotel-po-controle-biennal-installations`. L'entrée quand elle était `obligation_manquante` (2026-08-26 → 2026-10-13), cause `a_trancher` (`perimetre` jusqu'au 2026-10-12) : ~~« L'ensemble des installations techniques doit être contrôlé par un technicien compétent tous les deux ans. » Le référentiel ne sait pas porter « l'ensemble » : une obligation s'accroche à des catégories d'équipement énumérées, et énumérer reviendrait à décider à la place du texte ce qu'est une installation technique d'hôtel. Deux catégories plausibles — VMC et installation frigorifique — portent déjà une obligation BIENNALE valant pour tous les ERP : une ligne supplémentaire y ferait doublon. Cinquième occurrence du motif PE 4 § 2. Les ascenseurs sont explicitement exclus par le renvoi à AS 9.~~ — Son blocage : ~~porteur-d-echeance-hors-equipement — LEVÉ depuis le 2026-08-27 : l'ADR-022 a donné à l'établissement le rôle de porteur, et `PE 4 § 2` s'en sert. Ce qui retient cette ligne n'est plus technique : elle vise les HÔTELS (chapitre PO), hors de la cible du produit — d'où `cause: \"perimetre\"`. Rayé le 2026-09-20 ; la raison de non-encodage était restée écrite trois semaines après avoir cessé d'être vraie (règle 11 de `CLAUDE.md`). [2026-10-12 : ~~hors de la cible du produit~~ — la cible est désormais ce que l'onboarding ne refuse pas, et un hôtel de cinquante travailleurs au plus y entre. La cause passe de `perimetre` à `a_trancher` : la ligne rejoint les manques à classer selon la grille C45, sans être encodée.]~~",
      // 2026-10-13, revue : la citation, encore vraie, ne vivait plus que barrée dans `historique`.
      citationCle:
        "« L'ensemble des installations techniques doit être contrôlé par un technicien compétent tous les deux ans, à l'exception des installations électriques et des systèmes de détection incendie qui doivent être contrôlés annuellement. »",
      statut: "retenu",
      obligations: ["incendie-hotel-po-controle-biennal-installations"],
    },
    {
      ref: "PO 7",
      intitule: "Instruction et entraînement du personnel, deux fois par an",
      versionEnVigueur: "2011-10-30",
      // ~~luLe: "2026-08-26", lecture: "premiere_main"~~ — relu le 2026-10-13
      // par l'API (LEGIARTI000024770976).
      luLe: "2026-10-13",
      lecture: "api_legifrance",
      historique:
        "C51 (2026-09-27), relu par l'API Légifrance (pnpm legifrance:verifier) : versionEnVigueur 2018-01-01 → 2011-10-30 : la version en vigueur date du 30 octobre 2011 (arrêté du 26 octobre 2011, lien MODIFICATION « (V) ») ; l'API ne connaît aucune version du 1er janvier 2018 pour cet article. Texte inchangé.\n\n2026-10-13 — ENCODÉE, décision de la propriétaire : l'hôtel entre dans la cible redéfinie le 2026-10-12, et le chapitre PO est le seul de ses manques à être encodé (exception à « encodage terminé »). Portée par `incendie-hotel-po-instruction-personnel-semestrielle`. L'entrée quand elle était `obligation_manquante` (2026-08-26 → 2026-10-13), cause `a_trancher` (`perimetre` jusqu'au 2026-10-12) : ~~« Le personnel doit participer deux fois par an à des séances d'instruction et d'entraînement de façon compatible avec les conditions d'exploitation, compte tenu, le cas échéant, de son rythme saisonnier. » Périodicité chiffrée, donc encodable — mais l'obligation ne porte sur AUCUN équipement, et toute obligation du référentiel s'accroche aujourd'hui à une catégorie d'équipement. C'est le même blocage que PE 27 § 5 et R. 4544-11-1. Verbatim relevé en première main le 2026-08-26.~~ — Son blocage : ~~porteur-d-echeance-hors-equipement — LEVÉ depuis le 2026-08-27 : l'ADR-022 a donné à l'établissement le rôle de porteur, et `PE 4 § 2` s'en sert. Ce qui retient cette ligne n'est plus technique : elle vise les HÔTELS (chapitre PO), hors de la cible du produit — d'où `cause: \"perimetre\"`. Rayé le 2026-09-20 ; la raison de non-encodage était restée écrite trois semaines après avoir cessé d'être vraie (règle 11 de `CLAUDE.md`). [2026-10-12 : ~~hors de la cible du produit~~ — la cible est désormais ce que l'onboarding ne refuse pas, et un hôtel de cinquante travailleurs au plus y entre. La cause passe de `perimetre` à `a_trancher` : la ligne rejoint les manques à classer selon la grille C45, sans être encodée.]~~\n\n2026-10-13 — relu par l'API Légifrance (pnpm legifrance:verifier, environnement BAC À SABLE, égalité avec la production non vérifiée) : citation, version en vigueur (2011-10-30) — OK. Rapport : docs/revues/verification-legifrance-2026-10-13-selection.md.",
      // 2026-10-13, revue : la citation, encore vraie, ne vivait plus que barrée dans `historique`.
      citationCle:
        "« Le personnel doit participer deux fois par an à des séances d'instruction et d'entraînement de façon compatible avec les conditions d'exploitation, compte tenu, le cas échéant, de son rythme saisonnier. »",
      statut: "retenu",
      obligations: ["incendie-hotel-po-instruction-personnel-semestrielle"],
    },
    {
      ref: "PO 2",
      intitule: "Halls et escaliers",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PO 3",
      intitule: "Système d'alarme",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PO 4",
      intitule: "Portes",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PO 5",
      intitule: "Utilisation du gaz dans les chambres",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PO 6",
      intitule: "Détection automatique d'incendie",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PO 8",
      intitule: "Champ d'application des prescriptions aux hôtels EXISTANTS",
      versionEnVigueur: "2011-10-30",
      // ~~luLe: "2026-08-26", lecture: "premiere_main"~~ — relu le 2026-10-07
      // par l'API PISTE en BAC À SABLE (C60) : LEGIARTI000024771000, en
      // vigueur depuis le 2011-10-30. Texte inchangé.
      luLe: "2026-10-07",
      lecture: "api_legifrance",
      statut: "retenu",
      obligations: [
        "incendie-hotel-po-controle-annuel-electricite",
        // 2026-10-13 : PO 1 § 3 réimporté, volet biennal.
        "incendie-hotel-po-controle-biennal-installations",
        // ~~2026-10-07 (C60) : PO 1 (§ 3) réimporté, renvoi à AS 9 compris —
        // les deux lignes `ascenseur-hotel-5-*-as9`~~ — 2026-10-08 (C64) :
        // supprimées avant d'avoir été servies (réserve ci-dessous).
      ],
      reserve:
        "PO 1 (§ 3) EST RÉIMPORTÉ POUR LES HÔTELS EXISTANTS, RENVOI À AS 9 COMPRIS — QUESTION POSÉE AU PRÉVENTEUR ; IL BORNE AS 9 AUX N1-N4 (2026-10-08, C64). Rojer ne porte aucune ligne AS 9 pour l'hôtel de 5ᵉ catégorie, existant ou neuf ; la lecture du renvoi est consignée à PO 1.",
      citationCle:
        "« § 1. Les prescriptions définies dans la présente section sont applicables en complément des articles PE 4, PE 24, PE 26, PE 27, PE 32, PE 36, PO 1 (§ 3) et PO 5. »",
      prescrit:
        "Ferme une question restée ouverte. PO 1 § 3 figure dans la section 1, intitulée « Prescriptions applicables aux établissements à construire ou à modifier » — on pouvait craindre que ses périodicités ne visent que les hôtels neufs. PO 8 § 1 ouvre la section 2, « Prescriptions applicables aux établissements existant », et y réimporte PO 1 (§ 3) NOMMÉMENT. Le contrôle annuel des installations électriques vaut donc pour TOUS les hôtels. Le § 3 impose en outre au chef d'établissement, lorsqu'une prescription ne peut être appliquée pour raisons architecturales, de proposer des solutions alternatives approuvées par la commission après analyse de risque — obligation nominative, sans périodicité.",
    },
    {
      ref: "PO 9",
      intitule: "Escaliers",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PO 10",
      intitule: "Isolement des locaux dangereux",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PO 11",
      intitule: "Consignes - Signalisations - Affichages",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PO 12",
      intitule: "Extension de l'instruction du personnel aux hôtels existants",
      versionEnVigueur: "2011-10-30",
      // ~~luLe: "2026-08-26", lecture: "premiere_main"~~ — relu le 2026-10-13
      // par l'API (LEGIARTI000024771138).
      luLe: "2026-10-13",
      lecture: "api_legifrance",
      // 2026-10-13, revue : la citation, encore vraie, ne vivait plus que barrée dans `historique`.
      citationCle:
        "« Les dispositions des articles PE 27 (§ 5) et PO 7 sont applicables. »",
      statut: "retenu",
      obligations: ["incendie-hotel-po-instruction-personnel-semestrielle"],
      historique:
        "2026-10-13 — ENCODÉE, décision de la propriétaire : l'hôtel entre dans la cible redéfinie le 2026-10-12, et le chapitre PO est le seul de ses manques à être encodé (exception à « encodage terminé »). Portée par `incendie-hotel-po-instruction-personnel-semestrielle`. L'entrée quand elle était `obligation_manquante` (2026-08-26 → 2026-10-13), cause `a_trancher` (`perimetre` jusqu'au 2026-10-12) : ~~« Les dispositions des articles PE 27 (§ 5) et PO 7 sont applicables. » Symétrique de PO 8 § 1 pour la formation : PO 7 — deux séances d'instruction et d'entraînement du personnel par an — est réimporté nommément dans le régime des établissements EXISTANTS. La périodicité vaut donc pour tous les hôtels, pas seulement les neufs. Même blocage que PO 7 lui-même : l'obligation ne porte sur aucun équipement.~~ — Son blocage : ~~porteur-d-echeance-hors-equipement — LEVÉ depuis le 2026-08-27 : l'ADR-022 a donné à l'établissement le rôle de porteur, et `PE 4 § 2` s'en sert. Ce qui retient cette ligne n'est plus technique : elle vise les HÔTELS (chapitre PO), hors de la cible du produit — d'où `cause: \"perimetre\"`. Rayé le 2026-09-20 ; la raison de non-encodage était restée écrite trois semaines après avoir cessé d'être vraie (règle 11 de `CLAUDE.md`). [2026-10-12 : ~~hors de la cible du produit~~ — la cible est désormais ce que l'onboarding ne refuse pas, et un hôtel de cinquante travailleurs au plus y entre. La cause passe de `perimetre` à `a_trancher` : la ligne rejoint les manques à classer selon la grille C45, sans être encodée.]~~\n\n2026-10-13 — relu par l'API Légifrance (pnpm legifrance:verifier, environnement BAC À SABLE, égalité avec la production non vérifiée) : citation, version en vigueur (2011-10-30) — OK. Rapport : docs/revues/verification-legifrance-2026-10-13-selection.md.",
    },
    {
      ref: "PO 13",
      intitule: "Très petits hôtels existants — un seuil à double effet",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "non_couvert",
      motif:
        "Définit le « très petit hôtel » : « un établissement qui accueille 20 personnes au plus au titre du public dans les chambres et dont le plancher bas de l'étage le plus élevé accessible au public est situé à moins de 8 mètres du niveau d'accès des secours ». Ce seuil n'est PAS un régime allégé : il ouvre des atténuations (dispense d'encloisonnement des escaliers, dispense de BAEH) mais aussi une AGGRAVATION — « En aggravation de l'article PE 32, la détection automatique d'incendie est installée dans les circulations horizontales lorsqu'elles existent et dans tous les locaux, à l'exception des sanitaires. » L'exploitant qui renonce à l'encloisonnement hérite d'une détection généralisée. Aucune périodicité, mais un attribut d'établissement de plus que le modèle ne porte, distinct de « locaux à sommeil ».",
      declareA: "docs/veille-arbitrage-2026-08-26.md",
    },
    {
      ref: "Annexe à l'article PO 11",
      intitule: "Conduite à tenir en cas d'incendie",
      versionEnVigueur: "2011-10-30",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "non_couvert",
      motif:
        "Chapitre IV — règles spécifiques aux hôtels (type O), établissements de 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission : contrôle biennal des installations techniques, annuel pour l'électricité et la détection, et deux séances d'instruction du personnel par an. Un très petit hôtel est exactement le genre de TPE que le produit sait servir par ailleurs — ~~le manque est un choix, pas une impossibilité~~. [2026-10-13 : les périodicités du chapitre sont portées — le biennal de PO 1 § 3 (`incendie-hotel-po-controle-biennal-installations`) et les deux séances de PO 7 (`incendie-hotel-po-instruction-personnel-semestrielle`), décision de la propriétaire ; l'annuel électrique l'était depuis le 2026-08-26. Cet article-ci, qui n'écrit aucun rythme, reste non couvert.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
    {
      ref: "PU 1",
      intitule: "Généralités",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024776408",
      versionEnVigueur: "2005-04-22",
      modifiePar: { texte: "Arrêté du 10 décembre 2004 (V)" },
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE : LEGIARTI000024776408, en vigueur depuis le 2005-04-22.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle: "Les prescriptions définies dans le présent chapitre sont applicables aux établissements à construire ou à modifier en complément des mesures définies dans les chapitres Ier, II et III.",
      historique: "~~`non_couvert`, lu le 2026-08-26 par un agent (`agent_verbatim`), motif commun aux six articles : « Chapitre V — petits établissements de soins (type U). Ces articles n'imposent aucune échéance récurrente à l'exploitant : ce sont des règles de construction et d'équipement, plus un renvoi aux articles U 51 à U 64 sur les gaz médicaux, qui n'a pas été dépouillé. Le manque de couverture porte donc surtout sur ce renvoi. » ; `declareA` : « docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`. »~~ [2026-10-16 : relu par l'API Légifrance (PISTE, bac à sable, égalité avec la production non vérifiée) avec les chapitres de types ; le renvoi de PU 5 est OUVERT — U 51 à U 64 sont lus et classés au corpus `arrete-1980-livre-2-titre-2` —, et chaque article est reclassé pour lui-même. Le statut commun disait « manque de couverture » pour quatre articles qui n'imposent qu'une construction ou une dotation.]",
      statut: "sans_objet",
      motif: "Champ du chapitre V : il ne vaut que pour les petits établissements de soins (type U de 5ᵉ catégorie) « à construire ou à modifier », en complément des chapitres I à III (dont le chapitre III, locaux à sommeil). Il ne prescrit rien ; il borne PU 5, et c'est ce qui borne la proposition qui en découle.",
    },
    {
      ref: "PU 2",
      intitule: "Structures",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024776463",
      versionEnVigueur: "2005-04-22",
      modifiePar: { texte: "Arrêté du 10 décembre 2004 (V)" },
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE : LEGIARTI000024776463, en vigueur depuis le 2005-04-22.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle: "En aggravation des dispositions de l'article PE 28, les structures des établissements situés à rez-de-chaussée doivent être stables au feu de degré une demi-heure ou R. 30.",
      historique: "~~`non_couvert`, lu le 2026-08-26 par un agent (`agent_verbatim`), motif commun aux six articles : « Chapitre V — petits établissements de soins (type U). Ces articles n'imposent aucune échéance récurrente à l'exploitant : ce sont des règles de construction et d'équipement, plus un renvoi aux articles U 51 à U 64 sur les gaz médicaux, qui n'a pas été dépouillé. Le manque de couverture porte donc surtout sur ce renvoi. » ; `declareA` : « docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`. »~~ [2026-10-16 : relu par l'API Légifrance (PISTE, bac à sable, égalité avec la production non vérifiée) avec les chapitres de types ; le renvoi de PU 5 est OUVERT — U 51 à U 64 sont lus et classés au corpus `arrete-1980-livre-2-titre-2` —, et chaque article est reclassé pour lui-même. Le statut commun disait « manque de couverture » pour quatre articles qui n'imposent qu'une construction ou une dotation.]",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif: "Règle de construction de l'ouvrage, en aggravation du chapitre II (PE 28, PE 11) : l'exploitant ne la refait ni ne la constate à date.",
    },
    {
      ref: "PU 3",
      intitule: "Escaliers",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024776468",
      versionEnVigueur: "2005-04-22",
      modifiePar: { texte: "Arrêté du 10 décembre 2004 (V)" },
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE : LEGIARTI000024776468, en vigueur depuis le 2005-04-22.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle: "En aggravation des dispositions de l'article PE 11, les escaliers des établissements comportant des locaux à sommeil doivent avoir 1,40 mètre de largeur.",
      historique: "~~`non_couvert`, lu le 2026-08-26 par un agent (`agent_verbatim`), motif commun aux six articles : « Chapitre V — petits établissements de soins (type U). Ces articles n'imposent aucune échéance récurrente à l'exploitant : ce sont des règles de construction et d'équipement, plus un renvoi aux articles U 51 à U 64 sur les gaz médicaux, qui n'a pas été dépouillé. Le manque de couverture porte donc surtout sur ce renvoi. » ; `declareA` : « docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`. »~~ [2026-10-16 : relu par l'API Légifrance (PISTE, bac à sable, égalité avec la production non vérifiée) avec les chapitres de types ; le renvoi de PU 5 est OUVERT — U 51 à U 64 sont lus et classés au corpus `arrete-1980-livre-2-titre-2` —, et chaque article est reclassé pour lui-même. Le statut commun disait « manque de couverture » pour quatre articles qui n'imposent qu'une construction ou une dotation.]",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif: "Règle de construction de l'ouvrage, en aggravation du chapitre II (PE 28, PE 11) : l'exploitant ne la refait ni ne la constate à date.",
    },
    {
      ref: "PU 4",
      intitule: "Fonctionnement des portes",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024776472",
      versionEnVigueur: "2005-04-22",
      modifiePar: { texte: "Arrêté du 10 décembre 2004 (V)" },
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE : LEGIARTI000024776472, en vigueur depuis le 2005-04-22.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      // 2026-10-17 (revue de `lot/ref-a-corpus-titre-1`) : citation recoupée à
      // l'intérieur du texte — ~~« 1. Dans certains … ferme-porte. »~~ —, la
      // normalisation de `legifrance:verifier` ramenant « 1. » à « 1° » et
      // retirant le point final côté officiel, mais pas aux bords d'une citation.
      citationCle: "Dans certains établissements réservés aux enfants et aux adolescents ou dans les centres spécialisés (centre de psychiatrie ou de traitement des toxicomanes, par exemple), les locaux ou les unités de soins peuvent être maintenus exceptionnellement fermés dans les conditions fixées à l'article U 21. 2. En dérogation à l'article PE 29 (alinéa 3), les portes des locaux réservés au sommeil peuvent ne pas être munies de ferme-porte",
      historique: "~~`non_couvert`, lu le 2026-08-26 par un agent (`agent_verbatim`), motif commun aux six articles : « Chapitre V — petits établissements de soins (type U). Ces articles n'imposent aucune échéance récurrente à l'exploitant : ce sont des règles de construction et d'équipement, plus un renvoi aux articles U 51 à U 64 sur les gaz médicaux, qui n'a pas été dépouillé. Le manque de couverture porte donc surtout sur ce renvoi. » ; `declareA` : « docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`. »~~ [2026-10-16 : relu par l'API Légifrance (PISTE, bac à sable, égalité avec la production non vérifiée) avec les chapitres de types ; le renvoi de PU 5 est OUVERT — U 51 à U 64 sont lus et classés au corpus `arrete-1980-livre-2-titre-2` —, et chaque article est reclassé pour lui-même. Le statut commun disait « manque de couverture » pour quatre articles qui n'imposent qu'une construction ou une dotation.]",
      // ~~statut: "hors_perimetre", exclusion: "construction"~~ — 2026-10-17, revue
      // indépendante : le motif invoque la ligne de partage 1 (une faculté et ses
      // conditions), comme U 21, classé `sans_objet`.
      statut: "sans_objet",
      motif: "Verrouillage exceptionnel des unités de soins aux conditions de U 21, et dérogation au ferme-porte des chambres (PE 29) : des conditions d'aménagement, ligne de partage 1. U 21 est classé au corpus du titre II.",
    },
    {
      ref: "PU 5",
      intitule: "Conditions d'installation des gaz médicaux",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024776480",
      versionEnVigueur: "2005-04-22",
      modifiePar: { texte: "Arrêté du 10 décembre 2004 (V)" },
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE : LEGIARTI000024776480, en vigueur depuis le 2005-04-22.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle: "Les articles U 51 à U 64 du règlement de sécurité des établissements recevant du public sont applicables.",
      historique: "~~`non_couvert`, lu le 2026-08-26 par un agent (`agent_verbatim`), motif commun aux six articles : « Chapitre V — petits établissements de soins (type U). Ces articles n'imposent aucune échéance récurrente à l'exploitant : ce sont des règles de construction et d'équipement, plus un renvoi aux articles U 51 à U 64 sur les gaz médicaux, qui n'a pas été dépouillé. Le manque de couverture porte donc surtout sur ce renvoi. » ; `declareA` : « docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`. »~~ [2026-10-16 : relu par l'API Légifrance (PISTE, bac à sable, égalité avec la production non vérifiée) avec les chapitres de types ; le renvoi de PU 5 est OUVERT — U 51 à U 64 sont lus et classés au corpus `arrete-1980-livre-2-titre-2` —, et chaque article est reclassé pour lui-même. Le statut commun disait « manque de couverture » pour quatre articles qui n'imposent qu'une construction ou une dotation.]",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      // ~~toucheLaCible: true~~ — 2026-10-17, filtre à l'accueil.
      toucheLaCible: false,
      motif: "RENVOI EXPRÈS au livre II (au sens de PE 1 § 1) : la section des gaz médicaux du type U s'applique aux petits établissements de soins de 5ᵉ catégorie « à construire ou à modifier » (PU 1). Elle porte deux actes de l'exploitant : la vérification ANNUELLE écrite des stockages et installations de distribution (U 64 § 2) et les consignes « rappelées périodiquement » au personnel, affichées près des magasins et des centrales (U 62, défaut annuel ADR-039). Les autres articles (U 51 à U 61, U 63) sont de l'installation et de l'usage, classés au corpus du titre II. TPE CONCERNÉE : par construction — un établissement de soins sous les seuils de U 1 (moins de 20 lits, moins de 100 personnes simultanées). Proposition : la ligne d'équipement annuelle et la ligne de consignes proposées pour U 64 et U 62 (types J et U, catégories 1 à 4), étendues à U en 5ᵉ catégorie ; la borne « à construire ou à modifier » ne se lit pas dans le modèle (aucune date de permis ni de travaux), et l'appliquer à tout U de 5ᵉ sur-appliquerait à l'établissement ancien non modifié — sens d'erreur à trancher avec la ligne. [2026-10-17, sous-lot B du plan « mise à jour du référentiel » (§ 3), validé par la propriétaire : HORS CADRE (§ 7 de `docs/couverture-declaree-du-produit.md`) — ~~la catégorie d'équipement « gaz médicaux » proposée~~ n'est pas créée. L'article reste `obligation_manquante` ; rien n'est encodé ni annoncé.] [2026-10-17, lot « filtre à l'accueil » (`etablissements/types-refuses.ts`, décision de la propriétaire) : `toucheLaCible` passe à `false` — le filtre à l'accueil refuse le type U ; seuls des établissements que l'onboarding refuse y sont soumis. L'obligation reste au compte.]",
      bloquePar: "Aucune catégorie d'équipement ne désigne une installation ou un stockage de gaz médicaux ; et la borne « à construire ou à modifier » de PU 1 n'a pas d'attribut.",
    },
    {
      ref: "PU 6",
      intitule: "Détection automatique d'incendie et système d'alarme",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024776491",
      versionEnVigueur: "2005-04-22",
      modifiePar: { texte: "Arrêté du 10 décembre 2004 (V)" },
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE : LEGIARTI000024776491, en vigueur depuis le 2005-04-22.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle: "L'alarme qui peut être générale ou générale sélective, doit pouvoir être reçue de façon permanente par le personnel soignant qui aura été préalablement formé à la mise en œuvre des moyens de défense contre l'incendie et à l'alerte des sapeurs-pompiers.",
      historique: "~~`non_couvert`, lu le 2026-08-26 par un agent (`agent_verbatim`), motif commun aux six articles : « Chapitre V — petits établissements de soins (type U). Ces articles n'imposent aucune échéance récurrente à l'exploitant : ce sont des règles de construction et d'équipement, plus un renvoi aux articles U 51 à U 64 sur les gaz médicaux, qui n'a pas été dépouillé. Le manque de couverture porte donc surtout sur ce renvoi. » ; `declareA` : « docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`. »~~ [2026-10-16 : relu par l'API Légifrance (PISTE, bac à sable, égalité avec la production non vérifiée) avec les chapitres de types ; le renvoi de PU 5 est OUVERT — U 51 à U 64 sont lus et classés au corpus `arrete-1980-livre-2-titre-2` —, et chaque article est reclassé pour lui-même. Le statut commun disait « manque de couverture » pour quatre articles qui n'imposent qu'une construction ou une dotation.]",
      statut: "obligation_manquante",
      cause: "libre",
      // ~~toucheLaCible: true~~ — 2026-10-17, filtre à l'accueil.
      toucheLaCible: false,
      motif: "Détection dans tous les locaux et indicateurs d'action : DOTATION. Le seul acte : le personnel soignant « préalablement formé à la mise en œuvre des moyens de défense contre l'incendie et à l'alerte des sapeurs-pompiers ». C'est l'acte de PE 27 § 5 (« instruit sur les conduites à tenir en cas d'incendie et […] entraîné à la manœuvre des moyens de secours »), que `incendie-erp-5-instruction-personnel` sert déjà à tout ERP de 5ᵉ catégorie hors type O — le petit établissement de soins compris. Rien à créer : ajouter PU 6 en référence de contexte de cette ligne. Il ne vaut que pour les établissements avec locaux réservés au sommeil, à construire ou à modifier (PU 1). [2026-10-17, lot « filtre à l'accueil » (`etablissements/types-refuses.ts`, décision de la propriétaire) : `toucheLaCible` passe à `false` — le filtre à l'accueil refuse le type U ; seuls des établissements que l'onboarding refuse y sont soumis. L'obligation reste au compte.]",
      bloquePar: "Rien ne bloque : une référence à ajouter à une ligne existante. Lecture du 2026-10-16, rien n'est encodé.",
    },
    {
      ref: "PX 1",
      intitule: "Établissements sportifs — dispositions applicables",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024776628",
      versionEnVigueur: "2001-03-20",
      modifiePar: { texte: "Arrêté du 20 novembre 2000, v. init." },
      // ~~luLe: "2026-08-26", lecture: "agent_verbatim"~~ — relu le 2026-10-16 par l'API PISTE en BAC À SABLE : LEGIARTI000024776628, en vigueur depuis le 2001-03-20.
      luLe: "2026-10-16",
      lecture: "api_legifrance",
      citationCle:
        "En complément des dispositions des chapitres Ier et II du présent livre, les dispositions techniques du chapitre XII, livre II, visant les établissements du premier groupe, sont applicables aux établissements du 2e groupe.",
      statut: "non_couvert",
      motif:
        "Chapitre VI — établissements sportifs. Article de pur renvoi qui importe tout le chapitre XII du Livre II~~, non dépouillé~~ [2026-10-16 : le chapitre XII (type X) est lu en entier et classé au corpus `arrete-1980-livre-2-titre-2`. Ce que le renvoi importe en 5ᵉ catégorie : des règles de construction et de dotation, le traitement des eaux des piscines (exclusion `risque_specialise`), et un seul acte, l'interdiction de fumer rappelée par une signalisation (X 25), ~~à évaluer~~ — si c'est une « disposition technique » au sens du renvoi, elle vaut aussi pour la petite salle de sport] [2026-10-17, sous-lot D, décision de c6 : X 25 est retenu en catégories 1 à 4 seulement (`incendie-erp-interdiction-fumer-affichee`) ; la question du renvoi reste ouverte, écrite en réserve de X 25, et la ligne n'est pas étendue à la 5ᵉ]. ~~Les équipements sportifs figurent par ailleurs parmi les risques spécialisés que le produit déclare ne pas traiter.~~ [2026-10-17, sous-lot B : ils sortent de l'exclusion `risque_specialise` ; les piscines y restent.]",
      declareA:
        "docs/couverture-declaree-du-produit.md — NOTE INTERNE, pas une annonce à l'exploitant. Cet article a été nommé à l'écran, sur le tableau de bord de chaque établissement, du 2026-08-28 au soir du même jour ; la surface a été retirée par décision produit — déclarer ce que le produit ne couvre pas suppose d'avoir tranché ce qu'il couvre. Le document dit l'histoire et ce qu'il faudrait pour rendre l'annonce propre au dossier : un rattachement article → `Etablissement.typeErp`.",
    },
  ],
};
