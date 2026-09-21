// Corpus : code de la construction et de l'habitation — sécurité des ascenseurs.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const CCH_ASCENSEURS: Corpus = {
  id: "cch-ascenseurs",
  intitule:
    "Code de la construction et de l'habitation — sécurité des ascenseurs",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818721/",
  etendue: "articles_cites",
  portee:
    "Mise en sécurité, entretien et contrôle technique quinquennal. R. 134-6, R. 134-7 et R. 134-11 ont été réécrits par le décret n° 2026-166 du 4 mars 2026, en vigueur les 1er avril et 15 mai 2026.",
  articles: [
    {
      ref: "CCH R. 134-1",
      versionEnVigueur: "2021-07-01",
      // Page de l'article (LEGIARTI000043818725) : « Création Décret n°2021-872 du
      // 30 juin 2021 - art. ». Jamais modifié depuis — pas de texte modificateur.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["ascenseur-telealarme-liaison"],
      historique:
        "CORRIGÉ LE 2026-09-01 (lot A). L'article était le FONDEMENT de `ascenseur-telealarme-liaison` alors qu'il ne dit rien des moyens d'alerte. Le fondement est désormais R. 134-2, 6°, entré au corpus le même jour. L'article reste cité, en contexte, pour ce qu'il fait seul : borner le champ de la section, exclusion des 0,15 m/s comprise.",
      prescrit:
        "Article de CHAMP, pas de prescription : il définit ce qu'est un ascenseur au sens de la section — appareil desservant de manière permanente les niveaux d'un bâtiment par une cabine se déplaçant le long de guides rigides inclinés de plus de 15 degrés, pour le transport de personnes, de personnes et d'objets, ou d'objets seuls dès lors que la cabine est accessible sans difficulté et équipée de commandes à portée. Y sont assimilés les appareils à course fixée dans l'espace même sans guides rigides (ascenseurs à ciseaux). EXCLUSION : les appareils dont la vitesse n'excède pas 0,15 m/s — la même borne que celle par laquelle l'annexe de l'arrêté du 1er mars 2004 les écarte du levage ; les deux corpus se recoupent exactement sur ce point. L'article ne dit RIEN des moyens d'alerte ni de la liaison avec un service d'intervention : cet objectif de sécurité est à R. 134-2, et son entretien à R. 134-6. Le référentiel rattache pourtant `ascenseur-telealarme-liaison` à la clé « CCH R. 134-1 » ; non corrigé ici, hors mandat de relevé.",
      citationCle:
        "Les ascenseurs auxquels s'appliquent les dispositions de la présente section sont les appareils qui desservent de manière permanente les niveaux de bâtiments et de constructions à l'aide d'une cabine qui se déplace le long de guides rigides dont l'inclinaison sur l'horizontale est supérieure à 15 degrés […]. La présente section ne s'applique pas aux appareils dont la vitesse n'excède pas 0,15 m/s.",
    },
    {
      ref: "CCH R. 134-2",
      intitule: "Objectifs de sécurité d'un ascenseur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818727",
      versionEnVigueur: "2021-07-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      statut: "retenu",
      obligations: ["ascenseur-telealarme-liaison"],
      prescrit:
        "L'article des NEUF OBJECTIFS de sécurité, et le pivot de toute la section : R. 134-6 définit l'entretien comme ce qui « maintient le niveau de sécurité défini à l'article R. 134-2 », et R. 134-11 a) fait du contrôle quinquennal la vérification que les dispositifs permettant de les atteindre existent et sont en bon état. Le 6° est celui qui porte la téléalarme — « la mise à la disposition des utilisateurs de moyens d'alerte et de communication avec un service d'intervention ». Chemin : Livre Ier > Titre III > Chapitre IV > Section 1 > Sous-section 1 « Mise en sécurité des ascenseurs ». Entré au corpus le 2026-09-01 : `ascenseur-telealarme-liaison` s'ancrait sur R. 134-1, article de champ.",
      citationCle:
        "La sécurité d'un ascenseur consiste à assurer : 1° La fermeture des portes palières ; 2° L'accès sans danger des personnes à la cabine ; 3° La protection des utilisateurs contre les chocs provoqués par la fermeture des portes ; 4° La prévention des risques de chute et d'écrasement de la cabine ; 5° La protection contre les dérèglements de la vitesse de la cabine ; 6° La mise à la disposition des utilisateurs de moyens d'alerte et de communication avec un service d'intervention ; 7° La protection des circuits électriques de l'installation ; 8° L'accès sans danger des personnels d'intervention aux locaux des machines, aux équipements associés et aux espaces parcourus par la cabine ; 9° L'impossibilité pour toute personne autre que les personnels d'intervention d'accéder aux locaux des machines, aux équipements associés et aux espaces parcourus par la cabine.",
      reserve:
        "HUIT OBJECTIFS SUR NEUF N'ONT PAS DE LIGNE EN PROPRE, et c'est normal : ce sont des états de l'installation, vérifiés à chaque visite d'entretien (R. 134-6) et au contrôle quinquennal (R. 134-11). Seul le 6° est encodé, parce qu'il suppose en outre un tiers disponible en permanence — un contrat d'astreinte, que l'exploitant peut ne pas avoir alors que l'appareil est conforme. La distinction est celle qui fait qu'une ligne existe ou non ; elle est notée ici pour que personne ne conclue à huit manques.",
    },
    {
      ref: "CCH R. 134-6",
      versionEnVigueur: "2026-04-01",
      modifiePar: { texte: "Décret n° 2026-166 du 4 mars 2026 - art. 1" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "ascenseur-entretien-contrat",
        "ascenseur-examen-annuel-securite",
        "ascenseur-examen-semestriel-secours",
        // Ajoutée le 2026-09-01. Le `prescrit` ci-dessous annonçait déjà
        // « quatre obligations du référentiel à partir d'une seule clé de
        // corpus » et n'en nommait que trois. La quatrième est le 1° a),
        // « Une visite toutes les six semaines en vue de surveiller le
        // fonctionnement » — le fondement même de la visite. Article rouvert à
        // la source ce jour (version du 01/04/2026, décret n° 2026-166 du
        // 4 mars 2026) avant l'ajout.
        "ascenseur-visite-six-semaines",
      ],      prescrit:
        "Version réécrite par le décret n° 2026-166 du 4 mars 2026, en vigueur au 1er avril 2026. Définit l'objet de l'entretien — assurer le bon fonctionnement et maintenir le niveau de sécurité de R. 134-2 — puis énumère les DISPOSITIONS MINIMALES que prend le propriétaire, en deux blocs. 1° Opérations et vérifications PÉRIODIQUES : visite toutes les six semaines ; vérification toutes les six semaines de l'efficacité des serrures ; examen SEMESTRIEL des câbles et vérification ANNUELLE des parachutes ; nettoyage annuel de la cuvette, du toit de cabine et du local des machines ; lubrification et nettoyage des pièces ; vérification toutes les six semaines du bon fonctionnement des moyens d'alerte. 2° Opérations OCCASIONNELLES : réparation ou remplacement des petites pièces usées ; mesures d'entretien destinées à supprimer les défauts ; en cas d'incident, intervention pour dégager les personnes bloquées ; remplacement des moyens d'alerte quand il est nécessaire. Trois rythmes distincts dans un seul article, tous en fréquence minimale — c'est ce qui fonde quatre obligations du référentiel à partir d'une seule clé de corpus.",
      citationCle:
        "L'entretien d'un ascenseur a pour objet d'assurer son bon fonctionnement et de maintenir le niveau de sécurité défini à l'article R. 134-2. […] le propriétaire d'une installation d'ascenseur prend les dispositions minimales suivantes : 1° Opérations et vérifications périodiques : a) Une visite toutes les six semaines […] b) La vérification toutes les six semaines de l'efficacité des serrures […] c) L'examen semestriel des câbles et la vérification annuelle des parachutes […] f) La vérification toutes les six semaines du bon fonctionnement des moyens d'alerte […]",
    },
    {
      ref: "CCH R. 134-7",
      intitule:
        "Contrat d'entretien, carnet d'entretien et rapport annuel d'activité",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053629120",
      versionEnVigueur: "2026-04-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      statut: "retenu",
      obligations: [
        "ascenseur-carnet-entretien",
        // Ajoutée le 2026-09-01 (lot C) : le rapport annuel d'activité a
        // désormais sa ligne, distincte du carnet, qui est un état permanent.
        "ascenseur-rapport-annuel-activite",
      ],
      prescrit:
        "Version réécrite par le décret n° 2026-166 du 4 mars 2026, en vigueur au 1er avril 2026. Trois paragraphes. Le I impose le CONTRAT d'entretien écrit avec une entreprise dont le personnel a reçu une formation appropriée, et en fixe dix clauses minimales — dont une durée d'au moins un an, la disponibilité des pièces, le carnet d'entretien, les assurances, les pénalités, le sort des sous-traitants. Le II énumère les travaux importants qui échappent au contrat. Le III porte le CARNET D'ENTRETIEN — registre physique ou électronique, au choix du propriétaire — et le RAPPORT ANNUEL D'ACTIVITÉ que l'entreprise remet au propriétaire. C'est le régime ORDINAIRE ; R. 134-10 ne régit que le propriétaire qui entretient par ses propres moyens. Entré au corpus le 2026-09-01 : `ascenseur-carnet-entretien` le nommait dans sa `reference` mais s'ancrait sur R. 134-10.",
      citationCle:
        "III. - Les visites, opérations et interventions effectuées en exécution du contrat d'entretien font l'objet de comptes rendus dans un carnet d'entretien tenu à jour, établi sous forme d'un registre physique ou électronique suivant le choix du propriétaire. En outre, l'entreprise remet au propriétaire un rapport annuel d'activité auquel est annexé le contenu du carnet d'entretien lorsque celui-ci est établi sous forme électronique.",
      reserve:
        "UN DOUZIÈME CAS DU MÊME MOTIF, RELEVÉ ET NON CORRIGÉ. `ascenseur-entretien-contrat` cite « CCH, art. R. 134-6 et R. 134-7 » et s'ancre sur R. 134-6 — or le CONTRAT d'entretien écrit et ses dix clauses minimales sont au I de cet article-ci ; R. 134-6 porte les opérations d'entretien, pas le contrat qui les commande. Exactement le motif des onze du lot A — le terme cité d'un intervalle décide de l'ancre, et il tombe à côté —, mais l'obligation n'était pas dans la liste des onze : signalée pour la passe suivante plutôt que corrigée hors mandat. Elle n'est donc pas rattachée ici, sans quoi le lien serait rompu dans l'autre sens.\n\nLE RAPPORT ANNUEL D'ACTIVITÉ A SA LIGNE DEPUIS LE 2026-09-01 (lot C) : `ascenseur-rapport-annuel-activite`, annuelle, pièce attendue « rapport annuel d'activité ». La réserve disait « il est annuel, il a un réalisateur nommé, il produit une pièce, et rien ne le planifie » — les trois premiers points restent, le quatrième est levé. `ascenseur-carnet-entretien` garde le seul carnet, qui est un état permanent. La ligne couvre les DEUX régimes, celui du contrat (ce III) et celui de la régie (R. 134-10) : l'acte et le rythme sont identiques, seul l'auteur change, et le produit ne détient pas le fait « entretien en régie ».",
    },
    {
      ref: "CCH R. 134-10",
      versionEnVigueur: "2021-07-01",
      // Page de l'article (LEGIARTI000043818745) : « Création Décret n°2021-872 du
      // 30 juin 2021 - art. ». Jamais modifié depuis — pas de texte modificateur.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "ascenseur-carnet-entretien",
        // Ajoutée le 2026-09-01 (lot C) : le rapport annuel d'activité a
        // désormais sa ligne, distincte du carnet, qui est un état permanent.
        "ascenseur-rapport-annuel-activite",
      ],      prescrit:
        "PORTÉE PLUS ÉTROITE QUE L'USAGE QUI EN EST FAIT. L'article ne fonde pas le carnet d'entretien en général : il régit le seul cas où le propriétaire N'A PAS de prestataire et assure l'entretien PAR SES PROPRES MOYENS. Dans ce cas il reste tenu des prescriptions de R. 134-6, tient à jour le carnet d'entretien, établit un rapport annuel d'activité dans les conditions du III de R. 134-7, et le personnel qu'il emploie doit avoir reçu une formation appropriée au sens de l'article 9 du décret n° 95-826 du 30 juin 1995. Le carnet d'entretien du cas ordinaire — entretien confié à une entreprise — est porté par R. 134-7.",
      reserve:
        "CORRIGÉ LE 2026-09-01 (lot A). L'article était la clé `article` de `ascenseur-carnet-entretien` alors que sa `reference` citait bien « R. 134-7 et R. 134-10 » : la clé désignait le cas particulier, et le cas ordinaire n'était rattaché à aucun texte lu. R. 134-7 est entré au corpus et porte le fondement ; celui-ci reste cité, pour le régime de la régie et pour lui seul.\n\nUNE DES DEUX EXIGENCES DE RÉGIE EST PORTÉE DEPUIS LE 2026-09-01 (lot C), L'AUTRE NON.\n\nPORTÉE : le RAPPORT ANNUEL D'ACTIVITÉ que le propriétaire en régie établit « dans les conditions fixées au III de l'article R. 134-7 ». `ascenseur-rapport-annuel-activite` le porte, et couvre les deux régimes d'un seul tenant — l'acte, le rythme et la pièce sont les mêmes, seul l'auteur change.\n\nNON PORTÉE, ET LE RENVOI EST MORT. L'article exige que le personnel employé en régie ait « reçu une formation appropriée dans les conditions prévues à l'article 9 du décret n° 95-826 du 30 juin 1995 ». CE DÉCRET EST ABROGÉ depuis le 17 décembre 2010, par le décret n° 2008-1325 du 15 décembre 2008 — vérifié à la source le 2026-09-01. Le renvoi de R. 134-10, dont la version en vigueur date du 1er juillet 2021, pointe donc une numérotation morte depuis onze ans. C'est un quatrième renvoi mort, à ranger avec les trois relevés en section D du cadrage du 2026-09-01.\n\nCE QUI L'A REMPLACÉ, lu à la source le même jour : Code du travail, Livre V, Titre IV, CHAPITRE III « Interventions sur les équipements élévateurs et installés à demeure », SECTION 6 « Formation des travailleurs », articles R. 4543-22 à R. 4543-24. R. 4543-22 : « Tout travailleur effectuant ces interventions reçoit une formation particulière, renouvelée aussi souvent que nécessaire, notamment lors de l'introduction de nouvelles technologies. » R. 4543-23 : période d'exercices pratiques sous le contrôle d'un tuteur désigné par l'employeur, disposant de la qualification nécessaire. R. 4543-24 : attestation nominative remise au travailleur par l'employeur après une évaluation. Le champ est posé par R. 4543-1 — interventions de vérification, maintenance, contrôle technique, réparation et transformation sur ascenseurs et équipements assimilés — et il vise l'EMPLOYEUR de ces travailleurs, donc le propriétaire en régie comme l'ascensoriste.\n\nPOURQUOI ELLE N'EST PAS ENCODÉE. Il manque le fait, pas le texte : rien dans le modèle ne dit qu'un ascenseur est entretenu en régie. L'encoder sans ce fait donnerait la formation à tous les propriétaires d'ascenseur, dont l'immense majorité a un contrat — un faux positif de masse, exactement ce que l'ADR-023 interdit. Le déblocage est une caractéristique d'équipement sur ASCENSEUR (`estEntretenuEnRegie`), donc une question de plus au formulaire de parc : décision produit, proposée et non prise.",
      citationCle:
        "Lorsque le propriétaire ne recourt pas à un prestataire de services mais décide d'assurer par ses propres moyens l'entretien de l'ascenseur, il est tenu au respect des prescriptions de l'article R. 134-6. Il tient à jour le carnet d'entretien et établit un rapport annuel d'activité dans les conditions fixées au III de l'article R. 134-7. Le personnel qu'il emploie pour l'exercice de cette mission doit avoir reçu une formation appropriée dans les conditions prévues à l'article 9 du décret n° 95-826 du 30 juin 1995 […]",
    },
    {
      ref: "CCH R. 134-11",
      versionEnVigueur: "2026-05-15",
      modifiePar: { texte: "Décret n° 2026-166 du 4 mars 2026 - art. 1" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["ascenseur-controle-technique-quinquennal"],      prescrit:
        "Version réécrite par le décret n° 2026-166 du 4 mars 2026, en vigueur au 15 mai 2026. Impose au propriétaire de faire réaliser TOUS LES CINQ ANS un contrôle technique de son installation. Échéance fixe et non plafond : le texte écrit « tous les cinq ans », à la différence des régimes ESP en « au maximum ». Deux objets : a) vérifier que l'ascenseur est équipé des dispositifs permettant d'atteindre les objectifs de sécurité de R. 134-2, qu'ils sont en bon état, ET que les moyens d'alerte et de communication avec un service d'intervention sont compatibles avec les systèmes de communication autres que le réseau téléphonique commuté fixe ou un réseau mobile de troisième génération ou antérieur ; b) repérer tout défaut présentant un danger pour la sécurité des personnes ou portant atteinte au bon fonctionnement. Le a) est la nouveauté de mai 2026 : la compatibilité de la téléalarme avec la fin de la 2G/3G et du RTC entre dans l'objet du contrôle quinquennal.",
      citationCle:
        "Le propriétaire d'un ascenseur est tenu de faire réaliser tous les cinq ans un contrôle technique de son installation. Le contrôle technique a pour objet : a) De vérifier que les ascenseurs sont équipés des dispositifs permettant la réalisation des objectifs de sécurité mentionnés à l'article R. 134-2, que ces dispositifs sont en bon état et que les moyens d'alerte et de communication avec un service d'intervention sont compatibles avec les systèmes de communication autres que le réseau téléphonique commuté fixe ou un réseau de téléphonie mobile ouvert au public de troisième génération ou antérieur ; b) De repérer tout défaut présentant un danger pour la sécurité des personnes ou portant atteinte au bon fonctionnement de l'appareil.",
    },
  ],
};
