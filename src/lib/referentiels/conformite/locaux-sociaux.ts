/**
 * Domaine « locaux sociaux » — `R. 4225-2`, `R. 4228-1`, `R. 4228-22`,
 * `R. 4228-23`.
 *
 * CE QUE LE CODE IMPOSE AU BÉNÉFICE DES PERSONNES, et non au titre d'une
 * machine. Des vestiaires, des lavabos, des cabinets d'aisance, de l'eau
 * potable, un endroit où manger. Rien de tout cela n'est un équipement à
 * vérifier : c'est mis à disposition, et maintenu.
 *
 * QUATRE OBLIGATIONS, AUCUNE PÉRIODICITÉ. Aucun des quatre articles n'écrit de
 * durée — ni contrôle annuel des sanitaires, ni analyse périodique de l'eau du
 * robinet. `periodicite: "autre"` pour les quatre. La tentation était réelle
 * sur l'eau potable, où l'on trouve partout des rythmes d'analyse : ils
 * viennent du carnet sanitaire et du Code de la santé publique, pas de
 * `R. 4225-2`, et le produit sert déjà le premier par un module dédié.
 *
 * DEUX OBLIGATIONS EXCLUSIVES SUR LA RESTAURATION, et c'est le point de
 * modélisation de ce fichier. `R. 4228-22` et `R. 4228-23` ne sont pas un
 * article et son exception : ce sont deux régimes qui se partagent tout
 * l'espace au seuil de cinquante salariés. En écrire une seule ligne aurait
 * obligé à choisir laquelle taire. Elles s'écrivent donc `effectifMin: 50` et
 * `effectifMax: 49`, bornes incluses, sans recouvrement ni trou.
 */

import type { Obligation } from "./types";

export const obligationsLocauxSociaux: Obligation[] = [
  {
    id: "locaux-etablissement-installations-sanitaires",
    domaine: "locaux_sociaux",
    libelle: "Vestiaires, lavabos et cabinets d'aisance",
    description:
      "L'employeur met à la disposition des travailleurs les moyens d'assurer leur propreté individuelle, notamment des vestiaires, des lavabos, des cabinets d'aisance et, le cas échéant, des douches. Les articles suivants du chapitre en précisent l'aménagement : local spécial isolé des locaux de travail et de stockage, communication sans passer par l'extérieur, évacuation des effluents conforme aux règlements sanitaires.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4228-1 (moyens d'assurer la propreté individuelle : vestiaires, lavabos, cabinets d'aisance et, le cas échéant, douches)",
        article: "R. 4228-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532006",
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
      "VERBATIM RELEVÉ LE 2026-08-31, version en vigueur depuis le 2008-05-01 : « L'employeur met à la disposition des travailleurs les moyens d'assurer leur propreté individuelle, notamment des vestiaires, des lavabos, des cabinets d'aisance et, le cas échéant, des douches. »\n\nUNE SEULE LIGNE POUR TOUTE LA SECTION, ET C'EST ARGUMENTÉ. La section 1 du chapitre VIII court de `R. 4228-1` à `R. 4228-18` : dispositions générales, vestiaires collectifs, lavabos, cabinets d'aisance, douches. Seul `R. 4228-1` porte l'obligation ; les dix-sept suivants en règlent l'aménagement — surface, isolement, nombre de sièges, température de l'eau. Ce sont des règles de CONFORMITÉ D'UN AMÉNAGEMENT, pas des actes distincts à porter au calendrier. En faire cinq obligations aurait produit cinq lignes que le dirigeant solde du même geste, et dont aucune n'aurait de fondement propre — c'est exactement le défaut de fragmentation que l'ADR-022 a corrigé en retirant `aeration-travail-entretien-annuel`.\n\nCE QUE JE N'AI PAS DÉPOUILLÉ, ET JE LE DIS. `R. 4228-2` à `R. 4228-18` n'ont PAS été ouverts un par un sur Légifrance. La description ci-dessus en résume le contenu d'après les intitulés de sous-sections et le sommaire de la section, pas d'après leur texte. Le corpus `code-travail-locaux-sociaux` est déclaré `articles_cites` pour cette raison précise : il ne prouve rien sur ce que la section contient d'autre. Un lot ultérieur qui voudrait affiner l'aménagement devra les ouvrir.\n\nAUCUNE PÉRIODICITÉ. Le texte n'écrit pas de contrôle périodique des installations sanitaires. Le nettoyage quotidien de `R. 4228-13` est une obligation d'entretien continu, pas une échéance à porter au calendrier — et il n'est pas encodé, faute d'avoir été lu à la source.\n\nCriticité 3 : l'absence de sanitaires est un manquement grave et fréquemment relevé, sans exposer directement à un accident.\n\nNATURE : ÉTAT PERMANENT (ADR-026). Mise à disposition d'installations : un état matériel, aucun acte à refaire.",
  },

  {
    id: "locaux-etablissement-eau-potable",
    domaine: "locaux_sociaux",
    libelle: "Eau potable et fraîche à disposition des travailleurs",
    description:
      "L'employeur met à disposition des travailleurs de l'eau potable et fraîche pour leur permettre de se désaltérer et de se rafraîchir. Lorsque des conditions particulières de travail conduisent les travailleurs à se désaltérer fréquemment, l'employeur met en outre gratuitement à leur disposition au moins une boisson non alcoolisée, la liste des postes concernés étant établie après avis du médecin du travail et du comité social et économique.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4225-2 (mise à disposition d'eau potable et fraîche pour se désaltérer et se rafraîchir)",
        article: "R. 4225-2",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051679293",
        versionConstatee: "2025-06-02",
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
      "ARTICLE RÉCEMMENT RÉÉCRIT, ET C'EST LA RAISON DE L'AVOIR OUVERT. `R. 4225-2` a été modifié par le décret n° 2025-482 du 27 mai 2025 et sa version en vigueur date du 2025-06-02. CE N'EST PAS L'OBJET DE CE DÉCRET, et s'arrêter ici a coûté trois semaines : il crée surtout le chapitre « épisodes de chaleur intense », `R. 4463-1` à `-8` — au corpus (`code-travail-chaleur-intense`) et au référentiel depuis le 2026-09-20. (Cette note a classé cet article en tête du lot 8 par sa fraîcheur : `L. 2315-17`, du même lot, le devance depuis le 2026-05-28. Un rang se périme, une date en vigueur non. Garde : `superlatifs.test.ts`.) Verbatim relevé le 2026-08-31 : « L'employeur met à disposition des travailleurs de l'eau potable et fraîche pour leur permettre de se désaltérer et de se rafraîchir. » La rédaction antérieure ne portait pas « et se rafraîchir » ; encoder de mémoire aurait cité un texte abrogé.\n\nAUCUNE ANALYSE PÉRIODIQUE, ET C'EST LE PIÈGE DE CETTE LIGNE. On trouve partout des rythmes d'analyse d'eau. Aucun ne vient de cet article, qui n'écrit ni contrôle, ni prélèvement, ni durée. Ils viennent du Code de la santé publique et du carnet sanitaire — que ce produit sert déjà par un module dédié (`CarnetSanitaire`, `AnalyseLegionelle`), sur des textes distincts. Encoder ici une analyse annuelle aurait fabriqué une échéance sans texte et l'aurait fait doublonner avec un module existant. `periodicite: \"autre\"`.\n\nR. 4225-3 EST DÉCRIT, PAS ENCODÉ. La boisson non alcoolisée gratuite qu'il impose est conditionnée à des « conditions particulières de travail » que le produit ne sait pas qualifier — ce serait le cinquième déclencheur, l'activité réellement exercée, non implémenté. En faire une obligation à part l'aurait affichée à tout le monde (faux positif de masse chez un bureau) ou à personne. Elle est donc mentionnée en description, où elle informe sans engendrer de ligne, et l'article est classé `non_couvert` au corpus plutôt que `retenu` : le manque se compte.\n\nCriticité 3 : le manquement est constant en contrôle et l'enjeu sanitaire est direct, sans être un risque d'accident.\n\nNATURE : ÉTAT PERMANENT (ADR-026). Mise à disposition : un état matériel.",
  },

  {
    id: "locaux-etablissement-local-restauration",
    domaine: "locaux_sociaux",
    libelle: "Local de restauration (50 salariés et plus)",
    description:
      "Dans les établissements d'au moins cinquante salariés, l'employeur, après avis du comité social et économique, met à leur disposition un local de restauration. Ce local est pourvu de sièges et de tables en nombre suffisant, comporte un robinet d'eau potable, fraîche et chaude, pour dix usagers, et est doté d'un moyen de conservation ou de réfrigération des aliments et des boissons ainsi que d'une installation permettant de réchauffer les plats.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4228-22 (local de restauration dans les établissements d'au moins cinquante salariés)",
        article: "R. 4228-22",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041455665",
        versionConstatee: "2020-01-02",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { travail: true, effectifMin: 50, effectifMaille: "etablissement" },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "DEUX OBLIGATIONS ET NON UNE, PARCE QUE LE CODE ÉCRIT DEUX RÉGIMES. `R. 4228-22` vise « les établissements d'au moins cinquante salariés », `R. 4228-23` « les établissements de moins de cinquante salariés ». Ce n'est pas une règle et son exception : les deux se partagent tout l'espace, et ce qu'elles imposent diffère — un LOCAL équipé d'un côté, un simple EMPLACEMENT de l'autre. En écrire une seule ligne aurait obligé à taire l'un des deux régimes, et c'est celui de la cible du produit qu'on aurait tu.\n\nSEUIL À CINQUANTE, PAS À VINGT-CINQ. Le seuil de vingt-cinq personnes « désirant prendre habituellement leur repas sur les lieux de travail » a existé et se cite encore couramment. Il a été remplacé par le décret n° 2019-1586 du 31 décembre 2019 : la version en vigueur depuis le 2020-01-02, relevée le 2026-08-31, écrit « au moins cinquante salariés ». Encoder vingt-cinq aurait affiché l'obligation à des établissements qui n'y sont plus soumis.\n\nBORNES INCLUSES, SANS RECOUVREMENT NI TROU. « Au moins cinquante » ⇒ `effectifMin: 50` ; « moins de cinquante » ⇒ `effectifMax: 49`. Un établissement de cinquante salariés voit exactement une des deux lignes.\n\nLE DÉCOMPTE DU TEXTE N'EST PAS CELUI DU MOTEUR, ET C'EST À SAVOIR. L'article renvoie à `L. 130-1` du code de la sécurité sociale — moyenne du nombre de personnes employées sur l'année civile précédente — là où le moteur évalue `effectifSurSite`, un effectif courant déclaré. Autour du seuil, les deux peuvent diverger. Aucune des deux lignes n'en devient fausse : l'une ou l'autre s'affichera, jamais aucune.\n\nL'AVIS DU CSE N'EST PAS UNE CONDITION D'APPLICATION. « Après avis du comité social et économique » est une condition de bonne exécution, que l'outil ne trace pas — même traitement que « après avis du médecin du travail » dans `secours-etablissement-mesures`.\n\nAUCUNE PÉRIODICITÉ : le texte n'en écrit pas. `periodicite: \"autre\"`.\n\nCriticité 2 : manquement d'aménagement, sans exposition directe.\n\nNATURE : ÉTAT PERMANENT (ADR-026). Mise à disposition d'un local : un état matériel.\n\n[2026-09-26, C37 — MAILLE ET APPRENTIS, RELUS.] Le deuxième alinéa, lu ce jour mot pour mot : « L'effectif salarié et le franchissement du seuil de cinquante salariés sont déterminés selon les modalités prévues à l'article L. 130-1 du code de la sécurité sociale. Lorsque l'entreprise comporte plusieurs établissements, les effectifs sont décomptés par établissement. » La maille est donc l'établissement : `effectifMaille: \"etablissement\"`, évalué sur `effectifSurSite`. Les apprentis, eux, n'y sont pas comptés : R. 130-1 III du code de la sécurité sociale écarte « Les personnes mentionnées aux 1°, 2°, 4° et 6° de l'article L. 1111-3 du code du travail » de l'effectif de L. 130-1, et le 1° de L. 1111-3 est « Les apprentis ». Or `effectifSurSite` les compte (c'est aussi le nombre des personnes présentes de R. 4227-34, qui les compte, lui). Le produit ne porte pas « salariés du site, hors apprentis » : un établissement que ses apprentis portent à cinquante lit le local au lieu de l'emplacement. Déclaré, non comblé ; l'une des deux lignes s'affiche toujours.",
  },

  {
    id: "locaux-etablissement-emplacement-restauration",
    domaine: "locaux_sociaux",
    libelle: "Emplacement pour se restaurer (moins de 50 salariés)",
    description:
      "Dans les établissements de moins de cinquante salariés, l'employeur met à leur disposition un emplacement leur permettant de se restaurer dans de bonnes conditions de santé et de sécurité. Par dérogation, cet emplacement peut être aménagé dans les locaux affectés au travail — après déclaration à l'inspection du travail et au médecin du travail par tout moyen conférant date certaine — dès lors que l'activité de ces locaux ne comporte pas l'emploi ou le stockage de substances ou de mélanges dangereux.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4228-23 (emplacement permettant de se restaurer dans les établissements de moins de cinquante salariés)",
        article: "R. 4228-23",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041455662",
        versionConstatee: "2020-01-02",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { travail: true, effectifMax: 49, effectifMaille: "etablissement" },
    porteur: "etablissement",
    transmet: [],
    notesInternes:
      "C'EST LA LIGNE QUI CONCERNE LA CIBLE DU PRODUIT. Rojer s'adresse à des structures de 1 à 50 salariés : la quasi-totalité des dossiers relèvent de `R. 4228-23`, pas de `R. 4228-22`. Verbatim relevé le 2026-08-31, version en vigueur depuis le 2020-01-02 : « Dans les établissements de moins de cinquante salariés, l'employeur met à leur disposition un emplacement leur permettant de se restaurer dans de bonnes conditions de santé et de sécurité. »\n\n`effectifMax: 49`, borne incluse, en miroir exact de `effectifMin: 50` sur l'autre ligne. Voir les notes de `locaux-etablissement-local-restauration` pour l'argument du découpage en deux et pour l'écart entre le décompte de `L. 130-1` CSS et `effectifSurSite`.\n\nLA DÉROGATION DU TROISIÈME ALINÉA EST DÉCRITE, PAS MODÉLISÉE. Aménager l'emplacement dans les locaux de travail suppose une déclaration à l'inspection et au médecin du travail, et que l'activité ne comporte ni emploi ni stockage de substances dangereuses. Deux raisons de ne pas l'encoder : le produit ne sait pas si le dirigeant use de la dérogation, et le second critère recoupe une propriété d'équipement (`STOCKAGE_MATIERE_DANGEREUSE`) qui ne conditionne pas cette obligation-ci. En faire une condition l'aurait éteinte pour tous ceux qui n'ont pas répondu — l'inverse de la règle du non-renseigné.\n\nAUCUNE PÉRIODICITÉ : le texte n'en écrit pas.\n\nCriticité 2 : manquement d'aménagement, sans exposition directe.\n\nNATURE : ÉTAT PERMANENT (ADR-026). Mise à disposition d'un emplacement : un état matériel. La déclaration à l'inspection du travail prévue par la dérogation est un acte lié à un choix d'aménagement, pas une échéance ; elle n'est pas encodée.\n\n[2026-09-26, C37 — MAILLE ET APPRENTIS, RELUS.] Le deuxième alinéa, lu ce jour mot pour mot : « L'effectif salarié et le franchissement du seuil de cinquante salariés sont déterminés selon les modalités prévues à l'article L. 130-1 du code de la sécurité sociale. Lorsque l'entreprise comporte plusieurs établissements, les effectifs sont décomptés par établissement. » La maille est donc l'établissement : `effectifMaille: \"etablissement\"`, évalué sur `effectifSurSite`. Les apprentis, eux, n'y sont pas comptés : R. 130-1 III du code de la sécurité sociale écarte « Les personnes mentionnées aux 1°, 2°, 4° et 6° de l'article L. 1111-3 du code du travail » de l'effectif de L. 130-1, et le 1° de L. 1111-3 est « Les apprentis ». Or `effectifSurSite` les compte (c'est aussi le nombre des personnes présentes de R. 4227-34, qui les compte, lui). Le produit ne porte pas « salariés du site, hors apprentis » : un établissement que ses apprentis portent à cinquante lit le local au lieu de l'emplacement. Déclaré, non comblé ; l'une des deux lignes s'affiche toujours.",
  },
];
