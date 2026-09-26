// Corpus : sources institutionnelles INRS.
//
// Ces documents ne sont pas des textes opposables : ce sont des guides
// techniques, cités en appui d'une obligation dont le fondement est ailleurs.
// Ils entrent au registre des corpus pour une seule raison — qu'aucune
// référence du référentiel ne reste hors du décompte. Une source qu'on ne
// compte pas est une source qu'on ne relit pas.
//
// `sans_objet` et non `retenu` : ils n'établissent aucune obligation.

import type { Corpus } from "./types";

export const INRS_DOCUMENTAIRE: Corpus = {
  id: "inrs-documentaire",
  intitule: "INRS — guides et fiches techniques",
  url: "https://www.inrs.fr/",
  etendue: "articles_cites",
  portee:
    "Sources institutionnelles citées en appui. Aucune n'est opposable : le fondement des obligations qui les citent est toujours un texte de droit.",
  articles: [
    {
      ref: "INRS ED 6127",
      intitule: "Habilitation électrique",
      url: "https://www.inrs.fr/media.html?refINRS=ED%206127",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "sans_objet",
      motif:
        "Guide technique de l'INRS, cité en appui de l'obligation d'habilitation électrique. Il n'institue rien : le fondement est R. 4544-9 et suivants du Code du travail. Aucune échéance n'en découle.",
    },
    {
      ref: "INRS ED 6030",
      intitule: "Le permis de feu — Démarche et document support",
      url: "https://www.inrs.fr/media.html?refINRS=ED%206030",
      versionEnVigueur: "2019-08-01",
      luLe: "2026-09-03",
      lecture: "agent_verbatim",
      prescrit:
        "Rien. Brochure de douze pages, révisée en août 2019, éditée par une association loi 1901 : elle décrit une démarche et fournit un modèle de permis de feu à remplir. Aucune autorité ne la rend opposable.",
      // Deux passages, et ce sont EUX le résultat du lot. Le premier est la
      // définition de la p. 3, section « Les travaux concernés » ; le second
      // est la rubrique du formulaire modèle (p. 1/2 du document support), où
      // les deux lignes vides sont imprimées dans le document.
      citationCle:
        "Les travaux par points chauds regroupent : les opérations d'enlèvement de matières ou de désassemblage d'équipements (découpage, meulage, ébarbage…), les opérations d'assemblage (soudures) ou d'étanchéité (bitume). De manière générale, cette désignation comprend tous les travaux générateurs d'étincelles ou de surfaces chaudes. [Document support, rubrique « Type de travaux par points chauds » :] soudage / tronçonnage / découpage / meulage / […deux lignes laissées vides…]. [Rubrique voisine « Matériels utilisés » :] poste à souder / chalumeau / laser / tronçonneuse / […deux lignes laissées vides…].",
      statut: "sans_objet",
      motif:
        "Brochure de recommandations de l'INRS, citée en appui du module `PermisFeu` et de son référentiel de mesures. Elle n'institue rien — le fondement le plus proche est l'arrêté du 19 mars 1993, art. 1er, 21° (voir `code-travail-plan-prevention.ts`), qui vise le seul soudage oxyacétylénique et pour le seul objet du plan de prévention ÉCRIT. Aucune échéance n'en découle.\n\nCE QUE LE VERBATIM ÉTABLIT, ET C'EST LE RÉSULTAT DU LOT DU 2026-09-03. `NatureTravauxPointChaud` (onze valeurs) est réputée transcrire cette brochure. Elle ne le peut pas : ED 6030 NE PORTE AUCUNE NOMENCLATURE FERMÉE. Sa définition est ouverte par construction — deux catégories suivies de points de suspension, puis un fourre-tout explicite (« tous les travaux générateurs d'étincelles ou de surfaces chaudes ») —, et sa seule liste cochable en compte QUATRE, avec deux lignes vides imprimées pour en ajouter. Une liste que son auteur laisse ouverte n'est pas une nomenclature, et un test qui prétendrait y tenir les onze valeurs feindrait de vérifier quelque chose.\n\nDEUX RUBRIQUES CONFONDUES, relevé au passage. `chalumeau` est une valeur de `NatureTravauxPointChaud` ; dans ED 6030, « chalumeau » est un MATÉRIEL, pas un type de travaux. Le modèle a fusionné les deux colonnes du formulaire. Ce n'est pas faux au sens où le dirigeant s'y retrouve, mais cela interdit de présenter la liste comme le reflet d'un document.",
    },
    {
      ref: "INRS ED 840 fiche 4",
      intitule: "Risques routiers en mission",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-840.pdf",
      versionEnVigueur: "2025-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre :] Risques routiers en mission [p. 11 :] Les salariés sont exposés à un risque important d'accident sur la route. […] – un mode de rémunération : paiement à la course, politique du « fini-quitte »… […] – organisez le travail de façon à éviter ou limiter les déplacements en recourant à des moyens alternatifs : visioconférences, audioconférences, – privilégiez des moyens de déplacements plus sûrs (train) et empruntez des itinéraires plus sûrs (autoroutes),",
      statut: "sans_objet",
      motif:
        "Fiche de la brochure ED 840 (8e édition, 2023, révisée en mai 2025 — ligne d'édition p. 36 ; « mai 2025 » est porté au 1er du mois faute de jour), PDF téléchargé et extrait par pdftotext le 2026-09-26. N'institue rien. Citée par le risque transverse `trv-routier` ; la mesure `trv-routier-alternatif` en tirait « privilégier le train sur l'autoroute », que la fiche ne dit pas. Le titre et les passages sont recopiés tels quels, apostrophes typographiques rendues droites ; « [Titre :] » et « [p. N :] » sont des repères de ce relevé, pas du texte.",
    },
    {
      ref: "INRS ED 840 fiche 5",
      intitule: "Risques liés à la charge physique de travail",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-840.pdf",
      versionEnVigueur: "2025-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre :] Risques liés à la charge physique de travail [p. 12 :] – manutention manuelle de charges : masse unitaire supérieure à 15 kg, manipulation à fréquence élevée,",
      statut: "sans_objet",
      motif:
        "Fiche de la brochure ED 840 (8e édition, 2023, révisée en mai 2025 — ligne d'édition p. 36 ; « mai 2025 » est porté au 1er du mois faute de jour), PDF téléchargé et extrait par pdftotext le 2026-09-26. N'institue rien. Citée par `trv-charges` et les risques de charge physique des trois secteurs. Le repère de 10 kg que `trv-charges` et `q-charges` présentaient n'y figure pas : la fiche écrit 15 kg. Le titre et les passages sont recopiés tels quels, apostrophes typographiques rendues droites ; « [Titre :] » et « [p. N :] » sont des repères de ce relevé, pas du texte.",
    },
    {
      ref: "INRS ED 840 fiche 8",
      intitule: "Risques liés aux agents biologiques",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-840.pdf",
      versionEnVigueur: "2025-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre :] Risques liés aux agents biologiques [p. 15 :] Ce sont des risques d'infection, d'allergie ou d'intoxication liés à la présence de micro-organismes sur les lieux de travail.",
      statut: "sans_objet",
      motif:
        "Fiche de la brochure ED 840 (8e édition, 2023, révisée en mai 2025 — ligne d'édition p. 36 ; « mai 2025 » est porté au 1er du mois faute de jour), PDF téléchargé et extrait par pdftotext le 2026-09-26. N'institue rien. Citée par le risque transverse `trv-biologique`. Le titre et les passages sont recopiés tels quels, apostrophes typographiques rendues droites ; « [Titre :] » et « [p. N :] » sont des repères de ce relevé, pas du texte.",
    },
    {
      ref: "INRS ED 840 fiche 9",
      intitule: "Risques liés aux équipements de travail",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-840.pdf",
      versionEnVigueur: "2025-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre :] Risques liés aux équipements de travail [p. 16 :] – utilisation d'outils tranchants : couteaux, hachoirs, cutters, scies…,",
      statut: "sans_objet",
      motif:
        "Fiche de la brochure ED 840 (8e édition, 2023, révisée en mai 2025 — ligne d'édition p. 36 ; « mai 2025 » est porté au 1er du mois faute de jour), PDF téléchargé et extrait par pdftotext le 2026-09-26. N'institue rien. Citée par `com-coupure-cutter`, qui la doublait de la fiche 19 (« Risques de heurt, de cognement ») : la fiche 19 ne traite pas des coupures, la fiche 9 nomme le cutter. Le titre et les passages sont recopiés tels quels, apostrophes typographiques rendues droites ; « [Titre :] » et « [p. N :] » sont des repères de ce relevé, pas du texte.",
    },
    {
      ref: "INRS ED 840 fiche 14",
      intitule: "Risques liés à l'électricité",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-840.pdf",
      versionEnVigueur: "2025-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre :] Risques liés à l'électricité",
      statut: "sans_objet",
      motif:
        "Fiche de la brochure ED 840 (8e édition, 2023, révisée en mai 2025 — ligne d'édition p. 36 ; « mai 2025 » est porté au 1er du mois faute de jour), PDF téléchargé et extrait par pdftotext le 2026-09-26. N'institue rien. Citée par les risques électriques de la restauration et du bureau ; seul le titre est relevé. Le titre et les passages sont recopiés tels quels, apostrophes typographiques rendues droites ; « [Titre :] » et « [p. N :] » sont des repères de ce relevé, pas du texte.",
    },
    {
      ref: "INRS ED 840 fiche 17",
      intitule: "Risques psychosociaux",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-840.pdf",
      versionEnVigueur: "2025-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre :] Risques psychosociaux [p. 24 :] Les risques psychosociaux concernent les situations de travail où sont présents du stress, des violences internes (dont le harcèlement moral et sexuel) ou externes (agressions, conflits, tensions avec le public ou la clientèle).",
      statut: "sans_objet",
      motif:
        "Fiche de la brochure ED 840 (8e édition, 2023, révisée en mai 2025 — ligne d'édition p. 36 ; « mai 2025 » est porté au 1er du mois faute de jour), PDF téléchargé et extrait par pdftotext le 2026-09-26. N'institue rien. Citée par les risques psychosociaux des trois secteurs et du transverse. Le titre et les passages sont recopiés tels quels, apostrophes typographiques rendues droites ; « [Titre :] » et « [p. N :] » sont des repères de ce relevé, pas du texte.",
    },
    {
      ref: "INRS ED 880 p. 4",
      intitule: "La restauration traditionnelle — « Quels accidents ? »",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-880.pdf",
      versionEnVigueur: "2018-07-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "Trois types d'accidents représentent à eux seuls plus des deux tiers des accidents en restauration collective : [puce] les chutes et glissades de plain-pied (1/3 à eux seuls) ; [puce] les manipulations et manutentions manuelles ; [puce] les outils à main, des couteaux dans la grande majorité des cas. Les accidents aux mains représentent plus d'1/3 des accidents.",
      statut: "sans_objet",
      motif:
        "Brochure ED 880 « La restauration traditionnelle — Prévention des risques professionnels », 3e édition (2012), réimpression juillet 2018 (ligne d'édition de la brochure ; l'en-tête de `restauration.ts` disait « novembre 2012 »). PDF extrait par pdftotext le 2026-09-26, p. 4 imprimée. N'institue rien. LE CHIFFRE DES CHUTES EST DONNÉ POUR LA RESTAURATION COLLECTIVE : la description de `resto-chute-plain-pied` l'attribuait à « la restauration » tout court ; elle cite désormais la phrase entière. « [puce] » marque une puce du document.",
    },
    {
      ref: "INRS ED 880 fiche 3",
      intitule: "Production froide et chaude",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-880.pdf",
      versionEnVigueur: "2018-07-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Sommaire :] 3. Production froide et chaude [Fiche 3, p. 11, rubrique « Électrisation », pistes d'amélioration :] Entretenez et faites effectuer les contrôles périodiques réglementaires de vos installations électriques annuellement ou tous les deux ans dans certaines conditions. [Même page, rubrique « Incendie », pistes d'amélioration :] Faire vérifier les extincteurs annuellement par une personne qualifiée.",
      statut: "sans_objet",
      motif:
        "Fiche 3 de la brochure ED 880 (voir l'entrée « INRS ED 880 p. 4 » pour l'édition). N'institue rien. Citée par `resto-electrisation` et `resto-rps-coup-feu`. Elle-même écrit « annuellement ou tous les deux ans dans certaines conditions » : le « annuels obligatoires » de la description n'y était pas non plus. Rubrique « Incendie » ajoutée le même jour (seconde passe, pdftotext) : elle porte la recommandation annuelle que la mesure `resto-extincteurs` écrivait sans source ; c'est une recommandation de l'INRS, pas un texte. La « classe F pour huiles » de la même mesure n'est ni dans ED 880 ni dans ED 840 fiche 13 : retirée.",
    },
    {
      ref: "INRS ED 6305",
      intitule: "Le travail de nuit et le travail posté — Quels effets ? Quelle prévention ?",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-6305.pdf",
      versionEnVigueur: "2026-03-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre :] Le travail de nuit et le travail posté [Sous-titre :] Quels effets ? Quelle prévention ? [Rubrique « Quels effets sur la santé ? » :] Le travail de nuit peut altérer, de manière plus ou moins grave, la santé du salarié, allant de troubles du sommeil au risque de cancer ou de maladie cardiovasculaire. [Ligne d'édition :] 2e édition • (2022) révisée en mars 2026 [p. 4, rubrique « Agir sur l'organisation du travail » :] En cas de travail posté, adopter une vitesse de rotation rapide (tous les 2-3 jours) associée à une micro-sieste nocturne ou proposer un 2 x 8 associé à une équipe de nuit permanente.",
      statut: "sans_objet",
      motif:
        "Dépliant de six volets, date de publication 03/2026 au catalogue INRS. `commun.ts` le datait « (2022) » : c'est la 2e édition de 2022 révisée en mars 2026, et le texte lu est celui de mars 2026. N'institue rien. Citée par `trv-travail-nuit`, dont la description énumérait des effets « digestifs » que le dépliant révisé ne nomme pas ; elle cite désormais sa phrase de synthèse. La mesure `trv-nuit-rotation` (« dans le sens horaire », « limiter les nuits consécutives ») n'y trouve pas d'appui — le dépliant ne contient ni « sens horaire » ni « consécutives » : remplacée le 2026-09-26 par `trv-nuit-rotation-rapide`, qui cite la phrase de la p. 4.",
    },
    {
      ref: "INRS page « Travail de bureau. Les risques du métier »",
      intitule: "Travail de bureau. Les risques du métier",
      url: "https://www.inrs.fr/metiers/commerce-service/travail-bureau/travail-bureau-risques.html",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre de la page :] Travail de bureau. Les risques du métier [Rubrique « Les principaux risques professionnels » :] Les chutes et les manutentions manuelles (port de charges, efforts physiques…) constituent les principales causes d'accidents. Les troubles musculosquelettiques (ou TMS) et les lombalgies représentent quant à eux la très grande majorité des maladies professionnelles recensées. L'activité elle-même ou l'organisation du travail, mais également les situations de harcèlement ou de violences peuvent exposer les salariés à des risques psychosociaux (stress, burnout…). [Tableau, origines de « Stress, burnout, troubles psychologiques » :] Bruit ambiant excessif (voix, conversations voisines, climatisation, imprimantes…) [Rubrique « La posture assise prolongée » :] Le maintien prolongé d'une posture assise, associée à une faible dépense énergétique, peut être à l'origine d'un comportement dit sédentaire. Ce comportement sédentaire, lorsqu'il se prolonge, peut être à l'origine de troubles musculosquelettiques, mais aussi d'atteinte à la santé mentale, de diabète de type 2, d'obésité, de pathologies cardiovasculaires...",
      statut: "sans_objet",
      motif:
        "Page web de l'INRS, relevée le 2026-09-26 (HTML téléchargé). N'institue rien. Elle remplace l'adresse inrs.fr/risques/travail-bureau, qui répond 404. Les cinq citations de `bureau.ts` la reformulaient entre guillemets (« les TMS et lombalgies constituent l'essentiel », « la sédentarité… favorise pathologies cardiovasculaires et diabète », « les chutes constituent une des principales causes d'accident dans le tertiaire », « les salariés sont exposés aux risques psychosociaux (stress, harcèlement…) », « bruit en bureaux ouverts ») ; elles citent désormais ces phrases-ci.",
    },
    {
      ref: "INRS dossier web « Travail sur écran »",
      intitule: "Travail sur écran. Ce qu'il faut retenir",
      url: "https://www.inrs.fr/risques/travail-ecran/ce-qu-il-faut-retenir.html",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle: "[Titre de la page :] Travail sur écran. Ce qu'il faut retenir",
      statut: "sans_objet",
      motif:
        "Dossier web de l'INRS, cité par `trv-tms-ecran`. N'institue rien. Ni cette page, ni « Risques pour la santé », ni « Prévention des risques » ne portent de seuil de « 4 heures par jour » ni de « règle 20-20-20 » (recherche dans le HTML téléchargé le 2026-09-26). La page « Prévention des risques » porte la distance œil-écran « généralement de 50 cm à 70 cm » que reprend la mesure `trv-ecran-poste`.",
    },
    {
      ref: "INRS ED 840 fiche 13",
      intitule: "Risques d'incendie et d'explosion",
      url: "https://www.inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-840.pdf",
      versionEnVigueur: "2025-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre :] Risques d'incendie et d'explosion [p. 20 :] – installez des moyens d'extinction adaptés : extincteurs, robinets d'incendie armés (RIA), systèmes automatiques (sprinklers, gaz…), – assurez une maintenance régulière des appareils et des installations,",
      statut: "sans_objet",
      motif:
        "Fiche de la brochure ED 840 (voir la fiche 4 pour l'édition). N'institue rien. Citée par `resto-incendie` depuis le 2026-09-26. Elle ne fixe aucune périodicité de vérification des extincteurs et ne parle pas de « classe F ».",
    },
    {
      ref: "INRS dossier web « Travail isolé »",
      intitule: "Travail isolé. Ce qu'il faut retenir",
      url: "https://www.inrs.fr/risques/travail-isole/ce-qu-il-faut-retenir.html",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      citationCle:
        "[Titre de la page :] Travail isolé. Ce qu'il faut retenir [Texte :] Travailler de façon isolée, c'est réaliser seul une tâche dans un environnement de travail où l'on ne peut être vu ou entendu directement par d'autres personnes, et où la probabilité de visite est faible.",
      statut: "sans_objet",
      motif:
        "Dossier web de l'INRS, HTML téléchargé le 2026-09-26. N'institue rien. La description de `trv-rps-isolement` attribuait à « ED 840 fiche 17 » une définition du travail isolé (« hors de portée de vue ou de voix d'un tiers ») : la fiche 17 ne contient pas le mot « isolé », et cette formule n'est dans aucune source du dépôt. La définition citée est celle-ci.",
    },
  ],
};
