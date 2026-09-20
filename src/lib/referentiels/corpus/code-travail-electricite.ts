// Corpus : code du travail — installations électriques et habilitation.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite, plus
// R. 4544-9, inscrit pour lever une ambiguïté de la `portee` — voir sa note.
//
// ⚠ CE QUE LA SECTION 4 PORTE ET QUE LE RÉFÉRENTIEL N'ENCODE PAS. `R. 4544-11`
// a été réécrit au 1er octobre 2025 par le décret n° 2025-355, et son I met à la
// charge de l'employeur une obligation DISTINCTE de l'habilitation ordinaire :
// tout travailleur effectuant des travaux SOUS TENSION doit détenir une
// habilitation spécifique, délivrée par l'employeur après obtention d'un
// document établi par un organisme de formation agréé. Aucune obligation du
// référentiel ne la porte.
//
// Il est désormais inscrit, en `obligation_manquante`. Il ne l'a pas été du
// premier coup : une première lecture n'avait rendu qu'une restitution
// partielle, moitié traduite, et un article dont on n'a pas le texte ne
// s'inscrit pas au corpus — c'est la règle que ce fichier sert. Le verbatim du I
// a été obtenu à la relecture du 2026-08-31, en redemandant explicitement le
// français sans traduction.
//
// DEUX PIÈGES DANS CET ARTICLE, tous deux nommés dans l'entrée :
//  * les quatre ans du III sont la durée d'AGRÉMENT DES ORGANISMES de formation,
//    accordée par le ministre. Ils pèsent sur l'organisme, pas sur l'exploitant,
//    et ne sont pas une périodicité d'obligation ;
//  * le I renvoie aux NORMES de R. 4544-3 pour les modalités de délivrance et de
//    renouvellement. C'est le renvoi exact qui avait produit le « triennal »
//    NF C 18-510 déjà retiré de ce dépôt. Aucune périodicité ne se dérive de là.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_ELECTRICITE: Corpus = {
  id: "code-travail-electricite",
  intitule: "Code du travail — installations électriques et habilitation",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489059/",
  etendue: "articles_cites",
  portee:
    "Vérifications des installations électriques (R. 4226-14 et s.) et habilitation des travailleurs (section 4, R. 4544-9 à R. 4544-11-2). ATTENTION : R. 4544-10 et R. 4544-11 ont été réécrits au 1er octobre 2025 par le décret n° 2025-355, qui a aussi créé R. 4544-11-1 et -11-2. R. 4544-11-1 EST cité et retenu depuis le 2026-08-27 ; seul R. 4544-11-2 ne l'est pas — la portée annonçait les deux comme non cités, ce que le premier article de la liste démentait. Corrigé le 2026-08-31.",
  articles: [
    {
      ref: "R. 4544-11-1",
      intitule: "Attestation d'absence de contre-indications médicales",
      versionEnVigueur: "2025-10-01",
      luLe: "2026-08-27",
      lecture: "premiere_main",
      citationCle:
        "L'attestation mentionnée aux articles R. 4544-10 et R. 4544-11, d'une validité de cinq ans, est délivrée par le médecin du travail à l'issue d'un examen médical qu'il réalise. Elle est présentée par le travailleur à l'employeur, qui en conserve une copie pendant toute sa durée de validité.",
      statut: "retenu",
      obligations: ["elec-salarie-attestation-medicale-voisinage"],
    },
    {
      ref: "R. 4544-9",
      intitule: "Opérations réservées aux travailleurs habilités",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022849102",
      versionEnVigueur: "2011-07-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Les opérations sur les installations électriques ou dans leur voisinage sont réservées aux travailleurs habilités.",
      citationCle:
        "Les opérations sur les installations électriques ou dans leur voisinage ne peuvent être effectuées que par des travailleurs habilités.",
      statut: "sans_objet",
      motif:
        "Règle de champ, en une phrase : elle dit QUI peut opérer, sans instituer d'acte, de pièce ni de durée. L'habilitation elle-même est délivrée par R. 4544-10, que le référentiel retient.\n\nElle est inscrite ici parce que la `portee` de ce corpus désignait « R. 4544-9 et s. » comme le siège de l'habilitation, ce qui est trompeur : c'est la borne d'ouverture de la section, et elle ne porte rien. L'article qui coûte est R. 4544-11 — voir la note du corpus.",
    },
    {
      ref: "R. 4544-11",
      intitule:
        "Habilitation spécifique aux travaux sous tension, et vérification préalable par l'employeur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033200717",
      versionEnVigueur: "2025-10-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "Le travailleur qui effectue des travaux sous tension détient une habilitation spécifique, délivrée par l'employeur après obtention d'un document d'un organisme de formation agréé ; sa validité est subordonnée à une attestation d'absence de contre-indication médicale. L'employeur s'assure en outre, avant toute formation, que le travailleur a les capacités, compétences et expérience requises.",
      citationCle:
        "I.-Tout travailleur qui effectue des travaux sous tension est titulaire d'une habilitation spécifique délivrée par l'employeur après l'obtention d'un document délivré par un organisme de formation agréé attestant qu'il a acquis les connaissances et les compétences nécessaires. Cette habilitation spécifique est délivrée, maintenue ou renouvelée selon les modalités contenues dans les normes mentionnées à l'article R. 4544-3. La validité de l'habilitation spécifique est subordonnée à la détention, par le travailleur, d'une attestation qu'il ne présente pas de contre-indications médicales à la réalisation de travaux sous tension.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: false,
      motif:
        "DEUX obligations d'employeur, distinctes de l'habilitation ordinaire de R. 4544-10 que le référentiel porte déjà, et aucune des deux n'est encodée.\n\n(1) L'habilitation SPÉCIFIQUE aux travaux sous tension : elle suppose un document d'un organisme de formation agréé, et sa validité est subordonnée à une attestation médicale distincte de celle de R. 4544-11-1 — celle-ci vise le travail sous tension, celle-là le voisinage.\n\n(2) Le II, que personne n'avait relevé : « L'employeur s'assure avant toute formation que les travailleurs qui suivent la formation mentionnée au I ont les capacités et les compétences et expérience professionnelles requises dans le domaine des opérations d'ordre électrique. » C'est une vérification préalable à la charge de l'employeur, antérieure à la formation elle-même.\n\nDEUX CHIFFRES À NE PAS REPRENDRE. Les quatre ans du III sont la durée d'agrément des ORGANISMES de formation, accordée par le ministre : ils pèsent sur l'organisme, pas sur l'exploitant, et n'ont rien à faire au référentiel. Et le I renvoie aux normes de R. 4544-3 pour la délivrance, le maintien et le renouvellement — c'est le renvoi exact qui avait produit le « triennal » NF C 18-510 que ce dépôt a déjà retiré. Aucune périodicité ne se dérive de ce renvoi : une norme n'est pas une source opposable ici.",
      bloquePar:
        "Obligation nominative — le porteur salarié existe et saurait la porter —, mais elle n'est pas encodable en l'état : le Code ne lui donne aucune durée de validité propre, la renvoyant à des normes que le référentiel n'accepte pas comme source. L'encoder supposerait de trancher ce que « maintenue ou renouvelée selon les modalités contenues dans les normes » veut dire pour l'outil, et ce n'est pas un choix technique. Cette entrée existe pour que la question soit posée, pas pour la résoudre.",
    },
    {
      ref: "R. 4226-14",
      intitule: "Vérification initiale des installations électriques",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765072",
      versionEnVigueur: "2011-07-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur fait procéder à une vérification initiale des installations électriques à DEUX occasions : la mise en service, et toute modification de structure. R. 4226-15 réserve cette vérification initiale à un organisme accrédité.",
      citationCle:
        "L'employeur fait procéder à la vérification initiale des installations électriques lors de leur mise en service et après qu'elles ont subi une modification de structure, en vue de s'assurer qu'elles sont conformes aux prescriptions de sécurité prévues au présent chapitre.",
      statut: "retenu",
      obligations: ["elec-travail-mise-en-service"],
    },
    {
      ref: "R. 4226-16",
      intitule: "Vérification périodique des installations électriques",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765070",
      versionEnVigueur: "2011-07-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur procède ou fait procéder périodiquement à la vérification des installations électriques. L'article ne porte AUCUNE périodicité : R. 4226-18 la renvoie à un arrêté, et c'est l'article 3 de l'arrêté du 26 décembre 2011 qui fixe l'an. R. 4226-17 ouvre la vérification périodique — à la différence de la vérification initiale — à une personne qualifiée de l'entreprise.",
      citationCle:
        "L'employeur procède ou fait procéder, périodiquement, à la vérification des installations électriques afin de s'assurer qu'elles sont maintenues en conformité avec les règles de santé et de sécurité qui leur sont applicables.",
      statut: "retenu",
      obligations: ["elec-travail-periodique-annuelle"],
    },
    {
      ref: "R. 4226-19",
      intitule:
        "Consignation au registre des résultats des vérifications électriques",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765064",
      versionEnVigueur: "2011-07-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Les résultats des SEULES vérifications de R. 4226-14 (initiale) et R. 4226-16 (périodique), et les justifications des travaux correctifs, sont consignés sur un registre ; les rapports d'organisme accrédité y sont annexés.",
      citationCle:
        "Les résultats des vérifications prévues aux articles R. 4226-14 et R. 4226-16 ainsi que les justifications des travaux et modifications effectués pour porter remède aux défectuosités constatées sont consignés sur un registre. Lorsque les vérifications sont effectuées par un organisme accrédité, les rapports établis à la suite de ces vérifications sont annexés à ce registre.",
      statut: "retenu",
      obligations: [
        "elec-travail-consignation-registre",
        "incendie-travail-eclairage-securite-autonomie-semestrielle",
        "incendie-travail-eclairage-securite-essai-mensuel",
      ],
      historique:
        "L'ARTICLE NE FONDE RIEN EN ÉCLAIRAGE DE SÉCURITÉ — vrai. IL EN EST POURTANT LE REGISTRE — et c'est ce que le relevé du 2026-09-01 avait manqué.\n\nCe qui reste vrai : sa portée de FONDEMENT est close par sa propre lettre — il renvoie nommément à R. 4226-14 et R. 4226-16, et à rien d'autre —, et le chemin le confirme : Livre II, Titre II, Chapitre VI « Installations électriques », Section 5 « Vérification des installations électriques ». Les périodicités mensuelle et semestrielle de l'éclairage de sécurité viennent de l'article 11 de l'arrêté du 14 décembre 2011, pas d'ici.\n\nCE QUI ÉTAIT FAUX, corrigé le 2026-09-01 par le lot A : la conclusion « les deux obligations `incendie-travail-eclairage-securite-*` le citent donc à tort ». Elles ne le citent PAS en fondement — leur `referencesLegales[0]` est l'article 11 de l'arrêté — et l'article 11 désigne nommément ce registre-ci pour y porter le résultat : « Le résultat des opérations précédentes doit être mentionné sur le registre prévu à l'article R. 4226-19 du code du travail. » Le renvoi est dans le texte de l'arrêté, relu à la source le 2026-09-01. Il est cohérent avec sa première phrase, qui place ces vérifications « dans le cadre de la maintenance prescrite à l'article R. 4226-7 » — soit à l'intérieur du même chapitre. La citation est donc juste, et sa `note` disait déjà exactement ce qu'elle est : « support de consignation, pas fondement de la périodicité ».\n\nCE QUE CE CAS ENSEIGNE. La question avait été ouverte quatre fois depuis le 2026-08-27, et le 2026-09-01 deux lots l'ont lue séparément, ont concordé au mot près, et ont conclu la même chose — dans le même dépôt, à un fichier de distance, où l'article 11 était déjà relevé en première main avec la phrase qui tranchait dans sa `citationCle`. Une corroboration indépendante confirme une LECTURE ; elle ne valide pas la CONCLUSION qu'on en tire, et deux lecteurs qui remontent le même article s'arrêtent au même endroit. Ce qui manquait n'était pas une lecture de plus : c'était de remonter le renvoi dans l'autre sens — non « que dit l'article cité ? », mais « qui le cite, et pour quoi ? ».",
    },
    {
      ref: "R. 4544-10",
      intitule: "Habilitation délivrée par l'employeur",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051500368",
      versionEnVigueur: "2025-10-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Met QUATRE actes à la charge de l'employeur : délivrer l'habilitation en spécifiant la nature des opérations autorisées ; s'assurer AVANT de la délivrer que le travailleur a reçu la formation théorique et pratique ; remettre à chaque travailleur un carnet de prescriptions ; et, pour les opérations au voisinage de pièces nues sous tension, subordonner la validité à une attestation d'absence de contre-indication médicale. AUCUNE durée de validité, AUCUNE périodicité : la délivrance, le maintien et le renouvellement sont renvoyés aux normes de R. 4544-3.",
      citationCle:
        "Un travailleur est habilité dans les limites des attributions qui lui sont confiées. L'habilitation, délivrée par l'employeur, spécifie la nature des opérations qu'il est autorisé à effectuer. Avant de délivrer l'habilitation, l'employeur s'assure que le travailleur a reçu la formation théorique et pratique qui lui confère la connaissance des risques liés à l'électricité et des mesures à prendre pour intervenir en sécurité lors de l'exécution des opérations qui lui sont confiées. L'employeur délivre, maintient ou renouvelle l'habilitation selon les modalités contenues dans les normes mentionnées à l'article R. 4544-3. L'employeur remet à chaque travailleur un carnet de prescriptions établi sur la base des prescriptions pertinentes de ces normes, complété, le cas échéant, par des instructions de sécurité particulières au travail effectué.",
      statut: "retenu",
      // Trois obligations, et non une : l'article en fonde une côté
      // établissement — l'employeur s'assure que ses travailleurs sont
      // habilités, due dès qu'une installation est déclarée —, un titre
      // nominatif côté salarié, et le carnet de prescriptions de son quatrième
      // alinéa, remis à chaque travailleur. C'est le même article parce que
      // c'est le même texte ; ce sont trois lignes parce qu'elles n'existent
      // pas aux mêmes conditions. Les deux dernières sont nées le même jour,
      // sur deux branches qui ne se voyaient pas : la réserve du matin disait
      // le carnet « encodé nulle part », un lot l'a encodé l'après-midi.
      obligations: [
        "elec-travail-habilitation-personnel",
        "elec-salarie-habilitation",
        "elec-travail-carnet-prescriptions",
      ],
      reserve:
        "LE TRIENNAL NE VIENT PAS D'ICI, et l'article le prouve en creux : relu le 2026-09-01, il ne porte aucune durée. « L'employeur délivre, maintient ou renouvelle l'habilitation selon les modalités contenues dans les normes mentionnées à l'article R. 4544-3 » — soit la NF C 18-510, que R. 4544-3 qualifie lui-même de recommandation et que ce dépôt n'accepte pas comme source opposable. Cette réserve-là reste entière.\n\nLE CARNET DE PRESCRIPTIONS EST ENCODÉ DEPUIS LE MÊME JOUR (lot C) : `elec-travail-carnet-prescriptions`, état permanent, pièce attendue « carnet de prescriptions ». L'article met QUATRE actes à la charge de l'employeur — délivrer l'habilitation, s'assurer de la formation préalable, remettre le carnet, subordonner la validité au voisinage à l'attestation médicale — et le référentiel en portait trois. Le quatrième alinéa a sa ligne, distincte de l'habilitation : celle-ci est une décision, celui-là une pièce, et un employeur peut avoir habilité sans avoir remis.\n\n« CHAQUE TRAVAILLEUR » NE VEUT PAS DIRE TOUT L'EFFECTIF, et c'est le chemin qui le dit : Quatrième partie > Livre V > Titre IV > Chapitre IV > SECTION 4 « Travailleurs autorisés à effectuer des opérations ». Le carnet est dû à qui est habilité. Le produit ne sait pas qui l'est — le déclencheur reste l'installation électrique déclarée, et `transmet` nomme le trou.",
    },
    {
      ref: "L. 4711-5",
      intitule: "Faculté de réunir les registres en un registre unique",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903389",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Rien. L'article AUTORISE, il n'impose pas : il permet de réunir en un registre unique des informations que d'autres textes font figurer dans des registres distincts.",
      citationCle:
        "Lorsqu'il est prévu que les informations énumérées aux articles L. 4711-1 et L. 4711-2 figurent dans des registres distincts, l'employeur est autorisé à réunir ces informations dans un registre unique dès lors que cette mesure est de nature à faciliter la conservation et la consultation de ces informations.",
      statut: "retenu",
      obligations: [
        "elec-travail-consignation-registre",
        "incendie-registre-securite",
      ],
      reserve:
        "MÊME CONSTAT QUE SUR L'ENTRÉE JUMELLE du corpus incendie, refait ici le 2026-09-01 pour que la branche électricité ne se lise pas seule : le verbe est « est autorisé à », c'est une FACULTÉ. `elec-travail-consignation-registre` a heureusement un vrai fondement — R. 4226-19, qui impose la consignation —, de sorte que L. 4711-5 n'y ajoute que la forme permise. La question a été ouverte quatre fois en onze jours ; l'entrée existe pour qu'elle ne le soit pas une cinquième.",
    },
  ],
};
