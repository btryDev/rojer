// Corpus : articles cités par le référentiel, dépouillés le 26 août 2026,
// complétés le 4 septembre 2026 par les sept derniers articles du Titre Ier
// portant un rythme.
//
// Étendue « articles_cites » : cette liste ne contient QUE les articles que le
// référentiel cite — plus ceux qu'on a ouverts en cherchant, et qui portent une
// obligation qu'il ne sait pas encore faire naître (`obligation_manquante`).
// Elle ne dit rien de ce que le texte contient par ailleurs, et ne peut donc
// jamais se déclarer complète. C'est un remboursement de dette, pas une preuve
// d'exhaustivité.
//
// CE QUE LA MESURE DU 2026-09-03 A ÉTABLI, ET QUE CE FICHIER PORTE DEPUIS.
// `docs/revues/denominateur-livre-2-erp.md` a compté le Livre II sur la donnée
// officielle de la DILA : **794 articles**, dont **dix-neuf seulement portent
// un rythme** pour un ERP de type N ou M — les dix-neuf au Titre Ier, aucun
// dans un chapitre de type. Ce corpus en citait douze ; il les porte désormais
// tous les dix-neuf. Le dénominateur, lui, ne bouge pas : dix-neuf rythmes sur
// dix-neuf ne fait pas 25 articles sur 794, et la `portee` ci-dessous dit
// exactement ce que la liste couvre et ce qu'elle laisse dehors.

import type { Corpus } from "./types";

export const ARRETE_1980_LIVRE_2: Corpus = {
  id: "arrete-1980-livre-2",
  intitule:
    "Arrêté du 25 juin 1980, Livre II — établissements des quatre premières catégories",
  url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000020303557/",
  etendue: "articles_cites",
  portee:
    "TITRE IER SEUL — dispositions générales, dix des onze chapitres : GE (généralités), CO (construction), DF (désenfumage), CH (chauffage-ventilation), GZ (gaz), EL (électricité), EC (éclairage de sécurité), AS (ascenseurs, escaliers mécaniques, trottoirs roulants), GC (appareils de cuisson), MS (moyens de secours). Seul AM (aménagements intérieurs) n'a aucune entrée. AUCUN ARTICLE DU TITRE II — les 482 articles des quatorze chapitres de type (L, M, N, O, P, R, S, T, U, V, W, X, Y, J) ne sont pas ouverts, et pas davantage cités par le référentiel. PE 1 § 1 écarte ce livre en 5ᵉ catégorie sauf renvoi exprès : le Livre III n'en ouvre que MS 39 et MS 70. Les articles listés ici sont cités par le référentiel malgré cette exclusion — la sur-application est documentée obligation par obligation.",
  articles: [
    {
      ref: "CH 57",
      intitule: "Entretien",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020304588/",
      versionEnVigueur: "1980-08-15",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Article d'ENTRETIEN, non de vérification : entretien régulier et maintien en bon état, plus une seule périodicité chiffrée — le ramonage et le nettoyage annuels des conduits de fumée, des cheminées et de TOUS les appareils. La vérification technique annuelle, elle, est à CH 58.",
      citationCle:
        "Les installations doivent être entretenues régulièrement et maintenues en bon état de fonctionnement. En particulier, les conduits de fumée, les cheminées et tous les appareils doivent être ramonés et nettoyés une fois par an.",
      statut: "retenu",
      obligations: ["aeration-erp-chauffage-ventilation-annuelle"],
      reserve:
        "DEUX ACTES DISTINCTS SOUS UNE SEULE LIGNE, relevé le 2026-09-01. `aeration-erp-chauffage-ventilation-annuelle` s'intitule « Vérification annuelle des installations techniques de chauffage-ventilation » et cite CH 57 et CH 58 ensemble. Mais le ramonage annuel de CH 57 et la vérification technique annuelle de CH 58 sont deux obligations différentes : elles n'ont ni le même objet, ni le même réalisateur — CH 58 § 1 renvoie à la section II du chapitre Ier, donc à un organisme agréé ou un technicien compétent au sens de GE 6, là où le ramonage n'appelle personne en particulier. Un exploitant qui coche la ligne après une visite de maintenance aura l'air d'avoir ramoné.\n\nSCISSION PROPOSÉE ET NON FAITE PAR LE LOT A, le 2026-09-01. L'argument complet — deux objets, deux réalisateurs, ce que la confusion coûte, ce que la scission coûte — est écrit dans les `notesInternes` de l'obligation, à l'endroit où la décision se prendra. Ce que le lot a fait ici : la `note` de la référence CH 57 dit désormais en toutes lettres que le ramonage n'est PAS l'acte que la ligne planifie, de sorte que le manque est lisible sur la fiche et pas seulement au corpus. Une scission créerait une obligation, ce que le mandat du lot A exclut ; elle appartient à la propriétaire.",
    },
    {
      ref: "CH 58",
      intitule: "Vérifications techniques",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020304588/",
      versionEnVigueur: "2025-09-10",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      citationCle:
        "§ 2. Les vérifications périodiques doivent avoir lieu tous les ans et concernent : - les installations de production de chaleur ou de froid visées aux sections II, V et VI du présent chapitre ; - le stockage des combustibles visé à la section III ; - les installations de traitement d'air et de ventilation visées à la section VII ; - les appareils de production-émission de chaleur à combustion et les systèmes thermodynamiques visés à la section VIII. […] Les systèmes thermodynamiques visés à l'article CH 35 font l'objet d'un contrôle d'étanchéité qui fait mention des résultats des détections de fuites directes ou indirectes. De plus, les dispositifs de sécurité et les asservissements liés, visés à l'article CH 35 §3, doivent être vérifiés dans leur totalité tous les 3 ans.",
      historique:
        "Le 2026-09-26, l'obligation qu'il fonde est bornée aux catégories 1 à 4 : en 5ᵉ catégorie, `PE 1` § 1 écarte le livre II sauf « articles expressément mentionnés », et aucun article PE ne mentionne `CH 58` (balayage consigné dans les `notesInternes` de `aeration-erp-chauffage-ventilation-annuelle`).",
      statut: "retenu",
      obligations: ["aeration-erp-chauffage-ventilation-annuelle"],
      prescrit:
        "RYTHME NON PORTÉ, relevé le 2026-08-27. La rédaction issue de l'arrêté du 1er septembre 2025 ajoute : « les dispositifs de sécurité et les asservissements liés, visés à l'article CH 35 § 3, doivent être vérifiés dans leur totalité tous les 3 ans », plus un contrôle d'étanchéité des systèmes thermodynamiques. Le référentiel ne porte que l'annuelle. Non encodé parce que le texte vise les seuls SYSTÈMES THERMODYNAMIQUES, qu'aucune propriété d'équipement ne distingue d'une CTA ordinaire : poser la triennale sur CTA sur-appliquerait.",
    },
    {
      ref: "GC 8",
      intitule: "Moyens d'extinction des installations de cuisson",
      versionEnVigueur: "1980-08-15",
      luLe: "2026-08-27",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["cuisson-erp-extinction-automatique-annuelle"],
      citationCle:
        "« Dans les grandes cuisines ouvertes et les îlots de cuisson, des dispositifs d'extinction automatique adaptés au feu d'huile doivent être installés à l'aplomb des friteuses ouvertes. »",
      prescrit:
        "Fonde l'EXISTENCE du dispositif d'extinction automatique, pas sa vérification — laquelle relève de MS 73 § 2. Les deux articles étaient absents de l'obligation, qui ne citait que GC 22, où l'expression « extinction automatique » n'apparaît pas.",
    },
    {
      ref: "GC 1",
      intitule:
        "Domaine d'application et définitions — seuil de la « grande cuisine »",
      versionEnVigueur: "1980-08-15",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["cuisson-erp-verification-initiale"],
      citationCle:
        '« § 3. Un local ou un groupement de locaux non isolés entre eux comportant des appareils de cuisson et des appareils de remise en température dont la puissance utile totale est supérieure à 20 kW est appelé "grande cuisine". »',
      prescrit:
        "Définit le seuil qui déclenche tout le chapitre X : 20 kW de puissance utile totale, et RIEN D'AUTRE. Aucune mention d'un nombre de couverts, ici ni ailleurs dans le chapitre. Le référentiel annonçait « > 20 kW ou production > 500 couverts simultanés, cf. art. GC 1 » — second critère inventé, corrigé le 2026-08-26. GC 1 distingue par ailleurs la grande cuisine de l'office de remise en température, de l'îlot de cuisson et du module ou conteneur spécialisé, qui relèvent de sections distinctes.",
    },
    {
      ref: "GC 21",
      intitule: "Entretien des installations de cuisson",
      versionEnVigueur: "1980-08-15",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "cuisson-erp-circuits-extraction-nettoyage",
        "cuisson-erp-filtres-hebdomadaire",
      ],
      citationCle:
        "« § 2. Au moins une fois par an, il doit être procédé au ramonage des conduits d\'évacuation et à la vérification de leur vacuité. […] Les filtres doivent être nettoyés ou remplacés aussi souvent que nécessaire et, en tout cas, au minimum une fois par semaine. »",
      prescrit:
        "DEUX rythmes : ramonage annuel des conduits avec vérification de leur vacuité, et nettoyage ou remplacement des filtres au minimum HEBDOMADAIRE. Le second ne produisait aucune échéance avant le 2026-08-26 — il vivait dans le libellé d\'une référence. Le § 3 impose en outre de noter les dates des vérifications et opérations d\'entretien, et d\'annexer ce relevé au registre de sécurité.",
    },
    {
      ref: "GC 22",
      intitule: "Vérifications techniques",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317519/",
      versionEnVigueur: "1980-08-15",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Deux paragraphes. Le § 1 renvoie le régime de la vérification à la section II du chapitre Ier — donc à GE 6 et suivants, personne ou organisme agréé. Le § 2 fixe l'annuelle, en énumérant limitativement ce qu'elle couvre (grandes cuisines, offices de remise en température, îlots de cuisson, autres appareils à poste fixe) et ce qu'elle a pour objet, en quatre points.",
      citationCle:
        "§ 2. Les vérifications périodiques doivent avoir lieu tous les ans et concernent : - les grandes cuisines isolées ou non des locaux accessibles au public visées à la section II ; - les offices de remise en température visés à la section III ; - les îlots de cuisson visés à la section IV ; - les autres appareils à poste fixe visés à la section VI. Elles ont pour objet de s'assurer : - de l'état d'entretien et de maintenance des installations et appareils ; - des conditions de ventilation des locaux contenant des appareils de cuisson ou de remise en température : conditions d'évacuation de l'air vicié, des buées et des graisses, fonctionnement de l'installation d'extraction des fumées ; - de la signalisation des dispositifs de sécurité ; - de la manœuvre des dispositifs d'arrêt d'urgence.",
      statut: "retenu",
      obligations: [
        "cuisson-erp-appareils-annuelle",
        "cuisson-erp-verification-initiale",
      ],
      historique:
        "DEUX CHOSES RELEVÉES LE 2026-09-01, ARTICLE LU EN ENTIER.\n\n(1) L'EXTINCTION AUTOMATIQUE N'EST PAS DANS GC 22 — CORRIGÉ LE 2026-09-01 (lot A). L'objet de la vérification annuelle y est énuméré en quatre points, et aucun ne vise un système d'extinction automatique : entretien et maintenance, ventilation et évacuation des buées et graisses, signalisation des dispositifs de sécurité, manœuvre des arrêts d'urgence. `cuisson-erp-extinction-automatique-annuelle` citait l'article pour une chose qu'il ne dit pas ; la référence est retirée, et le fondement est MS 73 § 2 — déjà cité par elle, comme GC 8 (existence du dispositif). Aucun texte ajouté : deux références de contexte déjà là, dont l'une remonte en fondement.\n\n(2) LE RAMONAGE ANNUEL ET LE NETTOYAGE HEBDOMADAIRE DES FILTRES SONT À GC 21, NON ICI, et GC 21 § 3 impose en outre un livret d'entretien annexé au registre de sécurité. GC 21 est au corpus avec son verbatim ; le rappeler ici évite de croire que GC 22 porte tout le chapitre.",
    },
    {
      ref: "GZ 13",
      intitule: "Conformité de l'installation et mise en service",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051268454/",
      versionEnVigueur: "2026-01-01",
      modifiePar: { texte: "Arrêté du 23 février 2025 - art. 1" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "Quatre paragraphes, dont un seul vise l'exploitant. §§ 1 à 3 : c'est l'INSTALLATEUR qui vérifie la résistance mécanique et l'étanchéité de ce qu'il réalise ou modifie, et qui établit un certificat de conformité par intervention créant ou modifiant des canalisations fixes — un certificat par installateur quand ils sont plusieurs, les dispenses étant renvoyées aux guides de GZ 3. § 4 : L'UTILISATION DU GAZ NE PEUT COMMENCER QU'APRÈS VÉRIFICATION DE L'INSTALLATION par une personne ou un organisme AGRÉÉ, avec rapport de vérification technique conforme à GE 9 et visa apposé sur l'exemplaire du certificat de conformité joint au registre de sécurité. C'est un préalable à la mise en service, pas une périodicité.",
      citationCle:
        "§ 4. L'utilisation du gaz ne peut intervenir qu'après vérification de l'installation, par une personne ou un organisme agréé. Cette vérification doit faire l'objet d'un rapport de vérification technique conforme aux dispositions de l'article GE 9. Un visa apposé par cette personne ou cet organisme sur l'exemplaire du certificat de conformité joint au registre de sécurité atteste que l'installation satisfait aux exigences règlementaires.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: false,
      motif:
        "Le § 4 impose à l'exploitant une vérification de l'installation de gaz par une personne ou un organisme agréé AVANT toute utilisation du gaz, avec une pièce à joindre au registre de sécurité — rapport de vérification technique conforme à GE 9, et visa sur le certificat de conformité. Le référentiel ne porte rien de tel : `cuisson-gaz-installations-annuelle` porte la seule périodique de GZ 15, et `cuisson-erp-verification-initiale` porte la mise en service des appareils de cuisson, pas celle de l'installation de gaz. Signalé sans être encodé : l'ajout d'obligation ne relève pas du lot de traçabilité du 2026-09-01.",
      bloquePar:
        "Aucune catégorie d'équipement « installation de gaz ». Le rythme est encodable — `mise_en_service_uniquement` existe —, mais l'accrocher à `APPAREIL_CUISSON_ERP` sous-appliquerait : une installation de gaz alimente aussi un chauffage ou une production d'eau chaude, et GZ 13 vise l'installation, pas l'appareil. Même blocage que l'arrêté du 23 février 2018, art. 26 § 3.\n\nRÉEXAMINÉ LE 2026-09-01 (lot C), LE BLOCAGE TIENT, ET LE RABATTAGE A ÉTÉ PESÉ PLUTÔT QUE ÉCARTÉ D'OFFICE. L'argument POUR : le référentiel emploie DÉJÀ `APPAREIL_CUISSON_ERP` comme tenant-lieu d'installation de gaz — `cuisson-gaz-installations-annuelle` y accroche la périodique de GZ 15 —, si bien qu'ancrer GZ 13 § 4 au même endroit n'aggraverait aucune sous-application existante et donnerait une ligne à l'exploitant qui a déclaré une cuisine. L'argument CONTRE, et il l'emporte : ce serait un second rabattage adossé au premier, et il rendrait le trou plus difficile à voir en donnant l'apparence d'une couverture. Un commerce qui chauffe au gaz sans appareil de cuisson déclaré ne verrait toujours rien, et personne ne s'en apercevrait puisque la ligne existerait par ailleurs. La règle du dépôt est d'étendre le modèle plutôt que de rabattre l'obligation.\n\nCE QUE COÛTE LE DÉBLOCAGE, mesuré : une valeur `INSTALLATION_GAZ` à `CategorieEquipement`, donc à l'enum Prisma et à une migration ; une entrée au pré-remplissage de l'onboarding et au formulaire de parc ; et la reprise de `cuisson-gaz-installations-annuelle`, qui devrait migrer vers la nouvelle catégorie plutôt que de rester sur l'appareil de cuisson. C'est une décision produit — elle change l'onboarding — et elle débloquerait DEUX obligations d'un coup, celle-ci et l'arrêté du 23 février 2018, art. 26 § 3.",
    },
    {
      ref: "GZ 14",
      intitule: "Entretien des installations",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051268450/",
      versionEnVigueur: "2026-01-01",
      modifiePar: { texte: "Arrêté du 23 février 2025 - art. 1" },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      prescrit:
        "§ 1 : le maintien en l'état et l'entretien des installations de gaz, des appareils à gaz et de leurs systèmes d'évacuation des produits de combustion INCOMBENT À L'EXPLOITANT ; le distributeur, lui, entretient l'organe de coupure de branchement. § 2 : sur le domaine public, le maire maintient l'ACCÈS à l'organe de coupure et l'exploitant sa SIGNALISATION ; sur le domaine privé, l'exploitant maintient les deux et avertit sans délai le distributeur en cas de difficulté. Aucune périodicité : ce sont des états à tenir.",
      citationCle:
        "§ 1. Le maintien en l'état et l'entretien des installations de gaz, des appareils à gaz et de leurs systèmes d'évacuation des produits de combustion incombent à l'exploitant. Le distributeur assure l'entretien de l'organe de coupure de branchement.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: false,
      motif:
        "Deux obligations d'exploitant, aucune portée. (1) L'entretien et le maintien en l'état des installations de gaz, des appareils et de leurs systèmes d'évacuation — un état permanent, du même genre que le « maintenus en bon état de fonctionnement » de R. 4227-29, que le référentiel porte pour les extincteurs et pas ici. La vérification annuelle de GZ 15 CONSTATE cet entretien, elle ne le remplace pas : `cuisson-gaz-installations-annuelle` est la seule ligne du domaine et elle porte la vérification, pas l'entretien. (2) Le maintien en l'état de la signalisation de l'organe de coupure de branchement, et de son accès lorsqu'il est sur le domaine privé. Signalé sans être encodé, comme GZ 13.",
      bloquePar:
        "Même blocage que GZ 13 : aucune catégorie d'équipement « installation de gaz ». S'y ajoute, pour le § 2, que le référentiel ne connaît pas l'organe de coupure de branchement ni sa localisation — domaine public ou privé —, dont dépend le partage entre le maire et l'exploitant.",
    },
    {
      ref: "GZ 15",
      intitule: "Vérifications techniques périodiques",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020304213/",
      versionEnVigueur: "2026-01-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Fixe l'objet et le rythme ANNUEL des vérifications techniques des installations de gaz, en huit points — dont l'étanchéité des installations et le réglage des détendeurs —, et renvoie leur régime à la section II du chapitre Ier, c'est-à-dire à GE 6 et suivants.",
      citationCle:
        "Elles ont pour objet de s'assurer : - de l'état d'entretien et de maintenance des installations et appareils à gaz ; - des conditions de ventilation des locaux contenant des appareils alimentés en gaz ; - des conditions d'évacuation des produits de combustion ; - de la signalisation des dispositifs de sécurité ; - de la manœuvre des organes de coupure du gaz ; - du fonctionnement des dispositifs asservissant l'alimentation en gaz à un système de sécurité ; - du réglage des détendeurs ; - de l'étanchéité des installations de gaz. Elles sont réalisées annuellement conformément à la section II, chapitre premier du présent titre.",
      statut: "retenu",
      obligations: ["cuisson-gaz-installations-annuelle"],
      reserve:
        "NUMÉROTATION REFAITE, ET L'ARTICLE S'OUVRE SUR UN PRONOM. Relevé le 2026-09-01 : le chapitre VI a été récrit par l'arrêté du 23 février 2025, en vigueur au 1er janvier 2026, et il s'arrête désormais à GZ 15 — l'ancienne numérotation allait jusqu'à GZ 30, et c'est GZ 30 que la littérature professionnelle cite encore pour l'annuelle. Toute référence à « GZ 30 » rencontrée ailleurs vise ce texte-ci.\n\nLe texte de GZ 15 commence par « Elles ont pour objet de s'assurer » sans antécédent dans l'article.\n\nOÙ EST L'ANTÉCÉDENT, VÉRIFIÉ LE 2026-09-01. Le relevé du matin renvoyait à GZ 13 et GZ 14 ; les deux articles ont été ouverts depuis, et ILS NE LE PORTENT PAS. GZ 13 parle d'une « vérification » au singulier, faite par l'installateur puis par un organisme agréé avant la mise en service ; GZ 14 parle d'entretien. Aucun des deux n'introduit « les vérifications techniques périodiques » au pluriel. Le seul antécédent de « Elles » est l'INTITULÉ de GZ 15 lui-même — « Vérifications techniques périodiques » —, ce qui reste un défaut de rédaction du texte officiel, mais pas celui qu'on croyait. GZ 13 et GZ 14 sont entrés au corpus le même jour, tous deux en `obligation_manquante` : GZ 13 § 4 porte une vérification avant mise en service du gaz, GZ 14 § 1 l'entretien à la charge de l'exploitant, et le référentiel ne porte ni l'une ni l'autre. Signalés, non encodés.",
    },
    {
      ref: "GE 6",
      intitule: "Vérifications techniques — généralités",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020303884/",
      versionEnVigueur: "2007-11-19",
      versionFuture: "2027-06-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Article de RÉGIME, pas d'échéance : il dit QUI vérifie — organisme agréé par le ministre de l'intérieur, ou technicien compétent —, et réserve l'organisme agréé aux cas où la suite du règlement le prévoit. Aucun acte, aucun rythme. C'est lui que visent tous les renvois « dans les conditions prévues à la section II du chapitre Ier » (CH 58, GC 22, GZ 15, EL 19).",
      citationCle:
        "§ 1. Les vérifications techniques prévues par l'article R. 123-43 du code de la construction et de l'habitation doivent être effectuées soit par des organismes agréés par le ministre de l'intérieur, soit par des techniciens compétents. § 2. Les vérifications techniques doivent être effectuées par des organismes agréés lorsque la suite du présent règlement le prévoit.",
      statut: "retenu",
      obligations: ["elec-erp-mise-en-service"],
      reserve:
        "RENVOI VERS UNE NUMÉROTATION ABROGÉE, à ne pas recopier. LE RENVOI MORT EST DANS LE TEXTE OFFICIEL, pas dans le référentiel : c'est GE 6 lui-même, tel que Légifrance le publie aujourd'hui, qui fonde tout le régime sur « les vérifications techniques prévues par l'article R. 123-43 du code de la construction et de l'habitation » — numéro disparu à la recodification du CCH par le décret n° 2021-872 du 30 juin 2021. Relevé le 2026-09-01, verbatim relu à la source. Il n'y a rien à corriger dans le corpus : le corriger consisterait à réécrire l'arrêté.\n\nAUCUNE CORRESPONDANCE N'EST POSÉE ICI, et c'est délibéré. La piste la plus proche est le CCH R. 143-34, ouvert le 2026-09-01 : « Les constructeurs, installateurs et exploitants sont tenus [...] de s'assurer que les installations ou équipements sont établis, maintenus et entretenus en conformité [...] A cet effet, ils font respectivement procéder pendant la construction et périodiquement en cours d'exploitation aux vérifications nécessaires par les organismes ou personnes agréés dans les conditions fixées par les articles R. 141-15, R. * 141-16 et R. 141-17. » Le contenu concorde, mais AUCUNE source lue n'établit la concordance de numérotation : ni la page de R. 143-34, qui ne mentionne aucun ancien numéro, ni une table de concordance. C'est donc une piste, pas un constat, et elle ne se recopie pas comme si elle en était un. L'article n'a pas été rafraîchi depuis, et une version future est programmée au 1er juin 2027 : c'est là qu'il faudra vérifier si le renvoi est corrigé. Depuis le 2026-09-01, ce rendez-vous n'est plus une phrase : `elec-erp-mise-en-service` porte une `relectureDue` au 2027-06-01, et un test échouera ce jour-là.\n\nCE QUE L'ARTICLE NE DIT PAS. `elec-erp-mise-en-service` le cite avec un réalisateur « organisme agréé », ce qui n'est vrai que par le § 2 — donc seulement quand un autre article l'impose ; GE 6 pris seul admet aussi le technicien compétent. Le caractère agréé vient de GE 7 et GE 8, cités dans la même `reference` mais absents du corpus.",
    },
    {
      ref: "EL 18",
      intitule: "Maintenance, exploitation",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020314182/",
      versionEnVigueur: "2019-07-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Quatre paragraphes, dont trois que le référentiel ne porte pas. § 1 : entretien et réparation des défectuosités dès leur constatation. § 2 : PRÉSENCE PHYSIQUE d'une personne qualifiée pendant la présence du public en 1re et 2e catégorie, imposable en 3e et 4e après avis de la commission de sécurité. § 3 : renvoi de l'éclairage de sécurité à EC 13 et EC 14. § 4 : entretien et essais des groupes électrogènes de sécurité, quinzaine et mois, consignés dans un registre d'entretien.",
      citationCle:
        "§ 1. Les installations doivent être entretenues et maintenues en bon état de fonctionnement. Les défectuosités et les défauts d'isolement doivent être réparés dès leur constatation. § 2. Dans tout établissement de 1re ou 2e catégorie, la présence physique d'une personne qualifiée est requise pendant la présence du public pour, conformément aux consignes données, assurer l'exploitation et l'entretien quotidien. Une telle mesure peut être imposée après avis de la commission de sécurité dans les établissements de 3e et de 4e catégorie si l'importance ou l'état des installations électriques le justifie.",
      statut: "retenu",
      obligations: [
        "elec-erp-groupe-electrogene-annuel",
        "elec-erp-groupe-electrogene-quinzaine",
        // Ajoutée le 2026-09-01 (lot C). La réserve inscrite le matin même
        // disait « LE § 2 N'EST ENCODÉ NULLE PART » ; il l'est.
        "elec-erp-presence-personne-qualifiee",
      ],
      reserve:
        "LE § 2 EST ENCODÉ DEPUIS LE 2026-09-01 (lot C) : `elec-erp-presence-personne-qualifiee`, état permanent, porteur établissement, restreinte aux 1ʳᵉ et 2ᵉ catégories comme l'écrit la première phrase. La réserve du matin disait « aucune obligation du référentiel ne la porte, et le corpus ne la comptait pas comme manquante puisque l'article était déjà classé retenu au titre du seul § 4 » — c'est le cas d'école du manque qu'un statut « retenu » cache, et il est levé.\n\nCE QUI RESTE HORS RÉFÉRENTIEL, sur cet article. La SECONDE PHRASE du § 2 — la même mesure imposable aux 3ᵉ et 4ᵉ catégories « après avis de la commission de sécurité » — n'est pas encodée : c'est un acte administratif individuel, donc une prescription particulière (ADR-035), et l'inscrire au référentiel la donnerait à tous les ERP de 3ᵉ et 4ᵉ catégorie. Le § 1 (entretien et réparation des défectuosités dès leur constatation) et le § 3 (renvoi de l'éclairage de sécurité à EC 13 et EC 14) restent sans ligne propre : le premier est une obligation de moyens sans acte datable, le second est un renvoi dont la destination est encodée.",
    },
    {
      ref: "MS 38",
      intitule: "Appareils mobiles — caractéristiques et vérification des extincteurs",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020317639/",
      prescrit:
        "§ 4 : un extincteur fait l'objet d'une vérification ANNUELLE et d'une révision TOUS LES DIX ANS par une personne ou un organisme compétent, avec étiquette d'identification portant les années et les mois des vérifications ; le plan d'implantation et le relevé des vérifications sont portés au registre de sécurité. Les § 1 à § 3 portent la dotation, le marquage et les caractéristiques de l'appareil, pas sa vérification. Chemin : Livre II > Titre Ier > Chapitre XI > Section 2 > Sous-section 9 — donc écarté en 5ᵉ catégorie par PE 1 § 1.",
      citationCle:
        "Un extincteur doit faire l'objet d'une vérification annuelle et d'une révision tous les dix ans par une personne ou un organisme compétent. Il doit être marqué d'une étiquette clairement identifiable apposée par la personne ou l'organisme ayant réalisé cette dernière. Les années et les mois des vérifications doivent apparaître sur l'étiquette. Un plan d'implantation des extincteurs et un relevé des vérifications doivent être portés au registre de sécurité.",
      versionEnVigueur: "2008-10-08",
      modifiePar: { texte: "Arrêté du 26 juin 2008 - art. 2, v. init." },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "incendie-erp-extincteurs-annuelle",
        // Ajoutée le 2026-09-01 (lot C). La réserve inscrite le matin même
        // disait « la RÉVISION DÉCENNALE du § 4 n'est portée par aucune
        // obligation du référentiel » ; elle l'est désormais, par une ligne
        // distincte. Article rouvert à la source avant l'encodage.
        "incendie-erp-extincteurs-revision-decennale",
      ],
      reserve:
        "LA SUR-APPLICATION EN 5ᵉ CATÉGORIE RESTE, et elle vaut pour les deux lignes. Le chemin le dit — Livre II > Titre Ier > Chapitre XI > Section 2 > Sous-section 9 —, et PE 1 § 1 écarte le Livre II en 5ᵉ catégorie sans que le Livre III rouvre MS 38. Les deux obligations sont maintenues au même périmètre, sur l'analyse portée par les `notesInternes` de `incendie-erp-extincteurs-annuelle` ; restreindre l'une sans l'autre serait incohérent.",
    },
    {
      ref: "MS 73",
      versionEnVigueur: "1980-08-15",
      luLe: "2026-08-26",
      lecture: "agent_verbatim",
      statut: "retenu",
      obligations: [
        "incendie-erp-extincteurs-annuelle",
        "incendie-erp-ria-annuelle",
        "incendie-erp-ssi-annuelle",
        "incendie-erp-ssi-triennale",
        "cuisson-erp-extinction-automatique-annuelle",
      ],
      prescrit:
        "La triennale du § 2 ne vise QUE les systèmes de sécurité incendie de catégories A et B et les sprinkleurs, par personne ou organisme agréé — relu le 2026-08-27. Une obligation qui l'appliquerait aux SSI sans distinction de catégorie sur-couvrirait. Le § 2 fonde par ailleurs l'annuelle des dispositifs d'extinction automatique de cuisine, que GC 22 ne fonde pas.",
    },
    {
      ref: "EC 14",
      intitule: "Exploitation de l'éclairage de sécurité (ERP)",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020317456/",
      prescrit:
        "§ 3 : l'exploitant s'assure lui-même, une fois par mois, du passage en position de fonctionnement et de l'allumage de toutes les lampes, et de l'efficacité de la commande de mise en repos à distance et de la remise automatique en veille ; une fois tous les six mois, de l'autonomie d'au moins 1 heure. Ces opérations peuvent être automatiques avec des blocs SATI. Elles et leurs résultats sont consignés au registre de sécurité. Les § 1 et § 2 portent les états de veille, de repos et d'arrêt, sans périodicité.",
      citationCle:
        "L'exploitant s'assure périodiquement : - une fois par mois : - du passage à la position de fonctionnement en cas de défaillance de l'alimentation normale et à la vérification de l'allumage de toutes les lampes (le fonctionnement doit être strictement limité au temps nécessaire au contrôle visuel) ; - de l'efficacité de la commande de mise en position de repos à distance et de la remise automatique en position de veille au retour de l'alimentation normale. - une fois tous les six mois, de l'autonomie d'au moins 1 heure. Ces opérations peuvent être effectuées automatiquement par l'utilisation de blocs autonomes comportant un système automatique de test intégré (SATI) conforme à la norme NF C 71-820 (mai 1999). Dans les établissements comportant des périodes de fermeture, ces opérations sont effectuées de telle manière qu'au début de chaque période d'ouverture au public l'installation d'éclairage ait retrouvé l'autonomie prescrite. Les opérations ci-dessus et leurs résultats doivent être consignés dans le registre de sécurité.",
      versionEnVigueur: "2010-05-16",
      modifiePar: { texte: "Arrêté du 11 décembre 2009 - art." },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "incendie-erp-eclairage-securite-autonomie-semestrielle",
        "incendie-erp-eclairage-securite-essai-mensuel",
      ],      reserve:
        "La NF C 71-820 (mai 1999) visée par le § 3 est une norme privée : elle ne fonde rien, c'est EC 14 qui autorise l'automatisation par SATI. L'exception SATI n'est encodée dans aucune condition du référentiel, pas plus côté ERP que côté lieu de travail.\n\nRÉEXAMINÉE LE 2026-09-01 (lot C), ET LE MOT « EXCEPTION » EST TROP FORT. Le cadrage du même jour la présente comme une obligation qu'on RETIRE — « une installation SATI ne doit pas recevoir les mêmes échéances mensuelle et semestrielle ». Le verbatim dit autre chose : « Ces opérations PEUVENT ÊTRE EFFECTUÉES AUTOMATIQUEMENT par l'utilisation de blocs autonomes comportant un système automatique de test intégré (SATI). » L'article autorise un MOYEN, il ne dispense pas de l'obligation : les deux contrôles restent dus au même rythme, et la phrase qui suit — « Les opérations ci-dessus et leurs résultats doivent être consignés dans le registre de sécurité » — n'est pas allégée non plus.\n\nCE QUI EST DONC FAUX AUJOURD'HUI, exactement : le produit inscrit au calendrier un RENDEZ-VOUS que l'exploitant d'une installation SATI n'a pas à honorer de sa main. L'obligation n'est pas fausse, l'ACTE l'est. C'est une sur-application, donc visible par qui la subit, et bien plus étroite que « le référentiel donne une obligation qui n'existe pas ».\n\nCE QUE COÛTERAIT LE REMÈDE, et pourquoi c'est une décision produit. Il faut d'abord un fait que le produit ne détient pas : une caractéristique d'équipement sur BAES — `estEclairageSatiAutoteste` — donc une question de plus au formulaire de parc, un libellé de fiche, et une reprise des équipements déjà déclarés. Il faut ensuite décider ce qu'on fait de la réponse « oui », et les deux voies ne disent pas la même chose. Une condition `equipement_propriete_infirmee` sur les quatre lignes concernées (deux ERP, deux lieu de travail) les ÉTEINDRAIT — le dirigeant ne verrait plus rien, alors que la consignation reste due. Un changement de NATURE vers `etat_permanent` dirait plus juste : l'installation SATI est en état de tester, et ses résultats sont au registre. La seconde voie est la bonne lecture du texte et la plus chère : elle suppose de scinder chaque ligne en deux régimes. Aucune des deux ne se prend depuis un lot de correction.",

    },
    {
      ref: "EC 15",
      intitule: "Vérifications des installations d'éclairage (ERP)",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020317456/",
      prescrit:
        "Rien par lui-même : article de RENVOI d'une phrase. Il soumet les installations d'éclairage aux conditions de EL 19, qui porte seul la périodicité annuelle. Citer EC 15 sans EL 19 ne fonde aucune fréquence.",
      citationCle:
        "Les installations d'éclairage doivent être vérifiées dans les conditions de l'article EL 19.",
      versionEnVigueur: "1980-08-15",
      modifiePar: { texte: "Arrêté du 19 novembre 2001 - art. Annexe, v. init." },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-erp-baes-annuelle"],
    },
    {
      ref: "EL 19",
      intitule: "Vérifications techniques des installations électriques et d'éclairage (ERP)",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020314182/",
      prescrit:
        "TROIS PARAGRAPHES, ET ILS NE DISENT PAS LA MÊME CHOSE. § 1 : renvoi de régime à la section II du chapitre Ier (GE 6 et s.). § 2 : conformité des installations NEUVES OU AYANT FAIT L'OBJET DE TRAVAUX, vérifiée dans les conditions de GE 7 et GE 8 § 1. § 3 : c'est LUI qui porte l'annuelle, pour les installations NON MODIFIÉES, dans les conditions de GE 10 — avec une liste close d'articles couverts dont EC 13 et EC 14 § 3, ce qui rattache l'éclairage de sécurité à cette annuelle. Chemin : Livre II > Titre Ier > Chapitre VII > Section 4 — donc écarté en 5ᵉ catégorie par PE 1 § 1.",
      citationCle:
        "§ 3. Les vérifications périodiques des installations non modifiées doivent être effectuées annuellement dans les conditions prévues à l'article GE 10. Elles concernent les articles suivants à condition qu'ils soient applicables à l'établissement : ― EL 4 (§ 4) ; EL 5 (§ 1, 4 et 5) ; EL 8 (§ 3) ; EL 10 (§ 4) ; EL 11 (§ 3, 4 et 7) ; EL 15 (§ 3) ; EL 17 et EL 18 ; ― EC 5 (§ 5) ; EC 6 (§ 5 et 6) ; EC 7 ; EC 9 (§ 1) ; EC 13 et EC 14 (§ 3). Elles ont pour objet de s'assurer : de l'absence de modifications depuis la dernière vérification ; de l'état d'entretien et de maintenance des installations ; de l'existence d'un relevé des essais ; du maintien en l'état des installations d'éclairage ; du bon état apparent des éventuelles installations extérieures de protection contre la foudre.",
      versionEnVigueur: "2010-01-23",
      modifiePar: { texte: "Arrêté du 24 septembre 2009 - art. (V)" },
      luLe: "2026-09-01",
      // LU DEUX FOIS LE MÊME JOUR par deux lots qui s'ignoraient. Les deux
      // relevés concordent sur le fond — le § 3 porte l'annuelle — et chacun
      // a rapporté ce que l'autre n'avait pas : la liste close d'articles d'un
      // côté, la structure des trois paragraphes de l'autre, et une réserve
      // différente chacun. Les deux réserves sont conservées ci-dessous.
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "elec-erp-cat1-4-annuelle",
        "elec-erp-groupe-electrogene-annuel",
        "elec-erp-mise-en-service",
        "incendie-erp-baes-annuelle",
      ],
      reserve:
        "PARAGRAPHE MAL DÉSIGNÉ — CORRIGÉ LE 2026-09-01 (lot A). `elec-erp-cat1-4-annuelle` citait « EL 19 § 1 et § 2 » pour fonder une vérification ANNUELLE. Le § 1 n'est qu'un renvoi de régime et le § 2 vise les installations neuves ou modifiées — donc exactement l'objet de `elec-erp-mise-en-service`, l'autre ligne : les deux citaient le même paragraphe pour deux actes opposés, et celle qui l'avait juste était l'autre. L'annuelle est recalée sur le § 3, qui vise « les installations NON MODIFIÉES » et renvoie à GE 10. Les quatre obligations rattachées à cet article désignent désormais chacune leur paragraphe dans leur `reference` — la clé, elle, reste « EL 19 » pour toutes : le corpus ne descend pas au paragraphe.\n\nLA LISTE CLOSE DU § 3 N'EST PAS MODÉLISÉE. Le paragraphe énumère limitativement les articles couverts par l'annuelle, et c'est par EC 13 et EC 14 § 3 que l'éclairage de sécurité y entre — ce qui fonde `incendie-erp-baes-annuelle`. Le référentiel ne sait pas porter une liste d'articles couverts ; relevé, non encodé.\n\nDeux articles de régime cités par EL 19 manquent au corpus : GE 10 (conditions des vérifications périodiques) et GE 7 / GE 8 (organismes agréés, installations neuves).\n\nET LE DERNIER ALINÉA RENVOIE À UN TEXTE ABROGÉ : « Il conviendra d'adjoindre à ce document le rapport de vérification périodique effectuée au titre du décret n° 88-1056 du 14 novembre 1988. » Ce décret a été abrogé et recodifié aux articles R. 4226-* du Code du travail. Le renvoi est dans le texte officiel, ce n'est pas une erreur du référentiel — relevé, non recopié comme vivant.",
    },
    {
      ref: "DF 10",
      intitule: "Vérifications techniques des installations de désenfumage (ERP)",
      url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000020303557/LEGISCTA000020304211/",
      prescrit:
        "§ 2 : la périodicité des vérifications de désenfumage est de UN AN, sur six points énumérés (commandes manuelles et automatiques, volets/exutoires/ouvrants, fermeture des éléments mobiles de compartimentage, arrêt de la ventilation de confort, ventilateurs de désenfumage, mesures de pression, débit et vitesse en désenfumage mécanique). § 3 : lorsque coexistent un désenfumage MÉCANIQUE et un SSI de catégorie A ou B, les vérifications sont faites TOUS LES TROIS ANS par un organisme agréé.",
      citationCle:
        "§ 2. La périodicité des vérifications est de un an. Elles concernent : le fonctionnement des commandes manuelles et automatiques ; le fonctionnement des volets, exutoires et ouvrants de désenfumage ; la fermeture des éléments mobiles de compartimentage participant à la fonction désenfumage ; l'arrêt de la ventilation de confort mentionné à l'article DF 3, § 5 ; le fonctionnement des ventilateurs de désenfumage ; les mesures de pression, de débit et de vitesse, dans le cas du désenfumage mécanique. § 3. Lorsque existent une installation de désenfumage mécanique et un système de sécurité incendie de catégorie A ou B, les vérifications sont effectuées tous les trois ans par un organisme agréé.",
      versionEnVigueur: "2007-10-28",
      modifiePar: { texte: "Arrêté du 4 juillet 2007 - art. Annexe, v. init." },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: ["incendie-erp-desenfumage-annuelle"],      reserve:
        "Le § 3 — triennale par organisme agréé quand désenfumage mécanique ET SSI de catégorie A ou B — n'est porté par aucune obligation : `incendie-erp-desenfumage-annuelle` porte l'annuelle du § 2 et rien d'autre. Article reconstaté à la source le 2026-09-01, puis RÉEXAMINÉ le même jour par le lot C, le modèle ayant bougé. LA CAUSE TIENT TOUJOURS, et elle est triple.\n\n(1) LE MODÈLE NE SAIT PAS FAIRE UN « ET » ENTRE DEUX CATÉGORIES, et ce n'est pas une lacune de rédaction mais la forme du moteur. `matchEquipements` (`lib/matching/engine.ts`) groupe les `conditions[]` par catégorie et retient l'obligation dès qu'il existe UN équipement satisfaisant les conditions de SA propre catégorie. Écrire `categoriesEquipement: [\"DESENFUMAGE\", \"ALARME_INCENDIE\"]` produit donc un OU : un désenfumage mécanique seul déclencherait la triennale, sans aucun SSI. Ce qui manque est une variante de `ConditionApplication` qui interroge le PARC de l'établissement et non l'équipement déclencheur — quelque chose comme `etablissement_possede_equipement { categorie, propriete }`. Coût : une variante au type, une branche au moteur, la mise à jour de `docs/regles-matching.md`, et l'empreinte qui bouge sur toutes les obligations conditionnées.\n\n(2) RIEN NE PORTE LA CATÉGORIE D'UN SSI. La seule caractéristique d'ALARME_INCENDIE est `dessertLocauxSommeil` ; la catégorie d'un SSI est une énumération (A, B, C, D, E) et non un booléen, donc la mécanique des questions à trois états ne suffit pas. LA PREUVE QUE LE TROU EST DÉJÀ LÀ, et elle est dans le référentiel : `incendie-erp-ssi-triennale` s'intitule « Vérification triennale approfondie des SSI DE CATÉGORIE A OU B » et ne porte AUCUNE condition — elle tombe sur toute ALARME_INCENDIE déclarée en ERP de 1ʳᵉ à 4ᵉ catégorie, quelle que soit la catégorie du SSI. Encoder DF 10 § 3 sur ce modèle reproduirait cette sur-application au lieu de la corriger.\n\n(3) UN POINT DE DROIT N'EST PAS TRANCHÉ, et il décide de la forme. « Les vérifications sont effectuées tous les trois ans par un organisme agréé » — se substitue-t-il à l'annuelle du § 2, ou s'y ajoute-t-il ? L'article ne le dit pas, et le § 1 renvoie les modalités à GE 6 à GE 10, qui distinguent l'organisme agréé du technicien compétent et n'ont pas été lus sous cet angle. Encoder sans trancher donnerait soit deux échéances pour un acte, soit la suppression silencieuse de l'annuelle. À instruire AVANT d'encoder, et pas après.\n\nTANT QUE (1) ET (2) TIENNENT, LE MANQUE EST UNE SOUS-APPLICATION MUETTE et c'est ce qu'on garde : un établissement à désenfumage mécanique et SSI de catégorie A ou B reçoit l'annuelle du § 2 et pas la triennale par organisme agréé. Il fait donc trop peu, pas trop — mais il fait quelque chose, et rien ne lui ment.",

    },
    {
      ref: "GE 4",
      intitule: "Visites périodiques des établissements des quatre premières catégories",
      url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000029642660/",
      prescrit:
        "§ 1 : les établissements des 1re, 2e, 3e et 4e catégories sont visités périodiquement par les commissions de sécurité selon un TABLEAU croisant le type (J, L, M, N, O, P, R avec ou sans hébergement, S, T, U, V, W, X, Y) et la catégorie, qui donne trois ans ou cinq ans. Ce n'est donc pas une périodicité unique. Aucune ligne de 5ᵉ catégorie : l'article relève du Livre II, écarté en 5ᵉ par PE 1 § 1.",
      citationCle:
        "Les établissements des 1re, 2e, 3e et 4e catégories doivent être visités périodiquement par les commissions de sécurité selon la fréquence fixée au tableau suivant en fonction de leur type et de leur catégorie",
      versionEnVigueur: "2015-01-01",
      // Lu sur la page de l'ARTICLE (LEGIARTI000029642660), pas sur celle de sa
      // section : c'est la confusion que la réserve ci-dessous documente déjà.
      // Recoupé par une seconde source, qui donne le même arrêté du 20 octobre 2014.
      modifiePar: { texte: "ARRÊTÉ du 20 octobre 2014 - art." },
      luLe: "2026-09-01",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "incendie-erp-visite-commission-cat1-2-triennale",
        "incendie-erp-visite-commission-cat1-2-quinquennale",
        "incendie-erp-visite-commission-cat3-triennale",
        "incendie-erp-visite-commission-cat3-quinquennale",
        "incendie-erp-visite-commission-cat4-triennale",
        "incendie-erp-visite-commission-cat4-quinquennale",
        "incendie-erp-5-visite-commission",
      ],
      reserve:
        "(1) LA FIN DE VIGUEUR AU 1ER JUIN 2027 RELEVÉE ICI LE 2026-09-01 EST FAUSSE, et `versionFuture` est retirée le même jour. Trois lectures à la source, le 2026-09-01 : la page de section du chapitre Ier (LEGISCTA000020303872) affiche « Version en vigueur depuis le 01/01/2015 » pour GE 4, sans terme ; la page d'article (LEGIARTI000029642660) ne porte ni version future ni abrogation programmée ; et l'arrêté du 19 février 2026, ouvert au JO, ne modifie dans la série GE que GE 2, GE 6 et GE 7. Les deux articles de cette section qui portent bien « du ... au 01/06/2027 » sont GE 2 et GE 6 — GE 6 est au corpus et sa `versionFuture` est exacte. Le relevé du matin a donc étendu à GE 4 un terme lu sur ses voisins. Conséquence : aucune `relectureDue` n'est due sur `incendie-erp-5-visite-commission` de ce chef ; le rendez-vous du 1er juin 2027 est posé sur `elec-erp-mise-en-service`, seule obligation à citer GE 6. (2) Le § 3 est un PLAFOND, pas un rythme : quand un établissement sans hébergement enchaîne deux visites périodiques favorables, « le délai fixé pour sa prochaine visite par le tableau ci-dessus peut être prolongé dans la limite de cinq ans ». « Dans la limite de cinq ans » n'est pas « tous les cinq ans », et le § 4 permet en outre au maire ou au préfet de modifier la fréquence. (3) CONFIRMÉ UNE QUATRIÈME FOIS LE 2026-09-01 PAR LE LOT B, ET LE PIÈGE EST NOMMÉ. La page de SECTION du chapitre (LEGISCTA000020303874) affiche bien un sélecteur de version « au 01/06/2027 » : ce sélecteur porte sur la SECTION, pas sur GE 4, et il existe parce que GE 2 et GE 6, qui vivent dans la même section, sont modifiés à cette date. Lire un terme d'article sur un sélecteur de section est exactement l'erreur du relevé du matin. Le recoupement indépendant est dans `veille-textes.ts` : l'arrêté du 19 février 2026 « modifie GN 4 et GN 16 (nouveau), GE 2, GE 6, GE 7, CO 6 à CO 34, AM 1 à AM 8, EL 5 et AS 1 » — GE 4 n'y est pas. (4) [AMENDÉ LE 2026-09-01, VOIR (5) : CE QUI SUIT DÉCRIT UN MANQUE QUI A ÉTÉ COMBLÉ LE MÊME JOUR.] L'ÉCHELLE DE GE 4 N'EST ENCODÉE NULLE PART, ET CE N'EST PAS UN DÉFAUT DE `incendie-erp-5-visite-commission`. Cette obligation est bornée à la 5ᵉ catégorie (`typologies.erp.categories = [\"N5\"]`) et se fonde sur PE 37, pas sur GE 4, qui n'y figure que comme repoussoir. Le tableau du § 1 — [PHRASE FAUSSE, LIRE (6) : le type à cinq ans dans les quatre catégories est V et non Y, et quatre types restent à trois ans en 4ᵉ catégorie] trois ans pour toutes les catégories sauf le type Y en 1ʳᵉ à 3ᵉ, et cinq ans pour tous les types en 4ᵉ catégorie hors Y — ne vise que les 1ʳᵉ à 4ᵉ catégories, qui n'ont AUCUNE obligation de visite périodique au référentiel. C'est un manque, et son ampleur est bornée : les trois secteurs cibles (restauration, commerce de détail, bureau) sont presque toujours de 5ᵉ catégorie. L'encoder supposerait de croiser type ET catégorie dans une même condition, ce que `TypologieApplication` sait faire — `categories` et `types` y sont « indépendants et cumulables » —, mais au prix d'une obligation par ligne du tableau. Relevé, non encodé : c'est une obligation manquante, pas une échelle mal lue, et elle ne figure pas à l'inventaire des dix. (5) ENCODÉ LE 2026-09-01 PAR LE LOT B3, SUR DÉCISION DE LA PROPRIÉTAIRE — le produit sert toutes les catégories d'ERP. `incendie-erp-cat1-4-visite-commission` porte désormais le § 1, en UNE ligne bornée à N1–N4 et portée par l'ÉTABLISSEMENT : le § 1 ne conditionne la visite à aucun équipement. La périodicité retenue est `triennale`, et le raisonnement ne dépend pas des cellules du tableau : celui-ci ne porte que deux barreaux, 3 ans et 5 ans, donc trois ans n'est jamais en dessous d'une case. C'est ce qui a permis de l'encoder SANS le lire cellule par cellule — et il a bien fallu, car le corps du tableau n'a PAS pu être lu de façon fiable à la source : quatre extractions se contredisent, l'une porte quatorze croix là où le rendu brut en montre quatre, une autre invente un type « Q » absent de la nomenclature ERP, et les totaux ne se reconstituent pas à quinze colonnes. Le manque est donc DÉPLACÉ, pas supprimé : ce qui reste non lu est la répartition 3/5 ans par case, et l'affiner ferait passer certains établissements de trois à cinq ans. La sur-application actuelle est d'au plus deux ans et ne met personne en défaut. LE PIÈGE DE LA DATE A ÉTÉ LEVÉ AUTREMENT QUE PAR UNE CINQUIÈME LECTURE, et c'est le point de méthode à retenir : la section relue À LA DATE DU 1ER JUILLET 2027 rend GE 4 présent et inchangé dans sa version du 01/01/2015, tandis que GE 2 y apparaît dans une version NOUVELLE du 01/06/2027. Une lecture de plus de la même page aurait reproduit la même erreur une quatrième fois ; ce qui la corrige est une question dont les deux réponses se distinguent. (6) LE TABLEAU EST LU, ET LA NOTE (4) ÉTAIT FAUSSE SUR SES DEUX MOITIÉS — 2026-09-02. Le tableau a été relevé sur la donnée officielle de la DILA puis VÉRIFIÉ CASE PAR CASE SUR LE FAC-SIMILÉ DU JOURNAL OFFICIEL, quinze colonnes sur huit lignes, sans un écart. Il se lit ainsi, en années, par groupe de types : J, O, R (1) avec hébergement, U → 3, 3, 3, 3 ; L, P, R (2) sans hébergement → 3, 3, 3, 5 ; M, N, S, T, W, X, Y → 3, 3, 5, 5 ; V → 5, 5, 5, 5. PREMIÈRE ERREUR : « sauf le type Y ». Le type qui est à cinq ans dans les QUATRE catégories est V, les établissements de culte, et il est le seul dans ce cas. Y (musées) suit le régime ordinaire de M, N, S, T, W et X — trois ans en 1ʳᵉ et 2ᵉ, cinq ans en 3ᵉ et 4ᵉ. Un glissement V → Y rendrait la phrase exacte pour les deux premières catégories ; la lettre juste est V. SECONDE ERREUR, ET C'EST CELLE QUI COÛTAIT : « cinq ans pour tous les types en 4ᵉ catégorie hors Y ». En 4ᵉ catégorie, QUATRE types restent à trois ans — J, O, R avec hébergement, U —, et Y n'en fait pas partie. Encoder cette note aurait donné cinq ans à un EHPAD, un hôtel, un internat et un établissement de soins que le texte visite tous les trois ans : deux ans de délai en trop, sur exactement les publics hébergés ou vulnérables, et personne pour s'en apercevoir. CONTRÔLE. Les cellules vides du tableau ne sont pas encodées dans la donnée officielle — le défaut est déjà dans le texte publié au JO —, ce qui explique que quatre extractions se soient contredites le 2026-09-01 : elles alignaient à gauche des lignes de longueurs différentes. Les CARDINALITÉS, elles, sont exactes et lues sur deux jeux officiels indépendants : trois ans → 14, 14, 7, 4 ; cinq ans → 1, 1, 8, 11 ; chaque catégorie se complète à quinze. CE QUI EST ENCODÉ DEPUIS, ET COMMENT : six obligations, une par bloc du tableau (1ʳᵉ-2ᵉ / 3ᵉ / 4ᵉ × trois ans / cinq ans), qui forment une partition — chaque établissement en reçoit exactement une. Les lignes triennales sont écrites en COMPLÉMENT (`typesExclus`) et non en énumération, pour qu'un ERP dont le type n'est pas renseigné garde ses trois ans au lieu de perdre sa ligne. DEUX ÉCARTS ASSUMÉS, TOUS DEUX DU CÔTÉ COURT — ET IL N'EN RESTE QU'UN. (a) Le type J n'existait pas dans l'énumération `TypeErp` (il est à trois ans partout, donc sans conséquence de rythme, mais un EHPAD ne pouvait pas se déclarer pour ce qu'il est) : LEVÉ LE 2026-09-03. GN 1, la nomenclature elle-même, n'était dépouillé nulle part — c'est en le lisant qu'on a vu que la liste du produit en oubliait un sur vingt-deux, et que l'ADR-004 l'avait écrite de mémoire, « (~20 valeurs) ». Le corpus `arrete-1980-livre-1` la porte désormais, et `types-erp.test.ts` en dérive la liste attendue. (b) La distinction R (1) / R (2), elle, RESTE, et elle ne se lève pas de la même façon : GN 1 § 1 n'écrit qu'un seul R — « Etablissements d'éveil, d'enseignement, de formation, centres de vacances, centres de loisirs sans hébergement ». Les deux colonnes du tableau de GE 4 ne sont pas deux types de la nomenclature mais deux régimes d'une même ligne, séparés par le fait d'héberger, que le § 4 de GN 1 définit (« les seuls locaux destinés au sommeil du public la nuit »). Ajouter une lettre inventerait un type ; ce qu'il faudrait est un croisement du type R avec un attribut d'établissement, que `TypologieApplication` ne sait pas exprimer. Tout R reste donc à trois ans, y compris en 4ᵉ catégorie où le tableau met R sans hébergement à cinq. L'ARRÊTÉ QUI A POSÉ CE TABLEAU EST NOMMÉ AVEC SON NOR, ET IL LE FAUT : deux arrêtés du 20 octobre 2014 au titre identique figurent au même JO. Celui qui remplace le tableau de GE 4 est le NOR INTE1420988A (JORFTEXT000029641453, JORF n°0250 du 28 octobre 2014, texte n°23, page 17818) ; l'autre, NOR INTE1421827A (JORFTEXT000029641444), modifie REF 7, les refuges de montagne, et ne touche pas GE 4. Citer « l'arrêté du 20 octobre 2014 » sans son NOR désigne les deux à la fois. Relevé complet, sources et limites : `docs/revues/releve-ge4-tableau.md`.",

    },

    // -------------------------------------------------------------------------
    // Lot « les sept articles du Livre II », 2026-09-04.
    //
    // POURQUOI CES SEPT-LÀ, ET PAS D'AUTRES.
    // `docs/revues/denominateur-livre-2-erp.md` (2026-09-03) a mesuré le Livre II
    // sur la donnée officielle de la DILA : 794 articles, dont **dix-neuf
    // seulement portent un rythme** pour un ERP de type N ou M, tous au
    // Titre Ier. Le corpus en citait douze. Ces sept sont le complément exact,
    // et ce lot les ouvre un à un à la source.
    //
    // COMMENT ILS ONT ÉTÉ LUS, parce que le § 2.D du journal dit que trois
    // pièges se sont produits sur ce texte précis. Aucune page de sommaire n'a
    // servi de source : les pages de plan du Livre II et du Titre Ier se sont
    // arrêtées, l'une au chapitre II, l'autre à mi-chapitre Ier — piège n° 1,
    // constaté une fois de plus. La structure a été reconstituée de proche en
    // proche par les liens « section précédente / section suivante » des pages
    // de section, chacune annonçant son propre intitulé et son intervalle
    // d'articles. Un identifiant de chapitre rendu par une page de plan
    // (`LEGISCTA000020303864`, donné pour « Chapitre II : Construction ») a été
    // ÉCARTÉ après un 404 : c'était une fabrication de la lecture automatique,
    // le vrai est `LEGISCTA000020303891`. Chaque article a ensuite été ouvert
    // SUR SA PROPRE PAGE, qui annonce son numéro, son texte porteur, sa version
    // et son texte modificateur — les trois contrôles du § 2.D.
    //
    // LES DEUX ARTICLES LONGS ONT ÉTÉ RELUS PAR QUESTION FERMÉE (parade n° 8),
    // le paragraphe décisif redemandé seul : `CO 61 § 6` et `MS 71 § 3`. Les
    // deux relectures rendent le même chiffre que la première.
    // -------------------------------------------------------------------------
    {
      ref: "CO 61",
      intitule: "Tribunes fixes par destination ou télescopiques",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049576769",
      versionEnVigueur: "2024-05-24",
      modifiePar: {
        texte: "Arrêté du 17 mai 2024 - art. 1",
      },
      luLe: "2026-09-04",
      lecture: "agent_verbatim",
      prescrit:
        "Sept paragraphes de conception et d'exploitation des tribunes. UN SEUL porte un rythme, le § 6, et il ne vise que la tribune TÉLESCOPIQUE (escamotable, à tiroirs) dont le dernier plancher déployé est à plus d'un mètre du sol : contrôle de la conception et vérification du montage renvoyés à l'arrêté du 25 juillet 2022, puis inspection périodique de l'état de conservation TOUS LES CINQ ANS par un organisme accrédité, avec rapport conforme à son annexe VI. La motorisation du déploiement est expressément hors de ces contrôles. Les § 1 à § 5 et le § 7 sont des règles de construction et de propreté, sans acte daté.",
      citationCle:
        "La tribune télescopique (escamotable, déploiement à tiroirs et autres dispositifs) dont le dernier plancher déployé est à plus d'un mètre du sol est soumise au contrôle de la conception et à la vérification du montage prévus respectivement aux articles 37 § 2 et 38 § 4 de l'arrêté du 25 juillet 2022 fixant les règles de sécurité et les dispositions techniques applicables aux structures provisoires et démontables. Une inspection périodique portant sur l'état de conservation de la tribune télescopique est réalisée tous les cinq ans par un organisme accrédité pour l'inspection en exploitation des structures provisoires et démontables. Cette inspection fait l'objet d'un rapport dont le contenu figure à l'annexe VI de l'arrêté précité. La motorisation servant au déploiement n'est pas concernée par ces contrôles et ces vérifications.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: false,
      motif:
        "UNE QUINQUENNALE ÉCRITE, ET AUCUN OBJET POUR LA PORTER. Le § 6 impose à l'exploitant une inspection périodique tous les cinq ans par un organisme accrédité — un rythme chiffré, un réalisateur nommé, un rapport dont le contenu est fixé. Le référentiel ne sait pas la faire naître : aucune catégorie d'équipement ne dit « tribune », et le mot n'apparaît nulle part dans `src/`.\n\nCE QUI SERAIT FAUX ET QU'ON NE FAIT PAS. L'accrocher à `AUTRE` ferait naître une quinquennale d'organisme accrédité chez tout dirigeant ayant déclaré un équipement inclassable — un faux positif de masse sur une ligne coûteuse. La faire porter par l'établissement la donnerait à tous les ERP du 1er groupe, alors que le § 6 ne vise QUE la tribune télescopique de plus d'un mètre : ni une salle de restaurant, ni un magasin, ni un bureau n'en détiennent.\n\nCE QUE LE MANQUE COÛTE, ET IL EST BORNÉ. Une tribune télescopique se rencontre en type X (établissements sportifs), en type L (salles de spectacle) et dans les salles polyvalentes — aucun des trois secteurs cibles. Le relevé du 2026-09-03 le classait « sans objet dans les trois secteurs cibles » ; il n'est pas classé `sans_objet` ici, parce que ce statut dit « aucune échéance n'en sort » et que c'est faux : une échéance en sort, pour un exploitant que le produit ne sert pas encore.",
      bloquePar:
        "Aucune catégorie d'équipement « tribune » ni « structure provisoire et démontable », et aucun attribut ne dit qu'un établissement en détient une. Le § 6 pose en outre deux conditions cumulatives que rien ne peut renseigner : que la tribune soit télescopique, et que son dernier plancher déployé soit à plus d'un mètre du sol.",
    },
    {
      ref: "CH 39",
      intitule: "Entretien des filtres",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020304645",
      versionEnVigueur: "1980-08-15",
      modifiePar: {
        texte: "Arrêté du 14 février 2000 - art. Annexe, v. init.",
      },
      luLe: "2026-09-04",
      lecture: "agent_verbatim",
      prescrit:
        "Quatre paragraphes sur le chargement en poussières des filtres d'une installation de ventilation de confort. § 1 : l'UTILISATEUR tient un livret d'entretien de l'installation de filtration, où sont portées les valeurs d'efficacité minimale. § 2 : l'installateur y consigne la perte de charge maximale au-delà de laquelle les filtres doivent être nettoyés ou changés. § 3 : une VISITE PÉRIODIQUE est effectuée par l'utilisateur ou son représentant, à une périodicité qui ne peut excéder UN AN, RAMENÉE À TROIS MOIS en l'absence d'un système de mesure et d'alarme fonctionnant en permanence, et raccourcie encore si les caractéristiques locales ou fonctionnelles le justifient. § 4 : les visites, mesures, nettoyages et changements sont notés sur le livret. Chemin : Livre II > Titre Ier > Chapitre V > Section 7 « Traitement d'air et ventilation » > Sous-section 1 « Ventilation de confort » (CH 29 à CH 40).",
      citationCle:
        "§ 3. Une visite périodique doit être effectuée par l'utilisateur ou son représentant. Cette périodicité ne doit pas être supérieure à un an. En l'absence d'un système de mesure et d'alarme fonctionnant en permanence, cette périodicité est ramenée à trois mois. De plus, les caractéristiques locales ou fonctionnelles de certaines installations peuvent justifier une périodicité plus courte, qui sera portée sur le livret d'entretien.",
      statut: "retenu",
      obligations: ["aeration-erp-filtres-visite-periodique"],
      reserve:
        "TROIS CHOSES RESTENT DEHORS, ET LA PREMIÈRE EST UN ÉCRIT.\n\n(1) LE LIVRET D'ENTRETIEN DE L'INSTALLATION DE FILTRATION (§ 1, § 2 et § 4) N'EST PORTÉ PAR AUCUNE OBLIGATION. C'est une pièce que l'utilisateur TIENT — valeurs d'efficacité minimale, perte de charge maximale fixée par l'installateur, puis chaque visite, mesure, nettoyage ou changement de filtre. Un état permanent avec `pieceAttendue`, de la même espèce que le carnet d'entretien d'ascenseur que le référentiel porte déjà. Rien ne le bloque au modèle ; ce lot ne l'encode pas parce qu'il n'a pas tranché s'il fait un écrit à part ou s'il rejoint le livret d'entretien de GC 18 h) et le dossier de R. 4224-17, trois écrits voisins que personne n'a rapprochés.\n\n(2) L'ALLÈGEMENT ANNUEL N'EST PAS DONNÉ, ET C'EST DÉLIBÉRÉ. Le § 3 écrit un plafond d'un an et le ramène à trois mois « en l'absence d'un système de mesure et d'alarme fonctionnant en permanence ». Le produit ne détient aucun attribut disant qu'une installation en est pourvue, et la règle du dépôt vaut ici en plein : un allègement ne se donne pas sur une absence supposée. `aeration-erp-filtres-visite-periodique` porte donc TRIMESTRIELLE, qui est le régime ordinaire — une ventilation de confort de restaurant ou de commerce n'a presque jamais de mesure permanente. La sur-application possible est de trois visites par an, faites par l'exploitant lui-même, donc visible et sans coût de tiers ; l'erreur inverse aurait multiplié le délai par quatre sans que personne puisse s'en apercevoir.\n\n(3) LA TROISIÈME PHRASE DU § 3 N'EST PAS ENCODABLE, et il faut le dire : « les caractéristiques locales ou fonctionnelles de certaines installations peuvent justifier une périodicité plus courte, qui sera portée sur le livret d'entretien ». C'est un rythme que l'exploitant fixe lui-même, sur le livret. Le produit ne l'invente pas ; la prescription particulière (ADR-035) est la voie par laquelle il pourrait un jour l'accueillir.",
    },
    {
      ref: "AS 9",
      intitule: "Vérifications techniques des ascenseurs",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020382882",
      versionEnVigueur: "2008-10-08",
      modifiePar: {
        texte: "Arrêté du 26 juin 2008 - art. 1, v. init.",
      },
      luLe: "2026-09-04",
      lecture: "agent_verbatim",
      prescrit:
        "Deux titres dans une seule phrase : les ascenseurs sont vérifiés par un ORGANISME AGRÉÉ, dans les conditions de la section II du chapitre Ier (donc GE 6 et suivants), TOUS LES CINQ ANS et avant leur remise en service faisant suite à une transformation importante. La vérification porte sur le respect des dispositions de la section applicables aux ascenseurs. Chemin : Livre II > Titre Ier > Chapitre IX « Ascenseurs, escaliers mécaniques et trottoirs roulants » (AS 1 à AS 11).",
      citationCle:
        "Les ascenseurs doivent faire l'objet d'une vérification, fonctionnement compris, par un organisme agréé, dans les conditions prévues à la section II du chapitre Ier du présent titre tous les cinq ans et avant leur remise en service faisant suite à une transformation importante. Ces vérifications portent sur le respect des dispositions de la présente section applicables aux ascenseurs.",
      statut: "retenu",
      obligations: ["ascenseur-controle-technique-quinquennal"],
      reserve:
        "OUVERT AVANT D'ENCODER QUOI QUE CE SOIT, ET C'EST LE RÉSULTAT : IL N'Y AVAIT RIEN À ENCODER. Le contrôle quinquennal qu'il impose est le MÊME ACTE que celui de `ascenseur-controle-technique-quinquennal`, fondé sur `CCH R. 134-11` : même objet, même rythme de cinq ans, même appareil. Créer une seconde ligne aurait donné deux rendez-vous quinquennaux pour un seul contrôle — le doublon exact que le test anti-doublon cherche, et qu'il n'aurait PAS vu, les articles fondateurs étant différents. AS 9 est donc ajouté en CONTEXTE sur l'obligation existante, jamais en fondement d'une nouvelle.\n\nUN SECOND ARTICLE LE CITE, ET IL EST DÉJÀ AU CORPUS. `PO 1 § 3` (Livre III, hôtels de 5ᵉ catégorie) écrit : « Le contrôle des ascenseurs relève des dispositions particulières précisées dans le cadre de l'article AS 9 du règlement. » Le renvoi vient d'un autre livre, et il confirme qu'AS 9 est bien l'article du contrôle des ascenseurs — un recoupement qui ne partage pas l'angle mort de la lecture d'AS 9 elle-même.\n\nDEUX ÉCARTS RESTENT, ET AUCUN N'EST COMBLÉ ICI.\n\n(1) LE RÉALISATEUR. AS 9 exige un ORGANISME AGRÉÉ au sens de GE 6 ; `ascenseur-controle-technique-quinquennal` accepte `bureau_controle` ou `personne_qualifiee`, ce que `CCH R. 134-12` autorise (contrôleur technique agréé, organisme habilité, personne certifiée). Dans un ERP des quatre premières catégories, le règlement de sécurité est donc plus étroit que le CCH. Resserrer la ligne ferait perdre l'obligation aux ERP de 5ᵉ catégorie, aux immeubles d'habitation et aux locaux de travail, qui suivent le CCH seul : il faudrait deux lignes, donc un doublon d'acte. Non fait ; l'écart est nommé.\n\n(2) LA VÉRIFICATION AVANT REMISE EN SERVICE APRÈS TRANSFORMATION IMPORTANTE n'est portée par rien. C'est une obligation ÉVÉNEMENTIELLE au sens de l'ADR-026 — le fait déclencheur est la transformation, que le produit n'observe pas —, et cette nature n'a aujourd'hui AUCUNE surface (`src/lib/surfaces/obligations-sans-surface.ts`). L'encoder ajouterait une dixième ligne au registre daté qui existe pour les compter ; c'est une décision de conception, pas une correction.",
    },
    {
      ref: "AS 10",
      intitule:
        "Vérifications techniques des escaliers mécaniques et des trottoirs roulants",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020382709",
      versionEnVigueur: "2007-09-28",
      modifiePar: {
        texte: "Arrêté du 4 juillet 2007 - art. Annexe, v. init.",
      },
      luLe: "2026-09-04",
      lecture: "agent_verbatim",
      prescrit:
        "Trois actes, tous à la charge de l'exploitant. Avant remise en service après une transformation importante : vérification, fonctionnement compris, par une personne ou un organisme agréé. ANNUELLEMENT, par une personne ou un organisme agréé : examen du maintien de la conformité acquise, examen de l'état de conservation des éléments, vérification du fonctionnement des dispositifs de sécurité. AU MILIEU DE LA PÉRIODE ANNUELLE : examen supplémentaire des chaînes et crémaillères, par le service ou l'entreprise chargé de l'entretien — donc un second rendez-vous, à six mois du premier, avec un réalisateur différent.",
      citationCle:
        "En outre, l'exploitant est tenu de faire procéder : a) Annuellement, par une personne ou un organisme agréé : – à un examen du maintien de la conformité acquise lors de la mise en service ou après une transformation importante ; – à un examen de l'état de conservation des éléments de l'installation ; – à la vérification du fonctionnement des dispositifs de sécurité. b) Au milieu de la période annuelle ci-dessus, à un examen supplémentaire des chaînes et crémaillères, par le service ou l'entreprise chargé de l'entretien.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: false,
      motif:
        "DEUX RYTHMES ÉCRITS, ET AUCUN OBJET POUR LES PORTER. L'annuelle du a) et l'examen à mi-période du b) sont l'un et l'autre chiffrés, avec chacun son réalisateur — organisme ou personne agréé pour le premier, service ou entreprise d'entretien pour le second. Ce serait deux obligations, sur le patron de `incendie-erp-extincteurs-annuelle` et de sa révision décennale : deux actes, deux dates, deux preuves.\n\nCE QUI MANQUE EST UNE CATÉGORIE D'ÉQUIPEMENT, et le constat du 2026-09-03 se confirme en cherchant à nouveau : ni « escalier mécanique » ni « trottoir roulant » n'apparaissent dans `src/`. Le chapitre IX en réunit trois — ascenseurs, escaliers mécaniques, trottoirs roulants — et le référentiel n'en connaît qu'un.\n\nCE QU'IL NE FAUT SURTOUT PAS FAIRE, et c'est pour cela que ce motif est écrit plutôt qu'une ligne encodée : accrocher AS 10 à `ASCENSEUR`. Le chapitre traite les deux familles séparément — AS 9 pour les ascenseurs, AS 10 pour les escaliers mécaniques et trottoirs roulants — et leurs régimes ne coïncident sur rien : cinq ans contre un an, organisme agréé seul contre deux réalisateurs, aucun examen intermédiaire contre un examen à six mois. Un propriétaire d'ascenseur recevrait trois rendez-vous qu'il ne doit pas, et un exploitant d'escalier mécanique n'en recevrait toujours aucun.\n\nCE QUE LE MANQUE COÛTE. Un escalier mécanique se rencontre en centre commercial et en grand magasin — le type M, l'un des trois secteurs cibles. C'est celui des quatre manques de ce lot qui touche le plus près de la cible.",
      bloquePar:
        "Aucune catégorie d'équipement `ESCALIER_MECANIQUE` ni `TROTTOIR_ROULANT` dans `CATEGORIES_EQUIPEMENT` — donc rien à déclarer au parc, et rien à quoi accrocher les deux lignes. La créer est faisable et sans invention (le nom serait celui du texte), mais elle touche l'énumération Prisma, le formulaire d'équipement et le seed : c'est un lot, pas un effet de bord de celui-ci.",
    },
    {
      ref: "GC 18",
      intitule:
        "Conditions d'installation des modules ou conteneurs spécialisés de cuisson",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052225085",
      versionEnVigueur: "2026-01-01",
      modifiePar: {
        texte: "Arrêté du 1er septembre 2025 - art. 26",
      },
      luLe: "2026-09-04",
      lecture: "agent_verbatim",
      prescrit:
        "Régit le module ou conteneur spécialisé de cuisson installé TEMPORAIREMENT, dans un local accessible ou non au public ou à moins de 8 mètres d'un bâtiment, après avis de la commission de sécurité. Huit conditions a) à h) : énergies admises, arrêt d'urgence unique par énergie, degrés coupe-feu des parois, dispositifs d'obturation des ouvertures latérales, extraction mécanique avec clapet coupe-feu, extinction automatique et extincteur, régime dérogatoire des bouteilles de gaz de 35 kg. Le h) porte les seuls actes datés : l'entretien renvoyé à GC 21, le livret d'entretien tenu à la disposition de la commission de sécurité, et le NETTOYAGE DU CONDUIT D'EXTRACTION des buées et graisses avant chaque mise en place et AU MOINS TOUS LES SIX MOIS.",
      citationCle:
        "h) L'entretien doit être réalisé conformément aux dispositions de l'article GC 21. Le livret d'entretien doit être tenu à la disposition de la commission de sécurité. Le conduit d'extraction des buées et graisses doit être nettoyé avant chaque mise en place et au moins tous les six mois.",
      statut: "obligation_manquante",
      cause: "categorie_equipement",
      toucheLaCible: false,
      motif:
        "UN SEMESTRIEL ÉCRIT, SUR UN OBJET QUE LE PARC NE CONNAÎT PAS. Le dernier alinéa du h) impose un nettoyage du conduit d'extraction au moins tous les six mois, et un nettoyage supplémentaire avant chaque mise en place. Le premier est un rythme, le second un événement.\n\nCE QU'IL NE FAUT PAS FAIRE, ET C'EST LE POINT. L'accrocher à `HOTTE_PRO` donnerait un semestriel à toutes les cuisines professionnelles, alors que GC 21 ne leur impose qu'un ramonage ANNUEL des conduits — le référentiel le porte sous `cuisson-erp-circuits-extraction-nettoyage`. Ce serait doubler la fréquence pour l'immense majorité des exploitants sur la foi d'un article qui ne les vise pas : GC 18 ne parle que du module ou conteneur SPÉCIALISÉ, installé TEMPORAIREMENT. `GC 1` distingue déjà le module du reste du chapitre ; le référentiel, lui, n'a qu'une catégorie de hotte.\n\nCE QUE LE MANQUE COÛTE. Le module ou conteneur de cuisson est la cuisine mobile — camion-restaurant, cuisine relais de chantier ou d'événement, conteneur de remise en température. Il touche la restauration, secteur cible, mais par un mode d'exploitation que le produit ne sait pas décrire : rien, dans le modèle, ne dit qu'une cuisine est temporaire.",
      bloquePar:
        "Aucune catégorie d'équipement pour le « module ou conteneur spécialisé » de cuisson, et aucun attribut d'équipement disant qu'une installation de cuisson est TEMPORAIRE. Les deux conditions du champ de GC 18 sont indissociables : le régime dérogatoire qu'il ouvre (bouteilles de 35 kg, ouvertures latérales) n'a de sens que pour un module temporaire.",
    },
    {
      ref: "MS 69",
      intitule: "Exploitation de l'équipement d'alarme",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020317748",
      versionEnVigueur: "1980-08-15",
      modifiePar: {
        texte: "Arrêté du 2 février 1993 - art. Annexe, v. init.",
      },
      luLe: "2026-09-04",
      lecture: "agent_verbatim",
      prescrit:
        "Quatre obligations d'exploitation de l'alarme : initier le personnel au fonctionnement du système d'alarme ; s'assurer, UNE FOIS PAR SEMAINE AU MOINS, du bon fonctionnement de l'installation et de l'aptitude des alimentations électriques et/ou pneumatiques de sécurité ; faire effectuer les remises en état le plus rapidement possible ; disposer en permanence d'un stock de petites fournitures de rechange (lampes, fusibles, vitres de déclencheurs manuels à bris de glace, cartouches de gaz inerte comprimé). Chemin : Livre II > Titre Ier > Chapitre XI > Section 5 « Système de sécurité incendie (SSI) » (MS 53 à MS 69) — donc écarté en 5ᵉ catégorie par PE 1 § 1.",
      citationCle:
        "L'exploitant ou son représentant doit s'assurer, une fois par semaine au moins, du bon fonctionnement de l'installation et de l'aptitude des alimentations électriques et/ou pneumatiques de sécurité à satisfaire aux exigences du présent règlement.",
      statut: "retenu",
      obligations: ["incendie-erp-alarme-verification-hebdomadaire"],
      reserve:
        "TROIS DES QUATRE OBLIGATIONS DE L'ARTICLE NE SONT PORTÉES PAR RIEN, et elles ne se ressemblent pas.\n\n(1) L'INITIATION DU PERSONNEL AU FONCTIONNEMENT DU SYSTÈME D'ALARME. Première phrase de l'article, sans rythme et sans réalisateur nommé. Elle est voisine de la formation à la sécurité de `L. 4141-1` et de l'exercice semestriel de `R. 4227-39`, que le référentiel porte l'une et l'autre côté Code du travail — mais elle vise l'ALARME nommément, et un ERP peut n'avoir aucun salarié. Non encodée : la rabattre sur l'une des deux serait le rabattage que ce dépôt refuse.\n\n(2) LA REMISE EN ÉTAT « LE PLUS RAPIDEMENT POSSIBLE » n'est ni un rythme ni un état : c'est une obligation de diligence dont le fait déclencheur est la panne. Le produit ne l'observe pas.\n\n(3) LE STOCK PERMANENT DE PETITES FOURNITURES DE RECHANGE — lampes, fusibles, vitres de bris de glace, cartouches de gaz inerte — est un ÉTAT PERMANENT MATÉRIEL, de la même espèce que le matériel de premiers secours de `R. 4224-14` que le référentiel porte. Rien ne le bloque au modèle ; ce lot ne l'encode pas parce que le mandat bornait ce qui devait l'être aux articles qui PORTENT UN RYTHME, et qu'une seconde ligne sur le même article se décide pour elle-même.\n\nUNE TENSION DE DATE, SIGNALÉE PLUTÔT QUE LISSÉE. La page de l'article annonce « Version en vigueur depuis le 15/08/1980 » et, dans le même bandeau, « Modifié par Arrêté du 2 février 1993 - art. Annexe, v. init. ». Les deux ne peuvent pas être vraies ensemble. `versionEnVigueur` porte la date que la page affiche comme telle — c'est elle que la veille compare —, et `modifiePar` porte le texte que la même page nomme. Le § 2.D du journal tient ce piège au n° 7, mais pour une page CONSOLIDÉE ; ici la lecture vient de la page d'ARTICLE, et les deux informations y coexistent telles quelles. Le désaccord est donc dans la source, pas dans la lecture.",
    },
    {
      ref: "MS 71",
      intitule: "Communications radioélectriques",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049865160",
      versionEnVigueur: "2024-07-04",
      modifiePar: {
        texte: "Arrêté du 28 juin 2024 - art. 3",
      },
      luLe: "2026-09-04",
      lecture: "agent_verbatim",
      prescrit:
        "Huit paragraphes sur la continuité des communications radioélectriques des services de secours en infrastructure. Le § 1 borne le champ : ERP DU 1ER GROUPE et parcs de stationnement couverts DISPOSANT DE PLUS D'UN NIVEAU DE SOUS-SOL, et il écarte l'établissement dont la surface totale des niveaux en sous-sol est inférieure à 100 m². Le § 2 met à la charge de l'exploitant l'étude, la réalisation et l'entretien d'une installation fixe quand la continuité n'est pas acquise. Le § 3 porte le rythme : vérification par un ORGANISME AGRÉÉ par le ministère chargé de la sécurité civile, une fois avant l'ouverture au public, puis TOUS LES TROIS ANS et lors de la visite de réception consécutive à des travaux. Les § 5 et § 6 imposent une attestation de vérifications réglementaires conclusive, consignée au registre de sécurité. Le § 7 ouvre une dérogation totale ou partielle après avis conforme de la commission de sécurité.",
      citationCle:
        "§ 3. La vérification de la continuité des moyens de communications radioélectriques est réalisée par un organisme agréé par le ministère chargé de la sécurité civile : - une fois avant l'ouverture au public de l'établissement concerné ; puis - une fois tous les trois ans et lors de la visite de réception consécutive à des travaux relatifs à l'installation précitée.",
      statut: "obligation_manquante",
      cause: "attribut_etablissement",
      toucheLaCible: false,
      motif:
        "UNE TRIENNALE ÉCRITE, UN CHAMP QUE LE PRODUIT NE SAIT PAS INTERROGER. Le § 3 est aussi net que possible : organisme agréé, une fois avant ouverture, puis tous les trois ans. Ce qui manque n'est pas la lecture, c'est la question qui dit à qui elle s'adresse.\n\nDEUX CONDITIONS CUMULATIVES, AUCUNE RENSEIGNABLE. Le § 1 exige (a) plus d'un niveau de sous-sol et (b) une surface totale des niveaux en sous-sol d'au moins 100 m². `Etablissement` ne porte ni l'un ni l'autre, et aucun attribut voisin ne s'en approche.\n\nCE QU'UNE SUR-APPLICATION COÛTERAIT, ET POURQUOI ELLE EST REFUSÉE ICI. La règle du dépôt veut qu'entre sur- et sous-appliquer, on choisisse l'erreur que subit quelqu'un qui peut s'en apercevoir. Elle ne tranche pas en faveur de la sur-application quand le rendez-vous appelle un ORGANISME AGRÉÉ par le ministère de l'intérieur, tous les trois ans, pour une installation que l'immense majorité des ERP du 1er groupe n'a pas : le restaurant de plain-pied, le magasin de rue et le bureau sans sous-sol n'y sont pas, et la ligne leur coûterait une recherche de prestataire et un devis avant qu'ils comprennent qu'elle ne les vise pas. Le § 1 exclut ici plus qu'il n'inclut, ce qui n'est le cas d'aucune des sur-applications déjà assumées par le référentiel.\n\nCE QUE LE MANQUE COÛTE. Il est réel pour un commerce à réserve enterrée sur deux niveaux ou un restaurant à cave et sous-sol technique — mais il suppose PLUS D'UN niveau de sous-sol, ce qui reste rare dans les trois secteurs cibles.",
      bloquePar:
        "Deux attributs d'établissement absents du modèle : le NOMBRE DE NIVEAUX DE SOUS-SOL (le § 1 exige « plus d'un ») et la SURFACE TOTALE DES NIVEAUX EN SOUS-SOL (seuil de 100 m²). Les poser est une décision d'onboarding — deux questions de plus au dirigeant — et non un encodage ; c'est exactement la forme `Transmission.attribut_absent` de l'ADR-024, qui ne peut cependant pas être déclarée tant qu'aucune obligation ne porte l'article.",
    },
  ],
};
