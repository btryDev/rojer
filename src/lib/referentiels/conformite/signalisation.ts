/**
 * Domaine « signalisation de sécurité » — arrêté du 4 novembre 1993.
 *
 * CE QUE CE DOMAINE OUVRE. Avant le 2026-09-02, le référentiel ne portait
 * AUCUNE obligation de signalisation de sécurité, sous aucun de ses trois
 * porteurs : le corpus `arrete-1993-11-04-signalisation` a été écrit ce jour-là
 * en `etendue: "integral"`, et il a rendu onze articles en
 * `obligation_manquante`. Ce fichier en encode sept ; les quatre autres restent
 * manquants et disent pourquoi, article par article, dans le corpus.
 *
 * ── LE PIÈGE, ET IL EST DANS LA PREMIÈRE PHRASE DE L'ARTICLE 15 ────────────
 *
 * Le guide professionnel qui a déclenché ce lot annonçait une « vérification
 * semestrielle des moyens et dispositifs de signalisation ». Le texte ne dit
 * pas cela :
 *
 *   « Les moyens et dispositifs de signalisation doivent, selon le cas, être
 *     régulièrement nettoyés, entretenus, vérifiés et réparés, remplacés si
 *     nécessaire, de manière à conserver leurs qualités intrinsèques ou de
 *     fonctionnement, ET NOTAMMENT les signaux lumineux et les signaux
 *     acoustiques doivent faire l'objet d'une vérification de leur bon
 *     fonctionnement et de leur réelle efficacité, avant leur mise en service
 *     et, ultérieurement, au moins chaque semestre. »
 *
 * Le « et notamment » RESTREINT. Le semestre ne porte que sur ce qui se
 * déclenche — les signaux lumineux et acoustiques de l'annexe I. Les panneaux,
 * les couleurs et les bandes jaune et noir, qui forment l'essentiel du parc
 * d'un restaurant ou d'un commerce, ne relèvent que du « régulièrement », qui
 * ne chiffre rien. D'où DEUX lignes et non une : un état permanent d'entretien
 * en `periodicite: "autre"`, et une échéance semestrielle bornée aux signaux
 * qui se déclenchent. Encoder un semestriel sur toute la signalisation aurait
 * fabriqué un rendez-vous que le texte ne demande pas, sur un parc qu'il ne
 * vise pas.
 *
 * L'annuelle des alimentations de secours, elle, est écrite sans restriction
 * d'assiette : « La vérification des alimentations de secours doit être
 * pratiquée au moins une fois par an. » Elle n'a d'équivalent nulle part
 * ailleurs dans le référentiel, sous aucun régime.
 *
 * ── LE RECOUVREMENT AVEC L'ÉCLAIRAGE DE SÉCURITÉ, TRANCHÉ ──────────────────
 *
 * L'article 9 prévoit expressément que les panneaux d'évacuation « peuvent être
 * opaques ou transparents lumineux et regroupés avec l'éclairage de sécurité » :
 * un BAES à pictogramme est donc à la fois un bloc régi par l'arrêté du
 * 14 décembre 2011 et un signal lumineux au sens de l'annexe I du présent
 * arrêté. C'est ce recouvrement que la `bloquePar` de l'article 15 demandait de
 * trancher avant d'encoder. Il est tranché ainsi, et le partage n'est pas
 * arbitraire :
 *
 *   - `incendie-travail-eclairage-securite-autonomie-semestrielle` (et sa
 *     jumelle ERP) portent l'AUTONOMIE d'au moins une heure, elles sont
 *     portées par un ÉQUIPEMENT et produisent une ligne par BAES déclaré ;
 *   - `signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle`
 *     porte le BON FONCTIONNEMENT ET LA RÉELLE EFFICACITÉ de tous les signaux
 *     lumineux et acoustiques du lieu de travail, elle est portée par
 *     l'ÉTABLISSEMENT et produit UNE ligne.
 *
 * Deux objets différents, deux porteurs différents, la même cadence. Le même
 * matériel peut être touché par les deux, et ce n'est pas un doublon : c'est le
 * cas ordinaire de deux textes qui prescrivent chacun le leur. Le porteur
 * établissement est en outre ce qui permet à cette ligne d'atteindre son champ
 * réel — l'article 15 ne porte AUCUNE condition d'effectif ni de typologie, là
 * où `incendie-travail-exercice-semestriel` est borné par R. 4227-34 (plus de
 * cinquante personnes réunies, ou matières inflammables). Un bureau de six
 * personnes équipé d'une alarme sonore est dans le champ de l'article 15 et
 * hors de celui de R. 4227-39.
 *
 * ── POURQUOI UN DOMAINE, ET POURQUOI SEPT LIGNES ET NON UNE ────────────────
 *
 * Aucun domaine existant ne pouvait accueillir ces obligations sans rabattre
 * l'une sur l'autre : le balisage d'évacuation n'est pas de l'`incendie`
 * (le domaine porte les moyens de lutte, les exercices et l'éclairage, jamais
 * les panneaux), et la signalisation d'un stockage de produits n'est pas du
 * `stockage_dangereux` (ses six lignes portent la rétention, la ventilation,
 * les FDS — aucune ne porte un marquage). Le domaine sert à grouper ce qu'un
 * dirigeant traite d'un seul geste : ici, faire le tour de ses murs.
 *
 * Et neuf lignes plutôt qu'une seule « mettre en place la signalisation »,
 * parce que le texte lui-même les sépare. L'article 2 le dit dans sa première
 * proposition : la signalisation générale s'impose « SANS PRÉJUDICE » de celles
 * de l'évacuation, des secours, de l'incendie et des substances dangereuses —
 * c'est le texte qui refuse la fusion, pas nous. Chacune se constate à un
 * endroit différent, chacune cite un article distinct, et l'ADR-022 a corrigé
 * sur `PE 4` exactement le défaut inverse. Le précédent de `PE 35` — trois
 * plans en une seule ligne — ne s'applique pas ici : ces trois plans sont
 * commandés par une même phrase et se posent en une fois, alors qu'un panneau
 * d'extincteur, une bande jaune et noir sur une marche et un pictogramme CLP
 * sur un bidon ne se posent ni au même endroit, ni pour le même risque, ni le
 * même jour.
 *
 * ── LE PORTEUR, LIGNE PAR LIGNE ────────────────────────────────────────────
 *
 * Sept lignes sur neuf sont portées par l'ÉTABLISSEMENT : leur objet est le
 * lieu de travail dans son ensemble — les risques résiduels, les cheminements,
 * les obstacles, l'entretien du parc de signalisation. Aucune catégorie
 * d'équipement ne désigne un panneau, une bande de sol ni un signal, et en
 * inventer une serait la faute que ce lot s'interdit.
 *
 * Deux lignes sont portées par un ÉQUIPEMENT, et elles le sont parce que leur
 * objet EST l'équipement déclaré : l'identification des moyens de lutte contre
 * l'incendie (art. 10) se pose sur l'extincteur ou le RIA, exactement comme
 * `incendie-travail-moyens-lutte` s'y pose déjà ; la signalisation des
 * substances dangereuses (art. 11) se pose sur l'aire de stockage déclarée.
 */

import type { Obligation } from "./types";

export const obligationsSignalisation: Obligation[] = [
  {
    id: "signalisation-etablissement-risques-residuels",
    domaine: "signalisation",
    libelle:
      "Signalisation de sécurité des risques que ni la protection collective ni l'organisation du travail n'écartent",
    description:
      "Une signalisation de sécurité est mise en œuvre chaque fois qu'un risque, sur un lieu de travail, ne peut pas être évité ou prévenu par une protection collective ou par l'organisation du travail. Elle se détermine à partir des risques inscrits au document unique et se choisit selon les principes des points 3 et 4 de l'annexe I de l'arrêté. Elle vient sans préjudice des signalisations dues par ailleurs : évacuation, sauvetage et secours, matériel de lutte contre l'incendie, substances et mélanges dangereux.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 2 (mise en œuvre d'une signalisation de sécurité pour tout risque non évité par une protection collective ou par l'organisation du travail)",
        article: "Arrêté 1993-11-04 art. 2",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679530",
        note: "« […] la mise en oeuvre d'une signalisation de sécurité s'impose toutes les fois que sur un lieu de travail un risque ne peut pas être évité ou prévenu par l'existence d'une protection collective ou par l'organisation du travail. Le choix de cette signalisation est déterminé en fonction des principes énoncés aux points 3 et 4 de l'annexe I. » Verbatim relevé le 2026-09-02, version en vigueur depuis le 2014-01-19 (arrêté du 2 août 2013).",
        versionConstatee: "2014-01-19",
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
      "L'OBLIGATION GÉNÉRALE DE SIGNALISER, ET LE DÉCLENCHEUR EST LE STATUT D'EMPLOYEUR. Le texte ne pose aucun seuil d'effectif, aucune typologie, aucune condition d'équipement : tout lieu de travail est dans le champ. `typologies: { travail: true }` sans autre borne, donc, et porteur établissement — une seule ligne, due même si rien n'est déclaré au parc.\n\nPOURQUOI CE N'EST PAS UN DOUBLON DES QUATRE LIGNES SUIVANTES, et le texte le dit lui-même : l'article 2 s'ouvre par « Sans préjudice de l'obligation de signalisation pour ce qui concerne notamment l'évacuation, le sauvetage et les secours, le matériel et l'équipement de lutte contre l'incendie, les substances ou mélanges dangereux ainsi que certains équipements et matériels spécifiques ». La signalisation générale du risque résiduel se cumule avec les signalisations spéciales des articles 9 à 12 ; elle ne les recouvre pas. Le test anti-doublon compare l'article fondateur, et chacune des neuf lignes de ce domaine en a un distinct.\n\nRIEN NE LA BLOQUE, ET C'EST CE QUI LA REND ENCODABLE. Son déclencheur est le risque résiduel constaté à l'évaluation des risques — donc une donnée que le produit possède déjà, sous une forme que le référentiel n'a pas à interroger : l'obligation est de signaler, pas de signaler tel risque nommé. La ligne dit au dirigeant qu'il doit faire ce tour ; elle ne prétend pas savoir quels panneaux il doit poser.\n\nCE QUE CETTE LIGNE NE PORTE PAS. L'article 3 (nombre et emplacement des dispositifs, fonction de l'importance du risque et de la zone à couvrir) est un critère de proportionnalité que le produit ne peut ni vérifier ni échéancer : il reste `sans_objet` au corpus. L'article 4 (détermination de la signalisation après consultation des représentants du personnel) N'EST PAS ENCODÉ et reste `obligation_manquante` : il vise encore le CHSCT et les délégués du personnel, instances fondues dans le CSE au plus tard le 1er janvier 2020 par l'ordonnance n° 2017-1386, et substituer le CSE au texte serait écrire ce qu'aucun texte de ce dépôt ne dit.\n\nNATURE : ÉTAT PERMANENT (ADR-026). La signalisation se pose puis se maintient ; il n'y a pas d'acte à refaire à date. `pieceAttendue: null` : ce que le texte exige est l'acte matériel — un panneau posé —, pas un écrit détenu.\n\nCriticité 3 : le manquement est réel et constatable par l'inspection, mais il ne met pas seul en danger — le risque signalé, lui, est déjà coté au document unique.",
  },

  {
    id: "signalisation-etablissement-alimentation-secours-presence",
    domaine: "signalisation",
    libelle:
      "Alimentation de secours des signalisations qui ont besoin d'une source d'énergie",
    description:
      "Toute signalisation qui a besoin d'une source d'énergie pour fonctionner — signal lumineux de danger, signal acoustique, panneau transparent lumineux — est assurée d'une alimentation de secours en cas de rupture de cette énergie. Le texte réserve le cas où le risque signalé disparaît avec la coupure d'énergie.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 7 (alimentation de secours des signalisations qui ont besoin d'une source d'énergie)",
        article: "Arrêté 1993-11-04 art. 7",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679535",
        note: "« Les signalisations qui ont besoin d'une source d'énergie pour fonctionner doivent être assurées d'une alimentation de secours en cas de rupture de cette énergie, sauf si le risque disparaît avec la coupure d'énergie. » Verbatim relevé le 2026-09-02, version d'origine du 1993-12-17, jamais modifiée.",
        versionConstatee: "1993-12-17",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    equipementsEnContexte: ["BAES", "ALARME_INCENDIE"],
    transmet: [],
    notesInternes:
      "L'ARTICLE QUI FAIT EXISTER CE QUE L'ARTICLE 15 FAIT VÉRIFIER CHAQUE ANNÉE. Sans lui, `signalisation-etablissement-alimentations-secours-annuelle` porterait une vérification sur un objet dont aucune ligne ne dit qu'il doit exister.\n\nLA RÉSERVE FINALE N'EST PAS ENCODÉE EN CONDITION, ET C'EST UNE DÉCISION. « Sauf si le risque disparaît avec la coupure d'énergie » est un allègement de régime : il faudrait, pour l'appliquer, savoir de chaque signalisation alimentée si le risque qu'elle signale s'éteint avec le courant. Aucune propriété d'équipement ne le dit, et la règle du non-renseigné tranche dans ce sens précis — un allègement conditionné à une absence ne s'applique pas tant que l'absence n'est pas déclarée. La ligne est donc posée SANS la réserve, ce qui la sur-applique volontairement chez l'employeur dont toutes les signalisations alimentées signalent un risque électrique. La sur-application est visible par celui qui la subit ; le faux négatif inverse — retirer l'alimentation de secours d'une alarme sonore parce qu'on n'a pas su qualifier son risque — ne l'est par personne.\n\nLE VERBATIM A FAILLI SE PERDRE, et le corpus le dit : la page consolidée de l'arrêté TRONQUE cet article et rend sa première phrase sans la réserve finale. Elle n'a été retrouvée qu'en rouvrant l'article seul. C'est la raison pour laquelle le dépouillement a été mené article par article sur les pages `article_lc` plutôt que sur la page du texte.\n\nPORTEUR ÉTABLISSEMENT, PAS ÉQUIPEMENT. Aucune catégorie ne désigne une signalisation alimentée en énergie : le parc déclare des BAES et des alarmes incendie, pas les dispositifs de signalisation comme tels. Les deux catégories sont donc en `equipementsEnContexte` — affichées pour que le dirigeant voie lesquels de ses appareils sont concernés, sans jamais déclencher la ligne, qui existe même si rien n'est déclaré. La liste n'est pas limitative : un panneau transparent lumineux et un signal de danger de quai n'ont pas de catégorie.\n\nNATURE : ÉTAT PERMANENT (ADR-026). L'alimentation de secours est un équipement à mettre en place puis à conserver, pas un rendez-vous. Sa vérification annuelle, elle, est une échéance récurrente et vit sur sa propre ligne — deux rythmes ne se fondent pas (ADR-022).\n\nÀ NE PAS CONFONDRE avec l'ampoule auxiliaire de l'annexe III, qui répond à la défaillance de la LAMPE et non à une rupture d'énergie. L'annexe III reste `obligation_manquante` : son déclenchement suppose de qualifier un « danger grave », qualification qu'aucun attribut ne donne.",
  },

  {
    id: "signalisation-etablissement-cheminements-evacuation",
    domaine: "signalisation",
    libelle: "Balisage des cheminements d'évacuation vers la sortie la plus proche",
    description:
      "Une signalisation balise les cheminements empruntés par le personnel pour l'évacuation vers la sortie la plus rapprochée, par des panneaux conformes aux points 1 et 5 de l'annexe II de l'arrêté. Ces panneaux peuvent être opaques ou transparents lumineux, et regroupés avec l'éclairage de sécurité. Les dégagements qui font partie des dégagements réglementaires et ne servent pas habituellement de passage pendant le travail portent en outre un panneau additionnel « Sortie de secours ».",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 9 (balisage des cheminements d'évacuation par panneaux, et panneau additionnel « Sortie de secours » sur les dégagements réglementaires non utilisés habituellement)",
        article: "Arrêté 1993-11-04 art. 9",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679537",
        note: "« Une signalisation doit baliser les cheminements empruntés par le personnel pour l'évacuation vers la sortie la plus rapprochée. […] Ces panneaux peuvent être opaques ou transparents lumineux et regroupés avec l'éclairage de sécurité. Les dégagements faisant partie des dégagements réglementaires et qui ne servent pas habituellement de passage pendant la période de travail doivent être signalés par des panneaux comportant un panneau additionnel portant la mention Sortie de secours. » Verbatim relevé le 2026-09-02, version d'origine du 1993-12-17, jamais modifiée.",
        versionConstatee: "1993-12-17",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { travail: true },
    porteur: "etablissement",
    equipementsEnContexte: ["BAES"],
    transmet: [],
    notesInternes:
      "LE DOMAINE INCENDIE NE PORTAIT PAS CELA. Il couvre la consigne affichée (R. 4227-37), les exercices (R. 4227-39), l'éclairage de sécurité et les moyens de lutte — jamais les panneaux d'évacuation eux-mêmes. Un employeur pouvait donc être à jour de tout ce que le référentiel lui présentait sans qu'aucune ligne ne lui dise de baliser ses cheminements.\n\nUN SEUL ACTE, DEUX PANNEAUX, UNE LIGNE — et c'est le précédent de `PE 35` (trois plans en une ligne) qui s'applique ici, à la différence des autres lignes de ce domaine. Le balisage des cheminements et le panneau additionnel « Sortie de secours » sont commandés par le même article, se posent en une fois, par le même geste, sur le même parcours d'évacuation, et le second n'a aucun sens détaché du premier. Les scinder aurait produit deux cases pour un seul tour de bâtiment.\n\nC'EST L'ARTICLE QUI ÉTABLIT LE RECOUVREMENT AVEC L'ÉCLAIRAGE DE SÉCURITÉ, en toutes lettres : « Ces panneaux peuvent être opaques ou transparents lumineux et regroupés avec l'éclairage de sécurité. » Un BAES d'évacuation à pictogramme est donc simultanément un bloc régi par l'arrêté du 14 décembre 2011 et un signal lumineux au sens de l'annexe I du présent arrêté. Cette ligne-ci ne recoupe pourtant AUCUNE obligation existante : les deux lignes d'éclairage de sécurité portent l'essai mensuel et l'autonomie semestrielle, c'est-à-dire l'état de fonctionnement d'un bloc ; celle-ci porte la PRÉSENCE d'un balisage sur un cheminement, et elle est due même là où le balisage est assuré par des panneaux opaques sans aucun bloc. `BAES` est en `equipementsEnContexte` pour cette raison et pour elle seule : montrer au dirigeant que ses blocs peuvent porter ce balisage, sans jamais faire dépendre la ligne de leur déclaration.\n\nPORTEUR ÉTABLISSEMENT : un cheminement d'évacuation est une propriété du lieu, pas d'un appareil, et l'ADR-019 interdit de faire porter une échéance par le bâtiment. Une seule ligne, due même si aucun équipement n'est déclaré.\n\nCriticité 4 : c'est un dispositif d'évacuation. Son absence coûte des secondes au moment où elles comptent, et le manquement est constaté d'un regard par une commission de sécurité comme par l'inspection.\n\nNATURE : ÉTAT PERMANENT (ADR-026), `pieceAttendue: null` — l'obligation est le panneau posé, pas une pièce détenue. L'entretien de ces panneaux relève de `signalisation-etablissement-entretien`, qui porte l'article 15 et non celui-ci.",
  },

  {
    id: "signalisation-incendie-moyens-lutte",
    domaine: "signalisation",
    libelle:
      "Identification des équipements de lutte contre l'incendie : coloration rouge et panneau de localisation",
    description:
      "Les équipements de lutte contre l'incendie sont identifiés par une coloration rouge de l'équipement, sur une surface suffisante pour une identification facile, et par un panneau de localisation ou une coloration des emplacements ou des accès aux emplacements où ils se trouvent. Les panneaux du point 6 de l'annexe II de l'arrêté sont utilisés en fonction de ces emplacements. Le texte ne les rend pas obligatoires lorsque les équipements sont directement visibles.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 10 (coloration rouge des équipements de lutte contre l'incendie et panneau de localisation de leurs emplacements)",
        article: "Arrêté 1993-11-04 art. 10",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679538",
        note: "« Les équipements de lutte contre l'incendie doivent être identifiés par une coloration des équipements et par un panneau de localisation ou une coloration des emplacements ou des accès aux emplacements dans lesquels ils se trouvent. La couleur d'identification de ces équipements est rouge. La surface rouge doit être suffisante pour permettre une identification facile. Les panneaux prévus à l'annexe II, point 6, doivent être utilisés en fonction des emplacements de ces équipements. Lorsque ces équipements sont directement visibles, les panneaux ne sont pas obligatoires. » Verbatim relevé le 2026-09-02, version d'origine du 1993-12-17, jamais modifiée.",
        versionConstatee: "1993-12-17",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    categoriesEquipement: ["EXTINCTEUR", "RIA"],
    transmet: [],
    notesInternes:
      "PORTEUR ÉQUIPEMENT, ET C'EST LE SEUL DES NEUF AVEC LA SIGNALISATION DES SUBSTANCES DANGEREUSES. La raison est dans l'objet du texte : ce sont LES ÉQUIPEMENTS qui sont identifiés — colorés en rouge, localisés par un panneau. L'obligation se constate appareil par appareil, exactement comme `incendie-travail-moyens-lutte`, qui porte la présence et le maintien en état des mêmes extincteurs et est elle aussi portée par l'équipement. La faire porter par l'établissement aurait produit une case unique là où le dirigeant doit passer devant chacun de ses appareils, et aurait désaligné les deux lignes qu'il lit côte à côte.\n\nCE N'EST PAS UN DOUBLON DE `incendie-travail-moyens-lutte`. Celle-ci porte R. 4227-28 et suivants — l'établissement doit ÊTRE ÉQUIPÉ et maintenir ses moyens en état ; celle-là porte l'arrêté du 4 novembre 1993 — les moyens doivent ÊTRE IDENTIFIABLES. Article fondateur distinct, acte distinct, et un extincteur en parfait état de marche caché derrière une porte de réserve satisfait la première sans satisfaire la seconde. Le test anti-doublon compare l'article fondateur : vérifié avant encodage, aucune obligation du référentiel ne se fonde sur l'article 10 de cet arrêté.\n\nLA DISPENSE DE LA DERNIÈRE PHRASE N'EST PAS ENCODÉE, ET LA LIGNE SUR-APPLIQUE DONC VOLONTAIREMENT. « Lorsque ces équipements sont directement visibles, les panneaux ne sont pas obligatoires » : la visibilité directe est un constat de terrain qu'aucune propriété d'équipement ne porte, et l'inventer serait un attribut de modèle que ce lot s'interdit. La dispense porte au demeurant sur les SEULS panneaux — la coloration rouge et l'identification de l'emplacement restent dues dans tous les cas —, ce qui limite la sur-application à une moitié de l'obligation. Elle est écrite dans la `description`, pour que le dirigeant qui a ses extincteurs en pleine vue sache ce que le texte lui concède.\n\nRIA AJOUTÉ À CÔTÉ D'EXTINCTEUR : un robinet d'incendie armé est un équipement de lutte contre l'incendie au sens du texte, qui ne distingue pas. Les autres moyens possibles — colonne sèche, système d'extinction automatique — n'ont pas de catégorie au parc ; la ligne les sous-applique, ce qui est le sens d'erreur préféré ici puisqu'elle est portée par un équipement déclaré.\n\nNATURE : ÉTAT PERMANENT (ADR-026), `pieceAttendue: null` — la peinture et le panneau sont l'obligation elle-même.",
  },

  {
    // CRÉÉE LE 2026-10-07 (relecture du préventeur : « Idem ERP cat N1 à N5
    // MS39 PE26 », en regard de la ligne ci-dessus). Sœur ERP, quatre
    // premières catégories ; la 5ᵉ a sa ligne juste en dessous.
    id: "signalisation-erp-extincteurs-identification",
    domaine: "signalisation",
    libelle:
      "Identification et signalisation des moyens d'extinction, selon l'appareil (ERP des quatre premières catégories)",
    description:
      "Dans un établissement recevant du public des quatre premières catégories, l'extincteur est de couleur rouge, afin de faciliter sa localisation tant par le personnel que par le public (MS 38 § 3). Les moyens d'extinction sont répartis de préférence dans les dégagements, en des endroits visibles et facilement accessibles ; ils peuvent être protégés à condition de faire l'objet d'une signalisation claire, et leur emplacement est repéré par une signalisation durable (MS 39 § 1). Les extincteurs portatifs sont accrochés à un élément fixe, avec une signalisation durable (MS 39 § 2). Si les robinets d'incendie armés sont placés dans des armoires ou coffrets, ceux-ci sont signalés et ne comportent pas de dispositif de condamnation (MS 15 § 4). Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « § 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité. »",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 39 § 1 et § 2 (emplacement repéré par une signalisation durable) — livre II, établissements des quatre premières catégories",
        article: "MS 39",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020382896",
        note: "« Ils peuvent être protégés à condition de faire l'objet d'une signalisation claire. Ils ne doivent pas apporter de gêne à la circulation des personnes et leur emplacement, repéré par une signalisation durable, doit être tel que leur efficacité ne risque pas d'être compromise par les variations éventuelles de température survenant dans l'établissement. » § 2 : « Ils doivent être accrochés à un élément fixe, avec une signalisation durable, sans placer la poignée de portage à plus de 1,20 m du sol. » Relu le 2026-10-07 par l'API Légifrance (PISTE) en BAC À SABLE : LEGIARTI000020382896, en vigueur depuis le 2008-10-08, aucune version future.",
        versionConstatee: "2008-10-08",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 38 § 3 (l'extincteur est de couleur rouge) — livre II, établissements des quatre premières catégories",
        article: "MS 38",
        url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020317639/",
        note: "« Afin de faciliter sa localisation tant par le personnel que par le public, il doit être de couleur rouge. » Le sujet est « Un extincteur » (§ 3). Relu le 2026-10-07 en bac à sable PISTE : LEGIARTI000020382888, 2008-10-08.",
        versionConstatee: "2008-10-08",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 15 § 4 (armoires ou coffrets des robinets d'incendie armés signalés) — livre II, établissements des quatre premières catégories",
        article: "MS 15",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317685",
        note: "« § 4. Si les robinets d'incendie armés sont placés dans des armoires ou coffrets, ceux-ci doivent être signalés et ne pas comporter de dispositif de condamnation. » Relu le 2026-10-07 par l'API Légifrance (PISTE) en BAC À SABLE : LEGIARTI000020317685, seule version, en vigueur depuis le 1980-08-15.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    categoriesEquipement: ["EXTINCTEUR", "RIA"],
    transmet: [],
    notesInternes:
      "CRÉÉE LE 2026-10-07, relecture du préventeur (Julien Chantoin, retour du 2026-10-05), annotation portée sur `signalisation-incendie-moyens-lutte` : « Idem ERP cat N1 à N5 MS39 PE26 ». La sœur du Code du travail (arrêté du 4 novembre 1993, art. 10) ne vaut que pour `travail` ; un ERP sans salarié — ou l'ERP d'un employeur, au titre du règlement de sécurité — n'avait aucune ligne d'identification des moyens d'extinction.\n\nDEUX LIGNES ET NON UNE, parce que les textes ne sont pas les mêmes selon le groupe. En 1re à 4e catégorie : MS 38 § 3 (« il doit être de couleur rouge », dit de l'extincteur) et MS 39 (« leur emplacement, repéré par une signalisation durable »), deux articles du Livre II. En 5e catégorie, PE 1 § 1 écarte le Livre II sauf renvoi exprès ; PE 26 § 1 renvoie à MS 39 et non à MS 38 — la couleur rouge n'y est donc pas exigée au titre du règlement — et PE 26 § 3 ajoute le panneau pour l'appareil non apparent. D'où `signalisation-erp-5-extincteurs-identification`.\n\n~~PORTEUR ÉQUIPEMENT, `EXTINCTEUR` seul : MS 38 § 1 énumère les moyens d'extinction visés : « extincteurs portatifs ; extincteurs sur roues ; seaux et seaux pompes d'incendie ». Le RIA, que porte la sœur du Code du travail, n'est pas dans l'énumération de MS 38 § 1 et n'est pas rattaché ici.~~ [2026-10-07, C60, revue indépendante : MS 38 § 1 n'énumère pas, il donne une liste indicative — « des moyens d'extinction tels que » — ; le motif était donc une lecture présentée comme le texte.] PORTEUR ÉQUIPEMENT, `EXTINCTEUR` ET `RIA`. Ce que les textes disent, relus le 2026-10-07 par l'API PISTE (bac à sable) : MS 38 § 1 dote l'établissement de « moyens d'extinction tels que » extincteurs portatifs, extincteurs sur roues, seaux et seaux pompes — liste indicative ; MS 39 § 1 vise « les moyens d'extinction » sans les limiter, mais il appartient, comme MS 38, à la sous-section 9 « Appareils mobiles et moyens divers » de la section « Moyens d'extinction », quand les robinets d'incendie armés ont leur propre sous-section 3 (MS 14 à MS 17). Y ranger le RIA par MS 39 serait une lecture que la place de l'article ne soutient pas. C'est MS 15 § 4, dans la sous-section des RIA, qui porte leur signalisation : « Si les robinets d'incendie armés sont placés dans des armoires ou coffrets, ceux-ci doivent être signalés et ne pas comporter de dispositif de condamnation. » Le RIA est donc rattaché, sur ce fondement, et l'inclusion s'aligne sur la ligne de 5ᵉ catégorie, qui le porte au titre de PE 26 § 3 (« un appareil ou un dispositif d'extinction » non apparent). Comme là, la condition — un RIA « placé dans des armoires ou coffrets » — n'est portée par aucune propriété : sur-application de cette moitié, écrite dans la description. MS 14 § 3 (« Les robinets d'incendie armés doivent être numérotés en une série unique ») n'est pas repris : une numérotation n'est pas une signalisation de localisation, et l'article n'est pas entré au corpus.\n\nNATURE : ÉTAT PERMANENT (ADR-026), comme la sœur ; `pieceAttendue: null`. Réalisateur `exploitant`, comme la sœur : le texte ne réserve la signalisation à aucun tiers. Criticité 3, comme la sœur.\n\nGN 10 DIT DANS LA DESCRIPTION, comme les autres états permanents du règlement (PE 27, PE 33, PE 35) : hors entretien et vérifications, le règlement ne s'applique pas aux établissements existants, sauf travaux. La ligne est servie à tout établissement de la catégorie — sur-application visible, que la description rend lisible.\n\nLIBELLÉ NEUTRE [2026-10-07, C62, revue finale] : ~~« Extincteur de couleur rouge, emplacement des moyens d'extinction repéré par une signalisation durable, armoire de robinet d'incendie armé signalée »~~ — la ligne étant portée par l'équipement, un extincteur lisait une armoire de RIA et un RIA une couleur rouge que MS 15 § 4 ne lui demande pas. Le libellé ne dit plus que ce qui vaut pour les deux appareils ; la description dit, texte par texte, ce que chacun doit (MS 38 § 3 et MS 39 pour l'extincteur, MS 15 § 4 pour l'armoire de RIA). Une scission en deux lignes aurait créé deux ids pour une seule prescription de signalisation.",
  },

  {
    // CRÉÉE LE 2026-10-07 — même annotation du préventeur, 5ᵉ catégorie.
    id: "signalisation-erp-5-extincteurs-identification",
    domaine: "signalisation",
    libelle:
      "Emplacement de l'extincteur repéré par une signalisation durable, panneau de localisation de l'appareil d'extinction non apparent (ERP de 5ᵉ catégorie)",
    description:
      "Dans un établissement recevant du public de 5ᵉ catégorie, l'extincteur portatif est installé dans les conditions de l'article MS 39 (PE 26 § 1) : son emplacement est repéré par une signalisation durable, et il est accroché à un élément fixe, avec une signalisation durable. Lorsqu'un appareil ou un dispositif d'extinction n'est pas apparent, il est signalé par un panneau conforme aux signaux normalisés d'indication de localisation d'un équipement de lutte contre l'incendie (PE 26 § 3). Les dispositions générales du règlement de sécurité écrivent, à l'article GN 10 (rédaction en vigueur depuis le 23 janvier 2010, arrêté du 24 septembre 2009) : « § 1. A l'exception des dispositions à caractère administratif, de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à l'entretien, le présent règlement ne s'applique pas aux établissements existants. § 2. Lorsque des travaux de remplacement d'installation, d'aménagement ou d'agrandissement sont entrepris dans ces établissements, les dispositions du présent règlement sont applicables aux seules parties de la construction ou des installations modifiées. Toutefois, si ces modifications ont pour effet d'accroître le risque de l'ensemble de l'établissement, notamment si une évacuation différée est rendue nécessaire, des mesures de sécurité complémentaires peuvent être imposées après avis de la commission de sécurité. »",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PE 26 § 1 et § 3 (extincteur installé dans les conditions de MS 39 ; panneau de localisation de l'appareil non apparent) — livre III, établissements de 5ᵉ catégorie",
        article: "PE 26",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024766855",
        note: "« § 1. Les établissements doivent être dotés d'au moins un extincteur portatif installé dans les conditions définies par l'article MS 39 et en atténuation de cet article avec un minimum d'un appareil pour 300 mètres carrés et un appareil par niveau. » « § 3. Lorsqu'un appareil ou un dispositif d'extinction n'est pas apparent, il doit être signalé par un panneau conforme aux signaux normalisés d'indication de localisation d'un équipement de lutte contre l'incendie ou d'un autre moyen d'alarme ou d'alerte définis à la norme NF X 08-003 relative aux couleurs et signaux de sécurité. » Relu le 2026-10-07 par l'API Légifrance (PISTE) en BAC À SABLE : LEGIARTI000024766855, en vigueur depuis le 2008-10-08, aucune version future.",
        versionConstatee: "2008-10-08",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 39 § 1 et § 2 (emplacement repéré par une signalisation durable) — livre II, établissements des quatre premières catégories, applicable en 5ᵉ par le renvoi exprès de PE 26 § 1",
        article: "MS 39",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020382896",
        note: "« […] leur emplacement, repéré par une signalisation durable, doit être tel que leur efficacité ne risque pas d'être compromise par les variations éventuelles de température survenant dans l'établissement. » § 2 : « Ils doivent être accrochés à un élément fixe, avec une signalisation durable, sans placer la poignée de portage à plus de 1,20 m du sol. » Relu le 2026-10-07 en bac à sable PISTE (LEGIARTI000020382896, 2008-10-08).",
        versionConstatee: "2008-10-08",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { erp: { categories: ["N5"] } },
    categoriesEquipement: ["EXTINCTEUR", "RIA"],
    transmet: [],
    notesInternes:
      "CRÉÉE LE 2026-10-07 avec `signalisation-erp-extincteurs-identification`, sur la même annotation du préventeur (« Idem ERP cat N1 à N5 MS39 PE26 »). PE 26 n'était au corpus qu'en `sans_objet` (« règle de dotation et de dimensionnement ») et sa citation s'arrêtait au § 1 : le § 3 — le panneau de l'appareil non apparent — n'avait jamais été relevé. Verbatim des § 1 à § 3 relu le 2026-10-07 par l'API PISTE (bac à sable), via `src/lib/legifrance/client.ts`.\n\nCE QUE LE TEXTE EXIGE EN 5ᵉ, ET CE QU'IL N'EXIGE PAS. PE 26 § 1 renvoie à MS 39 — emplacement repéré par une signalisation durable, extincteur accroché avec une signalisation durable. Il ne renvoie pas à MS 38 : la couleur rouge n'est pas exigée en 5ᵉ au titre du règlement de sécurité, et le libellé ne la mentionne pas (chez un employeur, l'art. 10 de l'arrêté du 4 novembre 1993 l'exige par `signalisation-incendie-moyens-lutte`). PE 26 § 3 ne vaut que « lorsqu'un appareil ou un dispositif d'extinction n'est pas apparent » : la visibilité est un constat de terrain qu'aucune propriété ne porte, la ligne sur-applique donc cette moitié, comme la sœur du Code du travail sur sa dispense symétrique ; la condition est écrite dans la description. La norme NF X 08-003 citée par le § 3 n'est pas reprise en libellé : « signaux normalisés » suffit à dire ce que le texte exige.\n\n`RIA` AJOUTÉ À `EXTINCTEUR`, pour le seul § 3, qui vise « un appareil ou un dispositif d'extinction » sans les distinguer — même lecture que la sœur. Le § 1 et MS 39 ne visent que l'extincteur portatif ; un RIA déclaré en 5ᵉ reçoit donc une ligne dont la moitié MS 39 ne le concerne pas, ce que la description laisse lisible (« l'extincteur portatif »).\n\nNATURE : ÉTAT PERMANENT, réalisateur `exploitant`, criticité 3 : comme la sœur.\n\nGN 10 DIT DANS LA DESCRIPTION, comme les autres états permanents du règlement (PE 27, PE 33, PE 35) : hors entretien et vérifications, le règlement ne s'applique pas aux établissements existants, sauf travaux. La ligne est servie à tout établissement de la catégorie — sur-application visible, que la description rend lisible.",
  },

  {
    id: "signalisation-stockage-substances-dangereuses",
    domaine: "signalisation",
    libelle:
      "Signalisation des aires et enceintes de stockage de substances ou mélanges dangereux",
    description:
      "Les aires, salles ou enceintes utilisées pour stocker des substances ou mélanges dangereux en quantités importantes sont signalées par un panneau d'avertissement approprié choisi au point 3 de l'annexe II de l'arrêté, ou identifiées par le pictogramme du règlement (CE) n° 1272/2008, à moins que l'étiquetage des emballages ou récipients n'y suffise. Les tuyauteries apparentes qui contiennent ou transportent ces substances portent le même pictogramme, placé sur un côté visible, près des points les plus dangereux et de manière répétitive.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 11 (pictogramme CLP sur les tuyauteries apparentes, panneau d'avertissement sur les aires, salles et enceintes de stockage)",
        article: "Arrêté 1993-11-04 art. 11",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679539",
        note: "« Les tuyauteries apparentes contenant ou transportant des substances ou mélanges dangereux sont munis du pictogramme ou symbole sur couleur de fond défini par le règlement (CE) n° 1272/2008. […] Les aires, salles ou enceintes utilisées pour stocker des substances ou mélanges dangereux en quantités importantes doivent être signalisées par un panneau d'avertissement approprié choisi parmi ceux énumérés à l'annexe II, point 3, ou être identifiées conformément au premier alinéa du présent article, à moins que l'étiquetage des différents emballages ou récipients suffise à cet effet. » Verbatim relevé le 2026-09-02, version en vigueur depuis le 2014-01-19 (arrêté du 2 août 2013).",
        versionConstatee: "2014-01-19",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    categoriesEquipement: ["STOCKAGE_MATIERE_DANGEREUSE"],
    transmet: [],
    notesInternes:
      "[2026-10-07 : le domaine n'en porte plus que DEUX — les fiches de données de sécurité et la formation ; les quatre autres sont retirées (relecture préventeur du 30/09, « à exclure sauf 3 derniers points », dont celle-ci).] ~~LE DOMAINE `stockage_dangereux` PORTE SIX OBLIGATIONS~~ ET AUCUNE NE PORTAIT CELLE-CI : déclaration ICPE, rétention, vérification d'étanchéité, ventilation des locaux, fiches de données de sécurité, formation du personnel. La signalisation du stockage n'y figurait pas. Le test anti-doublon compare l'article fondateur : aucune obligation du référentiel ne se fonde sur l'article 11 de cet arrêté, vérifié avant encodage.\n\nANCRAGE SUR `STOCKAGE_MATIERE_DANGEREUSE`, EN CONNAISSANCE DE CAUSE, ET C'EST LE MÊME ARBITRAGE QUE `stockage-dangereux-formation-personnel` : le déclencheur du texte est la PRÉSENCE de substances dangereuses, ce qui relève du cinquième déclencheur de l'ADR-022 (« activité réellement exercée »), non implémenté. La catégorie d'équipement est un proxy imparfait — un établissement peut détenir des produits classés sans avoir déclaré de stockage — mais un proxy dans le bon sens : il sous-applique au lieu de sur-appliquer. Passer au porteur établissement poserait un panneau d'avertissement de produits dangereux à tout employeur du produit, cabinet et boutique de vêtements compris.\n\nCE QUE CETTE LIGNE LAISSE DEHORS, ET C'EST ÉCRIT AU CORPUS EN `reserve`. L'article a trois branches ; l'ancrage n'en atteint qu'une. Les TUYAUTERIES APPARENTES et le TRANSPORT INTERNE de substances dangereuses ne sont attachés à aucun stockage déclaré et n'ont aucune catégorie propre — un établissement qui a des tuyauteries marquables sans avoir déclaré de stockage ne verra pas cette ligne. La branche du stockage est celle qui touche réellement la cible (réserve de produits d'entretien d'un commerce, local à produits de plonge d'un restaurant), et c'est elle que l'ancrage sert. La `description` nomme les trois branches pour que le dirigeant qui voit la ligne sache ce qu'elle couvre.\n\nDEUX CONDITIONS DU TEXTE NE SONT PAS ENCODÉES, et toutes deux dans le sens de la sur-application : « en quantités importantes », que le texte ne chiffre pas et qu'aucun attribut ne mesure ; et « à moins que l'étiquetage des différents emballages ou récipients suffise à cet effet », qui est un constat de terrain. Les deux sont écrites dans la `description`. Inventer un seuil de quantité aurait été inventer un chiffre que le texte ne porte pas.\n\nLE RÉGIME TRANSITOIRE EST ÉPUISÉ : l'arrêté du 2 août 2013 laissait jusqu'au 31 mai 2017 pour passer de l'ancien étiquetage au règlement CLP. La date est passée, seul le régime CLP s'applique, et la ligne ne porte donc qu'une référence.\n\nCET ARTICLE DÉTAILLE R. 4224-21 DU CODE DU TRAVAIL — « Lorsque le contenu transporté par les tuyauteries présente un danger, ces tuyauteries font l'objet d'une signalisation permettant de déterminer la nature du contenu transporté. » L'article du Code n'est dans AUCUN corpus de ce dépôt : la section 5 du chapitre IV (R. 4224-20 à R. 4224-24) est un angle mort entier, dont le verbatim est relevé en tête du corpus de l'arrêté sans y être dépouillé. Il n'est donc pas cité ici — on ne cite pas un texte que personne n'a lu, et le cliquet de `corpus.test.ts` le vérifie.\n\nNATURE : ÉTAT PERMANENT (ADR-026), `pieceAttendue: null` — le panneau et le pictogramme sont l'obligation. À ne pas confondre avec les fiches de données de sécurité, qui sont un écrit et vivent sur `stockage-dangereux-fiches-donnees`.",
  },

  {
    id: "signalisation-etablissement-obstacles-zones-dangereuses",
    domaine: "signalisation",
    libelle:
      "Bandes jaune et noir sur les obstacles et les endroits dangereux des zones bâties",
    description:
      "À l'intérieur des zones bâties auxquelles le travailleur a accès dans le cadre de son travail, les obstacles susceptibles de provoquer des chocs ou des chutes de personnes et les endroits dangereux — où peuvent notamment avoir lieu des chutes d'objets — sont signalés par des bandes jaune et noir ou rouge et blanc, conformes au point 3 (b) de l'annexe II de l'arrêté. Les dimensions de la signalisation tiennent compte de celles de l'obstacle ou de l'endroit signalé.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 12 (bandes jaune et noir ou rouge et blanc sur les obstacles et les endroits dangereux des zones bâties)",
        article: "Arrêté 1993-11-04 art. 12",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679540",
        note: "« A l'intérieur des zones bâties de l'entreprise auxquelles le travailleur a accès dans le cadre de son travail, les obstacles susceptibles de provoquer des chocs ou des chutes de personnes et les endroits dangereux, où notamment peuvent avoir lieu des chutes d'objets, doivent être signalés par des bandes jaune et noir ou rouge et blanc. Les dimensions de cette signalisation doivent tenir compte des dimensions de l'obstacle ou endroit dangereux signalé. » Verbatim relevé le 2026-09-02, version d'origine du 1993-12-17, jamais modifiée.",
        versionConstatee: "1993-12-17",
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
      "LA LIGNE LA PLUS PROCHE DU QUOTIDIEN DES TROIS SECTEURS CIBLES : une marche isolée en salle, un linteau bas de réserve, un quai de livraison, une trappe de cave. Le déclencheur est le constat d'un obstacle ou d'un endroit dangereux — donc un résultat de l'évaluation des risques —, ce qui en fait une obligation d'établissement encodable sans attendre le cinquième déclencheur de l'ADR-022.\n\nPORTEUR ÉTABLISSEMENT, UNE SEULE LIGNE. Un obstacle n'est pas un équipement déclaré et ne le sera jamais : le parc recense des installations, pas des marches. Aucune catégorie n'est donc en contexte non plus — en désigner une ferait croire que la ligne se rattache à un appareil.\n\nCET ARTICLE DÉTAILLE R. 4224-20 DU CODE DU TRAVAIL, qui impose de signaler de manière visible les zones de danger et de les matérialiser par des dispositifs empêchant l'accès des travailleurs non autorisés. Cet article du Code n'est dans aucun corpus de ce dépôt et n'est donc pas cité : la section 5 du chapitre IV n'a jamais été dépouillée. Conséquence à connaître : la MATÉRIALISATION exigée par R. 4224-20 — les dispositifs qui empêchent d'entrer — n'est portée par aucune ligne du référentiel ; celle-ci ne porte que le marquage, qui est ce que l'arrêté prescrit.\n\nLES DEUX COULEURS SONT UNE ALTERNATIVE OFFERTE PAR LE TEXTE, pas deux obligations : « bandes jaune et noir OU rouge et blanc ». Une seule ligne, et la `description` laisse le choix ouvert comme le texte le laisse.\n\nÀ NE PAS CONFONDRE AVEC LE MARQUAGE DES VOIES DE CIRCULATION (art. 13), qui N'EST PAS ENCODÉ et reste `obligation_manquante` au corpus. Son obligation est CONDITIONNELLE : elle ne naît que si R. 4214-11 ou R. 4224-3 imposent d'identifier les voies, et aucun de ces deux articles n'est dépouillé. Encoder le marquage des voies supposerait donc de deviner sa condition d'entrée — c'est le seul des quatre refus de ce lot qui se lève par une lecture, et non par un modèle qui manque.\n\nNATURE : ÉTAT PERMANENT (ADR-026), `pieceAttendue: null` — la bande peinte ou collée est l'obligation.\n\nCriticité 3 : chocs et chutes de plain-pied sont la première cause d'accident du travail dans les trois secteurs cibles, mais la bande ne supprime pas le risque — elle le rend visible, et la mesure de prévention qui le supprime relève du plan d'actions.",
  },

  {
    id: "signalisation-etablissement-entretien",
    domaine: "signalisation",
    libelle:
      "Entretien régulier des moyens et dispositifs de signalisation (nettoyage, réparation, remplacement)",
    description:
      "Les moyens et dispositifs de signalisation sont, selon le cas, régulièrement nettoyés, entretenus, vérifiés et réparés, et remplacés si nécessaire, de manière à conserver leurs qualités intrinsèques ou de fonctionnement. Le texte n'écrit aucun rythme pour cet entretien : le rythme chiffré qu'il porte — au moins chaque semestre — ne vaut que pour les signaux lumineux et acoustiques, et fait l'objet d'une obligation distincte. Pour les panneaux, couleurs et autres dispositifs, Rojer retient par défaut au moins un entretien et une vérification par an.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 15, première phrase, premier membre (moyens et dispositifs de signalisation régulièrement nettoyés, entretenus, vérifiés et réparés, remplacés si nécessaire)",
        article: "Arrêté 1993-11-04 art. 15",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679543",
        note: "« Les moyens et dispositifs de signalisation doivent, selon le cas, être régulièrement nettoyés, entretenus, vérifiés et réparés, remplacés si nécessaire, de manière à conserver leurs qualités intrinsèques ou de fonctionnement […]. » Verbatim relevé le 2026-09-02, version d'origine du 1993-12-17 : l'arrêté du 2 août 2013, seul texte modificateur, a touché les articles 2, 11, 13, 14 et l'annexe II, pas celui-ci.",
        versionConstatee: "1993-12-17",
      },
    ],
    periodicite: "autre",
    rythmeRetenu: {
      motif: "defaut_annuel",
      periodicite: "annuelle",
      texteVague: "régulièrement nettoyés, entretenus, vérifiés",
    },
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 2,
    typologies: { travail: true },
    transmet: [],
    porteur: "etablissement",
    notesInternes:
      "RYTHME RETENU PAR DÉFAUT, LE 2026-10-07 (C59 lot 3, item 6 d ; ADR-039 (b)). Le préventeur, sur l'identification des moyens de lutte : « Préco annuelle ». L'article 15 fait « régulièrement nettoy[er], entret[enir], vérifi[er] » les moyens et dispositifs de signalisation, sans rythme : Rojer retient au moins une fois par an, affiché comme défaut. LE PIÈGE CI-DESSOUS TIENT TOUJOURS : le semestre de l'article ne vise que les signaux lumineux et acoustiques, portés par `signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle` ; cette ligne-ci ne reçoit PAS ce semestre, elle reçoit le plancher annuel du défaut, pour les panneaux, couleurs et bandes que l'article astreint au seul « régulièrement ». La semestrielle, écrite, l'emporte sur ce qu'elle couvre~~ — l'alarme sonore comprise : aucune ligne neuve n'est donc créée pour l'alarme (item 6 a)~~. [2026-10-08, C66 : écarté — la semestrielle est l'ESSAI du signal ; la maintenance et la vérification annuelles de l'équipement d'alarme, que le préventeur demande, sont un autre acte : `incendie-travail-alarme-entretien-verification` (R. 4224-17, défaut annuel, travail hors ERP).] `texteVague` recopie le verbatim du corpus (« régulièrement nettoyés, entretenus, vérifiés »). Nature : l'état permanent reste ; la ligne passe au calendrier, « à planifier » (ADR-036).\n\nCETTE LIGNE EST LE PIÈGE DU LOT, ÉCRIT À L'ENDROIT OÙ IL SE PREND. Un guide professionnel de janvier 2022 annonçait « moyens et dispositifs de signalisation : tous les 6 mois ». Le chiffre est dans le texte, l'assiette ne l'est pas : le « et notamment les signaux lumineux et les signaux acoustiques » qui introduit le semestre RESTREINT ce que le semestre touche. Les panneaux, les couleurs et les bandes jaune et noir — c'est-à-dire l'écrasante majorité de la signalisation d'un restaurant, d'un commerce ou d'un bureau — ne relèvent que du « régulièrement » de ce premier membre de phrase, qui ne chiffre rien. Encoder un semestriel ici aurait fabriqué un rendez-vous que le texte ne demande pas, sur un parc qu'il ne vise pas. `periodicite: \"autre\"`, et ce n'est pas une commodité : c'est ce que le texte écrit.\n\nPOURQUOI UNE LIGNE SÉPARÉE DE LA SEMESTRIELLE, ALORS QUE L'ARTICLE EST LE MÊME. Parce que les deux actes n'ont pas le même rythme, et que l'ADR-022 interdit précisément de fondre en une ligne des actes de rythmes différents — c'est le défaut qu'elle a corrigé sur `PE 4`. Le modèle ne porte au demeurant qu'une `periodicite` par obligation : fondre les deux aurait imposé de choisir entre étendre le semestre à tout le parc et taire la seule périodicité chiffrée du texte. Le test anti-doublon ne crie pas : il ne rapproche deux obligations que si leur périodicité est identique, et les trois lignes de l'article 15 en portent trois différentes.\n\nNATURE : ÉTAT PERMANENT, ET C'EST UN ARBITRAGE QUI SE DISCUTE — il est donc écrit. Le texte emploie un adverbe de récurrence (« régulièrement ») qui plaide pour `echeance_recurrente` + `periodicite: \"autre\"`, comme ~~`stockage-dangereux-verification-etancheite`~~ [2026-10-07, C60 : cette ligne est retirée depuis le lot 5 de la relecture du préventeur (`OBLIGATIONS_RETIREES`)  ; elle portait cette forme quand cette note a été écrite]. Ce qui l'emporte est la finalité que la phrase énonce elle-même : « DE MANIÈRE À CONSERVER LEURS QUALITÉS INTRINSÈQUES OU DE FONCTIONNEMENT ». L'obligation n'est pas de procéder à un acte qui revient, c'est que la signalisation soit à tout moment lisible et fonctionnelle — un état qui se constitue puis se maintient, sans rendez-vous. C'est aussi ce qui la rend constatable : un panneau décoloré est un manquement le jour où on le voit, quelle qu'ait été la date du dernier nettoyage. La conséquence est visible à l'écran — cette ligne va dans « Ce qui doit être en place » et non au calendrier — et c'est le comportement voulu. Si la lecture inverse devait l'emporter un jour, elle ne changerait ni la périodicité ni l'empreinte : `nature` n'entre pas dans `empreinteReferentiel()`.\n\nCriticité 2 : le manquement est formel et se corrige avec un chiffon ou un panneau neuf. Il a néanmoins un effet réel — une signalisation illisible ne signale rien —, ce qui interdit de descendre à 1.\n\n`pieceAttendue: null` : le texte exige l'entretien, pas un registre d'entretien. Aucun support de consignation n'est prévu par cet arrêté, à la différence de l'article 11 de l'arrêté du 14 décembre 2011, qui renvoie au registre de R. 4226-19 pour l'éclairage de sécurité.",
  },

  {
    id: "signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle",
    domaine: "signalisation",
    libelle:
      "Vérification semestrielle du bon fonctionnement des signaux lumineux et acoustiques",
    description:
      "Les signaux lumineux et les signaux acoustiques font l'objet d'une vérification de leur bon fonctionnement et de leur réelle efficacité, avant leur mise en service puis au moins chaque semestre. Sont visés les dispositifs qui se déclenchent — alarme sonore, signal lumineux de danger, panneau transparent lumineux —, et non les panneaux, couleurs et bandes de sol, qui relèvent de l'entretien régulier prévu par la même phrase.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 15, première phrase, second membre (signaux lumineux et acoustiques : vérification du bon fonctionnement et de la réelle efficacité, avant mise en service puis au moins chaque semestre)",
        article: "Arrêté 1993-11-04 art. 15",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679543",
        note: "« […] et notamment les signaux lumineux et les signaux acoustiques doivent faire l'objet d'une vérification de leur bon fonctionnement et de leur réelle efficacité, avant leur mise en service et, ultérieurement, au moins chaque semestre. » Verbatim relevé le 2026-09-02, version d'origine du 1993-12-17 : l'arrêté du 2 août 2013, seul texte modificateur, n'a pas touché cet article. La périodicité a trente-trois ans et n'a jamais bougé.",
        versionConstatee: "1993-12-17",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { travail: true },
    porteur: "etablissement",
    equipementsEnContexte: ["ALARME_INCENDIE", "BAES"],
    transmet: [],
    notesInternes:
      "L'ASSIETTE EST LA MOITIÉ DU TRAVAIL DE CETTE LIGNE. « Au moins chaque semestre » ne porte pas sur « les moyens et dispositifs de signalisation » mais sur les seuls SIGNAUX LUMINEUX ET ACOUSTIQUES, que le « et notamment » isole. L'annexe I les définit — un signal lumineux est un dispositif éclairé de l'intérieur ou par l'arrière apparaissant comme une surface lumineuse ; l'article 6 les caractérise comme ce qui « indique, par son déclenchement, le début d'une action sollicitée ou une mise en garde ». Le reste de la signalisation relève de `signalisation-etablissement-entretien`, sans rythme.\n\nCE QUE LE CHAMP AJOUTE, ET C'EST CE QUE CE TEXTE APPORTE DE PLUS UTILE AU RÉFÉRENTIEL. L'article 15 ne porte AUCUNE condition d'effectif ni de typologie. `incendie-travail-exercice-semestriel` couvre déjà les « essais et visites périodiques du matériel » de R. 4227-39, à la même cadence — mais dans le seul champ de R. 4227-34 : plus de cinquante personnes occupées ou réunies, ou matières inflammables. Un bureau de six personnes équipé d'une alarme sonore est dans le champ de cet article-ci et hors de celui de R. 4227-39. Aucune borne n'est donc posée sur cette ligne, et le test des seuils d'effectif ne s'y applique pas : la `description` n'annonce aucun seuil, parce que le texte n'en porte aucun.\n\nLE RECOUVREMENT AVEC L'ÉCLAIRAGE DE SÉCURITÉ, TRANCHÉ — c'est ce que la `bloquePar` de l'article 15 demandait avant d'écrire cette ligne. Un BAES d'évacuation à pictogramme est un signal lumineux au sens de l'annexe I, et l'article 9 prévoit expressément que ces panneaux soient « regroupés avec l'éclairage de sécurité ». Il tombe donc sous cette obligation ET sous `incendie-travail-eclairage-securite-autonomie-semestrielle` (ou sa jumelle ERP), elle aussi semestrielle. Ce n'est pas un doublon : l'arrêté du 14 décembre 2011 fait contrôler l'AUTONOMIE d'au moins une heure, celui-ci le BON FONCTIONNEMENT ET LA RÉELLE EFFICACITÉ. Deux objets, deux articles fondateurs, et deux porteurs différents — l'autonomie se vérifie bloc par bloc et sa ligne est portée par l'équipement, l'efficacité de la signalisation se vérifie pour le lieu et sa ligne est portée par l'établissement. Le test anti-doublon les distingue par l'article fondateur ; le dirigeant les distingue par leur libellé, qui nomme l'objet dans les deux cas.\n\nPORTEUR ÉTABLISSEMENT, UNE SEULE LIGNE, ET C'EST CE QUE LE CORPUS RECOMMANDAIT. Aucune catégorie d'équipement ne désigne un signal lumineux ni un signal acoustique : le parc déclare des BAES et des alarmes incendie, jamais les dispositifs de signalisation comme tels — un signal de danger de quai, un gyrophare de porte de réserve, un avertisseur de recul n'ont pas d'entrée. Un porteur équipement aurait donc couvert une part du parc et manqué le reste, tout en doublant, appareil par appareil, la ligne d'autonomie sur les mêmes BAES. Les deux catégories sont en `equipementsEnContexte` : affichées comme concernées, sans jamais déclencher la ligne, qui est due même si rien n'est déclaré. La liste est non limitative et l'interface le dit.\n\n« AU MOINS CHAQUE SEMESTRE » EST UN PLANCHER, pas un rendez-vous — même rédaction que le « au moins tous les six mois » de R. 4227-39 déjà encodé. L'outil planifie sur le plancher, ce qui est la lecture qui protège.\n\nLA VÉRIFICATION AVANT MISE EN SERVICE EST DANS LE MÊME MEMBRE DE PHRASE et n'a pas de ligne propre : la règle de résolution de `NatureObligation` place `echeance_recurrente` avant `ponctuelle` quand un article porte les deux titres, parce que c'est l'acte qui revient qui commande le suivi. La `description` la nomme pour qu'elle ne se perde pas.\n\nRÉALISATEUR `exploitant` : le texte ne réserve cette vérification à aucune qualification, à aucun organisme, à aucune personne compétente. Lui en attribuer une aurait ajouté une exigence que l'arrêté ne porte pas — et fait chercher au dirigeant un prestataire dont il n'a pas besoin.\n\nCriticité 4 : un signal d'évacuation qui ne se déclenche pas ou ne s'entend pas est un dispositif de mise en sécurité inopérant. Pas 5 : le manquement ne crée pas seul le danger, il retire l'avertissement.\n\n`pieceAttendue: null` : le texte exige la vérification, pas un écrit. Le rapport qui en résulte est la trace de l'acte, pas l'obligation — et cet arrêté ne désigne aucun registre, à la différence de l'article 11 de l'arrêté du 14 décembre 2011.",
  },

  {
    id: "signalisation-etablissement-alimentations-secours-annuelle",
    domaine: "signalisation",
    libelle:
      "Vérification annuelle des alimentations de secours des signalisations",
    description:
      "La vérification des alimentations de secours dont sont assurées les signalisations qui ont besoin d'une source d'énergie est pratiquée au moins une fois par an.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 15, seconde phrase (vérification des alimentations de secours au moins une fois par an)",
        article: "Arrêté 1993-11-04 art. 15",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679543",
        note: "« La vérification des alimentations de secours doit être pratiquée au moins une fois par an. » Verbatim relevé le 2026-09-02, version d'origine du 1993-12-17 : l'arrêté du 2 août 2013, seul texte modificateur, n'a pas touché cet article.",
        versionConstatee: "1993-12-17",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 4 novembre 1993, art. 7 (ce sont les alimentations de secours que cet article impose qui sont ici vérifiées)",
        article: "Arrêté 1993-11-04 art. 7",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006679535",
        note: "En contexte, pas en fondement. « Les signalisations qui ont besoin d'une source d'énergie pour fonctionner doivent être assurées d'une alimentation de secours en cas de rupture de cette énergie, sauf si le risque disparaît avec la coupure d'énergie. » C'est l'article qui fait exister l'objet vérifié ; la périodicité, elle, n'est écrite qu'à l'article 15. Verbatim relevé le 2026-09-02.",
        versionConstatee: "1993-12-17",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "etablissement",
    equipementsEnContexte: ["BAES", "ALARME_INCENDIE"],
    transmet: [],
    notesInternes:
      "AUCUN ÉQUIVALENT NULLE PART DANS LE RÉFÉRENTIEL, SOUS AUCUN RÉGIME. C'est la trouvaille la plus nette du dépouillement de cet arrêté : une vérification annuelle, écrite en une phrase autonome, que rien ne portait.\n\nÉCRITE SANS RESTRICTION D'ASSIETTE, ET C'EST CE QUI LA DISTINGUE DU SEMESTRE. La phrase précédente réserve le semestre aux signaux lumineux et acoustiques ; celle-ci ne réserve rien — « la vérification des alimentations de secours », toutes. C'est pourquoi la ligne ne porte aucune borne : ni effectif, ni typologie, ni catégorie d'équipement.\n\nDEUX PHRASES, DEUX RYTHMES, DEUX LIGNES. Le modèle ne porte qu'une `periodicite` par obligation, et l'ADR-022 interdit de fondre des actes de rythmes différents. Les trois lignes fondées sur l'article 15 portent `autre`, `semestrielle` et `annuelle` : le test anti-doublon, qui ne rapproche que des obligations de même périodicité, ne les confond pas.\n\nL'ARTICLE 7 EST CITÉ EN CONTEXTE, PAS EN FONDEMENT, et l'ordre de `referencesLegales` le dit : `[0]` est l'article qui fonde — celui qu'on citerait seul devant un inspecteur —, et c'est l'article 15, seul à porter la périodicité. L'article 7 explique ce qui est vérifié. `signalisation-etablissement-alimentation-secours-presence` porte l'article 7 en fondement pour l'obligation d'ÉQUIPER : les deux lignes ne sont pas un doublon, elles ont des articles fondateurs distincts et des natures distinctes — un état permanent d'un côté, une échéance récurrente de l'autre.\n\nPORTEUR ÉTABLISSEMENT : aucune catégorie ne désigne une alimentation de secours de signalisation. `BAES` et `ALARME_INCENDIE` sont en contexte, non limitatif — la batterie d'un panneau transparent lumineux ou d'un signal de danger relève de la même vérification sans avoir d'entrée au parc.\n\nSUR-APPLICATION CONNUE ET ASSUMÉE : la ligne est due à tout employeur, y compris à celui dont aucune signalisation n'est alimentée en énergie. La règle du non-renseigné commande ce sens — une obligation conditionnée à un attribut d'établissement inexistant ne disparaît pas en silence — et le sens d'erreur est celui qui se voit : un dirigeant qui n'a rien à vérifier le constate en lisant la ligne, alors qu'une ligne absente chez celui qui a une alarme sur batterie n'est visible par personne.\n\nRÉALISATEUR `exploitant` : le texte ne réserve cette vérification à aucune qualification. Criticité 3 : l'alimentation de secours ne signale rien par elle-même, elle garantit que la signalisation survit à une coupure — un cran en dessous du signal lui-même.\n\n`pieceAttendue: null` : l'obligation est la vérification, pas un écrit. Cet arrêté ne désigne aucun registre de consignation.",
  },
];
