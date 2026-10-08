/**
 * Obligations réglementaires — Stockage de matières dangereuses (P3).
 *
 * Sources primaires :
 *   - Code de l'environnement, articles L. 511-1 et s. (installations
 *     classées pour la protection de l'environnement — ICPE).
 *   - Code du travail, art. R. 4412-11 (procédures sûres de stockage et de
 *     manipulation des agents chimiques dangereux).
 *   - Arrêté du 1er juin 2015 (rubriques 4331/4734, enregistrement), art. 22,
 *     cité pour les valeurs de rétention — opposable seulement sous ce
 *     régime ICPE.
 *
 * Audit des sources 2026-08-25 : l'arrêté du 3 octobre 2010 cité auparavant
 * ne vise que les réservoirs aériens des ICPE soumises à autorisation
 * (rubrique 1432) ; il a été retiré.
 *   - Code du travail, articles R. 4412-1 et s. (prévention du risque
 *     chimique).
 *   - Code du travail, art. R. 4227-20 et s. (matières inflammables
 *     utilisées dans les locaux de travail).
 *
 * Scope MVP : stockage courant en TPE/PME (produits d'entretien, solvants,
 * bouteilles de gaz en petite quantité). Les installations soumises à
 * autorisation ou enregistrement ICPE sortent du périmètre V2 — une note
 * d'orientation est prévue pour les diriger vers un accompagnement
 * spécialisé.
 *
 * PÉRIMÈTRE RÉDUIT LE 2026-10-07 — relecture préventeur du 30/09 (« à exclure
 * sauf 3 derniers points » de la grille, p. 21), décision de la propriétaire
 * du 07/10. Restent `stockage-dangereux-fiches-donnees`,
 * ~~`stockage-dangereux-formation-personnel`~~
 * `stockage-dangereux-etablissement-formation-personnel` (2026-10-08, C64 :
 * une ligne pour l'établissement, due dès qu'un stockage est déclaré —
 * `siEquipementDeclare` ; l'ancien id est retiré, absorbé) et, au domaine signalisation,
 * `signalisation-stockage-substances-dangereuses`. Sont dans
 * `OBLIGATIONS_RETIREES`, sans absorbant : `stockage-dangereux-declaration-icpe`,
 * `stockage-dangereux-retention`, `stockage-dangereux-verification-etancheite`,
 * `stockage-dangereux-ventilation-locaux`. Les sources ci-dessus décrivent
 * l'état d'avant ; seuls R. 4412-38 et R. 4412-87 fondent encore une ligne ici
 * (2026-10-08 : L. 4141-2 donne en plus le rythme vague de la formation).
 */

import type { Obligation } from "./types";

export const obligationsStockageDangereux: Obligation[] = [
  {
    id: "stockage-dangereux-fiches-donnees",
    domaine: "stockage_dangereux",
    libelle: "Fiches de données de sécurité à jour et accessibles",
    description:
      "L'employeur veille à ce que les travailleurs aient accès aux fiches de données de sécurité (FDS) fournies par le fournisseur pour chaque substance ou mélange dangereux présent, et à ce que l'information soit actualisée à chaque changement.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4412-38 (accès des travailleurs aux fiches de données de sécurité)",
        article: "R. 4412-38",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483735/",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "fiches de données de sécurité",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["STOCKAGE_MATIERE_DANGEREUSE"],
    notesInternes: "NATURE : ÉVÉNEMENTIELLE (ADR-026). Deux titres : l'accès permanent aux fiches, et leur actualisation « à chaque changement ». La règle de résolution retient le second, qui oblige à refaire l'acte — une FDS de 2019 accessible n'est pas une FDS à jour. `pieceAttendue` nomme l'écrit, qui est ici l'obligation elle-même et non la trace d'un acte.\n\nCORRIGÉE EN ÉTAT PERMANENT LE 2026-09-04, ET LE SECOND TITRE N'ÉTAIT PAS DANS CET ALINÉA. Le fondement de cette ligne est le 2° de R. 4412-38 : « Aient accès aux fiches de données de sécurité fournies par le fournisseur des agents chimiques ». Il n'écrit rien d'autre — ni rythme, ni fait déclencheur. L'« actualisation » que la note ci-dessus retenait comme second titre est au 1°, « Reçoivent des informations sous des formes appropriées et PÉRIODIQUEMENT ACTUALISÉES sur les agents chimiques dangereux se trouvant sur le lieu de travail » : un autre alinéa, un autre objet — les informations sur les agents, non les fiches du fournisseur —, et il est DÉJÀ porté par `stockage-dangereux-formation-personnel`, encodée `echeance_recurrente` sur ce même article. Verbatim relevé sur le corpus (`code-travail-risque-chimique`, article lu le 2026-09-01, `agent_verbatim`) et contre-vérifié à la source le 2026-09-04, version en vigueur depuis le 2018-01-01, modifiée par le décret n° 2017-1819 du 29 décembre 2017.\n\nPOURQUOI LA RÈGLE DE RÉSOLUTION NE S'APPLIQUAIT PAS. L'ADR-026 § 3 arbitre entre deux titres D'UN MÊME ARTICLE portés par UNE MÊME obligation. Ici les deux titres sont deux alinéas distincts servis par deux obligations distinctes : appliquer la règle revenait à importer l'alinéa du voisin, donc à compter deux fois la même récurrence — et à priver cette ligne de toute surface, puisque `evenementielle` + `periodicite: \"autre\"` n'atteint ni le calendrier ni l'écran des états permanents.\n\nCE QUE LE 2° DÉCRIT EST UN ÉTAT À CONSTITUER PUIS À MAINTENIR, au sens exact du champ : soit les fiches sont là et accessibles, soit elles ne le sont pas. Un produit nouveau ou une fiche révisée par le fournisseur ENTRETIENNENT cet état, ils ne le refont pas — c'est vrai de tout état permanent, « un registre tenu » compris. La ligne entre donc à l'écran « Ce qui doit être en place », sous le verbe « en place », et y affiche sa `pieceAttendue`.\n\nLA DESCRIPTION N'EST PAS RÉÉCRITE, et elle dit encore « actualisée à chaque changement ». C'est le choix déjà fait pour `formation-securite-etablissement-organisation` et `formation-securite-etablissement-information` (ADR-026, § Conséquences) : une description est un texte relu, et la toucher demande de rouvrir sa relecture. Le désaccord est ici, il est daté, et c'est le verbatim qui tranche.",
  },
  {
    // 2026-10-08 (C64) : succède à `stockage-dangereux-formation-personnel`
    // (porteur équipement, `OBLIGATIONS_RETIREES`) — une ligne par
    // établissement, due dès qu'un stockage est déclaré.
    id: "stockage-dangereux-etablissement-formation-personnel",
    domaine: "stockage_dangereux",
    libelle: "Formation du personnel manipulant des matières dangereuses",
    description:
      "Les salariés qui manipulent des substances ou mélanges dangereux reçoivent une formation et des informations sur les précautions à prendre (R. 4412-38). La formation à la sécurité « est répétée périodiquement » (L. 4141-2), sans que le rythme soit fixé : Rojer retient par défaut au moins une fois par an. Pour les agents cancérogènes, mutagènes ou toxiques pour la reproduction, le texte ajoute qu'elle est « répétée régulièrement » (R. 4412-88). Une seule formation pour l'établissement, dès qu'un stockage de matières dangereuses y est déclaré.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4412-38 (agents chimiques dangereux)",
        article: "R. 4412-38",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483735/",
        versionConstatee: "2018-01-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "L. 4141-2 (formation à la sécurité « répétée périodiquement »)",
        article: "L. 4141-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903166",
        note: "« Cette formation est répétée périodiquement dans des conditions déterminées par voie réglementaire ou par convention ou accord collectif de travail. » Porte le rythme vague de la ligne (ADR-039 (b)) : de portée générale, il couvre tout travailleur, là où R. 4412-88 ne vise que les CMR (C64, 2026-10-08).",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4412-87 (agents CMR uniquement)",
        article: "R. 4412-87",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483731/",
        versionConstatee: "2018-01-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4412-88 (agents CMR uniquement : information et formation « répétées régulièrement »)",
        article: "R. 4412-88",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018530733",
        note: "« L'information et la formation à la sécurité sont adaptées à l'évolution des risques et à l'apparition de risques nouveaux. Elles sont répétées régulièrement. » Relu sur l'API Légifrance (sandbox) le 2026-10-07.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    rythmeRetenu: {
      motif: "defaut_annuel",
      periodicite: "annuelle",
      texteVague: "répétée périodiquement",
    },
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    porteur: "etablissement",
    siEquipementDeclare: ["STOCKAGE_MATIERE_DANGEREUSE"],
    notesInternes:
      "UNE LIGNE PAR ÉTABLISSEMENT, LE 2026-10-08 (C64). Le préventeur veut cette formation annuelle (« obligation annuelle de formation ») ; ce qui posait problème est l'effet d'une ligne PAR stockage déclaré — trois armoires, trois formations annuelles pour un même personnel. Décision de la propriétaire du 08/10 : « on respecte les décisions de Julien ». Nouvel identifiant : cette ligne succède à `stockage-dangereux-formation-personnel` (porteur équipement), inscrite à `OBLIGATIONS_RETIREES` avec `absorbePar` vers celle-ci. Garder l'identifiant en changeant de porteur aurait archivé les lignes d'équipement et fait naître celle-ci sans rien hériter (`succession-porteurs.test.ts`) ; le report d'échéance équipement → établissement n'est servi que pour une obligation retirée. Aucun mécanisme existant ne conditionnait une obligation d'établissement à la présence d'une catégorie (`equipementsEnContexte` est indicatif, la ligne existe sans équipement) : le modèle est étendu, `siEquipementDeclare` (types.ts, ADR-022 amendée le 2026-10-08).\n\nLE MOT VAGUE, PRIS DANS UN TEXTE QUI COUVRE LE CHAMP. R. 4412-88 (« Elles sont répétées régulièrement ») ne vise que les agents CMR ; la ligne est due à tout établissement qui déclare un stockage. `texteVague` est donc pris dans L. 4141-2, de portée générale : « Cette formation est répétée périodiquement dans des conditions déterminées par voie réglementaire ou par convention ou accord collectif de travail ». LA LECTURE, écrite pour être discutée : L. 4141-2 fait organiser « une formation pratique et appropriée à la sécurité » ; la formation aux précautions à prendre face aux agents chimiques dangereux présents (R. 4412-38 3°) en est une forme particulière — la formation à la sécurité relative aux conditions d'exécution du travail, pour le poste qui les manipule. La répétition de L. 4141-2 la couvre ; R. 4412-88 l'écrit en plus pour les CMR. Ce n'est pas un doublon de `formation-securite-etablissement-organisation` : celle-ci porte la formation générale de tout salarié, celle-là l'objet propre au risque chimique, et ne naît que d'un stockage déclaré.\n\nCALENDRIERS : ~~la version 2026-10-07.5 n'a jamais été servie, aucune ligne annuelle par stockage n'est née. En production, l'ancien identifiant était `autre` sans rythme : aucune ligne de calendrier. Reste à surveiller : une `DeclarationEtatPermanent` ou une prescription posée sur l'ancien identifiant ne suit pas le changement d'identifiant (question au rapport C64).~~ [2026-10-08, C66 : la version 2026-10-07.5 a été servie (PR #14, mergée et déployée le 2026-10-08), dans son état final où l'ancien identifiant est déjà retiré. Une ligne restée sur l'ancien identifiant voit sa réalisation la plus ancienne reprise par celle-ci (`heritageDesRetirees`, table `parObligation`), puis est archivée si elle porte une trace, supprimée sinon ; une déclaration ou une prescription ne suit pas. Comptage en production le 2026-10-08 (propriétaire, lecture seule) : 0 déclaration, 0 prescription, 0 ligne sur l'ancien identifiant — la question du rapport C64 est close.]\n\nNOTES DE L'ANCIEN IDENTIFIANT, CONSERVÉES :\n\n~~RYTHME RETENU PAR DÉFAUT, LE 2026-10-07 (C59 lot 3, item 5 ; ADR-039 (b), décision de la propriétaire du 07/10 « formation : annuelle »). Le mot vague est pris DANS LE TEXTE, pas dans la description : « renouvelée régulièrement », que la description portait depuis l'origine, n'est écrit nulle part — c'était une paraphrase. R. 4412-38 et R. 4412-87, relus sur l'API (sandbox) le 2026-10-07, ne contiennent aucun mot de rythme pour la FORMATION (« périodiquement actualisées », dans R. 4412-38, qualifie l'INFORMATION du 1°). Le rythme est dans R. 4412-88, relu le même jour et ajouté en référence et au corpus : « Elles sont répétées régulièrement ». `texteVague` le recopie mot pour mot.~~ [2026-10-08, C64 : le mot vague est désormais pris dans L. 4141-2, qui couvre tout travailleur ; R. 4412-88 reste cité en contexte pour les CMR. Voir la section du 2026-10-08 en tête.]\n\n~~LA LIMITE, ET LE SENS DE L'ERREUR. R. 4412-88 suit R. 4412-87 dans la section des agents CMR : son « répétées régulièrement » ne vise, au texte, que la formation des travailleurs exposés aux CMR. La ligne, elle, est déclenchée par tout stockage de matières dangereuses (proxy imparfait, notes ci-dessous). Le défaut annuel s'applique donc aussi à un employeur sans CMR : SUR-application, visible par qui la subit, conforme à la décision de la propriétaire. La description le dit (« Pour les agents cancérogènes… »). Question ouverte au rapport : un attribut « présence de CMR » permettrait de borner.~~ [2026-10-08, C64 : le mot vague est désormais pris dans L. 4141-2, qui couvre tout travailleur ; R. 4412-88 reste cité en contexte pour les CMR. Voir la section du 2026-10-08 en tête.]\n\nLe « triennal INRS » des notes ci-dessous reste NON encodé : le défaut est un plancher annuel, pas une estimation du bon rythme.\n\nPériodicité triennale est une pratique usuelle (INRS), pas une obligation stricte du Code du travail. Affichée comme rappel, non comme écart.\n\nAMENDEMENT 2026-08-27, même audit. La note ci-dessus le reconnaissait déjà : « Périodicité triennale est une pratique usuelle (INRS), pas une obligation stricte du Code du travail. » Elle était pourtant encodée comme une échéance triennale, donc affichée au dirigeant comme une date à tenir.\n\nR. 4412-38 exige des informations « périodiquement actualisées » et R. 4412-87 une formation, sans chiffre ni l'un ni l'autre. Reconnaître un écart en note et l'afficher quand même en échéance, c'est le documenter sans le corriger. `periodicite` passe à `autre` : la formation reste due et reste visible, sans date inventée.\n\nEXAMINÉE ET NON REBRANCHÉE — 2026-08-31, lot « faux négatifs d'ancrage ». Le brief portait cette ligne comme « à établir ». Elle est établie, et la réponse est non. [2026-10-08, C64 : le stockage reste le DÉCLENCHEUR, par `siEquipementDeclare`, mais n'est plus le porteur — une ligne pour l'établissement. Le refus d'appliquer la ligne à tout employeur tient toujours.]\n\nR. 4412-38 relu au verbatim ce jour (version en vigueur depuis le 2018-01-01) : « L'employeur veille à ce que les travailleurs ainsi que le comité social et économique : 1° Reçoivent des informations [...] sur LES AGENTS CHIMIQUES DANGEREUX SE TROUVANT SUR LE LIEU DE TRAVAIL [...] ; 2° Aient accès aux fiches de données de sécurité [...] ; 3° Reçoivent une formation et des informations sur les précautions à prendre [...] »\n\nLe déclencheur du texte est la PRÉSENCE d'agents chimiques dangereux sur le lieu de travail. Ce n'est ni un statut d'employeur, ni un équipement : c'est le cinquième déclencheur de la carto, « activité réellement exercée », qui n'est pas implémenté. Passer au porteur établissement appliquerait la formation au risque chimique et les FDS à tout employeur du produit — un cabinet, une boutique de vêtements —, ce qui est faux et bruyant sur du criticité 3.\n\nSTOCKAGE_MATIERE_DANGEREUSE reste donc l'ancrage, en connaissance de cause : c'est un PROXY imparfait — un établissement peut détenir des produits d'entretien classés sans avoir déclaré de stockage — mais un proxy dans le bon sens, qui sous-applique au lieu de sur-appliquer. La correction juste est un attribut de présence d'agents chimiques dangereux, pas un changement de porteur. Rien n'est modifié ici.\n\nÀ ne pas confondre avec la NOTICE DE POSTE de R. 4412-39, que la carto range sur la même ligne (A20, E7) : elle n'est encodée nulle part au référentiel, ni ici ni ailleurs. Ce n'est pas un ancrage à corriger, c'est une obligation absente — hors du périmètre de ce lot, qui ne traite que des ancrages existants.\n\nNATURE : ÉCHÉANCE RÉCURRENTE (ADR-026). Le texte porte deux titres — « renouvelée régulièrement » et « lors de tout changement notable » —, et la règle de résolution place `echeance_recurrente` avant `evenementielle` : quand l'acte revient à rythme, c'est ce rythme qui commande le suivi, l'événement n'étant qu'un ajout. « Régulièrement » sans chiffre, c'est précisément le couple `echeance_recurrente` + `periodicite: autre`. La note ci-dessus reste vraie : le triennal INRS n'est toujours pas encodé, et ne doit pas l'être.",
  },

];
