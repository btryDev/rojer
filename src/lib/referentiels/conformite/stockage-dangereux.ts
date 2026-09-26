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
 */

import type { Obligation } from "./types";

export const obligationsStockageDangereux: Obligation[] = [
  {
    id: "stockage-dangereux-declaration-icpe",
    domaine: "stockage_dangereux",
    libelle: "Vérification du régime ICPE applicable (stockage matières dangereuses)",
    description:
      "L'exploitant vérifie si les quantités stockées placent l'établissement sous un régime ICPE (déclaration, enregistrement ou autorisation) et effectue les démarches correspondantes (rubriques 1436, 4330, 4331, 4734…). Le classement conditionne les contrôles périodiques ultérieurs.",
    referencesLegales: [
      {
        source: "CODE_ENVIRONNEMENT",
        reference:
          "C. env., art. L. 512-8 — régime de la DÉCLARATION (section 3)",
        article: "C. env. L. 512-8",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006834242",
        note: "« Sont soumises à déclaration les installations qui, ne présentant pas de graves dangers ou inconvénients pour les intérêts visés à l'article L. 511-1, doivent néanmoins respecter les prescriptions générales édictées par le préfet en vue d'assurer dans le département la protection des intérêts visés à l'article L. 511-1. » Verbatim relevé le 2026-09-01. Placé en tête parce que c'est le SEUL des trois régimes qu'un commerce ou un restaurant rencontre couramment — une chambre froide, un stockage de gaz, une installation de réfrigération.",
        versionConstatee: "2017-03-01",
      },
      {
        source: "CODE_ENVIRONNEMENT",
        reference:
          "C. env., art. L. 512-7 — régime de l'ENREGISTREMENT, dit autorisation simplifiée (section 2)",
        article: "C. env. L. 512-7",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042654882",
        note: "« Sont soumises à autorisation simplifiée, sous la dénomination d'enregistrement, les installations qui présentent des dangers ou inconvénients graves pour les intérêts mentionnés à l'article L. 511-1, lorsque ces dangers et inconvénients peuvent, en principe, eu égard aux caractéristiques des installations et de leur impact potentiel, être prévenus par le respect de prescriptions générales édictées par le ministre chargé des installations classées. » Verbatim relevé le 2026-09-01. Second régime réellement atteignable dans les secteurs couverts.",
        versionConstatee: "2020-12-09",
      },
      {
        source: "CODE_ENVIRONNEMENT",
        reference:
          "C. env., art. L. 512-1 — régime de l'AUTORISATION environnementale (section 1)",
        article: "C. env. L. 512-1",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033933233",
        note: "« Sont soumises à autorisation les installations qui présentent de graves dangers ou inconvénients pour les intérêts mentionnés à l'article L. 511-1. » Le plus haut des trois régimes, et celui que les secteurs couverts n'atteignent pas — cité pour que la vérification porte bien sur les trois, pas parce qu'un restaurant y tombe.",
        versionConstatee: "2017-03-01",
      },
    ],
    periodicite: "autre",
    nature: "ponctuelle",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["STOCKAGE_MATIERE_DANGEREUSE"],
    notesInternes:
      "LES TROIS RÉGIMES SONT CITÉS SÉPARÉMENT DEPUIS LE 2026-09-01 (lot C), ET L'ORDRE EST UNE LECTURE. La ligne portait une seule référence dont le texte nommait bien les trois articles — « L. 512-8 (déclaration) · L. 512-7 (enregistrement) · L. 512-1 (autorisation) » — mais dont la clé `article`, la seule que le corpus et la veille savent lire, n'était que `C. env. L. 512-1`. Deux des trois régimes n'étaient donc ni surveillés par la veille, ni rattachables à un corpus, et c'est le troisième — l'autorisation — que la clé désignait : celui qu'un commerce ou un restaurant n'atteint jamais. L. 512-8 passe en fondement parce que c'est le régime réellement rencontré ; L. 512-7 le suit ; L. 512-1 reste, pour que la vérification porte bien sur les trois.\n\nCE QUE L'ARTICLE NE DIT PAS, et qui explique la forme de cette obligation : aucun des trois ne dit QUELLES QUANTITÉS déclenchent quel régime. C'est le décret de nomenclature pris pour L. 511-2. Le produit ne détient pas les quantités stockées et ne les devine pas (ADR-023) : l'obligation fait donc VÉRIFIER le régime, elle ne le déduit pas.\n\nCE QUI RESTE HORS RÉFÉRENTIEL, déclaré au corpus sur chacun des deux nouveaux articles : les procédures (L. 512-7-1 et s., L. 512-9 et s.) et, pour le régime déclaratif soumis à contrôle, ses contrôles périodiques — dont la périodicité dépend de la rubrique de nomenclature.\n\nÉtape de qualification initiale. Une fois le régime connu, les obligations ICPE spécifiques s'appliquent — sortie de périmètre MVP.\n\nNATURE : PONCTUELLE (ADR-026). La note ci-dessus la qualifie d'« étape de qualification initiale », et c'est exactement une obligation ponctuelle : faite une fois, elle ne se refait pas — sauf changement des quantités stockées, fait que le produit n'observe pas et qui n'est pas encodé ici. C'est l'une des trois obligations sur lesquelles l'audit du 2026-08-31 a établi que `periodicite: \"autre\"` recouvrait trois natures distinctes.",
  },
  {
    id: "stockage-dangereux-retention",
    domaine: "stockage_dangereux",
    libelle: "Capacité de rétention (stockage liquides dangereux)",
    description:
      "Tout stockage de liquides dangereux (inflammables, toxiques, corrosifs) est organisé de façon à prévenir les épandages : récipients placés sur une capacité de rétention étanche. La règle chiffrée des arrêtés ICPE — capacité de rétention au moins égale à la PLUS GRANDE des deux valeurs : 100 % de la capacité du plus grand réservoir, ou 50 % de la capacité totale des réservoirs associés — figure dans l'arrêté du 1er juin 2015 relatif aux installations classées soumises à enregistrement (rubriques 4331 et 4734) ; hors de ce régime, aucun texte lu ici ne la fixe, et Rojer la cite comme repère.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4412-11 (procédures de stockage sûres des agents chimiques dangereux)",
        article: "R. 4412-11",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018530929/",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 1er juin 2015 (rubriques 4331/4734, enregistrement), art. 22 — valeurs de rétention ; texte relatif aux installations classées de ce régime",
        article: "Arrêté 2015-06-01 art. 22",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044166790",
        versionConstatee: "2022-01-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4412-17 (prévention des débordements et ruptures de parois des récipients)",
        article: "R. 4412-17",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018530917",
        note: "« A cet effet, l'employeur prend les mesures appropriées pour empêcher : […] 2° Les risques de débordement ou d'éclaboussures, ainsi que de déversement par rupture des parois des cuves, bassins, réservoirs et récipients de toute nature contenant des produits susceptibles de provoquer des brûlures d'origine thermique ou chimique. » Verbatim relevé en première main le 2026-08-27. C'est le seul article du Code du travail qui vise la rupture de parois d'un récipient de stockage ; le mot « rétention » n'y figure pas, ni nulle part ailleurs dans le chapitre.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["STOCKAGE_MATIERE_DANGEREUSE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version fondait cette règle sur l'arrêté du 3 octobre 2010, qui ne s'applique qu'aux réservoirs aériens des ICPE soumises à autorisation (rubrique 1432) — inapplicable à une TPE non classée.\n\nNATURE : ÉTAT PERMANENT (ADR-026). La rétention est en place ou elle ne l'est pas : c'est un état matériel. `pieceAttendue` est nulle, malgré la criticité 5 — l'obligation ne porte sur aucun écrit.",
  },
  {
    id: "stockage-dangereux-verification-etancheite",
    domaine: "stockage_dangereux",
    libelle: "Vérification régulière de l'état du stockage (rétention, fuites)",
    description:
      "L'exploitant vérifie régulièrement l'état du stockage : intégrité des récipients, absence de fuite, état du bac de rétention, ventilation. Les anomalies sont consignées et corrigées. Aucun texte ne fixe de fréquence hors régime ICPE ; une vérification visuelle mensuelle est une pratique usuelle.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4412-11, 2° (procédures d'entretien régulières du matériel de stockage)",
        article: "R. 4412-11",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018530929/",
        note: "« L'employeur définit et applique les mesures de prévention visant à supprimer ou à réduire au minimum le risque d'exposition à des agents chimiques dangereux : […] 2° En prévoyant un matériel adéquat ainsi que des procédures d'entretien régulières qui protègent la santé et la sécurité des travailleurs […] » Article lu en entier à la source le 2026-09-01, ses sept alinéas relevés. CE QU'IL NE DIT PAS, et que la citation lui faisait dire jusqu'à cette date : ni « rétention », ni « étanchéité », ni aucun acte de vérification daté. Il impose des PROCÉDURES d'entretien régulières, pas un contrôle à échéance.",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4412-17 (prévention des débordements et ruptures de parois des récipients)",
        article: "R. 4412-17",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018530917",
        note: "« A cet effet, l'employeur prend les mesures appropriées pour empêcher : […] 2° Les risques de débordement ou d'éclaboussures, ainsi que de déversement par rupture des parois des cuves, bassins, réservoirs et récipients de toute nature contenant des produits susceptibles de provoquer des brûlures d'origine thermique ou chimique. » Verbatim relevé en première main le 2026-08-27, confirmé à la source le 2026-09-01. C'est le seul article du Code du travail qui vise la rupture de parois d'un récipient de stockage ; le mot « rétention » n'y figure pas, ni nulle part ailleurs dans le chapitre. Obligation de RÉSULTAT sur les contenants : aucun acte daté n'en découle.",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["STOCKAGE_MATIERE_DANGEREUSE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : la périodicité mensuelle était attribuée à l'arrêté du 3 octobre 2010 (ICPE autorisation), inapplicable ici. Aucune source opposable ne fixant de fréquence, l'obligation passe en « autre » et n'est plus planifiée au calendrier.\n\nNATURE : ÉCHÉANCE RÉCURRENTE (ADR-026). Rangée en `periodicite: autre` — ce qui reste juste — elle se lisait comme un état permanent, et un écran de déclaration lui aurait proposé une case à cocher à vie. Le couple nature + périodicité dit la vérité entière : elle revient, on ne sait pas à quel rythme.\n\nCITATION CORRIGÉE LE 2026-09-01 (lot A). La note ci-dessus affirmait jusqu'ici que « R. 4412-11 écrit que l'exploitant vérifie RÉGULIÈREMENT », et la `reference` annonçait « entretien régulier des équipements de stockage ». L'article, lu en entier à la source, n'écrit ni l'un ni l'autre : son 2° impose « des procédures d'entretien régulières », ce qui est un dispositif d'organisation, non un acte de vérification. Les deux formulations sont recalées sur le verbatim.\n\nAUCUN TEXTE PORTEUR TROUVÉ POUR L'ACTE LUI-MÊME — DÉCISION EN ATTENTE. La ligne décrit une vérification récurrente de l'état du stockage. Voici ce qui a été cherché le 2026-09-01, pour que le prochain ne le refasse pas. (1) La sous-section 3 « Mesures et moyens de prévention » du chapitre risque chimique, R. 4412-11 à R. 4412-22 : aucun acte daté, aucune vérification périodique ; R. 4412-17 est ce qui existe de plus proche et c'est une obligation de résultat. (2) L'arrêté du 1er juin 2015, art. 22, qui porte les valeurs de rétention : régime ICPE, opposable aux seuls établissements classés — il est déjà cité par `stockage-dangereux-retention` sous cette réserve. (3) R. 4224-17, « les installations et dispositifs techniques et de sécurité des lieux de travail sont entretenus et vérifiés suivant une périodicité appropriée » : c'est le SEUL candidat qui porte à la fois un acte de vérification et une récurrence sans rythme chiffré, ce qui correspond exactement à `periodicite: autre`. Il n'a PAS été ajouté, et c'est délibéré : son sujet est le bâti technique du lieu de travail, et étendre « dispositif technique et de sécurité » à un bac de rétention est une interprétation, pas une lecture. La proposer est le travail du lot ; la retenir est une décision de la propriétaire. LA LIGNE EST MAINTENUE en l'état.",
  },
  {
    id: "stockage-dangereux-ventilation-locaux",
    domaine: "stockage_dangereux",
    libelle: "Ventilation des locaux de stockage et contrôle annuel",
    description:
      "Les locaux de stockage de matières dangereuses sont ventilés en permanence. Le bon fonctionnement de la ventilation fait l'objet d'un contrôle annuel (débit, absence d'accumulation de vapeurs).",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4222-20",
        article: "R. 4222-20",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532294/",
        versionConstatee: "2008-05-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 8 octobre 1987, art. 4 (locaux à pollution spécifique)",
        article: "Arrêté 1987-10-08 art. 4",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006678611",
        versionConstatee: "1988-04-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["STOCKAGE_MATIERE_DANGEREUSE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'arrêté du 3 octobre 2010 (ICPE autorisation) remplacé par l'arrêté du 8 octobre 1987, qui fonde le contrôle annuel de la ventilation des locaux à pollution spécifique.",
  },
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
    id: "stockage-dangereux-formation-personnel",
    domaine: "stockage_dangereux",
    libelle: "Formation du personnel manipulant des matières dangereuses",
    description:
      "Les salariés qui manipulent des substances ou mélanges dangereux reçoivent une formation adaptée aux risques chimiques et aux consignes de stockage. La formation est renouvelée régulièrement et lors de tout changement notable.",
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
        reference: "R. 4412-87 (agents CMR uniquement)",
        article: "R. 4412-87",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483731/",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "autre",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["STOCKAGE_MATIERE_DANGEREUSE"],
    notesInternes:
      "Périodicité triennale est une pratique usuelle (INRS), pas une obligation stricte du Code du travail. Affichée comme rappel, non comme écart.\n\nAMENDEMENT 2026-08-27, même audit. La note ci-dessus le reconnaissait déjà : « Périodicité triennale est une pratique usuelle (INRS), pas une obligation stricte du Code du travail. » Elle était pourtant encodée comme une échéance triennale, donc affichée au dirigeant comme une date à tenir.\n\nR. 4412-38 exige des informations « périodiquement actualisées » et R. 4412-87 une formation, sans chiffre ni l'un ni l'autre. Reconnaître un écart en note et l'afficher quand même en échéance, c'est le documenter sans le corriger. `periodicite` passe à `autre` : la formation reste due et reste visible, sans date inventée.\n\nEXAMINÉE ET NON REBRANCHÉE — 2026-08-31, lot « faux négatifs d'ancrage ». Le brief portait cette ligne comme « à établir ». Elle est établie, et la réponse est non.\n\nR. 4412-38 relu au verbatim ce jour (version en vigueur depuis le 2018-01-01) : « L'employeur veille à ce que les travailleurs ainsi que le comité social et économique : 1° Reçoivent des informations [...] sur LES AGENTS CHIMIQUES DANGEREUX SE TROUVANT SUR LE LIEU DE TRAVAIL [...] ; 2° Aient accès aux fiches de données de sécurité [...] ; 3° Reçoivent une formation et des informations sur les précautions à prendre [...] »\n\nLe déclencheur du texte est la PRÉSENCE d'agents chimiques dangereux sur le lieu de travail. Ce n'est ni un statut d'employeur, ni un équipement : c'est le cinquième déclencheur de la carto, « activité réellement exercée », qui n'est pas implémenté. Passer au porteur établissement appliquerait la formation au risque chimique et les FDS à tout employeur du produit — un cabinet, une boutique de vêtements —, ce qui est faux et bruyant sur du criticité 3.\n\nSTOCKAGE_MATIERE_DANGEREUSE reste donc l'ancrage, en connaissance de cause : c'est un PROXY imparfait — un établissement peut détenir des produits d'entretien classés sans avoir déclaré de stockage — mais un proxy dans le bon sens, qui sous-applique au lieu de sur-appliquer. La correction juste est un attribut de présence d'agents chimiques dangereux, pas un changement de porteur. Rien n'est modifié ici.\n\nÀ ne pas confondre avec la NOTICE DE POSTE de R. 4412-39, que la carto range sur la même ligne (A20, E7) : elle n'est encodée nulle part au référentiel, ni ici ni ailleurs. Ce n'est pas un ancrage à corriger, c'est une obligation absente — hors du périmètre de ce lot, qui ne traite que des ancrages existants.\n\nNATURE : ÉCHÉANCE RÉCURRENTE (ADR-026). Le texte porte deux titres — « renouvelée régulièrement » et « lors de tout changement notable » —, et la règle de résolution place `echeance_recurrente` avant `evenementielle` : quand l'acte revient à rythme, c'est ce rythme qui commande le suivi, l'événement n'étant qu'un ajout. « Régulièrement » sans chiffre, c'est précisément le couple `echeance_recurrente` + `periodicite: autre`. La note ci-dessus reste vraie : le triennal INRS n'est toujours pas encodé, et ne doit pas l'être.",
  },
];
