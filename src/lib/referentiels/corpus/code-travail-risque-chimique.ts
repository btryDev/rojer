// Corpus : code du travail — agents chimiques dangereux, et l'aération qui s'y
// rattache.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.
//
// AMENDEMENT 2026-09-01 : `R. 4323-1` est sorti d'ici. Il ne relève ni du
// risque chimique ni du livre II, mais de la section 1 « Information et
// formation des travailleurs » du chapitre des équipements de travail, et il
// vise tout employeur. Il est passé dans `code-travail-equipements-information`,
// qui porte cette section.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_RISQUE_CHIMIQUE: Corpus = {
  id: "code-travail-risque-chimique",
  intitule: "Code du travail — agents chimiques dangereux et aération",
  url: "https://www.legifrance.gouv.fr/codes/id/LEGISCTA000018530931/",
  etendue: "articles_cites",
  portee:
    "Prévention du risque chimique (R. 4412-11 et s.), information et formation (R. 4412-38, R. 4412-87), aération (R. 4222-20). DEUX RÉGIMES Y COHABITENT DEPUIS LE 2026-09-02, et il faut le dire plutôt que de le laisser deviner : la SECTION 1 du chapitre II, commune à tous les agents chimiques dangereux (R. 4412-11, R. 4412-17, R. 4412-38), et la SECTION 2, propre aux agents CMR — R. 4412-87 y était seul, R. 4412-59 l'y rejoint en tant qu'article de champ. Ce corpus ne prétend couvrir ni l'une ni l'autre : il ne porte que les articles que le référentiel ou les écrans citent. La formation à l'utilisation des équipements de travail n'est plus ici : `R. 4323-1` relève du livre III (équipements de travail), pas du risque chimique, et a rejoint `code-travail-equipements-information` le 2026-09-01.",
  articles: [
    {
      // ~~obligation_manquante~~ → retenu le 2026-09-20 : la consigne est encodée
      // (`aeration-etablissement-consigne-utilisation`). C'était la seule manquante que rien ne
      // bloquait. Le motif d'origine (lot A, 2026-09-01) est dans l'historique git.
      ref: "R. 4222-21",
      intitule: "Consigne d'utilisation des installations de ventilation",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483604",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Impose un ÉCRIT permanent — une consigne d'utilisation disant les dispositions prises pour la ventilation et les mesures à prendre en cas de panne —, soumise à l'avis du médecin du travail et du CSE. Aucun contrôle, aucune mesure, aucune date.",
      citationCle:
        "L'employeur indique dans une consigne d'utilisation les dispositions prises pour la ventilation et fixe les mesures à prendre en cas de panne des installations. Cette consigne est établie en tenant compte, s'il y a lieu, des indications de la notice d'instructions fournie par le maître d'ouvrage conformément à l'article R. 4212-7. Elle est soumise à l'avis du médecin du travail, du comité social et économique.",
      statut: "retenu",
      obligations: ["aeration-etablissement-consigne-utilisation"],
    },
    {
      ref: "R. 4412-11",
      intitule:
        "Mesures de prévention du risque d'exposition aux agents chimiques dangereux",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018530929",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Liste en sept points les mesures d'organisation par lesquelles l'employeur supprime ou réduit au minimum le risque d'exposition. Aucun contrôle daté, aucune périodicité, aucun dispositif matériel nommé : le 7° est le seul point à toucher au stockage, et il vise des « procédures de travail adéquates ».",
      citationCle:
        "L'employeur définit et applique les mesures de prévention visant à supprimer ou à réduire au minimum le risque d'exposition à des agents chimiques dangereux : […] 7° En concevant des procédures de travail adéquates, notamment des dispositions assurant la sécurité lors de la manutention, du stockage et du transport sur le lieu de travail des agents chimiques dangereux et des déchets contenant de tels agents.",
      statut: "retenu",
      obligations: [
        "stockage-dangereux-retention",
        "stockage-dangereux-verification-etancheite",
      ],
      reserve:
        "NI « RÉTENTION » NI « ÉTANCHÉITÉ » N'Y FIGURENT — constat du 2026-09-01, article lu en entier à la source, les sept alinéas relevés. Le rapport du 2026-08-27 le soutenait ; il est confirmé. Ce que le chapitre porte de plus proche est R. 4412-17, qui vise « les risques de débordement ou d'éclaboussures, ainsi que de déversement par rupture des parois des cuves, bassins, réservoirs et récipients de toute nature » : c'est une exigence de résultat sur les contenants, sans acte de contrôle daté ni mot de rétention. La rétention d'un volume est prescrite ailleurs — art. 22 de l'arrêté ministériel du 1er juin 2015, hors code du travail.\n\nCE QUE LE LOT A A FAIT ET N'A PAS FAIT, le 2026-09-01. Fait : les deux formulations qui faisaient dire à l'article ce qu'il ne dit pas sont recalées sur le verbatim — la `reference` de `stockage-dangereux-verification-etancheite` annonçait « entretien régulier des équipements de stockage » et sa note interne affirmait que l'article « écrit que l'exploitant vérifie RÉGULIÈREMENT » ; le 2° dit « des procédures d'entretien régulières », qui est un dispositif d'organisation et non un acte. Pas fait : trouver le texte qui DATE l'acte. La sous-section 3 entière (R. 4412-11 à R. 4412-22) a été ouverte, aucun article n'en porte. Le seul candidat hors chapitre est R. 4224-17 — « entretenus et vérifiés suivant une périodicité appropriée » —, écarté délibérément : y ranger un bac de rétention est une interprétation, pas une lecture. La ligne est MAINTENUE, la décision revient à la propriétaire ; le détail est dans les notes internes de l'obligation.",
    },
    {
      ref: "R. 4412-38",
      intitule:
        "Information et formation des travailleurs sur les agents chimiques dangereux",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483735",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Trois obligations d'employeur envers les travailleurs ET le CSE : une information périodiquement actualisée sur les agents chimiques dangereux présents, l'accès aux fiches de données de sécurité du fournisseur, et une formation aux précautions à prendre. Le déclencheur est la PRÉSENCE d'agents chimiques dangereux sur le lieu de travail, pas un équipement de stockage. Aucun chiffre : « périodiquement actualisées » est le seul rythme, et il ne se convertit pas en échéance.",
      citationCle:
        "L'employeur veille à ce que les travailleurs ainsi que le comité social et économique : 1° Reçoivent des informations sous des formes appropriées et périodiquement actualisées sur les agents chimiques dangereux se trouvant sur le lieu de travail, telles que notamment leurs noms, les risques pour la santé et la sécurité qu'ils comportent et, le cas échéant, les valeurs limites d'exposition professionnelle et les valeurs limites biologiques qui leur sont applicables ; 2° Aient accès aux fiches de données de sécurité fournies par le fournisseur des agents chimiques ; 3° Reçoivent une formation et des informations sur les précautions à prendre pour assurer leur protection et celle des autres travailleurs présents sur le lieu de travail.",
      statut: "retenu",
      obligations: [
        "stockage-dangereux-fiches-donnees",
        "stockage-dangereux-formation-personnel",
      ],
      reserve:
        "LE CSE EST DESTINATAIRE AU MÊME TITRE QUE LES TRAVAILLEURS — « L'employeur veille à ce que les travailleurs AINSI QUE LE COMITÉ SOCIAL ET ÉCONOMIQUE » —, et aucune des deux obligations qui citent l'article ne le porte : l'une nomme les fiches, l'autre la formation des salariés qui manipulent. Relevé le 2026-09-01, non corrigé.",
    },
    {
      ref: "R. 4412-59",
      intitule:
        "Champ d'application de la section « agents CMR » et articles de la section 1 qui restent applicables",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769354",
      versionEnVigueur: "2017-01-01",
      modifiePar: {
        texte: "Décret n° 2016-1908 du 27 décembre 2016 - art. 10",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000033729065",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Article de CHAMP, pas de prescription. Il ouvre la section 2 (agents CMR) en la rendant applicable aux activités où les travailleurs sont exposés ou susceptibles de l'être à des agents cancérogènes, mutagènes ou toxiques pour la reproduction, et il écarte pour elles la section 1 (agents chimiques dangereux) SAUF sept blocs qu'il énumère : les définitions, les mesures contre les dangers physico-chimiques (R. 4412-17 et R. 4412-18), l'intervention en espace confiné (R. 4412-22), les vérifications périodiques des installations et appareils de protection collective, les mesures en cas d'accident ou d'incident, la notice de poste (R. 4412-39) et le suivi de l'état de santé.",
      citationCle:
        "Les dispositions de la présente section sont applicables aux activités dans lesquelles les travailleurs sont exposés ou susceptibles d'être exposés au cours de leur travail à des agents chimiques cancérogènes mutagènes ou toxiques pour la reproduction.",
      statut: "sans_objet",
      motif:
        "ARTICLE DE CHAMP : il n'impose rien par lui-même, il dit à quoi s'applique la section et ce qu'elle écarte. Consigné pour clore une question, pas pour la rouvrir.\n\nLA CITATION QUI L'A FAIT OUVRIR EST EXACTE, et c'est le résultat. Deux surfaces le montrent au dirigeant : la case « exposition à un agent CMR » de l'écran de cotation (« art. R. 4412-59 et suivants ») et le PDF du DUERP, qui écrit « les obligations renforcées de l'art. R. 4412-59 et suivants (substitution, liste nominative, suivi médical) ». Les trois obligations nommées existent bien dans la section qu'il ouvre — le remplacement de l'agent à R. 4412-66, la liste actualisée des travailleurs susceptibles d'être exposés à R. 4412-93-1, et le suivi de l'état de santé par le renvoi du 7° de cet article même. La forme « et suivants » est la bonne : elle désigne la section par son premier article sans lui attribuer leur contenu. Rien à corriger sur ces deux surfaces.\n\nCE QUI RESTE OUVERT : aucun des trois articles porteurs (R. 4412-66, R. 4412-93-1, et les articles de suivi de santé) n'est dépouillé. La liste de R. 4412-93-1 est en particulier un état permanent documentaire dont on ignore ici s'il est porté — le vérifier n'était pas dans ce lot, et ne pas l'écrire laisserait croire que la question a été posée.",
    },
    {
      ref: "R. 4412-87",
      intitule:
        "Information et formation à la sécurité des travailleurs exposés aux agents CMR",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483731",
      versionEnVigueur: "2018-01-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur organise, avec le CSE et le médecin du travail, l'information et la formation à la sécurité des travailleurs susceptibles d'être exposés aux agents cancérogènes, mutagènes ou toxiques pour la reproduction, et en fixe le contenu en cinq points. Aucune périodicité.",
      citationCle:
        "L'employeur organise, en liaison avec le comité social et économique et le médecin du travail, l'information et la formation à la sécurité des travailleurs susceptibles d'être exposés à l'action d'agents cancérogènes, mutagènes ou toxiques pour la reproduction.",
      statut: "retenu",
      obligations: ["stockage-dangereux-formation-personnel"],
      reserve:
        "CHAMP RESTREINT AUX CMR, confirmé par le chemin relevé le 2026-09-01 : Livre IV, Titre Ier, Chapitre II, SECTION 2 « Dispositions particulières aux agents chimiques dangereux cancérogènes, mutagènes et toxiques pour la reproduction », sous-section 6. R. 4412-38, lui, relève de la Section 1, commune à tous les agents chimiques dangereux. La référence porte déjà la mention « agents CMR uniquement » ; elle est exacte. Rien à corriger, l'entrée existe pour que le détour ne se refasse pas.",
    },
    {
      ref: "R. 4222-20",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-27",
      lecture: "premiere_main",
      citationCle:
        "L'employeur maintient l'ensemble des installations mentionnées au présent chapitre en bon état de fonctionnement et en assure régulièrement le contrôle.",
      statut: "retenu",
      obligations: [
        // L'obligation portée par l'établissement (ADR-022) : l'article pris
        // pour ce qu'il dit, l'ensemble des installations du chapitre.
        "aeration-controle-installations-r4222-20",
        // Deux autres obligations citent aussi R. 4222-20, et elles restent
        // parce qu'elles ne sont PAS des fragments : la mise en service est
        // un acte distinct (une seule fois, dans le mois qui suit), et le
        // volet stockage relève de l'article 4 de l'arrêté du 8 octobre 1987
        // — les locaux à pollution spécifique, autre régime.
        //
        // Un troisième, `aeration-travail-entretien-annuel`, a été RETIRÉ le
        // 2026-08-27 : même acte, même rythme, même arrêté que l'obligation
        // qui porte l'article entier (ADR-022).
        "aeration-travail-mise-en-service",
        "stockage-dangereux-ventilation-locaux",
      ],
      reserve:
        "L'article ne fixe aucun rythme : il dit « régulièrement ». Le rythme encodé (annuel) vient de la chaîne R. 4222-22 → arrêté du 8 octobre 1987, art. 3, « au minimum une fois par an » en local à pollution non spécifique — le cas des trois secteurs cibles. L'article 4 du même arrêté vise les locaux à pollution spécifique : même rythme annuel, plus un contrôle semestriel réservé aux installations avec recyclage. Ce semestriel N'EST PORTÉ NULLE PART — une première rédaction de cette réserve le disait « porté ailleurs » en citant un identifiant inventé, corrigé le 2026-08-27. Il est décrit dans `aeration-travail-locaux-pollution-specifique` sans y être planifié, faute d'une propriété d'équipement « recyclage » : c'est un manque réel, antérieur au chantier du porteur. Si un secteur à pollution spécifique entrait au périmètre, le porteur établissement ne suffirait plus à lui seul.",
    },
    {
      ref: "R. 4222-22",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-27",
      lecture: "premiere_main",
      citationCle:
        "Des arrêtés conjoints des ministres chargés du travail et de l'agriculture fixent : 1° Les méthodes de mesure de concentration, de débit, d'efficacité de captage, de filtration et d'épuration ; 2° La nature et la fréquence du contrôle des installations mentionnées au présent chapitre.",
      statut: "sans_objet",
      motif:
        "Renvoi pur : l'article n'impose rien à l'employeur, il habilite les ministres à fixer par arrêté les méthodes de mesure et la fréquence des contrôles. Il est dépouillé parce qu'il est le maillon qui donne son rythme à R. 4222-20 — lequel dit « régulièrement » sans chiffre. La fréquence vient de l'arrêté du 8 octobre 1987 pris sur ce fondement, dont l'article 3 impose « au minimum une fois par an » en local à pollution non spécifique. Sans ce maillon relevé, la périodicité annuelle de `aeration-controle-installations-r4222-20` serait une déduction non sourcée.",
    },
    {
      ref: "R. 4412-17",
      intitule:
        "Protection contre les dangers des propriétés chimiques et physico-chimiques",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-27",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "stockage-dangereux-retention",
        "stockage-dangereux-verification-etancheite",
      ],
      citationCle:
        "« Ces mesures portent, notamment, sur le stockage, la manutention et l'isolement des agents chimiques incompatibles. A cet effet, l'employeur prend les mesures appropriées pour empêcher : […] 2° Les risques de débordement ou d'éclaboussures, ainsi que de déversement par rupture des parois des cuves, bassins, réservoirs et récipients de toute nature contenant des produits susceptibles de provoquer des brûlures d'origine thermique ou chimique. »",
      prescrit:
        "Seul article du Code du travail visant la rupture de parois d'un récipient de stockage. Le mot « rétention » n'apparaît NULLE PART dans le chapitre — il n'existe d'ailleurs pas de section « stockage » : la structure va du champ d'application à l'évaluation, puis aux mesures de prévention. R. 4412-17 est ce qui existe de plus proche, et il suffit. Ajouté le 2026-08-27 après qu'un arbitrage eut établi que R. 4412-11, seul cité jusque-là, ne porte ni « rétention » ni « étanchéité » — son 2° ne fonde que « des procédures d'entretien régulières ».",
    },
  ],
};
