// Corpus : arrêté du 26 décembre 2011 — vérifications des installations électriques.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const ARRETE_2011_12_26_ELECTRICITE: Corpus = {
  id: "arrete-2011-12-26-electricite",
  intitule:
    "Arrêté du 26 décembre 2011 — vérifications des installations électriques",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000025046978/",
  etendue: "articles_cites",
  portee:
    "Pris pour R. 4226-14 et R. 4226-16. L'article 2 régit la vérification initiale, l'article 3 la vérification périodique et la faculté de porter le délai à deux ans. Version initiale, jamais modifiée.",
  articles: [
    {
      ref: "Arrêté 2011-12-26 art. 2",
      intitule: "Conditions de la vérification initiale",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000025046978/",
      versionEnVigueur: "2011-12-30",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Règle la vérification initiale de R. 4226-14 : méthodes et étendue renvoyées à l'annexe I, contenu du rapport à l'annexe II, DÉLAI DE CINQ SEMAINES pour transmettre le rapport au chef d'établissement, et — c'est ce qui manquait au référentiel — la définition en quatre points de la « modification de structure » qui déclenche une nouvelle vérification initiale.",
      citationCle:
        "Le délai de transmission du rapport au chef d'établissement ne doit pas excéder cinq semaines à compter de la date d'achèvement de la vérification. Les modifications de structure mentionnées à l'article R. 4226-14 du code du travail comprennent : ― la modification du schéma des liaisons à la terre ; ― la modification de la puissance de court-circuit de la source ; ― la modification ou l'adjonction de circuits de distribution ; ― la création ou le réaménagement d'une partie d'installation.",
      statut: "retenu",
      obligations: ["elec-travail-mise-en-service"],
      reserve:
        "DEUX ÉCARTS RELEVÉS LE 2026-09-01.\n\n(1) LE SECOND DÉCLENCHEUR EST MAINTENANT DÉFINISSABLE. La `notesInternes` d'`elec-travail-mise-en-service` porte que « toute modification de structure » est un titre que le produit n'observe pas ; l'article 2 en donne pourtant les quatre cas exacts, et ce sont des faits qu'un exploitant peut reconnaître — changement de schéma des liaisons à la terre, de puissance de court-circuit, adjonction de circuits de distribution, réaménagement d'une partie d'installation. Le manque n'est donc pas l'imprécision du texte, c'est l'absence de question posée à l'exploitant.\n\n(2) LES CINQ SEMAINES NE SONT PAS LE DÉLAI QUE LA DESCRIPTION ANNONCE. L'obligation écrit « Le rapport doit être transmis à l'inspection du travail sur demande ». Le délai de l'article 2 vise la transmission par le VÉRIFICATEUR au CHEF D'ÉTABLISSEMENT — ce n'est ni le même expéditeur, ni le même destinataire, ni le même fait générateur. Non corrigé.",
    },
    {
      ref: "Arrêté 2011-12-26 art. 3",
      intitule: "Périodicité de la vérification périodique",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025049531",
      versionEnVigueur: "2011-12-30",
      modifiePar: null,
      // Relu le 2026-09-26 sur la page du texte puis sur la page propre de
      // l'article (deux lectures concordantes de la phrase « Toutefois… »),
      // pour les référentiels de risques du DUERP, qui écrivaient « contrôles
      // annuels obligatoires ». La seconde phrase entre dans la `citationCle` :
      // elle était déjà relevée en prose dans `prescrit`, tronquée de « de
      // nature à répondre aux observations contenues dans le rapport de
      // vérification ». L'URL de l'article remplace celle du texte entier.
      // [Contre-lecture du même jour : la citation s'arrêtait avant les deux
      // phrases suivantes du même alinéa — la lettre recommandée à
      // l'inspecteur du travail et l'avis du CHSCT ou des délégués —, soit la
      // condition procédurale du passage à deux ans. Relues sur la page de
      // l'article et sur celle du texte (deux lectures ciblées), ajoutées.]
      luLe: "2026-09-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["elec-travail-periodique-annuelle"],
      citationCle:
        "La périodicité des vérifications est fixée à un an, le point de départ de cette périodicité étant la date de la vérification initiale. Toutefois, le délai entre deux vérifications peut être porté à deux ans par le chef d'établissement si le rapport précédent ne présente aucune observation ou si, avant l'échéance, le chef d'établissement a fait réaliser les travaux de mise en conformité de nature à répondre aux observations contenues dans le rapport de vérification. Le chef d'établissement informe l'inspecteur du travail par lettre recommandée avec accusé de réception, accompagnée des éléments prouvant qu'il n'y a pas de non-conformité ou que les non-conformités ont été levées. Cet envoi doit comprendre, le cas échéant, l'avis des membres du CHSCT ou des délégués du personnel.",
      prescrit:
        "L'AN EST ICI, ET NULLE PART AILLEURS — R. 4226-16 ne chiffre rien. Le point de départ est la date de la vérification initiale, non la date de mise en service ni un millésime. Verbatim relevé le 2026-09-01.\n\nSECOND RÉGIME NON PORTÉ, relevé le 2026-08-27. « Le délai entre deux vérifications peut être porté à deux ans par le chef d'établissement si le rapport précédent ne présente aucune observation ou si, avant l'échéance, le chef d'établissement a fait réaliser les travaux de mise en conformité. » Ce n'est ni automatique ni de droit acquis : il faut informer l'inspecteur du travail par lettre recommandée avec accusé de réception, pièces à l'appui. Sans doute à NE PAS encoder comme une périodicité — afficher deux ans sans trace de l'envoi afficherait une échéance qui n'existe pas.",
    },
    {
      ref: "Arrêté 2011-12-26 annexe II",
      intitule:
        "Contenu des rapports de vérification et éléments de traçabilité",
      versionEnVigueur: "2011-12-30",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["elec-travail-rapport-quadriennal"],
      citationCle:
        '« 3.5. Mise à jour des renseignements descriptifs. Une mise à jour complète de l\'ensemble des renseignements descriptifs doit être effectuée tous les quatre ans ; elle donnera lieu à un rapport, dit "quadriennal", rédigé comme un rapport de visite initiale. »',
      prescrit:
        "Fixe le contenu des rapports, et au point 3.5 une PÉRIODICITÉ que le référentiel ignorait : le rapport quadriennal. C'est ce qui empêche la vérification périodique de dériver — les rapports périodiques ne consignent que les non-conformités, sur la foi d'un descriptif établi une fois. Le point 4 impose en outre à l'organisme de conserver, à chaque vérification périodique, la liste des appareils, circuits et dispositifs différentiels vérifiés : obligation pesant sur le vérificateur, pas sur l'exploitant, donc hors du calendrier.",
    },
    {
      ref: "Arrêté 2011-12-26 annexe I",
      intitule: "Méthodes et étendue des vérifications",
      versionEnVigueur: "2011-12-30",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "sans_objet",
      motif:
        "Décrit COMMENT vérifier, jamais QUAND : méthodes d'examen, échantillonnage des prises de courant et des appareils d'éclairage, essais des dispositifs différentiels, tableau de choix des méthodes. Aucune périodicité propre. Le seul rythme qu'elle porte est un rythme d'échantillonnage — « la totalité des prises de courant des locaux de bureaux soit vérifiée au bout de deux vérifications périodiques et la totalité des appareils d'éclairage fixes au bout de trois » —, qui décrit l'étendue d'un contrôle déjà daté par ailleurs et ne crée pas d'échéance.",
    },
    {
      ref: "Arrêté 2011-12-26 annexe IV",
      intitule:
        "Processus de vérification des installations électriques temporaires",
      versionEnVigueur: "2011-12-30",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "hors_perimetre",
      exclusion: "risque_specialise",
      motif:
        "Porte de vraies périodicités — vérification annuelle sur les chantiers de longue durée (2.3), vérification biennale d'au moins 25 % des tableaux sur les chantiers navals (3.4), examen visuel QUOTIDIEN des matériels sur les bancs de marchés forains (5) —, mais toutes sur des installations TEMPORAIRES : chantiers du BTP, chantiers navals, stands d'exposition, fêtes foraines, événementiel. Le produit s'adresse à des établissements fixes et ne modélise aucune installation temporaire. L'annexe III, qui liste les éléments d'information dus au vérificateur, ne porte aucune périodicité.",
    },
  ],
};
