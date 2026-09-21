/**
 * Domaine « formation à la sécurité » — obligations d'information et de
 * formation (L. 4141-1 et s., R. 4141-1 et s.) et conduite d'équipements
 * (R. 4323-55 et s.).
 *
 * C'EST LE PREMIER DOMAINE DU RÉFÉRENTIEL QUI NE NAÎT D'AUCUN ÉQUIPEMENT.
 * Les dix domaines précédents partent tous d'une chose déclarée au parc — un
 * tableau électrique, un ascenseur, une hotte. Ici, le déclencheur est le
 * statut d'employeur : dès le premier salarié, sans condition de secteur,
 * d'effectif ni de matériel.
 *
 * POURQUOI CE FICHIER EXISTE. La question qui a ouvert le chantier était :
 * « et sur Camille qui est électricienne, il n'y a pas une formation
 * obligatoire ? ou je suis censée le voir où ? ». Le produit savait déjà DIRE
 * qu'un titre nominatif manquait (ADR-024) ; il n'avait aucune ligne de
 * catalogue à proposer. Le catalogue des titres de salarié en comptait
 * exactement une, l'attestation médicale de `R. 4544-11-1`.
 *
 * AUCUNE PÉRIODICITÉ N'EST INVENTÉE ICI, ET C'EST LE POINT DÉLICAT.
 * Le chapitre `R. 4141-*` ne chiffre aucune durée, et `L. 4141-2` renvoie la
 * répétition à « des conditions déterminées par voie réglementaire ou par
 * convention ou accord collectif de travail » — conditions que le règlement
 * n'a jamais fixées. Les obligations tirées de ce chapitre portent donc
 * `periodicite: "autre"`, qui ne dit qu'une chose : le texte n'écrit pas de
 * rythme. Ce qu'elles SONT se lit dans `nature` (ADR-026), et elles ne sont
 * pas toutes de la même espèce — l'accueil au poste est événementiel,
 * l'autorisation de conduite est un état à maintenir.
 *
 * UNE SEULE PORTE UNE PÉRIODICITÉ CHIFFRÉE, ET ELLE VIENT DU CODE.
 * `formation-securite-salarie-cse-sst` porte `quadriennale` :
 * `L. 2315-17` écrit que ces formations « sont renouvelées lorsque les
 * représentants ont exercé leur mandat pendant quatre ans, consécutifs ou
 * non ». Cette ligne a d'abord porté `autre` ; c'était un dépouillement
 * incomplet — `L. 4644-1` renvoie aux articles `L. 2315-16` À `L. 2315-18` et
 * seul le dernier avait été ouvert. Ses `notesInternes` portent l'argument.
 * L'en-tête de ce fichier a affirmé pendant ce temps que RIEN ici ne portait
 * de périodicité chiffrée, « et ce n'est pas un manque de dépouillement :
 * c'est ce que les textes disent ». La phrase était juste à l'écriture ; elle
 * a survécu à la correction qu'elle contredisait, quatre cents lignes plus
 * bas, sans qu'aucun diff ne la touche. Une affirmation en « aucune » ou
 * « toutes » ne se relit pas quand on ajoute une ligne — c'est ce qui la rend
 * chère.
 *
 * La seule durée écrite de la section 7 — les cinq ans de l'attestation
 * médicale de `R. 4323-56` — n'est pas ici : elle est délivrée par le médecin
 * du travail et vit dans le domaine `sante_travail`, où l'annuaire attend un
 * service de prévention et de santé au travail et non un organisme de
 * formation. `conduite-salarie-autorisation` la nomme par une transmission,
 * puisque sa propre validité en dépend.
 *
 * Ce dépôt a déjà eu à retirer un « triennal » venu d'une norme NF et non du
 * droit. Une échéance inventée dans un outil de conformité est pire qu'une
 * échéance absente : elle se présente à un contrôle.
 */

import type { Obligation } from "./types";

export const obligationsFormationSecurite: Obligation[] = [
  // ---------------------------------------------------------------------------
  // Information et formation à la sécurité (L. 4141-*, R. 4141-*)
  // ---------------------------------------------------------------------------
  {
    id: "formation-securite-etablissement-organisation",
    domaine: "formation_securite",
    libelle: "Organiser la formation à la sécurité des salariés",
    description:
      "L'employeur organise une formation pratique et appropriée à la sécurité pour les travailleurs qu'il embauche, ceux qui changent de poste ou de technique, les salariés temporaires, et — à la demande du médecin du travail — ceux qui reprennent après un arrêt d'au moins vingt et un jours. Elle porte sur les conditions de circulation, les conditions d'exécution du travail et la conduite à tenir en cas d'accident. Le Code ne fixe aucune périodicité de renouvellement : il la renvoie à un règlement qui ne l'a pas fixée, ou à un accord collectif. Elle revient donc — à chaque embauche, à chaque changement de poste ou de technique, à chaque retour d'un arrêt long — sans qu'aucune date ne soit fixée pour la refaire.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 4141-2 (formation pratique et appropriée à la sécurité, bénéficiaires)",
        article: "L. 4141-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903166",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4141-3 (objet et contenu de la formation)",
        article: "R. 4141-3",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532878",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4141-11 (formation aux conditions de circulation)",
        article: "R. 4141-11",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532860",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-13 (formation aux conditions d'exécution du travail)",
        article: "R. 4141-13",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532854",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-15 (tâches ouvrant droit à formation en cas de création ou modification de poste)",
        article: "R. 4141-15",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532850",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-17 (objet de la formation à la conduite à tenir en cas d'accident)",
        article: "R. 4141-17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532844",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-6 (association du médecin du travail à l'élaboration des actions de formation)",
        article: "R. 4141-6",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019960823",
        versionConstatee: "2008-12-20",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-9 (formation à la reprise après un arrêt d'au moins vingt et un jours, à la demande du médecin du travail)",
        article: "R. 4141-9",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532866",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [
      {
        vers: "salarie_designe",
        titre: "formation-securite-salarie-accueil",
        motif:
          "L'obligation d'organiser est portée par l'établissement, mais elle ne se solde que salarié par salarié : R. 4141-20 fait courir un délai « à compter de l'affectation du travailleur à son emploi », et L. 4141-5 (passeport de prévention) confirme depuis le 27 juin 2026 que ces formations produisent des attestations et certificats nominatifs. Le produit ne peut pas deviner qui a été formé et quand : l'employeur le déclare.",
      },
    ],
    notesInternes:
      "PORTEUR ÉTABLISSEMENT, ET C'EST UN CHOIX ARGUMENTÉ. Le texte écrit « L'employeur organise » : le sujet de l'obligation est l'employeur, et l'obligation d'organiser existe dès qu'il y a un salarié, même si aucun titre n'a été déclaré dans l'outil. Une seule ligne, indépendante des équipements — exactement la sémantique de l'ADR-022.\n\nPOURQUOI ELLE N'EST PAS SEULE. `formation-securite-salarie-accueil` la double côté salarié, et ce n'est pas une redondance : la première est due même avec zéro titre déclaré, la seconde ne produit de ligne que par personne déclarée. Les fondre aurait forcé un choix entre deux erreurs — soit une obligation qui disparaît quand personne n'est déclaré (alors qu'elle est due dès le premier salarié), soit une obligation qui ne se solde jamais nominativement (alors que le délai d'un mois de R. 4141-20 court par travailleur). Le brief du lot 7 posait la question — « les deux existent peut-être, et alors ce sont deux obligations » — et la lecture du texte répond oui.\n\nPÉRIODICITÉ « AUTRE », DÉLIBÉRÉMENT. L. 4141-2 dit « répétée périodiquement dans des conditions déterminées par voie réglementaire ou par convention ou accord collectif de travail ». Les vingt articles R. 4141-* ne fixent aucune durée — vérifié article par article le 2026-08-31 —, et l'autre branche renvoie aux accords collectifs, que l'outil ne lit pas. Écrire « annuelle » aurait fabriqué une échéance que le droit ne porte pas.\n\nCE QUE L'ARTICLE R. 4141-6 IMPOSE ET QUE L'OUTIL NE TRACE PAS : l'association du médecin du travail à l'élaboration des actions de formation. Aucun champ ne la porte, et en créer un sans arbitrage donnerait une case à cocher invérifiable. La référence est citée, la réserve est au corpus.\n\nDEUX ARTICLES DU CHAPITRE RESTENT NON ENCODÉS, tous deux événementiels : R. 4141-8 (formation après accident grave ou accidents répétés) et R. 4141-12 (après modification des conditions de circulation ou d'exploitation). Ils sont inscrits au corpus en `obligation_manquante`. Il n'y a pas de déclencheur « événement » dans le modèle, et le registre des accidents du travail est hors périmètre.\n\n⚠ LA `description` DE CETTE OBLIGATION EST FAUSSE SUR UN POINT, ET C'EST CELUI-CI. Elle conclut « obligation permanente, à maintenir, et non une échéance qui tombe à date ». NE LA CROYEZ PAS SUR CE POINT : la nature encodée est `echeance_recurrente`, et c'est elle qui fait foi. La description n'a pas été réécrite parce que c'est un texte relu, dont la reprise demande de rouvrir sa relecture — pas parce qu'elle aurait raison.\n\nNATURE : ÉCHÉANCE RÉCURRENTE (ADR-026). Celle-ci conclut « obligation permanente, à maintenir, et non une échéance qui tombe à date ». Le premier membre est exact, le second est une conséquence produit, pas une lecture du texte : L. 4141-2 écrit que la formation est « RÉPÉTÉE PÉRIODIQUEMENT dans des conditions déterminées par voie réglementaire ou par convention ou accord collectif de travail ». Le texte impose donc de la refaire ; il délègue seulement le rythme, à un règlement qui ne l'a pas fixé. C'est exactement le couple `nature: echeance_recurrente` + `periodicite: autre` que l'ADR-026 rend écrivable : elle revient, on ne sait pas à quel rythme. La conséquence pratique est décisive pour l'écran des états permanents : une case cochée à vie sur « organiser la formation à la sécurité » ment au premier embauché suivant.",
  },

  {
    id: "formation-securite-salarie-accueil",
    domaine: "formation_securite",
    libelle: "Formation à la sécurité reçue par le salarié",
    description:
      "Chaque travailleur bénéficie de la formation à la sécurité lors de son embauche, lors d'un changement de poste ou de technique, et lorsqu'il est affecté à l'une des tâches énumérées par R. 4141-15 (machines, produits chimiques, manutention, entretien, conduite d'engins, échafaudages, travaux sur cordes, contact avec des animaux dangereux). Le volet « conduite à tenir en cas d'accident ou de sinistre » est dispensé dans le mois qui suit l'affectation à l'emploi. Aucun texte ne fixe de durée de validité : la formation reçue n'expire pas, elle se complète quand le poste change.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-20 (formation dispensée dans le mois qui suit l'affectation du travailleur à son emploi)",
        article: "R. 4141-20",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532838",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 4141-2 (bénéficiaires : embauche, changement de poste, salariés temporaires, reprise)",
        article: "L. 4141-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903166",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-2 (information et formation dispensées lors de l'embauche et chaque fois que nécessaire)",
        article: "R. 4141-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019960813",
        versionConstatee: "2008-12-20",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4141-15 (tâches concernées)",
        article: "R. 4141-15",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532850",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4141-16 (changement de poste de travail ou de technique)",
        article: "R. 4141-16",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532848",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-18 (bénéficiaires de la formation à la conduite à tenir en cas d'accident)",
        article: "R. 4141-18",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532842",
        versionConstatee: "2008-05-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-19 (formation à la conduite à tenir lors d'un changement de poste)",
        article: "R. 4141-19",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532840",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "evenementielle",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { travail: true },
    porteur: "salarie",
    exclut: [],
    pieceMedicale: false,
    transmet: [],
    notesInternes:
      "C'EST LA LIGNE DE CATALOGUE QUI RÉPOND À LA QUESTION DE CAMILLE. Jusqu'ici le catalogue des titres de salarié n'en comptait qu'une, l'attestation médicale de R. 4544-11-1, et la transmission de l'habilitation électrique déclarait `titre: null`. Celle-ci est due à TOUS les salariés, pas seulement aux électriciens.\n\nPOURQUOI UN TITRE ALORS QUE LE TEXTE DIT « L'EMPLOYEUR ORGANISE ». Deux raisons écrites. D'abord R. 4141-20 : le délai d'un mois court « à compter de l'affectation DU TRAVAILLEUR à son emploi » — c'est une date par personne, pas par établissement. Ensuite L. 4141-5, en vigueur depuis le 27 juin 2026 : le passeport de prévention « comporte les attestations, certificats, certifications professionnelles et diplômes obtenus dans le cadre des formations relatives à la santé et à la sécurité au travail mentionnées au même article L. 4141-2 ». Le droit affirme donc lui-même que ces formations produisent une pièce nominative. C'est l'argument décisif, et il est récent.\n\nPÉRIODICITÉ « AUTRE » ET `echeanceLe` NULLE. Aucun texte ne donne de durée de validité à la formation à la sécurité. `TitreSalarie.echeanceLe` est nullable précisément pour ce cas — c'est déjà celui de l'habilitation électrique. Une formation reçue reste acquise ; elle se complète lors d'un changement de poste, ce qui est un événement, pas une expiration.\n\nLE DÉLAI D'UN MOIS N'EST PAS CALCULÉ. Il court depuis l'affectation à l'emploi, et le modèle ne porte pas la date d'affectation : `TitreSalarie.delivreLe` est la date de la formation reçue, pas celle de l'embauche. Le mois est rappelé en description, il n'engendre aucune ligne de calendrier. L'exposer supposerait un champ « date d'affectation » sur `Salarie`, qui n'existe pas et que ce lot n'a pas à créer.\n\n`pieceMedicale: false` — une attestation de formation à la sécurité n'a rien de médical. Le drapeau est requis pour que l'oubli ne compile pas ; ici il est faux à bon droit, et l'interface peut proposer d'en conserver la trace.\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026). Deux titres, et le second commande : L. 4141-2 vise l'embauche, mais aussi le changement de poste ou de technique, et R. 4141-15 l'affectation à l'une des tâches qu'il énumère. La formation reçue n'expire pas — la description le dit — mais elle est redue à chaque fois que le poste bouge. Un titre déclaré une fois ne vaut donc pas pour la carrière.",
  },

  {
    id: "formation-securite-etablissement-information",
    domaine: "formation_securite",
    libelle: "Informer les salariés sur les risques et l'accès au DUERP",
    description:
      "L'employeur informe les travailleurs, d'une manière compréhensible pour chacun, sur les risques pour leur santé et leur sécurité. Cette information porte notamment sur les modalités d'accès au document unique d'évaluation des risques, sur les mesures de prévention qu'il retient, sur le rôle du service de santé au travail, sur le règlement intérieur le cas échéant, et sur les consignes de sécurité incendie ainsi que l'identité des personnes chargées de l'évacuation. Obligation permanente : elle est due à l'embauche et chaque fois que nécessaire.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "L. 4141-1 (obligation générale d'information)",
        article: "L. 4141-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000027326445",
        versionConstatee: "2013-04-18",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4141-3-1 (contenu de l'information due aux travailleurs)",
        article: "R. 4141-3-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021723595",
        versionConstatee: "2010-01-23",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4141-2 (information dispensée lors de l'embauche et chaque fois que nécessaire)",
        article: "R. 4141-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019960813",
        versionConstatee: "2008-12-20",
      },
    ],
    periodicite: "autre",
    nature: "evenementielle",
    pieceAttendue: null,
    faitGenerateur:
      "À l'embauche d'un salarié, et chaque fois que nécessaire",
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "INFORMER N'EST PAS FORMER, ET LE CHAPITRE LE DIT DANS SON TITRE : « Obligation générale d'information ET de formation ». L. 4141-1 porte l'information, L. 4141-2 la formation ; R. 4141-3-1 détaille le contenu de la première, R. 4141-3 celui de la seconde. Les fondre en une obligation « information et formation » aurait effacé la distinction que le Code prend soin de faire.\n\nCELLE-CI EST PARTICULIÈREMENT UTILE À UNE TPE, et c'est ce qui a fait qu'elle est encodée plutôt que laissée en `obligation_manquante` : le 1° de R. 4141-3-1 impose d'informer les salariés des MODALITÉS D'ACCÈS AU DUERP. Un dirigeant qui tient son document unique dans cet outil et ne l'a jamais montré à ses salariés est en défaut sur ce point précis, et ne le sait pas.\n\nPORTEUR ÉTABLISSEMENT et périodicité « autre » : c'est un état à maintenir, dû à l'embauche et « chaque fois que nécessaire » (R. 4141-2). Aucune durée n'est écrite, aucune n'est inventée.\n\nCriticité 3 et non 4 : le manquement est réel et sanctionnable, mais il n'expose pas directement à un dommage corporel comme l'absence de formation elle-même.\n\n⚠ LA `description` DE CETTE OBLIGATION EST FAUSSE SUR UN POINT, ET C'EST CELUI-CI. Elle écrit « Obligation permanente ». NE LA CROYEZ PAS : la nature encodée est `evenementielle`, et c'est elle qui fait foi. Même motif que pour `formation-securite-etablissement-organisation` — la description est un texte relu, sa reprise demande de rouvrir sa relecture.\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026). R. 4141-2 dispense l'information « lors de l'embauche et CHAQUE FOIS QUE NÉCESSAIRE ». Ce n'est ni un rythme ni un état : c'est un fait — une embauche, un risque nouveau, un changement de poste — que le produit n'observe pas. La règle de résolution de l'ADR-026 range cette obligation sur le titre qui oblige à refaire l'acte. Une déclaration unique ne la solde donc pas.",
  },

  // ---------------------------------------------------------------------------
  // Conduite d'équipements mobiles automoteurs et de levage (R. 4323-55 et s.)
  // ---------------------------------------------------------------------------
  {
    id: "conduite-salarie-formation",
    domaine: "formation_securite",
    libelle: "Formation à la conduite d'équipements mobiles ou de levage",
    description:
      "La conduite des équipements de travail mobiles automoteurs et des équipements servant au levage est réservée aux travailleurs ayant reçu une formation adéquate, complétée et réactualisée chaque fois que nécessaire. Le Code ne fixe aucune durée de validité ni aucun rythme de recyclage : c'est un acquis à entretenir, pas une échéance. Le CACES est l'un des moyens usuels de démontrer cette formation ; il n'est pas exigé par le Code du travail.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-55 (conduite réservée aux travailleurs ayant reçu une formation adéquate)",
        article: "R. 4323-55",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531407",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "evenementielle",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 5,
    typologies: { travail: true },
    porteur: "salarie",
    exclut: [],
    pieceMedicale: false,
    transmet: [],
    notesInternes:
      "LE CACES N'EST PAS ENCODÉ, ET C'EST DÉLIBÉRÉ. Il n'apparaît dans aucun des trois articles de la section 7 — vérifié le 2026-08-31 sur les trois. C'est un dispositif conventionnel porté par des recommandations de la Caisse nationale d'assurance maladie ; le Code exige une « formation adéquate » et une « autorisation de conduite », jamais un CACES. L'encoder comme obligation réglementaire aurait fait entrer une source non opposable dans un référentiel qui n'en accepte aucune (ADR-003).\n\nAUCUN RECYCLAGE QUINQUENNAL. Les cinq ans que l'on rencontre partout sont la durée de validité d'un CACES, fixée par les recommandations CNAM — pas par le droit. R. 4323-55 dit « complétée et réactualisée chaque fois que nécessaire », sans chiffre. C'est exactement la configuration du « triennal » que ce dépôt a déjà eu à retirer, et la réponse est la même : `periodicite: \"autre\"`.\n\nATTENTION À NE PAS CONFONDRE avec `conduite-salarie-attestation-medicale`, qui porte bien cinq ans — mais parce que R. 4323-56 les écrit, et ils s'appliquent à l'attestation médicale, pas à la formation.\n\nQUELS ÉQUIPEMENTS ? R. 4323-55 vise « les équipements de travail mobiles automoteurs et les équipements de travail servant au levage » — sans liste. Le porteur salarié évite d'avoir à trancher : aucune ligne ne naît d'un équipement déclaré, l'employeur déclare qui conduit quoi.\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026). R. 4323-55 écrit que la formation est « complétée et réactualisée CHAQUE FOIS QUE NÉCESSAIRE ». Aucun rythme, mais un fait déclencheur — un nouvel équipement, un changement de conditions d'utilisation — que le produit n'observe pas. À ne pas confondre avec l'autorisation de conduite de R. 4323-56, qui est un état permanent.",
  },

  {
    id: "conduite-salarie-autorisation",
    domaine: "formation_securite",
    libelle: "Autorisation de conduite délivrée par l'employeur",
    description:
      "La conduite de certains équipements présentant des risques particuliers est subordonnée à une autorisation de conduite délivrée par l'employeur. L'autorisation et une copie de l'attestation médicale sont tenues à la disposition de l'inspection du travail et des services de prévention des organismes de sécurité sociale. Le Code ne donne aucune durée de validité à l'autorisation elle-même : elle vaut tant qu'elle n'est pas retirée — mais sa validité est subordonnée à celle de l'attestation médicale, qui vaut cinq ans.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-56, alinéa 1 (autorisation de conduite délivrée par l'employeur)",
        article: "R. 4323-56",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033769343",
        versionConstatee: "2025-10-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4323-57 (arrêtés fixant les catégories d'équipements soumises à autorisation)",
        article: "R. 4323-57",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531403",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "autorisation de conduite",
    realisateurs: ["exploitant"],
    criticite: 5,
    typologies: { travail: true },
    porteur: "salarie",
    exclut: [],
    pieceMedicale: false,
    transmet: [
      {
        vers: "salarie_designe",
        titre: "conduite-salarie-attestation-medicale",
        motif:
          "R. 4323-56 : « La validité de cette autorisation de conduite est subordonnée à la détention, par le travailleur, d'une attestation qu'il ne présente pas de contre-indications médicales ». L'autorisation ne porte pas d'échéance propre, mais elle tombe avec l'attestation — qui, elle, expire au bout de cinq ans. Le produit ne dérive pas ce lien : il le nomme, pour qu'une autorisation déclarée sans attestation ne passe pas pour complète.",
      },
    ],
    notesInternes:
      "PAS D'ÉCHÉANCE DANS LE TEXTE, ET C'EST LA RÉPONSE À LA QUESTION POSÉE PAR LE BRIEF. R. 4323-56 a été relu en entier le 2026-08-31 dans sa version du 1er octobre 2025 : aucune durée n'est attachée à l'autorisation de conduite. Les cinq ans qu'il mentionne portent sur l'attestation médicale, et sur elle seule. `periodicite: \"autre\"` — un état à maintenir.\n\nMAIS LA VALIDITÉ EST CHAÎNÉE, et c'est ce que la transmission dit. Une autorisation sans attestation valide n'est plus valide, alors même que rien ne la fait « expirer » au calendrier. C'est précisément le cas que l'ADR-024 existe pour nommer : le produit ne dérive pas, il déclare.\n\nLE RÉFÉRENTIEL NE PEUT PAS DIRE QUELS ÉQUIPEMENTS SONT CONCERNÉS. R. 4323-57, 2° confie à des arrêtés le soin de fixer « les catégories d'équipements de travail dont la conduite nécessite d'être titulaire d'une autorisation de conduite ». Un arrêté du 26 septembre 2025 relatif à la formation à la conduite existe ; il n'est pas dépouillé, donc aucune obligation ne s'y appuie et aucune liste d'équipements n'est encodée. Le corpus le dit en toutes lettres.\n\nNATURE : ÉTAT PERMANENT, ET `pieceAttendue` NON NULLE (ADR-026). L'autorisation vaut tant qu'elle n'est pas retirée : il n'y a pas d'acte à refaire, il y a un état — quelqu'un est autorisé — à maintenir. Et R. 4323-56 en fait un ÉCRIT que l'inspection se fait présenter, d'où `pieceAttendue: \"autorisation de conduite\"`. Sa validité est subordonnée à celle de l'attestation médicale, qui, elle, est une échéance récurrente quinquennale portée par une ligne distincte (`conduite-salarie-attestation-medicale`).",
  },

  // ---------------------------------------------------------------------------
  // Formations liées à une activité ou à un mandat (lot 8)
  //
  // Quatre lignes, deux porteurs, et le partage n'est pas arbitraire : deux
  // d'entre elles sont des obligations d'ORGANISER que rien ne rattache à une
  // personne identifiable, les deux autres sont des titres qu'une personne
  // nommée détient. Le critère qui tranche n'est pas tout à fait celui du
  // lot 7 : au « le texte date-t-il par personne, produit-il une pièce
  // nominative » s'ajoute une condition qui s'est révélée décisive — LE PRODUIT
  // SAIT-IL À QUI ATTRIBUER LE TITRE. Un titre que personne ne sait attribuer
  // produit zéro ligne (ADR-023), donc porteur établissement. Le développer
  // ligne par ligne en `notesInternes`.
  //
  // Les deux titres partagent le régime de `L. 2315-16` à `L. 2315-18` et NE
  // PARTAGENT PAS leur périodicité : `L. 2315-17` renouvelle la formation « au
  // bout de quatre ans de mandat exercé », condition écrite pour des
  // représentants élus et inapplicable à un salarié désigné.
  // ---------------------------------------------------------------------------
  {
    id: "formation-securite-etablissement-manutention",
    domaine: "formation_securite",
    libelle: "Formation à la manutention manuelle (gestes et postures)",
    description:
      "L'employeur fait bénéficier les travailleurs dont l'activité comporte des manutentions manuelles d'une information sur les risques qu'ils encourent lorsque les activités ne sont pas exécutées d'une manière techniquement correcte, et d'une formation adéquate à la sécurité relative à l'exécution de ces opérations. Au cours de cette formation, essentiellement à caractère pratique, les travailleurs sont informés sur les gestes et postures à adopter. Le Code ne fixe aucune durée de validité ni aucun recyclage.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4541-8 (information sur les risques et formation adéquate à la sécurité des travailleurs dont l'activité comporte des manutentions manuelles)",
        article: "R. 4541-8",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528891",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "PORTEUR ÉTABLISSEMENT ET NON SALARIÉ, ET C'EST LA QUESTION QUE LE BRIEF POSAIT. Le critère du lot 7 pour faire d'une formation un titre de salarié était double : le texte la date par personne (R. 4141-20 : « à compter de l'affectation DU TRAVAILLEUR à son emploi »), ou il lui fait produire une pièce nominative (L. 4141-5 : passeport de prévention). R. 4541-8 ne fait ni l'un ni l'autre. Il n'écrit aucun délai, aucune attestation, aucune validité : il écrit « l'employeur fait bénéficier les travailleurs [...] d'une formation adéquate ». C'est une obligation d'organiser, et elle se solde à l'échelle de l'établissement.\n\nET SURTOUT : LE PORTEUR SALARIÉ AURAIT ÉTÉ INAPPLICABLE ICI. Une obligation salarié ne produit de ligne que si l'employeur déclare qui détient le titre (ADR-023). Or R. 4541-8 vise « les travailleurs dont l'activité comporte des manutentions manuelles » — une qualification que le produit ne détient pas et ne peut pas dériver : ce serait le cinquième déclencheur, l'activité réellement exercée, non implémenté. On aurait donc eu un titre que personne ne sait à qui attribuer, et zéro ligne tant que le dirigeant n'aurait pas deviné. Le porteur établissement pose au contraire une ligne unique et exacte : « organisez cette formation pour ceux qui manutentionnent ».\n\nCE QUE CE CHOIX COÛTE, ET JE LE DIS. Avec un porteur établissement, l'outil ne saura jamais QUI a été formé — donc rien ne se prouve nominativement en contrôle. C'est une perte réelle. Elle est préférée au faux négatif muet du porteur salarié, et elle se rattrape le jour où le cinquième déclencheur existera.\n\nAUCUN RECYCLAGE. On lit couramment « gestes et postures à renouveler tous les deux ans » ou « tous les cinq ans ». Le texte, relu en entier le 2026-08-31 dans sa version du 2008-05-01, n'écrit aucune durée. `periodicite: \"autre\"`.\n\nR. 4541-6 EST CITÉ PAR L'ARTICLE ET N'EST PAS DÉPOUILLÉ. Le 1° renvoie aux « facteurs individuels de risque définis par l'arrêté prévu à l'article R. 4541-6 ». Cet arrêté n'a pas été ouvert, aucune obligation ne s'y appuie, et le corpus le dit.\n\nCriticité 3 : les troubles musculo-squelettiques sont la première cause de maladie professionnelle reconnue en restauration et en commerce, mais le manquement n'expose pas à un accident immédiat.\n\nNATURE : ÉTAT PERMANENT (ADR-026). R. 4541-8 n'écrit ni rythme ni fait déclencheur : il impose que les travailleurs concernés aient reçu l'information et la formation. Porté par l'établissement, cela se lit « l'employeur fait en sorte que ce soit le cas », donc un état à maintenir. À distinguer de la formation au travail sur écran, dont R. 4542-16 date l'acte par personne et par modification de poste.",
  },

  {
    id: "formation-securite-etablissement-travail-sur-ecran",
    domaine: "formation_securite",
    libelle: "Information et formation au travail sur écran de visualisation",
    description:
      "L'employeur assure l'information et la formation des travailleurs sur les modalités d'utilisation de l'écran et de l'équipement de travail dans lequel cet écran est intégré. Chaque travailleur en bénéficie avant sa première affectation à un travail sur écran de visualisation, et chaque fois que l'organisation du poste de travail est modifiée de manière substantielle.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4542-16 (information et formation avant la première affectation à un travail sur écran et à chaque modification substantielle du poste)",
        article: "R. 4542-16",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528838",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "evenementielle",
    pieceAttendue: null,
    faitGenerateur:
      "Avant la première affectation d'un salarié à un travail sur écran, et chaque fois que l'organisation du poste de travail est modifiée de manière substantielle",
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { travail: true },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "MÊME RAISONNEMENT DE PORTEUR QUE LA MANUTENTION, AVEC UNE NUANCE QUI AURAIT PU LE RENVERSER. R. 4542-16 date bien l'obligation par personne — « chaque travailleur en bénéficie AVANT SA PREMIÈRE AFFECTATION à un travail sur écran » —, ce qui est le premier des deux critères du lot 7. Mais il ne remplit pas le second : aucune pièce nominative, aucune attestation, aucune validité. Et surtout, l'obstacle décisif reste le même : le produit ne sait pas qui travaille sur écran. Un titre que personne ne sait attribuer ne produit aucune ligne. Porteur établissement, donc, avec le même coût assumé : l'outil ne saura pas qui a été formé.\n\nLE SECOND DÉCLENCHEMENT EST ÉVÉNEMENTIEL, ET IL N'EST PAS SIMULÉ. « Chaque fois que l'organisation du poste de travail est modifiée de manière substantielle » : un événement, non daté et non détectable. C'est exactement ce que `.claude/CLAUDE.md` décrit en refusant un sixième déclencheur — l'événement date l'obligation, il ne la fait pas naître. La description le porte en toutes lettres, l'outil n'en fabrique aucune échéance.\n\nAUCUNE PÉRIODICITÉ : le texte n'écrit ni durée ni recyclage. Verbatim relu le 2026-08-31, version du 2008-05-01. `periodicite: \"autre\"`.\n\nCE QUI N'EST PAS ENCODÉ DE CE CHAPITRE, ET POURQUOI. R. 4542-1 et s. imposent aussi une analyse des postes (R. 4542-3), des règles d'ambiance et d'interface, et un examen ophtalmologique approprié (R. 4542-17). Aucun de ces articles n'a été ouvert sur Légifrance dans ce lot : ils ne sont donc ni encodés ni décrits, et le corpus les porte comme non dépouillés plutôt que comme absents. C'est un manque annoncé, pas un silence.\n\nCriticité 2 : la fatigue visuelle et les TMS liés à l'écran sont des risques différés, sans exposition immédiate.\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026). R. 4542-16 porte DEUX titres — « avant sa première affectation à un travail sur écran » (ponctuel) et « chaque fois que l'organisation du poste de travail est modifiée de manière substantielle » (événementiel). La règle de résolution de l'ADR-026 retient le second, parce que c'est lui qui oblige à refaire l'acte : une déclaration unique cesserait d'être vraie au premier réaménagement.",
  },

  {
    id: "formation-securite-salarie-cse-sst",
    domaine: "formation_securite",
    libelle:
      "Formation en santé, sécurité et conditions de travail (membre du CSE)",
    description:
      "Les membres de la délégation du personnel du comité social et économique et le référent en matière de lutte contre le harcèlement sexuel bénéficient de la formation nécessaire à l'exercice de leurs missions en matière de santé, de sécurité et de conditions de travail. Cette formation dure au minimum cinq jours lors du premier mandat, et trois jours pour chaque membre en cas de renouvellement. Son financement est pris en charge par l'employeur, et le temps de formation est pris sur le temps de travail. Elle est renouvelée lorsque le représentant a exercé son mandat pendant quatre ans, consécutifs ou non.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 2315-18 (formation en santé, sécurité et conditions de travail des membres de la délégation du personnel du CSE : cinq jours au premier mandat, trois au renouvellement)",
        article: "L. 2315-18",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036761949",
        versionConstatee: "2022-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 2315-17 (les formations sont renouvelées lorsque les représentants ont exercé leur mandat pendant quatre ans, consécutifs ou non)",
        article: "L. 2315-17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035621181",
        versionConstatee: "2026-05-28",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 2315-16 (le temps de formation est pris sur le temps de travail et rémunéré comme tel)",
        article: "L. 2315-16",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035621179",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "quadriennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true, effectifMin: 11 },
    porteur: "salarie",
    exclut: [],
    pieceMedicale: false,
    transmet: [],
    notesInternes:
      "PORTEUR SALARIÉ, ET C'EST LE CAS OÙ LE CRITÈRE EST NETTEMENT REMPLI. Le texte date la formation PAR PERSONNE — « cinq jours lors du PREMIER MANDAT », « trois jours POUR CHAQUE MEMBRE » au renouvellement — et il la rattache à un mandat individuel : un membre du CSE est élu, il a un nom. C'est la différence avec la manutention et l'écran, où le texte vise « les travailleurs dont l'activité comporte », une catégorie que personne ne sait nommer.\n\nQUADRIENNALE, ET C'EST UNE CORRECTION APRÈS RELECTURE. Cette ligne a d'abord porté `autre`, au motif que L. 2315-18 ne chiffrait qu'une durée de stage. C'était faux, et le défaut venait d'un dépouillement incomplet : L. 4644-1 renvoie aux articles L. 2315-16 À L. 2315-18, et je n'avais ouvert que le dernier. `L. 2315-17`, ouvert le 2026-08-31, écrit : « Ces formations sont renouvelées lorsque les représentants ont exercé leur mandat pendant quatre ans, consécutifs ou non. » Le chiffre est dans le Code, il porte bien sur le RENOUVELLEMENT de la formation, et le taire aurait été l'erreur symétrique de celle que ce dépôt combat — non pas inventer une échéance, mais en effacer une qui existe.\n\nCE QUE `quadriennale` DIT DE TROP, ET POURQUOI C'EST LE BON SENS DE L'ERREUR. Les quatre ans ne comptent pas du temps calendaire depuis la formation : ils comptent du MANDAT EXERCÉ, « consécutifs ou non ». Un élu qui siège deux ans, s'interrompt trois, puis siège deux ans encore atteint ses quatre ans de mandat au bout de sept années civiles. Le produit ne modélise aucun mandat — il n'a ni date d'élection, ni durée, ni interruption —, donc les deux ne coïncident que pour un mandat continu, qui est le cas ordinaire. L'échéance calculée arrive donc à la bonne date pour la quasi-totalité des dossiers, et EN AVANCE pour les mandats interrompus. C'est le sens d'erreur que ce dépôt préfère explicitement : une sur-application visible et corrigeable vaut mieux qu'un faux négatif muet. `TitreSalarie.echeanceLe`, déclaré par l'employeur, prime de toute façon sur le calcul.\n\nÀ NE PAS CONFONDRE AVEC LES PLAFONDS DU LOT 7. `R. 4624-16` écrit « qui ne peut excéder cinq ans » : le chiffre y est une BORNE EXTÉRIEURE, et l'échéance encodée est la date au-delà de laquelle l'employeur est nécessairement en défaut. Ici c'est l'inverse : quatre ans de mandat est le SEUIL À PARTIR DUQUEL le renouvellement est dû, donc une borne intérieure. Les deux se ressemblent et ne se comportent pas pareil — le premier peut annoncer « à jour » à tort, le second « en retard » à tort.\n\nVERSION RÉCENTE À SURVEILLER : `L. 2315-17` est en vigueur depuis le 2026-05-28, soit trois mois avant ce lot. C'est le texte le plus fraîchement modifié du référentiel après `R. 4225-2`.\n\nCINQ JOURS ET TROIS JOURS RESTENT DES DURÉES DE STAGE, pas des périodicités : ils disent combien de temps dure la formation, pas quand la refaire. C'est `L. 2315-17` qui dit quand.\n\n`effectifMin: 11` PARCE QU'UN CSE N'EXISTE PAS EN DEÇÀ (L. 2311-2). Sans ce seuil, le catalogue aurait proposé à un dirigeant de trois personnes un titre que personne chez lui ne peut détenir. Le seuil restreint le catalogue, il n'engendre aucune ligne par lui-même : les instances d'une obligation salarié naissent d'un `TitreSalarie` déclaré, jamais du moteur.\n\nLE SALARIÉ DÉSIGNÉ COMPÉTENT A SA PROPRE LIGNE, ET IL N'EST PLUS ICI. La première rédaction de ce lot faisait porter à cette obligation les deux populations, au motif que L. 4644-1 renvoie « aux conditions prévues aux articles L. 2315-16 à L. 2315-18 ». La relecture des trois articles du renvoi a montré que ce sont DEUX ACTES sous un même régime : voir `formation-securite-salarie-designe-competent`, dont les notes portent l'argument. Le discriminant décisif est dans L. 2315-17 lui-même — son renouvellement est écrit en termes de « représentants » ayant « exercé leur mandat », vocabulaire qui ne peut pas s'appliquer à un salarié DÉSIGNÉ, qui ne détient aucun mandat.\n\n`pieceMedicale: false` — une formation en santé, sécurité et conditions de travail atteste d'une compétence, pas d'un état de santé. Le mot « santé » dans l'intitulé ne la rend pas médicale, et c'est exactement l'inférence par mot-clé que ce référentiel refuse partout ailleurs.\n\nLE RÉFÉRENT HARCÈLEMENT PARTAGE CETTE LIGNE. L. 2315-18 vise aussi « le référent prévu au dernier alinéa de l'article L. 2314-1 » : même formation, même fondement. Sa désignation relève de L. 2314-1, non dépouillé, et n'est portée par aucune obligation.",
  },

  {
    id: "formation-securite-salarie-designe-competent",
    domaine: "formation_securite",
    libelle:
      "Formation en santé au travail du salarié désigné compétent",
    description:
      "Le ou les salariés désignés par l'employeur pour s'occuper des activités de protection et de prévention des risques professionnels bénéficient d'une formation en matière de santé au travail, dans les conditions prévues pour la formation des membres du comité social et économique : temps pris sur le temps de travail et rémunéré, organisme enregistré auprès de l'autorité administrative, durée minimale de cinq jours, financement à la charge de l'employeur. Elle est due dès le premier salarié désigné, sans condition d'effectif. Le Code ne lui fixe aucune durée de validité.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 4644-1 I alinéa 2 (le ou les salariés désignés bénéficient d'une formation en matière de santé au travail dans les conditions prévues aux articles L. 2315-16 à L. 2315-18)",
        article: "L. 4644-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043893856",
        versionConstatee: "2022-03-31",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 2315-18 (durée minimale de cinq jours au premier mandat, trois jours au renouvellement ; financement par l'employeur)",
        article: "L. 2315-18",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036761949",
        versionConstatee: "2022-03-31",
        note: "Référence de contexte : elle fournit les conditions, pas l'obligation.",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "L. 2315-17 (organisme enregistré ; renouvellement après quatre ans de MANDAT exercé — condition inapplicable à un salarié désigné, qui n'en détient aucun)",
        article: "L. 2315-17",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035621181",
        versionConstatee: "2026-05-28",
      },
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4644-1 (désignation après avis du comité social et économique s'il existe ; temps et moyens nécessaires ; absence de discrimination)",
        article: "R. 4644-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036483822",
        versionConstatee: "2018-01-01",
      },
    ],
    periodicite: "autre",
    nature: "ponctuelle",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "salarie",
    exclut: [],
    pieceMedicale: false,
    transmet: [],
    notesInternes:
      "DEUX ACTES SOUS UN MÊME RÉGIME, ET NON UN SEUL. C'est la question que ce lot a rouverte après coup, et la réponse vient de la lecture des trois articles du renvoi — dont deux n'avaient pas été ouverts la première fois. Quatre indices, dans l'ordre de leur force :\\n\\n1. LE VOCABULAIRE DU RENVOI. L. 4644-1 écrit « bénéficient d'une formation en matière de santé au travail DANS LES CONDITIONS PRÉVUES aux articles L. 2315-16 à L. 2315-18 ». « Dans les conditions prévues » renvoie à des MODALITÉS. Si le législateur avait voulu la même formation, il aurait écrit « bénéficient de la formation prévue à l'article L. 2315-18 » — la tournure existe et il ne l'a pas employée.\\n\\n2. L'OBJET DIFFÈRE. L. 2315-18 vise « la formation nécessaire à l'exercice de LEURS MISSIONS en matière de santé, de sécurité et de conditions de travail PRÉVUES AU CHAPITRE II DU PRÉSENT TITRE » — c'est-à-dire les attributions du CSE. Un salarié désigné n'a aucune de ces attributions : il s'occupe « des activités de protection et de prévention des risques professionnels de l'entreprise » (L. 4644-1). L'objet de la formation est défini par référence à des missions qu'il n'exerce pas.\\n\\n3. L'INDICE DÉCISIF EST DANS L. 2315-17. Son renouvellement est écrit ainsi : « Ces formations sont renouvelées lorsque LES REPRÉSENTANTS ont exercé LEUR MANDAT pendant quatre ans, consécutifs ou non. » Un salarié désigné n'est pas un représentant et ne détient aucun mandat : R. 4644-1 le fait DÉSIGNER par l'employeur après avis du CSE, il n'est pas élu. Si le renvoi valait identité d'acte, cette condition de renouvellement serait inapplicable à la moitié de ses destinataires — ce qui n'a pas de sens. Elle est cohérente seulement si le renvoi porte sur des conditions dont chacune s'applique là où elle peut.\\n\\n4. LA CONSÉQUENCE PRATIQUE CONFIRME. Le seuil de onze salariés de la ligne CSE vient de L. 2311-2, qui ne s'applique qu'au CSE. Le salarié désigné est dû DÈS LE PREMIER SALARIÉ. Une ligne unique aurait obligé à choisir entre proposer un titre CSE à une entreprise de trois personnes, ou priver un employeur de six personnes de la formation de son désigné. Les deux étaient faux.\\n\\nPÉRIODICITÉ `autre`, ET C'EST LE POINT LE PLUS FIN DE CE LOT. La ligne CSE porte `quadriennale` parce que L. 2315-17 chiffre son renouvellement. Celle-ci porte `autre` parce que le même article chiffre ce renouvellement EN ANNÉES DE MANDAT EXERCÉ, et qu'un salarié désigné n'exerce aucun mandat. Le même renvoi produit donc deux périodicités différentes, et ce n'est pas une incohérence : c'est le texte lu de près. Encoder `quadriennale` ici aurait fabriqué une échéance en appliquant à quelqu'un une condition écrite pour un autre.\\n\\nCE QUE JE NE PEUX PAS AFFIRMER, ET QUI SE DIT. Aucun texte lu ne donne de durée de validité à la formation du salarié désigné. Cela ne veut pas dire qu'elle est acquise à vie : cela veut dire que le Code ne le dit pas. `TitreSalarie.echeanceLe` reste nullable — l'employeur qui connaît l'échéance de son attestation la saisit, l'outil ne l'invente pas. Même régime que l'habilitation électrique et que la formation à la sécurité de R. 4141-20.\\n\\nPORTEUR SALARIÉ. Le titre est nominatif : R. 4644-1 fait désigner UNE OU PLUSIEURS PERSONNES, après avis du CSE, et l'employeur sait qui il a désigné. C'est le critère qui manquait à la manutention et à l'écran — le produit sait ici à qui attribuer le titre. `prevention-etablissement-salarie-designe` porte l'acte de désigner, celle-ci porte la formation de la personne désignée.\\n\\nMÊME ARTICLE FONDATEUR QUE `prevention-etablissement-salarie-designe`, ET C'EST DÉCLARÉ. Les deux se fondent sur L. 4644-1 : le I alinéa 1 pour la désignation, le I alinéa 2 pour la formation. Le test anti-doublon ne compare que l'article et ne sait pas distinguer deux alinéas ; la paire est donc inscrite dans `PAIRES_DECLAREES` avec sa raison, comme la paire R. 4222-20 avant elle.\\n\\n`pieceMedicale: false` — une attestation de formation en santé au travail atteste d'une compétence, pas d'un état de santé.\\n\\nCriticité 3, la même que la désignation qu'elle prolonge : le manquement est réel et sanctionnable, sans exposition corporelle directe.\n\nNATURE : PONCTUELLE (ADR-026). Le renouvellement de L. 2315-17 court sur quatre ans de MANDAT exercé, et un salarié désigné n'en détient aucun — c'est le point que ce fichier établit plus haut. Aucun autre texte ne date le renouvellement de cette formation : elle est due une fois, à la désignation. Le contraste avec `formation-securite-salarie-cse-sst`, quadriennale, tient tout entier là.",
  },
];
