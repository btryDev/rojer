/**
 * Obligations réglementaires — Cuisson et hottes professionnelles (P2).
 *
 * Sources primaires :
 *   - Arrêté du 25 juin 1980 modifié — règlement de sécurité ERP, section GC
 *     « Grandes cuisines » (art. GC 12 à GC 21) et section GZ
 *     « Installations aux gaz combustibles et aux hydrocarbures liquéfiés »
 *     (art. GZ 29 pour vérifications périodiques).
 *
 * Amendement 2026-08 — fusion du doublon de ramonage. Le nettoyage/ramonage
 * annuel des circuits d'extraction de buées (art. GC 20) était déclaré deux
 * fois : ici sous `cuisson-erp-circuits-extraction-nettoyage` et dans
 * `aeration.ts` sous `aeration-hotte-pro-annuelle`. Même article, même
 * périodicité annuelle, même catégorie d'équipement `HOTTE_PRO` : un
 * restaurant avec une hotte recevait deux échéances pour une seule
 * obligation, ce qui faussait aussi les agrégats de conformité. La règle
 * survit ici (le domaine `cuisson_hotte` correspond au chapitre « Grandes
 * cuisines » du règlement ERP dont l'article GC 20 est issu) ; l'id
 * `aeration-hotte-pro-annuelle` a été retiré du référentiel.
 */

import type { Obligation } from "./types";

export const obligationsCuissonHotte: Obligation[] = [
  {
    id: "cuisson-erp-filtres-hebdomadaire",
    domaine: "cuisson_hotte",
    libelle:
      "Nettoyage ou remplacement des filtres de hotte (grandes cuisines ERP)",
    description:
      "Les filtres des hottes et dispositifs de captation des buées et des graisses sont nettoyés ou remplacés aussi souvent que nécessaire et, en tout cas, au minimum une fois par semaine. C'est la graisse accumulée dans les filtres qui transforme un départ de feu sur un appareil de cuisson en feu de conduit. Cet article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range les appareils de cuisson et les circuits d'extraction de l'air vicié, des buées et des graisses des grandes cuisines parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents ; PE 15 § 1 renvoie au chapitre X du livre II, dont relève cet article, pour la « mise en œuvre » des installations autorisées en 4ᵉ catégorie ; il ne parle ni de leur entretien ni de leur vérification. Ce rythme de trois ans figure déjà au calendrier de tout établissement de 5ᵉ catégorie, sous « Entretien et vérification de l'ensemble des installations techniques (ERP 5ᵉ catégorie) ». En 5ᵉ catégorie, le calendrier maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. GC 21 § 2 (entretien des installations de cuisson) — livre II, établissements des quatre premières catégories",
        article: "GC 21",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317499/2022-02-10",
        note: "« Pendant les périodes d'activité, les appareils de cuisson et de remise en température, le circuit d'extraction d'air vicié, de buées et de graisses, y compris les ventilateurs et récupérateurs de chaleur éventuels, doivent être nettoyés chaque fois qu'il est nécessaire. Les filtres doivent être nettoyés ou remplacés aussi souvent que nécessaire et, en tout cas, au minimum une fois par semaine. » Verbatim relevé en première main le 2026-08-26.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "hebdomadaire",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["HOTTE_PRO"],
    notesInternes:
      "Créée le 2026-08-26. GC 21 § 2 porte DEUX rythmes : le ramonage annuel des conduits d'évacuation avec vérification de leur vacuité, et le nettoyage ou remplacement des filtres au minimum HEBDOMADAIRE. Le référentiel ne portait que le premier — la fréquence hebdomadaire figurait dans le libellé de la référence de `cuisson-erp-circuits-extraction-nettoyage`, donc dans de la prose, et ne produisait aucune échéance.\n\nSixième occurrence du motif PE 4 § 2 : un article qui porte plusieurs rythmes n'entrait dans le modèle que par le plus long. Celle-ci n'a demandé aucune migration — `hebdomadaire` existait déjà.\n\n`realisateurs: [\"exploitant\"]` : le texte n'exige aucun tiers, et c'est une opération de cuisine, pas de maintenance.\n\nUne échéance hebdomadaire produit environ 52 lignes de calendrier par an et par hotte. C'est le rythme que le texte écrit ; si le volume devient un problème d'affichage, c'est l'affichage qu'il faudra traiter, pas la périodicité.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».\n\nPE 15 § 1 / PE 20 § 2 RELUS EN ENTIER LE 2026-09-27 (C41), avec le plan des chapitres V et X du livre II. Le renvoi porte sur la « mise en œuvre » des installations « autorisées dans les établissements de 4e catégorie », « dans ce cas » seulement. Au livre II, l'entretien et la vérification ne sont pas mêlés aux règles d'installation : ils forment une section à part, « Section 7 : Entretien et vérifications » (GC 21, GC 22) au chapitre X, « Section 9 : Entretien et vérification » (CH 57, CH 58) au chapitre V. Le texte ne définit pas « mise en œuvre » ; y lire l'entretien et la vérification reste une lecture, que le découpage ne soutient pas. Le rythme que le livre III impose en 5ᵉ sur ces objets est PE 4 § 2 — trois ans au plus, « appareils de cuisson, circuits d'extraction de l'air vicié, des buées et des graisses des grandes cuisines », « chauffage » —, porté par `incendie-erp-pe4-entretien-installations-techniques` (N5, porteur établissement) ; la description le dit désormais. Applicabilité INCHANGÉE : la sur-application assumée reste la politique des sœurs.",
  },
  {
    id: "cuisson-erp-verification-initiale",
    domaine: "cuisson_hotte",
    libelle: "Vérification à la mise en service des installations de cuisson (grandes cuisines ERP)",
    description:
      "À la mise en service d'une grande cuisine — un local ou un groupement de locaux non isolés entre eux dont la puissance utile totale des appareils de cuisson et de remise en température dépasse 20 kW (GC 1 § 3) —, un examen de l'installation est effectué dans les conditions prévues à la section II du chapitre Ier du titre Ier, c'est-à-dire par une personne ou un organisme agréé. Ces articles relèvent du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 15 § 1 admet les installations autorisées en 4ᵉ catégorie et veut que leur « mise en œuvre » soit réalisée « dans les conditions définies au livre II, titre Ier, chapitre X », dont relèvent GC 1 et GC 22. Le texte ne définit pas la « mise en œuvre » : y compter l'examen à la mise en service est une lecture, et c'est elle qui maintient cette ligne au calendrier en 5ᵉ catégorie.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. GC 22 § 1 (vérification dans les conditions de la section II du chapitre Ier) — livre II, établissements des quatre premières catégories",
        article: "GC 22",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317519/",
        versionConstatee: "1980-08-15",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. GE 6 à GE 8 (vérifications par organismes agréés) — livre II, établissements des quatre premières catégories",
        article: "GE 6",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020303884/",
        versionConstatee: "2007-11-19",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. GC 1 § 3 (définition de la « grande cuisine ») — livre II, établissements des quatre premières catégories",
        article: "GC 1",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317499/2022-02-10",
        note: "« Un local ou un groupement de locaux non isolés entre eux comportant des appareils de cuisson et des appareils de remise en température dont la puissance utile totale est supérieure à 20 kW est appelé \"grande cuisine\". » Verbatim relevé en première main le 2026-08-26. C'est le SEUL seuil du chapitre X : aucune mention d'un nombre de couverts.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "ponctuelle",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["APPAREIL_CUISSON_ERP"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait GC 12 (offices de remise en température) et GC 19 (appareils installés dans les locaux accessibles ou non au public), qui ne traitent pas de vérification. GC 22 § 1 renvoie aux articles GE 6 à GE 8.\n\nCORRIGÉ LE 2026-08-26, GC 1 lu en première main. La description annonçait un seuil de « > 20 kW OU production > 500 couverts simultanés, cf. art. GC 1 ». Les 500 couverts ne figurent NULLE PART dans GC 1, ni ailleurs dans le chapitre X. Le § 3 ne connaît qu'un seuil : « Un local ou un groupement de locaux non isolés entre eux comportant des appareils de cuisson et des appareils de remise en température dont la puissance utile totale est supérieure à 20 kW est appelé \u00ab grande cuisine \u00bb. » Le second critère était une référence inventée, attribuée à un article précis — le cas exact que la règle 6 du CLAUDE.md interdit. Il élargissait le déclenchement à des établissements que le texte ne vise pas.\n\nNATURE : PONCTUELLE (ADR-026). GC 22 § 1 ne vise que la mise en service de la grande cuisine ; aucun second titre.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».\n\nPE 15 § 1 / PE 20 § 2 RELUS EN ENTIER LE 2026-09-27 (C41), avec le plan des chapitres V et X du livre II. Le renvoi porte sur la « mise en œuvre » des installations « autorisées dans les établissements de 4e catégorie », « dans ce cas » seulement. Au livre II, l'entretien et la vérification ne sont pas mêlés aux règles d'installation : ils forment une section à part, « Section 7 : Entretien et vérifications » (GC 21, GC 22) au chapitre X, « Section 9 : Entretien et vérification » (CH 57, CH 58) au chapitre V. Le texte ne définit pas « mise en œuvre » ; y lire l'entretien et la vérification reste une lecture, que le découpage ne soutient pas. Le rythme que le livre III impose en 5ᵉ sur ces objets est PE 4 § 2 — trois ans au plus, « appareils de cuisson, circuits d'extraction de l'air vicié, des buées et des graisses des grandes cuisines », « chauffage » —, porté par `incendie-erp-pe4-entretien-installations-techniques` (N5, porteur établissement) ; la description le dit désormais. Applicabilité INCHANGÉE : la sur-application assumée reste la politique des sœurs.\n\nREPRISE DU 2026-09-27 (contre-lecture de C41). Un examen à la mise en service n'est pas un rythme : la description ne l'accole plus à la triennale de PE 4 § 2, et ne parle plus de sur-application. Elle dit ce que PE 15 § 1 dit — la « mise en œuvre » dans les conditions du chapitre X — et que l'inclusion de l'examen initial dans cette mise en œuvre est une lecture. La garde livre II de `conformite.test.ts` admet cette forme (« est une lecture ») à côté de « sur-application assumée ».",
  },
  {
    id: "cuisson-erp-appareils-annuelle",
    domaine: "cuisson_hotte",
    libelle: "Vérification annuelle des appareils de cuisson et des dispositifs de sécurité (grandes cuisines ERP)",
    description:
      "Les appareils de cuisson et leurs dispositifs de sécurité (thermocouples, arrêts d'urgence, commandes à distance) sont vérifiés annuellement par une personne compétente dans les grandes cuisines ERP. Cet article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range les appareils de cuisson parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents ; PE 15 § 1 renvoie au chapitre X du livre II, dont relève cet article, pour la « mise en œuvre » des installations autorisées en 4ᵉ catégorie ; il ne parle ni de leur entretien ni de leur vérification. Ce rythme de trois ans figure déjà au calendrier de tout établissement de 5ᵉ catégorie, sous « Entretien et vérification de l'ensemble des installations techniques (ERP 5ᵉ catégorie) ». En 5ᵉ catégorie, le calendrier maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. GC 22 — livre II, établissements des quatre premières catégories",
        article: "GC 22",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317519/",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["APPAREIL_CUISSON_ERP"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : la vérification annuelle est à l'article GC 22 (« Vérifications techniques »), GC 21 ne traitant que de l'entretien.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».\n\nPE 15 § 1 / PE 20 § 2 RELUS EN ENTIER LE 2026-09-27 (C41), avec le plan des chapitres V et X du livre II. Le renvoi porte sur la « mise en œuvre » des installations « autorisées dans les établissements de 4e catégorie », « dans ce cas » seulement. Au livre II, l'entretien et la vérification ne sont pas mêlés aux règles d'installation : ils forment une section à part, « Section 7 : Entretien et vérifications » (GC 21, GC 22) au chapitre X, « Section 9 : Entretien et vérification » (CH 57, CH 58) au chapitre V. Le texte ne définit pas « mise en œuvre » ; y lire l'entretien et la vérification reste une lecture, que le découpage ne soutient pas. Le rythme que le livre III impose en 5ᵉ sur ces objets est PE 4 § 2 — trois ans au plus, « appareils de cuisson, circuits d'extraction de l'air vicié, des buées et des graisses des grandes cuisines », « chauffage » —, porté par `incendie-erp-pe4-entretien-installations-techniques` (N5, porteur établissement) ; la description le dit désormais. Applicabilité INCHANGÉE : la sur-application assumée reste la politique des sœurs.",
  },
  // `cuisson-gaz-installations-triennale` a été RETIRÉ le 2026-08-27
  // (ADR-022), pour la même raison que `elec-erp-cat5-quinquennale` : son
  // article fondateur était PE 4 § 2, dont il ne projetait qu'un fragment —
  // « les installations de gaz » — sur une catégorie d'équipement. Aucun
  // fondement propre. Le référentiel porte désormais PE 4 § 2 entier
  // (`incendie-erp-pe4-entretien-installations-techniques`), qui a repris sa
  // criticité 5 et son couple de réalisateurs.
  //
  // Ce qui NE disparaît pas avec lui : `cuisson-gaz-installations-annuelle`
  // reste — c'est le régime des ERP de 1ʳᵉ à 4ᵉ catégorie, fondé sur GZ 15 et
  // non sur PE 4, donc une autre obligation et non un fragment.
  //
  // Le constat réglementaire que portaient ses notes est conservé ici parce
  // qu'il vaut au-delà de cette ligne : les articles GZ 16 à GZ 30 sont
  // ABROGÉS depuis le 1er janvier 2026 (arrêté du 23 février 2025, art. 1) et
  // remplacés par GZ 14 (entretien) et GZ 15 (vérifications périodiques
  // annuelles). Toute référence survivante à GZ 29 ou GZ 30 est morte.
  //
  // L'id ne doit jamais être réemployé : il est dans `OBLIGATIONS_RETIREES`.
  {
    id: "cuisson-gaz-installations-annuelle",
    domaine: "cuisson_hotte",
    libelle: "Vérification annuelle des installations de gaz combustible (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Dans les ERP des quatre premières catégories, les installations fixes aux gaz combustibles et aux hydrocarbures liquéfiés (stockage, distribution, locaux d'utilisation, appareils) sont vérifiées tous les ans : état d'entretien, ventilation, évacuation des produits de combustion, organes de coupure, dispositifs de sécurité, réglage des détendeurs, étanchéité des canalisations.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. GZ 15 (vérifications techniques périodiques, ex GZ 30)",
        article: "GZ 15",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020304213",
        versionConstatee: "2026-01-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree", "personne_competente"],
    criticite: 5,
    transmet: [],
    typologies: { erp: { categories: ["N1", "N2", "N3", "N4"] } },
    categoriesEquipement: ["APPAREIL_CUISSON_ERP"],
    notesInternes:
      "Ajouté à l'audit 2026-08 : jusque-là seule une vérification « triennale » (fausse pour le 1er groupe) existait. GZ 29 = entretien, GZ 30 = vérification annuelle.\n\nAmendement 2026-08-26 : le chapitre GZ a été entièrement réécrit. Les articles GZ 16 à GZ 30 sont ABROGÉS depuis le 1er janvier 2026 (arrêté du 23 février 2025, art. 1), et l'URL de section qui les portait renvoie un 404. Ce qui les remplace : GZ 14 « Entretien des installations » et GZ 15 « Vérifications techniques périodiques », en vigueur depuis la même date. GZ 15 dispose que les vérifications « sont réalisées annuellement conformément à la section II, chapitre premier du présent titre ». La substance encodée était juste ; la numérotation et le lien étaient morts.",
  },
  {
    id: "cuisson-erp-circuits-extraction-nettoyage",
    domaine: "cuisson_hotte",
    libelle: "Ramonage et nettoyage annuels des circuits d'extraction de buées (grandes cuisines ERP)",
    description:
      "Les circuits d'extraction d'air vicié et de buées des grandes cuisines — hottes, filtres, conduits — sont maintenus en état de propreté et font l'objet d'un ramonage et d'un nettoyage aussi souvent que nécessaire, et au moins une fois par an. Cet article relève du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range les circuits d'extraction de l'air vicié, des buées et des graisses des grandes cuisines parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents ; PE 15 § 1 renvoie au chapitre X du livre II, dont relève cet article, pour la « mise en œuvre » des installations autorisées en 4ᵉ catégorie ; il ne parle ni de leur entretien ni de leur vérification. Ce rythme de trois ans figure déjà au calendrier de tout établissement de 5ᵉ catégorie, sous « Entretien et vérification de l'ensemble des installations techniques (ERP 5ᵉ catégorie) ». En 5ᵉ catégorie, le calendrier maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. GC 21 § 2 (ramonage annuel, nettoyage des circuits, filtres hebdomadaires) — livre II, établissements des quatre premières catégories",
        article: "GC 21",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317519/",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee", "exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["HOTTE_PRO"],
    notesInternes:
      "Obligation unique issue de la fusion de l'ancien doublon `aeration-hotte-pro-annuelle` (retiré). Typologie `erp: true` — l'article GC 20 ne restreint pas par catégorie ; écrire `categories: [N1…N5]` reviendrait à exiger en plus une catégorie renseignée et créerait un faux négatif sur les établissements dont la catégorie est inconnue.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».\n\nPE 15 § 1 / PE 20 § 2 RELUS EN ENTIER LE 2026-09-27 (C41), avec le plan des chapitres V et X du livre II. Le renvoi porte sur la « mise en œuvre » des installations « autorisées dans les établissements de 4e catégorie », « dans ce cas » seulement. Au livre II, l'entretien et la vérification ne sont pas mêlés aux règles d'installation : ils forment une section à part, « Section 7 : Entretien et vérifications » (GC 21, GC 22) au chapitre X, « Section 9 : Entretien et vérification » (CH 57, CH 58) au chapitre V. Le texte ne définit pas « mise en œuvre » ; y lire l'entretien et la vérification reste une lecture, que le découpage ne soutient pas. Le rythme que le livre III impose en 5ᵉ sur ces objets est PE 4 § 2 — trois ans au plus, « appareils de cuisson, circuits d'extraction de l'air vicié, des buées et des graisses des grandes cuisines », « chauffage » —, porté par `incendie-erp-pe4-entretien-installations-techniques` (N5, porteur établissement) ; la description le dit désormais. Applicabilité INCHANGÉE : la sur-application assumée reste la politique des sœurs.",
  },
  {
    id: "cuisson-erp-extinction-automatique-annuelle",
    domaine: "cuisson_hotte",
    libelle: "Vérification annuelle du système d'extinction automatique sur appareils de cuisson (ERP)",
    description:
      "Lorsque l'établissement est équipé d'un système d'extinction automatique des feux sur appareils de cuisson (friteuses, plaques grasses), celui-ci est vérifié annuellement par un technicien compétent — état des cartouches, des capteurs, des circuits de déclenchement. Ces articles relèvent du livre II du règlement de sécurité, qui vise les établissements des quatre premières catégories. En 5ᵉ catégorie, PE 4 § 2 range les moyens de secours et les appareils de cuisson parmi les installations et équipements que l'exploitant fait entretenir et vérifier « tous les trois ans au plus » par des techniciens compétents ; PE 15 § 1 renvoie au chapitre X du livre II, dont relève GC 8, pour la « mise en œuvre » des installations autorisées en 4ᵉ catégorie ; il ne parle ni de leur entretien ni de leur vérification. Ce rythme de trois ans figure déjà au calendrier de tout établissement de 5ᵉ catégorie, sous « Entretien et vérification de l'ensemble des installations techniques (ERP 5ᵉ catégorie) ». En 5ᵉ catégorie, le calendrier maintient pourtant cette échéance, par sur-application assumée.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification annuelle des moyens de secours) — livre II, établissements des quatre premières catégories",
        article: "MS 73",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317753/",
        note: "« En cours d'exploitation, ces mêmes appareils ou installations ainsi que les appareils mobiles doivent être vérifiés, au moins une fois par an, dans les conditions prévues à la section II précitée. » Verbatim relevé en première main le 2026-08-27. La triennale par organisme agréé du même paragraphe ne vise QUE les SSI de catégories A et B et les sprinkleurs : un système sous hotte de friteuse relève de l'annuelle par technicien compétent.",
        versionConstatee: "1980-08-15",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. GC 8 (obligation d'installation du dispositif) — livre II, établissements des quatre premières catégories",
        article: "GC 8",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020317499/",
        note: "« Dans les grandes cuisines ouvertes et les îlots de cuisson, des dispositifs d'extinction automatique adaptés au feu d'huile doivent être installés à l'aplomb des friteuses ouvertes. » Fonde l'EXISTENCE du dispositif, pas sa vérification.",
        versionConstatee: "1980-08-15",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["APPAREIL_CUISSON_ERP"],
    conditions: [
      {
        type: "equipement_propriete_non_infirmee",
        categorie: "APPAREIL_CUISSON_ERP",
        propriete: "aExtinctionAutomatique",
      },
    ],
    notesInternes:
      "La portée est dans le texte de l'obligation elle-même (« lorsque l'établissement est équipé d'un système d'extinction automatique ») : elle est désormais portée par une condition déclarative, plus par un commentaire. Forme `non_infirmee` obligatoire (criticité 5) — les appareils de cuisson déjà déclarés conservent l'obligation tant que le dirigeant n'a pas répondu « non ».\n\nFONDEMENT RECALÉ LE 2026-09-01 (lot A). GC 22 était le fondement, et son § 2 énumère limitativement l'objet de l'annuelle en QUATRE points, dont aucun ne vise un système d'extinction automatique : état d'entretien et de maintenance, conditions de ventilation et d'évacuation des buées et graisses, signalisation des dispositifs de sécurité, manœuvre des arrêts d'urgence. Article ouvert en entier le 2026-09-01. La référence est retirée. Ce qui porte l'obligation était DÉJÀ CITÉ par elle, en contexte : MS 73 § 2 pour la vérification annuelle des moyens de secours par technicien compétent, GC 8 pour l'existence du dispositif. Le recalage consiste ici à ne plus faire dire à un article ce qu'il ne dit pas, et à promouvoir MS 73 en fondement — il n'ajoute aucun texte.\n\nCE QUE GC 22 PORTE VRAIMENT et qui reste encodé ailleurs : l'annuelle des appareils de cuisson eux-mêmes, `cuisson-erp-appareils-annuelle`, et la vérification initiale. Le ramonage annuel et le nettoyage hebdomadaire des filtres sont à GC 21, non à GC 22.\n\nRÉSERVE AFFICHÉE — 2026-09-26 (C39). Même traitement que `incendie-erp-extincteurs-annuelle` : sur-application en 5ᵉ MAINTENUE, comportement inchangé. Ce qui change est ce que l'exploitant lit : chaque `reference` au livre II porte « — livre II, établissements des quatre premières catégories », et la description dit ce que le livre III porte en 5ᵉ, relu sur Légifrance le 2026-09-26 — PE 1 § 1 (en vigueur depuis le 27/08/1990), PE 4 (en vigueur depuis le 01/07/2026), PE 15 § 1 (depuis le 01/03/2006), PE 20 § 2 (depuis le 22/05/2004) —, sans y ajouter de renvoi que ces articles ne font pas. Garde : `conformite.test.ts`, « toute référence au livre II servie à un ERP de 5ᵉ dit son champ ».\n\nPE 15 § 1 / PE 20 § 2 RELUS EN ENTIER LE 2026-09-27 (C41), avec le plan des chapitres V et X du livre II. Le renvoi porte sur la « mise en œuvre » des installations « autorisées dans les établissements de 4e catégorie », « dans ce cas » seulement. Au livre II, l'entretien et la vérification ne sont pas mêlés aux règles d'installation : ils forment une section à part, « Section 7 : Entretien et vérifications » (GC 21, GC 22) au chapitre X, « Section 9 : Entretien et vérification » (CH 57, CH 58) au chapitre V. Le texte ne définit pas « mise en œuvre » ; y lire l'entretien et la vérification reste une lecture, que le découpage ne soutient pas. Le rythme que le livre III impose en 5ᵉ sur ces objets est PE 4 § 2 — trois ans au plus, « appareils de cuisson, circuits d'extraction de l'air vicié, des buées et des graisses des grandes cuisines », « chauffage » —, porté par `incendie-erp-pe4-entretien-installations-techniques` (N5, porteur établissement) ; la description le dit désormais. Applicabilité INCHANGÉE : la sur-application assumée reste la politique des sœurs.",
  },
];
