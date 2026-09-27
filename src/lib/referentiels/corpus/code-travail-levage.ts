// Corpus : code du travail — vérifications des équipements de travail (levage).
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_LEVAGE: Corpus = {
  id: "code-travail-levage",
  intitule:
    "Code du travail — vérifications des équipements de travail (levage)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018489757/",
  etendue: "articles_cites",
  portee:
    "Section 4 du chapitre III : vérification initiale (R. 4323-22), vérifications périodiques (R. 4323-23), qualification du vérificateur (R. 4323-24), remise en service (R. 4323-28), consignation au registre (R. 4323-25 à -27). S'applique à tout employeur. ⚠ LE NOM DU FICHIER DIT « LEVAGE », LA SECTION NON : ces sept articles gouvernent TOUS les équipements de travail. Les articles d'habilitation R. 4323-22, -23 et -28 sont instruits ici par leur branche levage (arrêté du 1er mars 2004) ; la branche hors levage de R. 4323-23 est au corpus `arrete-1993-03-05-machines` depuis le 2026-09-02, et elle fonde une obligation depuis le même jour.",
  articles: [
    {
      ref: "R. 4323-22",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 - art. (V) ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "Article d'habilitation, non prescriptif par lui-même : il renvoie à des arrêtés du ministre chargé du travail ou de l'agriculture le soin de désigner les équipements soumis à vérification initiale lors de leur mise en service dans l'établissement, et aligne les conditions de cette vérification sur celles des vérifications périodiques de la sous-section 2. Aucune liste d'équipements ni aucun contenu de vérification ne figure dans l'article. Chemin : partie réglementaire, quatrième partie, livre III, titre II, chapitre III, section 4, sous-section 1 « Vérification initiale ».",
      citationCle:
        "Des arrêtés du ministre chargé du travail ou du ministre chargé de l'agriculture déterminent les équipements de travail et les catégories d'équipements de travail pour lesquels l'employeur procède ou fait procéder à une vérification initiale, lors de leur mise en service dans l'établissement, en vue de s'assurer qu'ils sont installés conformément aux spécifications prévues, le cas échéant, par la notice d'instructions du fabricant et peuvent être utilisés en sécurité. Cette vérification est réalisée dans les mêmes conditions que les vérifications périodiques prévues à la sous-section 2.",
      statut: "retenu",
      obligations: [
        "levage-epreuve-initiale-fonctionnement",
        "levage-examen-adequation-mise-en-service",
      ],
    },
    {
      ref: "R. 4323-23",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 - art. (V) ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "Article d'habilitation. Il ne porte AUCUNE périodicité : il renvoie à des arrêtés du ministre chargé du travail ou de l'agriculture le soin de désigner les équipements soumis à vérification générale périodique ET d'en fixer la périodicité, la nature et le contenu. Sa portée est celle de tous les équipements de travail, pas seulement le levage. LA SECONDE BRANCHE EST OUVERTE DEPUIS LE 2026-09-02 : l'arrêté du 5 mars 1993, qui soumet à VGP des machines qui ne sont pas des appareils de levage, est au corpus `arrete-1993-03-05-machines` — la ligne qui figurait ici disait qu'il « n'est instruit nulle part au référentiel », et c'est cette ligne qui a servi de point de départ au dépouillement. Une troisième branche a été ouverte et écartée le même jour : l'arrêté du 24 juin 1993, jumeau du précédent pour les seuls établissements agricoles, hors cible du produit. Le « retenu » ci-dessous a cessé de ne valoir que pour la branche levage le 2026-09-02 : `compactage-dechets-vgp-trimestrielle` y est entrée, fondée sur l'article 1er de l'arrêté du 5 mars 1993 pour ses deux catégories qui touchent les secteurs cibles — presses à balles et compacteurs à déchets. L'article 2 du même arrêté reste `obligation_manquante` dans son corpus, et l'article 1er y porte une `reserve` qui dit ce qui reste dehors. Chemin : livre III, titre II, chapitre III, section 4, sous-section 2 « Vérifications périodiques ».",
      citationCle:
        "Des arrêtés du ministre chargé du travail ou du ministre chargé de l'agriculture déterminent les équipements de travail ou les catégories d'équipement de travail pour lesquels l'employeur procède ou fait procéder à des vérifications générales périodiques afin que soit décelée en temps utile toute détérioration susceptible de créer des dangers. Ces arrêtés précisent la périodicité des vérifications, leur nature et leur contenu.",
      statut: "retenu",
      obligations: [
        "levage-examen-etat-conservation",
        "levage-vgp-accessoires-annuelle",
        "levage-vgp-annuelle-charges",
        "levage-vgp-semestrielle-chariot-gerbeur",
        "levage-vgp-semestrielle-personnes",
        // Ajoutée le 2026-09-01. Elle manquait seule parmi les cinq VGP de
        // levage, sans raison : R. 4323-23 les fonde toutes de la même façon —
        // il oblige à la vérification générale périodique et renvoie la
        // périodicité à l'arrêté, ici l'article 23 b) de l'arrêté du 1er mars
        // 2004. Article rouvert à la source ce jour avant l'ajout.
        "levage-vgp-trimestrielle-force-humaine",
        // La branche HORS LEVAGE, encodée le 2026-09-02. Elle se rattache au
        // même article habilitant que les six précédentes, et c'est le point :
        // `R. 4323-23` n'a jamais été un article de levage, seule sa lecture
        // l'était. La périodicité vient de l'arrêté du 5 mars 1993, art. 1er.
        "compactage-dechets-vgp-trimestrielle",
        "prevention-etablissement-liste-personnes-qualifiees",
      ],
    },
    {
      // ENTRÉ LE 2026-09-02, ET C'ÉTAIT LE SEUL TROU DE LA SOUS-SECTION 2.
      // Le corpus déclarait R. 4323-23, -25, -26 et -27 et sautait celui-ci,
      // alors que `levage-vgp-annuelle-charges` l'a toujours cité en clair —
      // sa `reference` dit « R. 4323-23 et R. 4323-24 » pour une clé
      // `article` qui ne vaut que pour le premier. Une référence lisible qui
      // nomme deux articles sous une seule clé est invisible à
      // `articlesCitesNonDepouilles()` : le second passe pour lu.
      //
      // Il est rangé ici plutôt que dans un fichier neuf parce que la
      // sous-section 2 vit ici : un second corpus qui reprendrait R. 4323-23
      // ou -25 pour accueillir celui-ci divergerait de celui-là. Le nom du
      // fichier dit « levage », ce que la section ne dit pas — la sous-section
      // 4 du chapitre III vaut pour TOUS les équipements de travail, et
      // l'arrêté du 5 mars 1993 (corpus `arrete-1993-03-05-machines`) s'y
      // adosse autant que celui du 1er mars 2004. C'est un nom de fichier à
      // corriger, pas une frontière à créer.
      ref: "R. 4323-24",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531477",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 ».
      // Jamais modifié depuis — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "premiere_main",
      prescrit:
        "L'article qui dit QUI réalise les vérifications générales périodiques, pour tous les équipements de travail et pas seulement le levage. Il répond en trois temps : par des « personnes qualifiées », appartenant OU NON à l'établissement — un organisme extérieur n'est donc jamais exigé par le Code, contrairement au régime des équipements sous pression ; ces personnes doivent être compétentes en prévention des risques présentés par l'équipement vérifié et connaître les dispositions réglementaires afférentes ; et leur LISTE est tenue à la disposition de l'inspection du travail. C'est cet article qui fonde la valeur `personne_qualifiee` de `realisateurs` sur toutes les VGP d'équipement de travail du référentiel. Chemin : partie réglementaire, quatrième partie, livre III, titre II, chapitre III, section 4, sous-section 2 « Vérifications périodiques ».",
      citationCle:
        "Les vérifications générales périodiques sont réalisées par des personnes qualifiées, appartenant ou non à l'établissement, dont la liste est tenue à la disposition de l'inspection du travail. Ces personnes sont compétentes dans le domaine de la prévention des risques présentés par les équipements de travail soumis à vérification et connaissent les dispositions réglementaires afférentes.",
      statut: "retenu",
      obligations: [
        // La liste elle-même, encodée le 2026-09-04. Elle est rangée dans le
        // domaine `organisation_prevention` et non dans `levage` : c'est un
        // document unique d'employeur, qui couvre TOUTES les vérifications
        // générales périodiques du parc, levage ou non. Le motif du choix est
        // dans les notes internes de l'obligation.
        "prevention-etablissement-liste-personnes-qualifiees",
        // Les deux VGP qui citaient déjà l'article pour la QUALIFICATION du
        // vérificateur — l'autre moitié de sa première phrase.
        "levage-vgp-annuelle-charges",
        "compactage-dechets-vgp-trimestrielle",
      ],
      reserve:
        "LE MANQUE NOMMÉ LE 2026-09-02 EST COMBLÉ LE 2026-09-04, ET L'ENTRÉE PRÉCÉDENTE DISAIT DÉJÀ POURQUOI IL LE SERAIT : « Rien de technique : la pièce est un document permanent d'établissement, forme que le modèle sait déjà porter. Ce qui manque est l'encodage lui-même. » `prevention-etablissement-liste-personnes-qualifiees` porte désormais la liste — porteur établissement, `etat_permanent`, `periodicite: \"autre\"`, `pieceAttendue` nommée, `realisateurs: [\"exploitant\"]`.\n\nLES DEUX EXIGENCES DE LA PREMIÈRE PHRASE SONT DONC COUVERTES, chacune par son moyen : la QUALIFICATION du vérificateur par la valeur `personne_qualifiee` que portent les VGP du domaine, la LISTE par une obligation à elle.\n\nCE QUI RESTE DEHORS, ET C'EST LA SECONDE PHRASE. « Ces personnes sont compétentes dans le domaine de la prévention des risques présentés par les équipements de travail soumis à vérification et connaissent les dispositions réglementaires afférentes. » C'est une exigence de FOND sur la compétence, que rien ne peut constater dans le produit : ni la liste tenue par l'employeur, ni le rapport déposé ne disent si son auteur connaît les textes. Le référentiel ne prétend pas la porter, et une case à cocher qui l'affirmerait serait exactement la déclaration-qui-ressemble-à-une-preuve que l'ADR-027 interdit.\n\nUNE SUR-APPLICATION CONNUE ET ASSUMÉE, écrite ici parce qu'elle se lit sur cet article. La liste n'est due que par l'employeur qui détient au moins un équipement soumis à vérification générale périodique — l'article ne s'ouvre que sur « les vérifications générales périodiques ». Le porteur établissement ne sait pas poser cette condition : une obligation d'établissement s'applique quels que soient les équipements déclarés, y compris aucun (ADR-022 § 4). Un bureau sans le moindre appareil reçoit donc la ligne. C'est le sens d'erreur voulu : elle est visible par celui qui la subit, elle se solde par une déclaration, et l'inverse aurait fait disparaître la liste chez le commerçant qui a déclaré son transpalette sans savoir qu'elle allait avec.",
    },
    {
      ref: "R. 4323-25",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 - art. (V) ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "Impose à l'employeur de consigner le résultat des vérifications générales périodiques sur le ou les registres de sécurité de l'article L. 4711-5. Obligation de traçabilité, sans périodicité propre : elle suit celle de la vérification.",
      citationCle:
        "Le résultat des vérifications générales périodiques est consigné sur le ou les registres de sécurité mentionnés à l'article L. 4711-5.",
      statut: "retenu",
      obligations: [
        "levage-registre-securite-consignation",
        // Ajoutée le 2026-09-02. L'article ne parle pas de levage : il vise
        // « les vérifications générales périodiques », toutes branches
        // confondues. La VGP trimestrielle des compacteurs et presses à
        // balles s'y consigne au même titre, et le cite en contexte.
        "compactage-dechets-vgp-trimestrielle",
      ],
    },
    {
      ref: "R. 4323-26",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 - art. (V) ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "Quand la vérification est faite par un intervenant extérieur à l'établissement, impose d'annexer son rapport au registre de sécurité ; à défaut, d'y porter la date de la vérification, la date de remise du rapport et son lieu d'archivage dans l'établissement. Les deux branches sont des obligations, la seconde n'est pas une dispense.",
      citationCle:
        "Lorsque les vérifications périodiques sont réalisées par des personnes n'appartenant pas à l'établissement, les rapports établis à la suite de ces vérifications sont annexés au registre de sécurité. A défaut, les indications précises relatives à la date des vérifications, à la date de remise des rapports correspondants et à leur archivage dans l'établissement sont portées sur le registre de sécurité.",
      statut: "retenu",
      obligations: ["levage-registre-securite-consignation"],
    },
    {
      ref: "R. 4323-27",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 - art. (V) ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "Autorise la tenue et la conservation du registre de sécurité et des rapports sur tout support, dans les conditions de l'article L. 8113-6. Permissif : ne crée aucune obligation nouvelle, lève l'exigence d'un support papier.",
      citationCle:
        "Le registre de sécurité et les rapports peuvent être tenus et conservés sur tout support dans les conditions prévues par l'article L. 8113-6.",
      statut: "retenu",
      obligations: ["levage-registre-securite-consignation"],
    },
    {
      ref: "R. 4323-28",
      versionEnVigueur: "2008-05-01",
      // Page de l'article : « Création Décret n°2008-244 du 7 mars 2008 - art. (V) ».
      // Jamais modifié depuis sa création — pas de texte modificateur à signaler.
      modifiePar: null,
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "Article d'habilitation : renvoie à des arrêtés ministériels le soin de désigner les équipements soumis à vérification lors de la remise en service après démontage-remontage ou après modification susceptible de mettre en cause la sécurité. Le déclencheur est l'opération, pas le calendrier — aucune récurrence ne s'en déduit. Chemin : section 4, sous-section 3 « Vérification lors de la remise en service ».",
      citationCle:
        "Des arrêtés des ministres chargés du travail ou de l'agriculture déterminent les équipements de travail et les catégories d'équipements de travail pour lesquels l'employeur procède ou fait procéder à une vérification, dans les conditions prévues à la sous-section 2, lors de leur remise en service après toute opération de démontage et remontage ou modification susceptible de mettre en cause leur sécurité, en vue de s'assurer de l'absence de toute défectuosité susceptible de créer des situations dangereuses.",
      statut: "retenu",
      obligations: ["levage-remise-en-service-apres-reparation"],
    },
  ],
};
