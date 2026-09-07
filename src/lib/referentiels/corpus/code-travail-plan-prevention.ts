// Corpus : code du travail — plan de prévention et co-activité avec une
// entreprise extérieure. Chapitre II du titre Ier du livre V, INTÉGRAL :
// seize articles sur seize, R. 4512-1 à R. 4512-16.
//
// POURQUOI CE LOT EXISTE, ET IL NE RESSEMBLE À AUCUN AUTRE. Le cliquet de
// `citations-ecran.ts` a mesuré le 2026-09-02 que quatre articles de ce
// chapitre — `R. 4512-2`, `-6`, `-7`, `-12` — s'affichaient au dirigeant sans
// qu'aucun corpus les ait ouverts. Ailleurs, une citation orpheline est un
// NUMÉRO d'article. Ici, l'écran `plan-prevention/page.tsx` montre en plus un
// EXTRAIT ENTRE GUILLEMETS de l'arrêté du 19 mars 1993, et cet extrait ne
// venait d'aucun relevé : personne, dans ce dépôt, n'avait ouvert le texte
// qu'il fait lire au dirigeant.
//
// RÉSULTAT PRINCIPAL, ET IL EST RASSURANT : L'EXTRAIT EST EXACT. Recopié mot
// à mot, ponctuation comprise, de l'article 1er de l'arrêté du 19 mars 1993
// dans sa version consolidée en vigueur, relevée sur Légifrance le 2026-09-02
// (LEGIARTI000029720328). Y compris le « R. 4512-7 » qu'il cite, qui surprend
// sur un texte de 1993 : Légifrance porte la substitution opérée par le décret
// n° 2008-244 du 7 mars 2008, jusque dans le titre de l'arrêté. La version
// d'origine au Journal officiel, elle, vise « l'article R. 237-8 », et son
// visa le vise encore aujourd'hui. Les deux se lisent, aucun n'est faux ; le
// produit affiche la version consolidée, qui est la bonne.
//
// CE QUI N'EST PAS EXACT, ET QUI EST L'AUTRE VERBATIM DE LA FAMILLE. Le
// chapeau de la section « Inspection commune préalable » de
// `FormulairePlanPrevention.tsx` cite `R. 4512-2` entre guillemets et
// s'arrête à « mis à disposition ». Le texte écrit « mis à disposition DES
// ENTREPRISES EXTÉRIEURES ». Trois mots retirés sans points de suspension :
// le sens survit, la promesse des guillemets non. Corrigé le 2026-09-02, sur
// le verbatim relevé ici.
//
// LE SEUIL EST BON, ET LA MOITIÉ QU'ON OUBLIE AUSSI. `R. 4512-7` 1° écrit
// « égal au moins à 400 heures sur une période inférieure ou égale à douze
// mois » : le `>=` de `plan-prevention/schema.ts` est le bon opérateur, et
// « sur une période d'au plus 12 mois » de l'écran dit bien ce que le texte
// dit. Son 2° renvoie bien à une liste de travaux dangereux fixée par arrêté,
// et l'arrêté du 19 mars 1993 en compte vingt et un. Ce que l'écran ne dit
// pas : un plan de prévention est dû dès que l'analyse conjointe de
// `R. 4512-6` révèle un risque d'interférence, quelle que soit la durée — les
// 400 heures ne conditionnent que l'ÉCRIT. La `WhyCard` écrit « écrit
// obligatoire si… », ce qui préserve la distinction ; le reste des surfaces
// dit « le plan » là où le texte dit « le plan écrit ».
//
// LA CONDITION QUI GOUVERNE LE CHAPITRE N'EST PAS DANS LE CHAPITRE. Elle est
// au chapitre Ier, lu le même jour et NON listé ici — quatre articles sur
// douze n'auraient pas fait un corpus intégral, et il valait mieux un
// chapitre entier qu'un morceau de deux. `R. 4511-1` : le titre s'applique
// « lorsqu'une entreprise extérieure fait intervenir des travailleurs pour
// exécuter ou participer à l'exécution d'une opération, QUELLE QUE SOIT SA
// NATURE, dans un établissement d'une entreprise utilisatrice, y compris dans
// ses dépendances ou chantiers ». Aucun seuil d'effectif, aucune durée
// minimale : la plomberie d'un restaurant y est. `R. 4511-4` définit
// l'opération comme « les travaux ou prestations de services réalisés par une
// ou plusieurs entreprises afin de concourir à un même objectif ».
// `R. 4511-2` et `R. 4511-3` écartent la construction navale et les chantiers
// de bâtiment ou de génie civil soumis à la coordination de `L. 4532-2` —
// deux exclusions qui ne mordent pas sur la cible.
//
// CE CHAPITRE N'EST PAS DANS LE RÉFÉRENTIEL D'OBLIGATIONS, ET C'EST VOULU.
// `DOMAINES.co_activite` le dit en toutes lettres : le plan de prévention est
// porté par le module `PlanPrevention`, pas par une `Obligation`. AUCUN
// article de ce corpus ne peut donc être `retenu` — il n'y a pas d'obligation
// à nommer. Les articles que le module et ses écrans servent sont
// `sans_objet` ; ceux qui imposent quelque chose que ni le module ni le
// référentiel ne portent sont `obligation_manquante`. Confondre les deux
// aurait soit fait disparaître des manques réels, soit compté seize fois une
// décision de produit prise une fois.
//
// LE COMPTE A CHANGÉ LE 2026-09-07 : douze `sans_objet` et quatre
// `obligation_manquante`, contre onze et cinq à la lecture du 2026-09-02.
// `R. 4512-8` a basculé parce que le module porte désormais les cinq rubriques
// du contenu minimal — voir son entrée, et `plan-prevention/contenu-r4512-8.ts`.
//
// LE CHAPITRE V NE S'Y AJOUTE PAS, IL L'EXCLUT. `R. 4515-1` déroge
// expressément aux articles `R. 4512-2` à `R. 4512-11` pour les opérations de
// chargement et de déchargement, et `R. 4515-4` écrit que le protocole de
// sécurité « remplace » le plan de prévention. Voir
// `code-travail-co-activite.ts`, l'autre versant.
//
// `modifiePar` : renseigné sur les DEUX articles du chapitre dont la version
// en vigueur ne date pas de la recodification — `R. 4512-9` (décret
// n° 2016-1908) et `R. 4512-11` (décret n° 2021-872), relevés tous deux sur
// la fiche Légifrance de l'article. Les quatorze autres sont en vigueur au
// 1er mai 2008, date d'effet du décret n° 2008-244 du 7 mars 2008 qui a créé
// la partie réglementaire nouvelle ; l'information est portée en prose ici
// plutôt qu'article par article, parce que je n'ai pas ouvert ce décret en
// entier — c'est la recodification de toute la quatrième partie — et que la
// règle en tête de `types.ts` demande la lecture, pas la case remplie.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-02, page de
// section du chapitre puis fiche de chaque article pour l'URL et la version.

import type { Corpus } from "./types";

/** Ce que le module `PlanPrevention` porte déjà, et qui n'a rien à faire au calendrier. */
const PORTE_PAR_LE_MODULE =
  "Le plan de prévention n'est pas dans le référentiel d'obligations : il est porté par le module `PlanPrevention`, décision inscrite au domaine `co_activite` de `conformite/types.ts`. Il n'y a donc aucune `Obligation` à nommer, et rien à porter au calendrier — l'acte naît d'une opération, pas d'une échéance.";

export const CODE_TRAVAIL_PLAN_PREVENTION: Corpus = {
  id: "code-travail-plan-prevention",
  intitule:
    "Code du travail — mesures préalables à l'exécution d'une opération par une entreprise extérieure",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018491552/",
  etendue: "integral",
  portee:
    "Le chapitre II du titre Ier du livre V de la quatrième partie, en entier : les seize articles R. 4512-1 à R. 4512-16, répartis en cinq sections — dispositions générales (R. 4512-1), inspection commune préalable (R. 4512-2 à R. 4512-5), plan de prévention (R. 4512-6 à R. 4512-12), travail isolé (R. 4512-13 et R. 4512-14), information des travailleurs (R. 4512-15 et R. 4512-16). Le champ d'application vient du chapitre Ier, lu le même jour mais non listé ici : R. 4511-1 applique le titre dès qu'une entreprise extérieure fait intervenir des travailleurs pour une opération « quelle que soit sa nature » dans un établissement d'une entreprise utilisatrice, sans seuil d'effectif ni durée minimale ; R. 4511-3 en écarte les chantiers de bâtiment ou de génie civil soumis à la coordination de L. 4532-2. Quatre des seize articles s'adressent au chef de l'entreprise EXTÉRIEURE et non à l'utilisatrice, qui est l'utilisateur du produit.",
  articles: [
    {
      ref: "R. 4512-1",
      intitule: "Nouveaux sous-traitants après le début de l'intervention",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529799",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le recours à de nouveaux sous-traitants après le début de l'intervention fait recommencer, à leur égard, toutes les procédures du chapitre : inspection commune préalable, analyse conjointe des risques et plan de prévention.",
      citationCle:
        "Lorsque, après le début de l'intervention, une entreprise extérieure recourt à de nouveaux sous-traitants, les procédures prévues par le présent chapitre sont à nouveau applicables à ces derniers.",
      statut: "obligation_manquante",
      motif:
        "L'article rend caduque, pour un nouvel arrivant, la procédure déjà accomplie : un plan signé le lundi ne couvre pas le sous-traitant arrivé le jeudi, et il faut refaire l'inspection commune avec lui. Le modèle `PlanPrevention` ne connaît qu'UNE entreprise extérieure par plan — `entrepriseExterieureRaison`, un seul `efChefNom`, un seul `efEffectifIntervenant` — et aucun champ ni aucun écran ne mentionne la sous-traitance en cascade. Un plan validé reste donc affiché « signé » quand le texte le tient pour inapplicable à la moitié des gens présents sur le site. Le blocage est double : événementiel, comme R. 4141-8 et R. 4141-12 — il n'y a pas de déclencheur « événement » au modèle —, et structurel, puisque le rattachement d'un plan à plusieurs entreprises n'existe pas. C'est le manque le plus silencieux du chapitre : rien, à l'écran, ne laisse deviner qu'une question se pose.",
    },
    {
      ref: "R. 4512-2",
      intitule: "Inspection commune préalable",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529795",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Une inspection commune des lieux de travail, des installations et des matériels mis à disposition est faite préalablement à l'exécution de toute opération réalisée par une entreprise extérieure, sans condition de durée ni de nature des travaux.",
      citationCle:
        "Il est procédé, préalablement à l'exécution de l'opération réalisée par une entreprise extérieure, à une inspection commune des lieux de travail, des installations qui s'y trouvent et des matériels éventuellement mis à disposition des entreprises extérieures.",
      statut: "sans_objet",
      motif:
        `${PORTE_PAR_LE_MODULE} Le module le sert directement : \`inspectionDate\` et \`inspectionParticipants\`, une section dédiée du formulaire, et un encart de la fiche qui dit « Aucune date d'inspection commune enregistrée » tant qu'elle manque. C'est aussi l'article dont le verbatim était TRONQUÉ à l'écran : le chapeau de la section citait la phrase entre guillemets en s'arrêtant à « mis à disposition », là où le texte écrit « mis à disposition des entreprises extérieures ». Corrigé le 2026-09-02 sur le relevé ci-dessus. Autre trace de la même approximation, non corrigée parce qu'elle vit dans un commentaire de \`prisma/schema.prisma\` : le bloc \`inspectionDate\` y est annoté « (art. R4512-7) », alors que l'inspection commune est R. 4512-2 — R. 4512-7 ne porte que le seuil de l'écrit.`,
    },
    {
      ref: "R. 4512-3",
      intitule: "Ce que le chef de l'entreprise utilisatrice fait pendant l'inspection",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529793",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Au cours de l'inspection commune, le chef de l'entreprise utilisatrice délimite le secteur d'intervention, matérialise les zones dangereuses, indique les voies de circulation et définit les voies d'accès aux locaux mis à disposition.",
      citationCle:
        "Au cours de l'inspection commune préalable, le chef de l'entreprise utilisatrice : 1° Délimite le secteur de l'intervention des entreprises extérieures ; 2° Matérialise les zones de ce secteur qui peuvent présenter des dangers pour les travailleurs ; 3° Indique les voies de circulation que pourront emprunter ces travailleurs ainsi que les véhicules et engins de toute nature appartenant aux entreprises extérieures ; 4° Définit les voies d'accès de ces travailleurs aux locaux et installations à l'usage des entreprises extérieures prévus à l'article R. 4513-8.",
      statut: "sans_objet",
      motif:
        "Article de CONTENU de l'inspection que R. 4512-2 impose, et non un acte distinct : il énumère les quatre gestes du chef d'établissement pendant la visite, tous accomplis le même jour, dans le même déplacement. Aucune échéance propre, aucune pièce à produire.\n\nCE MOTIF S'APPUYAIT SUR R. 4512-8, ET CETTE BÉQUILLE EST RETIRÉE LE 2026-09-07. La rédaction du 2026-09-02 renvoyait le manque ailleurs : ce que le module ne collecte pas — la délimitation du secteur, la matérialisation des zones dangereuses — était « le même écart de contenu que porte l'entrée `obligation_manquante` de R. 4512-8 », et le dédoubler aurait compté deux fois un seul manque. L'argument tenait tant que R. 4512-8 comptait un manque. Il ne le compte plus : le module sert ses cinq rubriques depuis ce jour, et AUCUNE des cinq ne recouvre les quatre gestes de cet article-ci — ni la délimitation du secteur, ni le balisage des zones, ni les voies de circulation, ni les voies d'accès de R. 4513-8. Laisser la phrase en l'état aurait fait pointer un renvoi vers une case désormais vide, ce qui est la façon la plus discrète de perdre un manque.\n\nCE QUI FONDE LE CLASSEMENT SANS BÉQUILLE, et c'est celui de R. 4512-4 et R. 4512-5 : les quatre gestes sont des ACTES MATÉRIELS accomplis sur place pendant la visite — on délimite, on balise, on montre un chemin. Le texte n'exige ni écrit, ni date, ni conservation, et ne dit pas ce qu'un outil devrait en détenir. Rien ne se date, donc rien ne se porte au calendrier ; rien ne se prouverait par une pièce déposée. Le compter comme un défaut de couverture supposerait de savoir ce que le produit devrait montrer, et le texte ne le dit pas — c'est exactement la limite que ce corpus s'interdit de franchir.",
    },
    {
      ref: "R. 4512-4",
      intitule: "Communication des consignes de sécurité",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529791",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le chef de l'entreprise utilisatrice communique aux chefs des entreprises extérieures ses consignes de sécurité applicables aux travailleurs chargés d'exécuter l'opération, y compris durant leurs déplacements.",
      citationCle:
        "Le chef de l'entreprise utilisatrice communique aux chefs des entreprises extérieures ses consignes de sécurité applicables aux travailleurs chargés d'exécuter l'opération, y compris durant leurs déplacements.",
      statut: "sans_objet",
      motif:
        "Acte de communication entre employeurs, accompli à l'occasion de l'inspection commune et sans forme imposée : le texte n'exige ni écrit, ni date, ni conservation. Rien ne se date, donc rien ne se porte au calendrier, et rien ne se prouverait par une pièce déposée. Le consigner comme un manque de couverture supposerait de savoir ce que l'outil devrait détenir, et le texte ne le dit pas.",
    },
    {
      ref: "R. 4512-5",
      intitule: "Échange d'informations entre employeurs",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529789",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les employeurs se communiquent toutes les informations nécessaires à la prévention des risques, notamment la description des travaux, des matériels utilisés et des modes opératoires.",
      citationCle:
        "Les employeurs se communiquent toutes informations nécessaires à la prévention des risques, notamment la description des travaux à accomplir, des matériels utilisés et des modes opératoires dès lors qu'ils ont une incidence sur la santé et la sécurité.",
      statut: "sans_objet",
      motif:
        "Obligation réciproque et sans forme, comme R. 4512-4 : elle décrit la matière de l'échange préalable, pas un livrable. Le module en garde d'ailleurs la trace utile — `naturesTravaux`, au moins dix caractères et jusqu'à quatre mille, est la description des travaux que cet article fait circuler. Aucune échéance, aucune pièce distincte.",
    },
    {
      ref: "R. 4512-6",
      intitule: "Analyse conjointe des risques et plan de prévention",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529785",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les chefs des entreprises utilisatrice et extérieures analysent en commun les risques d'interférence au vu de l'inspection commune ; lorsque ces risques existent, ils arrêtent d'un commun accord, avant le début des travaux, un plan de prévention définissant les mesures de chacun.",
      citationCle:
        "Au vu des informations et éléments recueillis au cours de l'inspection commune préalable, les chefs des entreprises utilisatrice et extérieures procèdent en commun à une analyse des risques pouvant résulter de l'interférence entre les activités, installations et matériels. Lorsque ces risques existent, les employeurs arrêtent d'un commun accord, avant le début des travaux, un plan de prévention définissant les mesures prises par chaque entreprise en vue de prévenir ces risques.",
      statut: "sans_objet",
      motif:
        `${PORTE_PAR_LE_MODULE} C'est l'article FONDATEUR du module, et celui que la fiche de plan cite en pastille : les lignes risque ↔ mesure de l'entreprise utilisatrice ↔ mesure de l'entreprise extérieure sont la transcription littérale de son second alinéa, avec au moins une ligne exigée. À noter parce que les écrans ne le disent qu'à demi : c'est ICI que naît le plan, dès qu'un risque d'interférence existe et quelle que soit la durée. R. 4512-7 ne conditionne que son passage à l'ÉCRIT.`,
    },
    {
      ref: "R. 4512-7",
      intitule: "Cas où le plan de prévention est établi par écrit",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529783",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le plan est établi par écrit et arrêté avant le commencement des travaux dans deux cas : au moins 400 heures de travail prévisibles sur une période inférieure ou égale à douze mois, ou travaux figurant sur la liste de travaux dangereux fixée par arrêté, quelle que soit la durée.",
      citationCle:
        "Le plan de prévention est établi par écrit et arrêté avant le commencement des travaux dans les deux cas suivants : 1° Dès lors que l'opération à réaliser par les entreprises extérieures, y compris les entreprises sous-traitantes auxquelles elles peuvent faire appel, représente un nombre total d'heures de travail prévisible égal au moins à 400 heures sur une période inférieure ou égale à douze mois, que les travaux soient continus ou discontinus. Il en est de même dès lors qu'il apparaît, en cours d'exécution des travaux, que le nombre d'heures de travail doit atteindre 400 heures ; 2° Quelle que soit la durée prévisible de l'opération, lorsque les travaux à accomplir sont au nombre des travaux dangereux figurant sur une liste fixée, respectivement, par arrêté du ministre chargé du travail et par arrêté du ministre chargé de l'agriculture.",
      statut: "sans_objet",
      motif:
        "L'article du SEUIL, et le plus cité du produit — trois surfaces affichées plus le diagnostic de `plan-prevention/schema.ts`. Il ne crée pas d'obligation nouvelle : il dit dans quels cas celle de R. 4512-6 passe à l'écrit. Vérifié à la source le 2026-09-02 : « égal au moins à 400 heures sur une période inférieure ou égale à douze mois » — le `>=` du diagnostic est le bon opérateur, et « au plus 12 mois » de l'aide de saisie dit bien ce que le texte dit. Deux points que le produit ne reprend pas et qui ne sont pas des manques du référentiel : le seuil compte les heures des SOUS-TRAITANTS de l'entreprise extérieure, quand le formulaire ne demande qu'un effectif intervenant ; et il se déclenche aussi en COURS d'exécution, « dès lors qu'il apparaît que le nombre d'heures doit atteindre 400 heures », alors que le module ne recalcule rien après validation. Le second est porté par l'entrée de R. 4512-1, dont le blocage événementiel est le même.",
    },
    {
      ref: "R. 4512-8",
      intitule: "Contenu minimal du plan de prévention",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529781",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le plan comporte au moins cinq rubriques : phases d'activité dangereuses et moyens de prévention, adaptation des matériels et conditions d'entretien, instructions aux travailleurs, organisation des premiers secours, et conditions de participation des travailleurs d'une entreprise aux travaux d'une autre.",
      citationCle:
        "Les mesures prévues par le plan de prévention comportent au moins les dispositions suivantes : 1° La définition des phases d'activité dangereuses et des moyens de prévention spécifiques correspondants ; 2° L'adaptation des matériels, installations et dispositifs à la nature des opérations à réaliser ainsi que la définition de leurs conditions d'entretien ; 3° Les instructions à donner aux travailleurs ; 4° L'organisation mise en place pour assurer les premiers secours en cas d'urgence et la description du dispositif mis en place à cet effet par l'entreprise utilisatrice ; 5° Les conditions de la participation des travailleurs d'une entreprise aux travaux réalisés par une autre en vue d'assurer la coordination nécessaire au maintien de la sécurité et, notamment, de l'organisation du commandement.",
      statut: "sans_objet",
      motif:
        `${PORTE_PAR_LE_MODULE} PORTÉ DEPUIS LE 2026-09-07, ET IL NE L'ÉTAIT PAS DU TOUT AVANT. C'était le manque le plus opposable du lot, parce que Rojer ÉMET le document : un plan produit par l'outil et présenté à un inspecteur doit porter les cinq rubriques, et le modèle n'en portait AUCUNE. Le module collecte désormais les cinq — \`PhaseDangereuse\` pour le 1° (une relation, parce que le texte apparie les phases « ET les moyens de prévention spécifiques CORRESPONDANTS », qu'un bloc de prose aurait dissociés), et quatre colonnes de texte pour les 2° à 5°. Le formulaire les saisit, la fiche les rend, et le fichier \`07_Plans_de_prevention.txt\` du ZIP de contrôle les imprime.\n\nCINQ ET NON QUATRE, ET C'EST UNE DÉCISION, PAS UNE ÉVIDENCE. La première lecture de ce corpus, le 2026-09-02, comptait le 1° comme couvert par les lignes risque ↔ mesures et n'appelait qu'« un formulaire à quatre champs près ». La lecture stricte a été retenue le 2026-09-07 : ces lignes transcrivent le second alinéa de R. 4512-6 — les risques « pouvant résulter de l'INTERFÉRENCE entre les activités » —, quand le 1° de R. 4512-8 vise les phases dangereuses de l'opération elle-même, qui existent sans co-activité. Les compter pour une seule rubrique aurait fait porter à l'une le contenu de l'autre.\n\nCE QUI RESTE, ET QUI N'EST PAS UN DÉFAUT DE CE CORPUS. Aucune rubrique n'est exigée à la saisie : le produit n'a pas de porte de validation sur les plans — toutes les écritures de statut de \`plan-prevention/actions.ts\` écrivent sans lire l'état courant —, et en poser une au seul point de création aurait bloqué la création sans rien exiger de la clôture ni des plans déjà en base. Le manque est rendu VISIBLE : la fiche compte les rubriques non renseignées et les nomme avec leur verbatim, le ZIP écrit « NON RENSEIGNÉE ». Le 4° ne se pré-remplit pas non plus, faute de source : aucun champ de \`Etablissement\` ne décrit le dispositif de secours, et R. 4224-16 est détenu par le dirigeant, pas par la base.`,
    },
    {
      ref: "R. 4512-9",
      intitule: "Liste des postes relevant du suivi individuel renforcé",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769545",
      versionEnVigueur: "2017-01-01",
      modifiePar: {
        texte: "Décret n° 2016-1908 du 27 décembre 2016 - art. 17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769545",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Chaque entreprise concernée fournit la liste des postes occupés par les travailleurs susceptibles de relever du suivi individuel renforcé en raison des risques liés aux travaux réalisés dans l'entreprise utilisatrice ; cette liste figure dans le plan de prévention.",
      citationCle:
        "Chaque entreprise concernée fournit la liste des postes occupés par les travailleurs susceptibles de relever du suivi individuel renforcé prévu par les articles R. 4624-22 à R. 4624-28 ou, s'il s'agit d'un salarié agricole, par l'article R. 717-16 du code rural et de la pêche maritime, en raison des risques liés aux travaux réalisés dans l'entreprise utilisatrice. Cette liste figure dans le plan de prévention.",
      statut: "obligation_manquante",
      motif:
        "Une pièce nommée, exigée dans le plan, et qui n'existe nulle part dans le produit : « Cette liste figure dans le plan de prévention » est une phrase impérative, pas une recommandation, et « chaque entreprise concernée » inclut l'entreprise utilisatrice pour ses propres travailleurs exposés. Aucun champ du modèle `PlanPrevention`, aucune section du formulaire, aucune ligne du PDF. Le blocage n'est pas seulement un champ manquant : le produit ne rattache aucun poste ni aucun salarié à un suivi individuel renforcé — le corpus `code-travail-sante-travail` a déjà buté sur la même absence à propos de R. 4624-28-2. Encoder la liste sans savoir qui la peuple produirait un champ vide qu'on cocherait.",
    },
    {
      ref: "R. 4512-10",
      intitule: "Répartition des charges d'entretien des locaux mis à disposition",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529777",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le plan fixe la répartition des charges d'entretien entre les entreprises extérieures dont les travailleurs utilisent les locaux et installations mis à disposition par l'entreprise utilisatrice.",
      citationCle:
        "Le plan de prévention fixe la répartition des charges d'entretien entre les entreprises extérieures dont les travailleurs utilisent les locaux et installations prévus à l'article R. 4513-8 et mis à disposition par l'entreprise utilisatrice.",
      statut: "sans_objet",
      motif:
        "Rubrique CONDITIONNELLE du plan, et la condition n'est pas remplie dans la cible ordinaire : elle ne joue que si l'entreprise utilisatrice met à disposition les locaux et installations de R. 4513-8 — vestiaires, sanitaires, restauration réservés aux intervenants —, ce qui suppose une opération longue et un site d'une taille que le produit ne sert pas. Le rattacher à `obligation_manquante` ferait porter au décompte une rubrique qui, pour un restaurant ou un commerce recevant un plombier, n'a pas d'objet. R. 4513-8 n'est pas dépouillé : il appartient au chapitre III, hors de ce corpus, et la condition d'entrée de cette rubrique serait devinée si on l'encodait.",
    },
    {
      ref: "R. 4512-11",
      intitule: "Dossiers amiante joints au plan de prévention",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025819097",
      versionEnVigueur: "2021-07-01",
      modifiePar: {
        texte: "Décret n° 2021-872 du 30 juin 2021 - art. 7",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025819097",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les dossiers techniques amiante, ou le cas échéant le rapport de repérage avant travaux, sont joints au plan de prévention.",
      citationCle:
        "Les dossiers techniques regroupant les informations relatives à la recherche et à l'identification des matériaux contenant de l'amiante prévus aux articles R. 1334-29-4 à R. 1334-29-6 du code de la santé publique et à l'article R. 126-10 du code de la construction et de l'habitation ou, le cas échéant, le rapport de repérage de l'amiante prévu à l'article R. 4412-97-5 du présent code sont joints au plan de prévention.",
      statut: "obligation_manquante",
      motif:
        "Une pièce que l'entreprise utilisatrice DÉTIENT — le dossier technique amiante est celui du propriétaire ou de l'exploitant de l'immeuble — et que le texte lui fait joindre au plan. Le produit ne connaît le DTA sous aucune forme : ni type de document, ni champ, ni pièce attendue du plan de prévention, balayage de `src/` le 2026-09-02. Le manque touche la cible de plein fouet : un local commercial ou un restaurant construit avant le 1er juillet 1997 a un DTA, et l'intervention d'un plombier ou d'un électricien dans ses faux plafonds est exactement le cas que l'article vise. La version lue est celle du décret n° 2021-872, qui a substitué le renvoi à R. 126-10 du CCH à l'ancien R. 111-45 recodifié — un renvoi de plus qui aurait été mort si l'article n'avait pas été rouvert. Ce qui empêche l'encodage n'est pas le modèle mais l'absence de toute notion d'amiante dans le produit, qui déborde ce lot.",
    },
    {
      ref: "R. 4512-12",
      intitule: "Tenue à disposition du plan écrit et information de l'inspection du travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529773",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Quand le plan écrit est obligatoire, il est tenu pendant toute la durée des travaux à la disposition de l'inspection du travail et des agents de prévention, et le chef de l'entreprise utilisatrice informe par écrit l'inspection du travail de l'ouverture des travaux.",
      citationCle:
        "Lorsque l'établissement d'un plan de prévention par écrit est obligatoire, en application de l'article R. 4512-7 : 1° Ce plan est tenu, pendant toute la durée des travaux, à la disposition de l'inspection du travail, des agents de prévention des organismes de sécurité sociale et, le cas échéant, de l'Organisme professionnel de prévention du bâtiment et des travaux publics ; 2° Le chef de l'entreprise utilisatrice informe par écrit l'inspection du travail de l'ouverture des travaux.",
      statut: "obligation_manquante",
      motif:
        "LE 2° EST UNE DÉMARCHE À FAIRE, PAS UN DOCUMENT À RANGER, et c'est le seul acte du chapitre qui sorte de l'entreprise : informer par écrit l'inspection du travail de l'ouverture des travaux, à la charge du chef de l'entreprise utilisatrice, dès que l'écrit est obligatoire. Rien dans le produit ne le nomme — ni le formulaire, ni la fiche de plan, ni le ZIP de contrôle —, alors que DEUX surfaces affichent la pastille « Art. R. 4512-6 à R. 4512-12 CT » et que la prose de la pastille parle de l'établissement conjoint du plan sans dire un mot de cette démarche. Un dirigeant qui lit l'écran conclut qu'il a fini quand il a signé. Le 1° est mieux servi — le plan est stocké et exportable — mais « pendant toute la durée des travaux » suppose de savoir que les travaux ont commencé, ce que `dateDebut` donne, sans qu'aucune surface le rapproche de l'exigence. Le blocage du 2° est celui des obligations événementielles : le déclencheur est l'ouverture des travaux, et le référentiel n'a pas d'axe pour ça.",
    },
    {
      ref: "R. 4512-13",
      intitule: "Travail isolé de nuit ou en lieu isolé",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529769",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Quand l'opération se déroule de nuit, en lieu isolé, ou à un moment où l'activité de l'entreprise utilisatrice est interrompue, le chef de l'entreprise EXTÉRIEURE prend les mesures pour qu'aucun travailleur ne travaille isolément là où il ne pourrait être secouru à bref délai.",
      citationCle:
        "Lorsque l'opération est réalisée de nuit ou dans un lieu isolé ou à un moment où l'activité de l'entreprise utilisatrice est interrompue, le chef de l'entreprise extérieure intéressé prend les mesures nécessaires pour qu'aucun travailleur ne travaille isolément en un point où il ne pourrait être secouru à bref délai en cas d'accident.",
      statut: "sans_objet",
      motif:
        "L'article désigne expressément « le chef de l'entreprise extérieure intéressé » : il ne prescrit rien à l'entreprise utilisatrice, qui est l'utilisateur du produit. Même configuration que R. 4515-7 dans le corpus du protocole de sécurité, classé sans objet pour la raison inverse et symétrique — il portait sur le transporteur. L'entrée existe pour que le prochain lecteur n'ait pas à rouvrir l'article : le cas est courant chez la cible (ménage ou maintenance après fermeture d'un restaurant), et il est tentant de l'attribuer à l'exploitant qui ouvre ses locaux la nuit. Le texte ne le fait pas.",
    },
    {
      ref: "R. 4512-14",
      intitule: "Travail isolé — limitation en établissement agricole",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529767",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "En établissement agricole, R. 4512-13 ne s'applique qu'aux travaux réalisés dans les locaux de l'exploitation ou à proximité.",
      citationCle:
        "Pour les travaux accomplis dans un établissement agricole, les dispositions de l'article R. 4512-13 ne s'appliquent qu'aux travaux réalisés dans les locaux de l'exploitation, de l'entreprise ou de l'établissement ou à proximité de ceux-ci.",
      statut: "sans_objet",
      motif:
        "Article de restriction de champ, et doublement sans portée ici : il ne fait que borner R. 4512-13, lui-même adressé au chef de l'entreprise extérieure, et il ne joue qu'en établissement agricole — trois secteurs cibles, aucun agricole. Consigné plutôt qu'omis, parce qu'un corpus intégral compte ses seize articles et qu'un article sauté serait indistinguable d'un article oublié.",
    },
    {
      ref: "R. 4512-15",
      intitule: "Information des travailleurs de l'entreprise extérieure",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529763",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Avant le début des travaux et sur place, le chef de l'entreprise extérieure informe ses travailleurs des dangers spécifiques, des zones dangereuses, des protections, des voies d'accès et des issues de secours.",
      citationCle:
        "Avant le début des travaux et sur le lieu même de leur exécution, le chef de l'entreprise extérieure fait connaître à l'ensemble des travailleurs qu'il affecte à ces travaux les dangers spécifiques auxquels ils sont exposés et les mesures de prévention prises en application du présent titre.",
      statut: "sans_objet",
      motif:
        "Obligation du chef de l'entreprise EXTÉRIEURE envers ses propres salariés, comme R. 4512-13 : rien n'en découle pour l'entreprise utilisatrice. À ne pas confondre avec l'information des travailleurs de l'établissement d'accueil, qui relève du corpus `code-travail-information-travailleurs` et d'autres articles. Relevé ici parce que la section s'intitule « Information des travailleurs » et que le titre seul induit en erreur sur le destinataire.",
    },
    {
      ref: "R. 4512-16",
      intitule: "Temps d'information assimilé à du temps de travail effectif",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529761",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le temps consacré à l'information des travailleurs prévue par R. 4512-15 est assimilé à du temps de travail effectif.",
      citationCle:
        "Le temps consacré à l'information des travailleurs est assimilé à du temps de travail effectif.",
      statut: "sans_objet",
      motif:
        "Règle de qualification du temps de travail, sans destinataire distinct et sans acte : elle dit comment se compte le temps passé à l'information de R. 4512-15, article lui-même adressé à l'entreprise extérieure. Aucune échéance, aucune pièce, et le sujet relève de la paie plutôt que de la santé-sécurité opposable que le produit suit.",
    },
  ],
};
