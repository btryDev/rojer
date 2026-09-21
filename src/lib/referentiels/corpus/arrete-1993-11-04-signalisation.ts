// Corpus : arrêté du 4 novembre 1993 — signalisation de sécurité et de santé
// au travail.
//
// POURQUOI CE FICHIER EXISTE. Le référentiel ne portait, au 2026-09-02, AUCUNE
// obligation de signalisation : `grep signalis src/lib/referentiels/` ne
// renvoyait que des phrases de DUERP sectoriel et des `notesInternes` où le
// mot apparaît en passant, jamais une entrée de corpus ni une référence
// légale. Le texte qui gouverne tout le domaine n'avait donc jamais été
// ouvert. Il l'est ici de bout en bout — dix-sept articles et quatre annexes,
// `etendue: "integral"`.
//
// ── CE QUE LE DÉPOUILLEMENT ÉTABLIT, ET QUI ÉTAIT LA QUESTION POSÉE ─────────
//
// Un guide professionnel (Qualiconsult, janvier 2022) annonçait deux
// périodicités sur cet arrêté : six mois pour « les moyens et dispositifs de
// signalisation », un an pour « les alimentations de secours ». LES DEUX SONT
// DANS LE TEXTE, à l'article 15, et le guide a raison sur les chiffres. Il se
// trompe sur l'assiette du premier, et l'écart n'est pas cosmétique :
//
//   « […] et notamment les signaux lumineux et les signaux acoustiques doivent
//     faire l'objet d'une vérification de leur bon fonctionnement et de leur
//     réelle efficacité, avant leur mise en service et, ultérieurement, au
//     moins chaque semestre. »
//
// Le semestre ne porte pas sur « les moyens et dispositifs de signalisation »
// — c'est-à-dire sur les panneaux, les couleurs, les bandes jaune et noir, qui
// sont l'écrasante majorité de la signalisation d'un restaurant ou d'un
// commerce. Sur ceux-là, l'article n'impose qu'un entretien « régulier », sans
// aucun rythme. Le semestre est réservé à ce qui se déclenche : les signaux
// lumineux et les signaux acoustiques. Encoder « vérification semestrielle de
// la signalisation » sur foi du guide aurait produit un rendez-vous que le
// texte ne demande pas, sur un parc que le texte ne vise pas.
//
// L'annuelle des alimentations de secours, en revanche, est écrite sans
// restriction d'assiette : « La vérification des alimentations de secours doit
// être pratiquée au moins une fois par an. »
//
// ── LE FONDEMENT, ET CE QU'IL N'EST PAS ────────────────────────────────────
//
// L'arrêté est pris pour l'application de l'article aujourd'hui numéroté
// R. 4224-24 du code du travail (visé sous son ancienne numérotation
// R. 232-1-13 ; les visas citent aussi R. 231-54-7, R. 231-54-8, R. 232-1-6,
// R. 232-1-7, R. 232-12-7 et R. 232-12-19). Lu à la source le 2026-09-02,
// version en vigueur du 01/05/2008, création par le décret n° 2008-244 du
// 7 mars 2008 :
//
//   « La signalisation relative à la santé et à la sécurité au travail est
//     conforme à des caractéristiques déterminées par arrêté conjoint des
//     ministres chargés du travail et de l'agriculture. Ces dispositions
//     n'affectent pas l'utilisation de la signalisation relative aux trafics
//     routier, ferroviaire, fluvial, maritime et aérien, pour ce qui concerne
//     ces trafics à l'intérieur de l'établissement. »
//
// C'EST UN ARTICLE D'HABILITATION, PAS UN ARTICLE QUI PRESCRIT. Il dit que la
// signalisation doit être conforme à un arrêté ; il n'impose ni de signaler,
// ni de vérifier. Les articles qui prescrivent sont ses voisins de la même
// section 5 « Signalisation et matérialisation relatives à la santé et à la
// sécurité » (Quatrième partie, Livre II, Titre II, Chapitre IV), tous en
// vigueur depuis le 01/05/2008 et tous créés par le même décret :
//
//   R. 4224-20 — « Lorsqu'il n'est pas possible, compte tenu de la nature du
//     travail, d'éviter des zones de danger comportant notamment des risques
//     de chute de personnes ou des risques de chute d'objets, et même s'il
//     s'agit d'activités ponctuelles d'entretien ou de réparation, ces zones
//     sont signalées de manière visible. Elles sont également matérialisées
//     par des dispositifs destinés à éviter que les travailleurs non autorisés
//     pénètrent dans ces zones. »
//   R. 4224-21 — « Lorsque le contenu transporté par les tuyauteries présente
//     un danger, ces tuyauteries font l'objet d'une signalisation permettant
//     de déterminer la nature du contenu transporté. »
//   R. 4224-22 — « Un marquage est apposé à hauteur de vue sur les portes
//     transparentes. »
//   R. 4224-23 — « Le matériel de premiers secours fait l'objet d'une
//     signalisation par panneaux. »
//
// AUCUN DE CES CINQ ARTICLES N'EST DANS UN CORPUS DE CE DÉPÔT. La section 5 du
// chapitre IV est un angle mort entier, voisin immédiat de la section 3 que
// `code-travail-secours.ts` couvre (R. 4224-14 à R. 4224-16) — R. 4224-23 est
// d'ailleurs le pendant en signalisation du matériel de premiers secours de
// R. 4224-14. Les verbatims ci-dessus sont relevés à la source pour que la
// prochaine session n'ait pas à les rouvrir, mais ILS NE SONT PAS DÉPOUILLÉS
// ICI : ce corpus est celui de l'arrêté, et y ranger des articles du Code
// ferait de sa `portee` un mensonge, exactement comme l'explique l'en-tête de
// `code-travail-secours.ts`. Un corpus `code-travail-signalisation` reste à
// écrire ; il n'a pas été créé de la seule initiative de ce lot.
//
// ── CE QUE CE FICHIER NE COUVRE PAS ────────────────────────────────────────
//
// AUCUN ARTICLE N'ÉTAIT « RETENU » LE JOUR OÙ CE FICHIER A ÉTÉ ÉCRIT, et ce
// n'était pas un jugement sur le texte. Le lot qui l'a écrit dépouillait et
// n'encodait pas : `retenu` exige de nommer au moins une obligation existante,
// et le câblage appartenait à la session délégante. Un article qui impose
// quelque chose portait donc `obligation_manquante`, un article qui n'impose
// rien d'autonome porte `sans_objet`. Deux entrées `sans_objet` — l'article 5
// et l'article 14 — restent des candidats à requalification en `retenu` le
// jour où le câblage tranche ; leur motif le dit.
//
// LE CÂBLAGE A EU LIEU LE MÊME JOUR, ET SEPT ARTICLES SONT PASSÉS `retenu` :
// les articles 2, 7, 9, 10, 11, 12 et 15, qui fondent les neuf obligations du
// domaine `signalisation` (`conformite/signalisation.ts`) — l'article 15 en
// porte trois, une par rythme. Chacun de ces sept porte une `reserve` disant
// ce qu'il impose encore et que le référentiel ne porte pas : une dispense
// non évaluable, une branche sans catégorie d'équipement, une assiette
// approximée par le porteur. QUATRE ARTICLES RESTENT `obligation_manquante`,
// et pas pour la même raison : l'article 4 (instance abrogée), l'article 8
// (donnée de santé refusée, et postes portant des EPI non modélisés),
// l'article 13 (condition d'entrée logée dans R. 4214-11 et R. 4224-3, non
// dépouillés) et l'annexe III (« danger grave » non qualifiable). Le premier,
// le deuxième et le quatrième attendent un modèle ; le troisième n'attend
// qu'une lecture.
//
// L'ÉCLAIRAGE DE SÉCURITÉ SE RECOUPE AVEC CE TEXTE, ET IL FAUT LE SAVOIR AVANT
// D'ENCODER. `arrete-2011-12-14-eclairage.ts` porte déjà, par son article 11,
// un essai mensuel et un contrôle semestriel d'autonomie des blocs. Or
// l'article 9 du présent arrêté prévoit expressément que les panneaux
// d'évacuation « peuvent être opaques ou transparents lumineux et regroupés
// avec l'éclairage de sécurité » : un BAES d'évacuation à pictogramme est à la
// fois un bloc d'éclairage de sécurité et un signal lumineux au sens de
// l'annexe I. Le même matériel relève donc des deux textes, et une
// « vérification semestrielle des signaux lumineux » encodée sans condition
// doublerait `incendie-travail-eclairage-securite-autonomie-semestrielle` sur
// le même parc. La réserve de l'article 15 dit où passe la ligne.
//
// L'ALARME SONORE SE RECOUPE AUSSI, MAIS PAS SUR LE MÊME CHAMP, et c'est là
// que ce texte apporte quelque chose que le référentiel n'a pas.
// `incendie-travail-exercice-semestriel` porte les « essais et visites
// périodiques du matériel » de R. 4227-39, semestriels — mais dans le seul
// champ de R. 4227-34, c'est-à-dire plus de cinquante personnes réunies, ou
// des matières inflammables. L'article 15 du présent arrêté ne porte AUCUNE
// condition d'effectif : dès qu'un lieu de travail comporte un signal
// acoustique, sa vérification semestrielle est due. Un bureau de six personnes
// équipé d'une alarme sonore volontaire est dans le champ de l'article 15 et
// hors de celui de R. 4227-39.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-02, article
// par article sur les pages `article_lc`. Le relevé a été fait ainsi parce que
// la page consolidée du texte TRONQUE : elle rendait l'article 7 sans sa
// réserve finale (« sauf si le risque disparaît avec la coupure d'énergie »)
// et l'article 5 sans son alinéa 2 tout entier, qui porte une obligation de
// formation. Les deux ont été retrouvés en rouvrant l'article seul.
//
// L'URL de l'article 17 n'a pas été relevée : l'identifiant `LEGIARTI` ne se
// déduit pas de la série, et celui qui aurait suivi le rang mène à un article
// du code monétaire et financier. Fabriquer une URL plausible serait la faute
// que ce corpus existe pour empêcher.

import type { Corpus } from "./types";

const URL = (id: string) =>
  `https://www.legifrance.gouv.fr/loda/article_lc/${id}`;

/** Le seul texte qui ait jamais modifié cet arrêté, le 19 janvier 2014. */
const ARRETE_2013 = {
  texte:
    "Arrêté du 2 août 2013 modifiant l'arrêté du 4 novembre 1993 relatif à la signalisation de sécurité et de santé au travail",
} as const;

export const ARRETE_1993_11_04_SIGNALISATION: Corpus = {
  id: "arrete-1993-11-04-signalisation",
  intitule:
    "Arrêté du 4 novembre 1993 — signalisation de sécurité et de santé au travail",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000483337/",
  etendue: "integral",
  portee:
    "Texte EN VIGUEUR au 02/09/2026, vérifié à la source avant son contenu : ni abrogé, ni remplacé, sans version future programmée, et modifié une seule fois depuis 1993 — par l'arrêté du 2 août 2013, qui a touché les articles 2, 11, 13, 14 et l'annexe II, et PAS l'article 15. Pris pour l'application de l'article R. 4224-24 du code du travail (visé sous son ancienne numérotation R. 232-1-13), il transpose la directive 92/58/CEE. Les dix-sept articles et les quatre annexes sont énumérés et lus. Champ : tout lieu de travail, sans seuil d'effectif et sans clause de priorité au règlement ERP — contrairement à l'arrêté du 14 décembre 1993 sur l'éclairage de sécurité, dont l'article 1er al. 2 rend le règlement ERP seul applicable dans les locaux recevant du public, RIEN d'équivalent ne figure ici. Ce que le texte porte de périodique tient à son seul article 15 : vérification des signaux lumineux et acoustiques à la mise en service puis au moins chaque semestre, vérification des alimentations de secours au moins une fois par an. Ce corpus ne couvre PAS les articles du code du travail qui prescrivent la signalisation (R. 4224-20 à R. 4224-24, section 5 du chapitre IV) : ils sont relevés en verbatim dans l'en-tête de fichier et n'appartiennent à aucun corpus à ce jour.",
  articles: [
    {
      ref: "Arrêté 1993-11-04 art. 1",
      intitule: "Définition d'une signalisation de sécurité ou de santé",
      url: URL("LEGIARTI000006679529"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Définit la signalisation de sécurité ou de santé et énumère ses quatre formes possibles : panneau, couleur, signal lumineux, signal acoustique. Renvoie la terminologie à l'annexe I point 1.",
      citationCle:
        "Au sens du présent arrêté, une signalisation de sécurité ou de santé est une signalisation qui, rapportée à un objet, à une activité ou à une situation déterminée, fournit une indication relative à la sécurité ou la santé. Elle prend la forme, selon le cas, d'un panneau, d'une couleur, d'un signal lumineux ou acoustique. Les termes relatifs à la signalisation utilisés dans le présent arrêté sont définis à l'annexe I, point 1, Terminologie.",
      statut: "sans_objet",
      motif:
        "Article de définition : il fixe le vocabulaire du texte et n'impose rien à un exploitant. Il compte quand même, et pour une raison précise : c'est lui qui range le SIGNAL LUMINEUX et le SIGNAL ACOUSTIQUE parmi les formes de signalisation, ce qui rend intelligible l'assiette restreinte du semestre de l'article 15.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 2",
      intitule: "Quand la mise en œuvre d'une signalisation s'impose",
      url: URL("LEGIARTI000006679530"),
      versionEnVigueur: "2014-01-19",
      modifiePar: ARRETE_2013,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Impose la mise en œuvre d'une signalisation de sécurité chaque fois qu'un risque ne peut être ni évité ni prévenu par une protection collective ou par l'organisation du travail — sans préjudice des signalisations dues par ailleurs (évacuation, secours, lutte contre l'incendie, substances dangereuses). Le choix se fait selon les points 3 et 4 de l'annexe I.",
      citationCle:
        "Sans préjudice de l'obligation de signalisation pour ce qui concerne notamment l'évacuation, le sauvetage et les secours, le matériel et l'équipement de lutte contre l'incendie, les substances ou mélanges dangereux ainsi que certains équipements et matériels spécifiques, la mise en oeuvre d'une signalisation de sécurité s'impose toutes les fois que sur un lieu de travail un risque ne peut pas être évité ou prévenu par l'existence d'une protection collective ou par l'organisation du travail. Le choix de cette signalisation est déterminé en fonction des principes énoncés aux points 3 et 4 de l'annexe I.",
      statut: "retenu",
      obligations: ["signalisation-etablissement-risques-residuels"],
      reserve:
        "L'obligation générale de signaliser est encodée. Ce que l'article porte en plus ne l'est pas, et c'est un renvoi : « Le choix de cette signalisation est déterminé en fonction des principes énoncés aux points 3 et 4 de l'annexe I. » Ces principes — interchangeabilité, complémentarité, conditions d'efficacité — guident un choix au cas par cas que le produit ne peut ni vérifier ni échéancer ; l'annexe I reste `sans_objet` pour cette raison. L'obligation encodée dit au dirigeant qu'il doit signaler ; elle ne lui dit pas quel panneau poser.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 3",
      intitule: "Nombre et emplacement des dispositifs de signalisation",
      url: URL("LEGIARTI000006679531"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le nombre et l'emplacement des moyens de signalisation se déterminent en fonction de l'importance des risques ou de la zone à couvrir.",
      citationCle:
        "Le nombre et l'emplacement des moyens ou des dispositifs de signalisation à mettre en place sont fonction de l'importance des risques ou dangers ou de la zone à couvrir.",
      statut: "sans_objet",
      motif:
        "Règle de dimensionnement de la signalisation que l'article 2 fait mettre en œuvre. Elle ne crée aucune obligation autonome et ne porte aucune périodicité : c'est un critère de proportionnalité, appliqué au cas par cas, que le produit ne peut ni vérifier ni échéancer.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 4",
      intitule:
        "Détermination de la signalisation après consultation des représentants du personnel",
      url: URL("LEGIARTI000006679532"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le chef d'établissement détermine la signalisation à installer en fonction des risques, après consultation des représentants du personnel.",
      citationCle:
        "Le chef d'établissement détermine, après consultation du comité d'hygiène, de sécurité et des conditions de travail ou, à défaut, des délégués du personnel, la signalisation relative à la sécurité ou la santé qui doit être installée ou utilisée en fonction des risques.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "Obligation procédurale pleine et entière — une consultation, préalable à la détermination de la signalisation — que le référentiel ne porte pas. À LIRE AVEC UNE RÉSERVE DE RENVOI : l'article n'a jamais été modifié depuis 1993 et vise encore le « comité d'hygiène, de sécurité et des conditions de travail » et, à défaut, les « délégués du personnel ». Ces deux instances ont disparu, fondues dans le CSE par l'ordonnance n° 2017-1386 du 22 septembre 2017 au plus tard le 1er janvier 2020. Le renvoi est donc mort au sens de la skill de veille, et le destinataire réel de la consultation est aujourd'hui le CSE ; l'encoder suppose de l'écrire, pas de recopier le texte tel quel.",
      bloquePar:
        "Le texte désigne une instance abrogée (CHSCT / délégués du personnel) ; l'obligation ne s'encode pas sans trancher la substitution par le CSE, qui n'est écrite dans aucun texte de ce dépôt.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 5",
      intitule:
        "Information et formation des travailleurs sur la signalisation",
      url: URL("LEGIARTI000006679533"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les travailleurs sont informés des indications fournies par la signalisation et de la conduite à tenir. Le chef d'établissement leur fait bénéficier d'une formation adéquate portant notamment sur la signification des panneaux, des couleurs de sécurité et des signaux lumineux et acoustiques, renouvelée aussi souvent que nécessaire.",
      citationCle:
        "Les travailleurs sont informés de manière appropriée sur les indications relatives à la sécurité ou à la santé fournies par la signalisation et la conduite à tenir qui en résulte. Le chef d'établissement doit faire bénéficier les travailleurs d'une formation adéquate, comportant, en tant que de besoin, des instructions précises concernant la signalisation de sécurité ou de santé qui portent, notamment, sur la signification des panneaux, des couleurs de sécurité, des signaux lumineux et acoustiques. Cette formation doit être renouvelée aussi souvent qu'il est nécessaire.",
      statut: "sans_objet",
      motif:
        "L'alinéa 2 impose une formation, mais il ne crée ni une échéance ni une obligation détachable de celle que le référentiel porte déjà : `formation-securite-etablissement-organisation` (L. 4141-2) organise la formation à la sécurité de l'établissement, et cet article en précise un CONTENU. Son renouvellement « aussi souvent qu'il est nécessaire » n'est pas un rythme — c'est la même rédaction que R. 4323-3, dont le dépôt a déjà refusé de tirer une périodicité. CANDIDAT À REQUALIFICATION EN `retenu` : ce que l'article ajoute réellement est une matière de formation que ni L. 4141-2 ni R. 4141-11 à R. 4141-13 ne nomment — aucun des trois ne prononce le mot signalisation. Si le câblage rattache cet article à `formation-securite-etablissement-organisation`, l'entrée passe `retenu` avec une réserve sur ce contenu ; sinon elle devient `obligation_manquante`. Le lot qui dépouille ne tranche pas à la place de celui qui encode.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 6",
      intitule: "Rôle et réenclenchement d'un signal lumineux ou sonore",
      url: URL("LEGIARTI000006679534"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Un signal lumineux ou sonore indique par son déclenchement le début d'une action ou une mise en garde, pour une durée aussi longue que l'action l'exige ; il doit être réenclenché immédiatement après chaque utilisation. Ses caractéristiques sont aux annexes III et IV.",
      citationCle:
        "Un signal lumineux ou sonore indique, par son déclenchement, le début d'une action sollicitée ou une mise en garde (exemple : signal d'évacuation, signal d'appel, signal de danger) ; sa durée doit être aussi longue que l'action l'exige. Les signaux lumineux ou acoustiques doivent être réenclenchés immédiatement après chaque utilisation. Les caractéristiques des signaux lumineux et acoustiques sont définies dans les annexes III et IV.",
      statut: "sans_objet",
      motif:
        "Règle de fonctionnement, sans récurrence : le réenclenchement se fait après chaque utilisation, ce qui est un geste d'exploitation immédiat et non une échéance. L'article compte pour la lecture de l'article 15, dont il désigne l'objet — les signaux lumineux et acoustiques sont bien les dispositifs qui se déclenchent, donc ceux dont on peut vérifier « le bon fonctionnement et la réelle efficacité ».",
    },
    {
      ref: "Arrêté 1993-11-04 art. 7",
      intitule: "Alimentation de secours des signalisations",
      url: URL("LEGIARTI000006679535"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Toute signalisation ayant besoin d'une source d'énergie pour fonctionner doit être assurée d'une alimentation de secours en cas de rupture de cette énergie, sauf si le risque disparaît avec la coupure.",
      citationCle:
        "Les signalisations qui ont besoin d'une source d'énergie pour fonctionner doivent être assurées d'une alimentation de secours en cas de rupture de cette énergie, sauf si le risque disparaît avec la coupure d'énergie.",
      statut: "retenu",
      obligations: [
        "signalisation-etablissement-alimentation-secours-presence",
        "signalisation-etablissement-alimentations-secours-annuelle",
      ],
      reserve:
        "L'EXCEPTION FINALE N'EST PAS ENCODÉE, ET LA LIGNE SUR-APPLIQUE DONC. « Sauf si le risque disparaît avec la coupure d'énergie » suppose de savoir, de chaque signalisation alimentée, si le risque qu'elle signale s'éteint avec le courant : aucune propriété d'équipement ne le dit. Le blocage relevé au dépouillement était réel ; ce qui l'a levé n'est pas un attribut nouveau mais la règle du non-renseigné, qui commande qu'un allègement de régime ne s'applique pas tant que sa condition n'est pas déclarée. L'obligation est donc posée entière, avec un porteur établissement — le parc ne déclarant pas les dispositifs de signalisation comme tels, `BAES` et `ALARME_INCENDIE` ne figurent qu'en contexte, et la liste n'est pas limitative.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 8",
      intitule:
        "Travailleurs aux capacités auditives ou visuelles limitées",
      url: URL("LEGIARTI000006679536"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Des mesures supplémentaires ou de remplacement doivent être prises lorsque des travailleurs concernés ont des capacités auditives ou visuelles limitées, y compris du fait du port d'équipements de protection individuelle.",
      citationCle:
        "Au cas où des travailleurs concernés ont des capacités ou facultés auditives ou visuelles limitées, y compris par le port d'équipements de protection individuelle, des mesures adéquates supplémentaires ou de remplacement doivent être prises.",
      statut: "obligation_manquante",
      cause: "activite_exercee",
      toucheLaCible: true,
      motif:
        "Obligation d'employeur réelle et non portée. Elle est remarquable par sa deuxième branche : la limitation peut venir du PORT D'ÉQUIPEMENTS DE PROTECTION INDIVIDUELLE, donc d'un fait d'organisation du travail et non d'un état de santé — un cuisinier en casque antibruit entre dans le champ sans qu'aucune donnée de santé n'entre en jeu. La première branche, en revanche, suppose de connaître une limitation auditive ou visuelle d'un salarié nommé, ce que `docs/rgpd.md` interdit de stocker et que la frontière sur la santé du CLAUDE.md exclut.",
      bloquePar:
        "La première branche demande une donnée de santé que le produit refuse de détenir ; la seconde demande de savoir quels postes portent des EPI, information qu'aucun attribut d'établissement ne donne (cinquième déclencheur de l'ADR-022, non implémenté).",
    },
    {
      ref: "Arrêté 1993-11-04 art. 9",
      intitule: "Balisage des cheminements d'évacuation",
      url: URL("LEGIARTI000006679537"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Une signalisation doit baliser les cheminements d'évacuation vers la sortie la plus proche, par panneaux conformes à l'annexe II points 1 et 5 ; ces panneaux peuvent être opaques ou transparents lumineux et regroupés avec l'éclairage de sécurité. Les dégagements réglementaires non utilisés habituellement portent en outre un panneau additionnel « Sortie de secours ».",
      citationCle:
        "Une signalisation doit baliser les cheminements empruntés par le personnel pour l'évacuation vers la sortie la plus rapprochée. Cette signalisation est assurée par des panneaux conformes aux dispositions de l'annexe II, points 1 et 5. Ces panneaux peuvent être opaques ou transparents lumineux et regroupés avec l'éclairage de sécurité. Les dégagements faisant partie des dégagements réglementaires et qui ne servent pas habituellement de passage pendant la période de travail doivent être signalés par des panneaux comportant un panneau additionnel portant la mention Sortie de secours.",
      statut: "retenu",
      obligations: ["signalisation-etablissement-cheminements-evacuation"],
      reserve:
        "L'article est encodé en une seule ligne, qui porte le balisage des cheminements ET le panneau additionnel « Sortie de secours » des dégagements réglementaires non utilisés habituellement : même phrase, même geste, même parcours — c'est le précédent de `PE 35` (trois plans en une ligne) et non celui de `PE 4`. La conformité des panneaux aux points 1 et 5 de l'annexe II n'est pas encodée à part : c'est une caractéristique du panneau, pas un acte distinct, et l'annexe II reste `sans_objet`.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 10",
      intitule:
        "Identification des équipements de lutte contre l'incendie",
      url: URL("LEGIARTI000006679538"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les équipements de lutte contre l'incendie doivent être identifiés par une coloration rouge des équipements et par un panneau de localisation ou une coloration de leurs emplacements ou accès ; les panneaux de l'annexe II point 6 s'utilisent selon les emplacements, et ne sont pas obligatoires lorsque les équipements sont directement visibles.",
      citationCle:
        "Les équipements de lutte contre l'incendie doivent être identifiés par une coloration des équipements et par un panneau de localisation ou une coloration des emplacements ou des accès aux emplacements dans lesquels ils se trouvent. La couleur d'identification de ces équipements est rouge. La surface rouge doit être suffisante pour permettre une identification facile. Les panneaux prévus à l'annexe II, point 6, doivent être utilisés en fonction des emplacements de ces équipements. Lorsque ces équipements sont directement visibles, les panneaux ne sont pas obligatoires.",
      statut: "retenu",
      obligations: ["signalisation-incendie-moyens-lutte"],
      reserve:
        "LA DISPENSE DE LA DERNIÈRE PHRASE N'EST PAS ENCODÉE : « Lorsque ces équipements sont directement visibles, les panneaux ne sont pas obligatoires. » La visibilité directe est un constat de terrain qu'aucune propriété d'équipement ne porte, et en inventer une aurait été l'attribut de modèle que ce lot s'interdit. La sur-application est bornée — la dispense ne vise que les PANNEAUX, la coloration rouge et l'identification de l'emplacement restant dues dans tous les cas — et elle est écrite dans la `description` de l'obligation, donc visible par celui qui la subit. SECONDE RÉSERVE, D'ANCRAGE : l'obligation est portée par les catégories `EXTINCTEUR` et `RIA`, les seules du parc qui soient des équipements de lutte contre l'incendie. Une colonne sèche ou un système d'extinction automatique relèvent du même article et n'ont pas de catégorie : la ligne les sous-applique.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 11",
      intitule:
        "Signalisation des tuyauteries, du transport et des stockages de substances dangereuses",
      url: URL("LEGIARTI000006679539"),
      versionEnVigueur: "2014-01-19",
      modifiePar: ARRETE_2013,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Depuis le 1er juin 2017, les tuyauteries apparentes contenant ou transportant des substances ou mélanges dangereux portent le pictogramme du règlement (CE) n° 1272/2008, placé sur au moins un côté visible près des points les plus dangereux et de manière répétitive. Le transport interne de ces substances est signalé de même. Les aires, salles ou enceintes de stockage en quantités importantes portent un panneau d'avertissement approprié, ou sont identifiées comme les tuyauteries, à moins que l'étiquetage des emballages n'y suffise.",
      citationCle:
        "Les tuyauteries apparentes contenant ou transportant des substances ou mélanges dangereux sont munis du pictogramme ou symbole sur couleur de fond défini par le règlement (CE) n° 1272/2008. […] Les aires, salles ou enceintes utilisées pour stocker des substances ou mélanges dangereux en quantités importantes doivent être signalisées par un panneau d'avertissement approprié choisi parmi ceux énumérés à l'annexe II, point 3, ou être identifiées conformément au premier alinéa du présent article, à moins que l'étiquetage des différents emballages ou récipients suffise à cet effet.",
      statut: "retenu",
      obligations: ["signalisation-stockage-substances-dangereuses"],
      reserve:
        "DEUX DES TROIS BRANCHES DE L'ARTICLE NE SE DÉCLENCHENT PAS. L'obligation encodée est ancrée sur la catégorie `STOCKAGE_MATIERE_DANGEREUSE`, seul point d'accroche disponible : c'est la branche des « aires, salles ou enceintes utilisées pour stocker », celle qui touche réellement la cible produit. Les TUYAUTERIES APPARENTES et le TRANSPORT INTERNE de substances dangereuses n'ont aucune catégorie d'équipement et ne sont attachés à aucun stockage déclaré — un établissement qui a des tuyauteries à marquer sans stockage déclaré ne verra pas la ligne. Même arbitrage que `stockage-dangereux-formation-personnel` : la catégorie est un proxy imparfait du vrai déclencheur (la présence d'agents chimiques dangereux, cinquième déclencheur de l'ADR-022, non implémenté), et il sous-applique au lieu de sur-appliquer. DEUX CONDITIONS DU TEXTE NE SONT PAS ÉVALUÉES NON PLUS, dans l'autre sens celles-là : « en quantités importantes », que le texte ne chiffre pas, et « à moins que l'étiquetage des différents emballages ou récipients suffise ». Les deux sont écrites dans la `description`. ENFIN, R. 4224-21 DU CODE DU TRAVAIL, que cet article détaille, n'est dans aucun corpus : la section 5 du chapitre IV n'a jamais été dépouillée, et l'obligation ne le cite donc pas.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 12",
      intitule: "Signalisation des obstacles et des endroits dangereux",
      url: URL("LEGIARTI000006679540"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Dans les zones bâties auxquelles le travailleur a accès, les obstacles pouvant provoquer des chocs ou des chutes de personnes et les endroits dangereux (notamment de chute d'objets) doivent être signalés par des bandes jaune et noir ou rouge et blanc, dimensionnées à la taille de l'obstacle et conformes au point 3 (b) de l'annexe II.",
      citationCle:
        "A l'intérieur des zones bâties de l'entreprise auxquelles le travailleur a accès dans le cadre de son travail, les obstacles susceptibles de provoquer des chocs ou des chutes de personnes et les endroits dangereux, où notamment peuvent avoir lieu des chutes d'objets, doivent être signalés par des bandes jaune et noir ou rouge et blanc. Les dimensions de cette signalisation doivent tenir compte des dimensions de l'obstacle ou endroit dangereux signalé. Les bandes jaune et noir ou rouge et blanc doivent être conformes au point 3 (b) de l'annexe II.",
      statut: "retenu",
      obligations: ["signalisation-etablissement-obstacles-zones-dangereuses"],
      reserve:
        "L'ARTICLE EST ENCODÉ EN ENTIER, MAIS PAS CE QU'IL DÉTAILLE. Cet article donne la forme — bandes jaune et noir ou rouge et blanc — de la signalisation des zones de danger que R. 4224-20 du code du travail impose. Or R. 4224-20 impose DEUX choses : signaler « de manière visible », et MATÉRIALISER la zone « par des dispositifs destinés à éviter que les travailleurs non autorisés pénètrent dans ces zones ». L'arrêté ne porte que la première ; la matérialisation n'est portée par aucune obligation du référentiel, et son article n'est dans aucun corpus — la section 5 du chapitre IV n'a jamais été dépouillée.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 13",
      intitule: "Marquage des voies de circulation",
      url: URL("LEGIARTI000006679541"),
      versionEnVigueur: "2014-01-19",
      modifiePar: ARRETE_2013,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Lorsque R. 4214-11 ou R. 4224-3 du code du travail imposent d'identifier clairement les voies de circulation, celles-ci doivent être bordées de bandes continues d'une couleur bien visible, de préférence blanche ou jaune, dont l'emplacement tient compte des distances de sécurité ; les voies permanentes extérieures situées en zone bâtie doivent aussi être marquées, sauf barrières ou dallage appropriés.",
      citationCle:
        "Lorsqu'en application des articles R. 4214-11 ou R. 4224-3 du code du travail les voies de circulation doivent être clairement identifiées, ces voies doivent être bordées par des bandes continues d'une couleur bien visible, de préférence blanche ou jaune, compte tenu de la couleur du sol. L'emplacement des bandes doit tenir compte des distances de sécurité nécessaires entre les véhicules qui peuvent y circuler et tout objet pouvant se trouver à proximité et entre les piétons et les véhicules. Les voies permanentes situées à l'extérieur dans les zones bâties doivent également être marquées, à moins qu'elles ne soient pourvues de barrières ou d'un dallage appropriés.",
      statut: "obligation_manquante",
      cause: "attribut_etablissement",
      toucheLaCible: true,
      motif:
        "[2026-09-21 — LES DEUX ARTICLES SONT OUVERTS (`corpus/code-travail-circulation-lieux.ts`), et la cause change : ~~texte à lire~~ → `attribut_etablissement`. `R. 4214-11` s'adresse au maître d'ouvrage ; `R. 4224-3` pose à l'employeur un résultat — la circulation sûre — sans parler de marquage. Ce qui déclenche la bande continue est donc le critère de `R. 4214-11`, « l'importance de la circulation des véhicules ou le danger lié à l'utilisation […] des locaux » : un fait de l'établissement, que rien ne demande au dirigeant. Une réserve de restaurant où l'on pousse un transpalette, oui peut-être ; un bureau, non.] État permanent non porté. Le renvoi de tête est ici À JOUR — l'arrêté du 2 août 2013 a remplacé l'ancienne numérotation par R. 4214-11 et R. 4224-3, ce qui contraste avec l'article 4, resté sur le CHSCT. Mais il est CONDITIONNEL : l'obligation de marquage ne naît que si l'un de ces deux articles impose d'identifier les voies, et aucun des deux n'est dans un corpus de ce dépôt. Encoder ce marquage suppose donc de dépouiller d'abord R. 4224-3, faute de quoi la condition serait devinée.",
      bloquePar:
        "~~La condition de déclenchement vit dans R. 4214-11 et R. 4224-3, articles non dépouillés~~ — dépouillés le 2026-09-21. Reste : aucun attribut ne dit que des véhicules circulent dans les locaux.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 14",
      intitule:
        "Types d'équipement d'alarme exigés selon l'effectif et les matières manipulées",
      url: URL("LEGIARTI000028480696"),
      versionEnVigueur: "2014-01-19",
      modifiePar: ARRETE_2013,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Précise le type d'équipement d'alarme exigé par R. 4227-34 à R. 4227-36 : au moins le type 3 au-delà de 700 personnes, et au-delà de 50 personnes lorsque sont entreposées ou manipulées des substances de R. 4227-22 ; au moins le type 4 dans les autres établissements de R. 4227-34 ; au moins le type 2 a ou 2 b si le chef d'établissement souhaite une temporisation.",
      citationCle:
        "Les systèmes d'alarme sonores exigés aux articles R. 4227-34 à R. 4227-36 du code du travail sont constitués d'équipements d'alarme dont les types sont précisés dans l'annexe IV. Un équipement d'alarme au moins de type 3 doit être installé dans les établissements dont l'effectif est supérieur à 700 personnes et dans ceux dont l'effectif est supérieur à 50 personnes lorsque sont entreposées ou manipulées des substances ou mélanges visés à l'article R. 4227-22 du code du travail. Un équipement d'alarme au moins de type 4 doit être installé dans les autres établissements visés à l'article R. 4227-34 du code du travail. Toutefois, si le chef d'établissement souhaite disposer d'une temporisation il doit installer un équipement d'alarme du type 2 a ou 2 b au minimum et respecter toutes les contraintes liées à ce type.",
      statut: "sans_objet",
      motif:
        "Donne la caractéristique technique du système d'alarme sonore que R. 4227-34 fait installer ; il ne crée pas l'obligation, il la spécifie, et R. 4227-34 est déjà `retenu` au corpus `code-travail-incendie`. Même rapport que R. 4227-38 au contenu de la consigne de R. 4227-37. DEUX CHOSES À NE PAS PERDRE. D'abord, un manque subsiste ailleurs : l'entrée de R. 4227-34 ne nomme que `incendie-travail-exercice-semestriel`, si bien que l'INSTALLATION de l'alarme n'est portée par aucune obligation — le manque appartient à cet article-là et n'est pas recompté ici. Ensuite, le seuil de 700 personnes et le régime de temporisation sont hors cible produit, mais celui de 50 personnes croisé aux matières de R. 4227-22 ne l'est pas : une réserve de restaurant peut y tomber. CANDIDAT À REQUALIFICATION EN `retenu` le jour où l'installation de l'alarme est encodée.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 15",
      intitule:
        "Entretien de la signalisation, vérification semestrielle des signaux lumineux et acoustiques, vérification annuelle des alimentations de secours",
      url: URL("LEGIARTI000006679543"),
      versionEnVigueur: "1993-12-17",
      // Page de l'article : aucune ligne « Modifié par ». Version d'origine du
      // 17/12/1993. L'arrêté du 2 août 2013, seul texte modificateur de
      // l'arrêté, a touché les articles 2, 11, 13, 14 et l'annexe II — pas
      // celui-ci. Les deux périodicités ont donc trente-trois ans et n'ont
      // jamais bougé.
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Trois prescriptions dans un seul article. (1) Les moyens et dispositifs de signalisation sont régulièrement nettoyés, entretenus, vérifiés, réparés et remplacés si nécessaire — sans aucun rythme chiffré. (2) Les signaux lumineux ET acoustiques font l'objet d'une vérification de leur bon fonctionnement et de leur réelle efficacité avant mise en service, puis au moins chaque semestre. (3) La vérification des alimentations de secours est pratiquée au moins une fois par an.",
      citationCle:
        "Les moyens et dispositifs de signalisation doivent, selon le cas, être régulièrement nettoyés, entretenus, vérifiés et réparés, remplacés si nécessaire, de manière à conserver leurs qualités intrinsèques ou de fonctionnement, et notamment les signaux lumineux et les signaux acoustiques doivent faire l'objet d'une vérification de leur bon fonctionnement et de leur réelle efficacité, avant leur mise en service et, ultérieurement, au moins chaque semestre. La vérification des alimentations de secours doit être pratiquée au moins une fois par an.",
      statut: "retenu",
      obligations: [
        "signalisation-etablissement-entretien",
        "signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle",
        "signalisation-etablissement-alimentations-secours-annuelle",
      ],
      reserve:
        "TROIS PRESCRIPTIONS, TROIS OBLIGATIONS, ET LE PARTAGE EST CELUI DU TEXTE. L'entretien « régulier » de la première proposition porte `periodicite: \"autre\"` — le texte ne chiffre rien pour les panneaux, les couleurs et les bandes ; le semestre est réservé aux signaux LUMINEUX et ACOUSTIQUES par le « et notamment » qui les introduit ; l'annuel porte sur les alimentations de secours, sans restriction d'assiette. Trois rythmes ne se fondent pas en une ligne (ADR-022), et le modèle ne porte qu'une périodicité par obligation.\n\nCE QUI RESTE EN RÉSERVE, ET IL Y A TROIS CHOSES. (1) L'ASSIETTE EST APPROXIMÉE PAR LE PORTEUR. Le texte vise chaque signal ; les trois lignes sont portées par l'établissement et en produisent une seule chacune, parce qu'aucune catégorie d'équipement ne désigne un signal lumineux, un signal acoustique ni une alimentation de secours de signalisation. Un employeur sans aucun signal de ce genre reçoit donc les trois lignes — sur-application assumée, visible par celui qui la subit, et préférée au faux négatif muet qu'un ancrage sur `BAES` et `ALARME_INCENDIE` aurait créé pour tous les autres dispositifs. (2) LA VÉRIFICATION AVANT MISE EN SERVICE n'a pas de ligne propre : la règle de résolution de l'ADR-026 place l'échéance récurrente avant l'obligation ponctuelle quand un même membre de phrase porte les deux, et la `description` de la semestrielle la nomme. (3) LE RECOUVREMENT AVEC L'ÉCLAIRAGE DE SÉCURITÉ EST TRANCHÉ, PAS SUPPRIMÉ : un BAES à pictogramme relève de la semestrielle de cet article (bon fonctionnement et réelle efficacité, porteur établissement) ET de celle de l'arrêté du 14 décembre 2011 (autonomie d'une heure, porteur équipement). Deux objets, deux textes, la même cadence, sur un même matériel.",
      // CE QUE LE DÉPOUILLEMENT AVAIT CONCLU, GARDÉ TEL QUEL. Les deux
      // paragraphes qui suivent étaient le `motif` de l'entrée quand elle
      // portait `obligation_manquante`, et son `bloquePar`. Ils sont conservés
      // en commentaire plutôt que perdus au passage en `retenu` : le premier
      // porte la lecture qui a corrigé le guide professionnel, le second dit
      // ce qui bloquait l'encodage et que ce lot a levé — non par un attribut
      // nouveau, mais en choisissant le porteur établissement et en tranchant
      // le recouvrement avec l'éclairage de sécurité.
      // ── LE MOTIF
      //
      // L'ARTICLE QUI PORTE LES DEUX SEULES PÉRIODICITÉS DU TEXTE, et le
      // référentiel n'en porte ni l'une ni l'autre. Deux échéances
      // récurrentes distinctes, plus un état permanent d'entretien.
      //
      // CE QUE LE VERBATIM CORRIGE DANS LE POINT DE DÉPART. Un guide
      // professionnel annonçait « moyens et dispositifs de signalisation :
      // tous les 6 mois ». Le texte réserve le semestre aux SIGNAUX LUMINEUX
      // ET ACOUSTIQUES, introduits par un « et notamment » qui restreint :
      // les panneaux, les couleurs et les bandes jaune et noir, qui forment
      // l'essentiel de la signalisation d'un commerce ou d'un bureau, ne
      // relèvent que du « régulièrement nettoyés, entretenus, vérifiés et
      // réparés » du début de phrase, lequel ne chiffre rien. Encoder un
      // semestriel sur toute la signalisation créerait un rendez-vous que le
      // texte ne demande pas. Les deux chiffres du guide, eux, sont exacts,
      // et la lecture à la source les confirme : six mois et un an.
      //
      // DEUX PLANCHERS, PAS DEUX RENDEZ-VOUS. « Au moins chaque semestre »
      // et « au moins une fois par an » sont des fréquences minimales, comme
      // le « au moins tous les six mois » de R. 4227-39 déjà encodé.
      //
      // CE QUE LE CHAMP AJOUTE, ET C'EST LE POINT LE PLUS UTILE DU
      // DÉPOUILLEMENT. L'article ne porte AUCUNE condition d'effectif ni de
      // typologie. `incendie-travail-exercice-semestriel` couvre déjà les «
      // essais et visites périodiques du matériel » de R. 4227-39 — mais
      // dans le seul champ de R. 4227-34 : plus de cinquante personnes
      // réunies, ou matières inflammables. Un bureau de six personnes équipé
      // d'une alarme sonore est dans le champ de cet article-ci et hors de
      // celui de R. 4227-39. Quant à la vérification annuelle des
      // alimentations de secours, elle n'a aucun équivalent nulle part dans
      // le référentiel, sous aucun régime.
      //
      // LE RECOUVREMENT À TRAITER AVANT D'ENCODER. Un BAES d'évacuation à
      // pictogramme est un signal lumineux au sens de l'annexe I, et
      // l'article 9 prévoit expressément que ces panneaux soient « regroupés
      // avec l'éclairage de sécurité ». Une échéance semestrielle écrite
      // sans condition sur les signaux lumineux tomberait donc sur le même
      // parc que l'obligation
      // `incendie-travail-eclairage-securite-autonomie-semestrielle`, déjà
      // semestrielle et fondée sur l'article 11 de l'arrêté du
      // 14 décembre 2011. Le partage n'est pas arbitraire :
      // c'est l'AUTONOMIE que l'arrêté de 2011 fait contrôler, et le BON
      // FONCTIONNEMENT ET LA RÉELLE EFFICACITÉ que celui-ci fait vérifier.
      // Deux objets différents sur un même matériel, à la même cadence.
      // ── CE QUI BLOQUAIT
      //
      // Aucune catégorie d'équipement ne désigne un signal lumineux, un
      // signal acoustique ni une alimentation de secours de signalisation :
      // le parc déclare des BAES et des alarmes incendie, pas les
      // dispositifs de signalisation comme tels. Un porteur établissement
      // produirait une ligne unique conforme à l'ADR-022, mais il faudrait
      // alors trancher le recouvrement avec l'échéance semestrielle de
      // l'éclairage de sécurité avant d'écrire la ligne, sous peine de
      // doubler un rendez-vous existant sur le même matériel.
    },
    {
      ref: "Arrêté 1993-11-04 art. 16",
      intitule: "Dispositions transitoires",
      url: URL("LEGIARTI000006679544"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Entrée en vigueur au 1er janvier 1994 pour les nouveaux lieux de travail et les nouveaux aménagements, au 1er janvier 1996 pour les lieux existants.",
      citationCle:
        "Pour les nouveaux lieux de travail ou les nouveaux aménagements de lieux de travail les dispositions du présent arrêté entrent en vigueur le 1er janvier 1994. Pour les lieux existants, les dispositions de l'ensemble de l'arrêté entrent en vigueur le 1er janvier 1996.",
      statut: "sans_objet",
      motif:
        "Régime transitoire entièrement épuisé : les deux dates sont dépassées de trente ans, et aucun établissement en exploitation aujourd'hui ne peut se prévaloir d'un différé. L'article est relevé parce qu'un corpus intégral énumère tout, et parce que son épuisement est précisément ce qu'il faut avoir constaté pour ne pas rouvrir la question.",
    },
    {
      ref: "Arrêté 1993-11-04 art. 17",
      intitule: "Exécution de l'arrêté",
      // URL non relevée : l'identifiant `LEGIARTI` de cet article n'a pas été
      // trouvé, et celui qui suivrait la série des articles 1 à 16 mène à un
      // article du code monétaire et financier. Une URL fabriquée serait pire
      // qu'aucune.
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Charge le directeur des relations du travail et le directeur des exploitations de l'exécution de l'arrêté.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "Article d'exécution, adressé à deux directeurs d'administration centrale. Il ne prescrit rien à un employeur. Pas de `citationCle` : il n'a été lu que sur la page consolidée du texte, qui en rend la substance et non le verbatim exact — et la page consolidée s'est révélée tronquer ailleurs (articles 5 et 7). Le verbatim n'est pas affirmé faute d'avoir pu ouvrir l'article seul.",
    },
    {
      ref: "Arrêté 1993-11-04 annexe I",
      intitule:
        "Prescriptions générales relatives à la signalisation de sécurité et de santé",
      url: URL("LEGIARTI000006679546"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Cinq points : terminologie, modes de signalisation, interchangeabilité et complémentarité, efficacité d'une signalisation, signification des couleurs de sécurité. C'est ici que « signal lumineux » et « signal acoustique » reçoivent leur définition, et que les points 3 et 4 auxquels l'article 2 renvoie fixent le choix de la signalisation.",
      statut: "sans_objet",
      motif:
        "Annexe de définitions et de principes de choix. Elle ne crée aucune obligation autonome et ne porte aucune périodicité — vérifié point par point, y compris sur les rubriques consacrées aux signaux lumineux et acoustiques, qui n'y reçoivent que leur définition. Elle est indispensable à la lecture de l'article 15 : c'est sa définition du signal lumineux — un dispositif éclairé de l'intérieur ou par l'arrière apparaissant comme une surface lumineuse — qui fait entrer un BAES d'évacuation à pictogramme dans l'assiette du semestre.",
    },
    {
      ref: "Arrêté 1993-11-04 annexe II",
      intitule: "Panneaux de signalisation",
      url: URL("LEGIARTI000006679547"),
      versionEnVigueur: "2014-01-19",
      modifiePar: ARRETE_2013,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Six points : prescriptions générales sur les panneaux, puis panneaux d'interdiction, d'avertissement, d'obligation, de sauvetage et de secours, et panneaux concernant le matériel de lutte contre l'incendie. Fixe formes, couleurs, pictogrammes et conditions d'installation.",
      statut: "sans_objet",
      motif:
        "Annexe de caractéristiques : elle décrit à quoi doit ressembler un panneau, jamais quand il faut en poser un — cette question est aux articles 9 à 13 — ni à quel rythme le contrôler. Aucun passage sur la vérification, l'entretien, l'alimentation de secours ou une périodicité, vérifié rubrique par rubrique. Seule annexe modifiée par l'arrêté du 2 août 2013, en même temps que le passage des articles 2, 11, 13 et 14 au régime CLP.",
    },
    {
      ref: "Arrêté 1993-11-04 annexe III",
      intitule: "Signaux lumineux",
      url: URL("LEGIARTI000006679548"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Deux points : caractéristiques d'un signal lumineux, et règles d'utilisation. Le second impose que le signal intermittent marque un niveau de danger supérieur au signal continu, que la durée et la fréquence des éclairs assurent une perception sans confusion, que le code soit identique si un signal lumineux intermittent remplace ou complète un signal acoustique — et, dernière phrase, qu'un dispositif utilisable en cas de danger grave soit spécialement surveillé ou muni d'une ampoule auxiliaire.",
      citationCle:
        "Un dispositif pour émettre un signal lumineux utilisable en cas de danger grave doit être spécialement surveillé ou être muni d'une ampoule auxiliaire.",
      statut: "obligation_manquante",
      cause: "activite_exercee",
      toucheLaCible: true,
      motif:
        "SEULE ANNEXE À IMPOSER AUTRE CHOSE QU'UNE CARACTÉRISTIQUE, et il a fallu lire les deux rubriques en entier pour la trouver : la phrase est la dernière du point 2, sous un intitulé — « Règles d'utilisation des signaux lumineux » — qui ne laisse pas deviner qu'une obligation de surveillance s'y cache. Elle offre une alternative à l'exploitant : surveiller spécialement le dispositif, ou le doter d'une ampoule auxiliaire. La première branche est une organisation, la seconde un équipement, et le référentiel ne porte ni l'une ni l'autre. À ne pas confondre avec l'alimentation de secours de l'article 7, qui répond à une rupture d'énergie ; ici il s'agit de la défaillance de la lampe elle-même.",
      bloquePar:
        "Le déclenchement suppose de qualifier un « danger grave », qualification que ni le parc d'équipements ni le code NAF ne donnent — cinquième déclencheur de l'ADR-022, non implémenté. Et l'alternative laissée à l'exploitant se solderait de deux façons différentes, dont l'une n'est pas une preuve datable.",
    },
    {
      ref: "Arrêté 1993-11-04 annexe IV",
      intitule: "Signaux acoustiques",
      url: URL("LEGIARTI000006679549"),
      versionEnVigueur: "1993-12-17",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Deux points : caractéristiques d'un signal acoustique, et équipements d'alarme — c'est ici que sont définis les types auxquels l'article 14 renvoie, avec les normes applicables, les dimensions et le placement.",
      statut: "sans_objet",
      motif:
        "Annexe de caractéristiques, lue en entier : aucun passage sur la vérification, l'entretien, l'alimentation de secours, l'autonomie ni une périodicité. Ce constat compte autant que son contraire — c'est ici qu'on aurait pu s'attendre à trouver une règle d'autonomie de l'équipement d'alarme, comme l'arrêté du 14 décembre 2011 en porte une pour l'éclairage de sécurité. Il n'y en a pas : la seule règle d'alimentation de secours du texte est à l'article 7, et la seule règle de vérification à l'article 15.",
    },
  ],
};
