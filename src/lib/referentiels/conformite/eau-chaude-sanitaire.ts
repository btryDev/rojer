/**
 * Obligations réglementaires — Eau chaude sanitaire (surveillance des
 * légionelles).
 *
 * Source primaire : arrêté du 1er février 2010 relatif à la surveillance des
 * légionelles dans les installations de production, de stockage et de
 * distribution d'eau chaude sanitaire — art. 1er et 2 (version du 2023-01-01,
 * après l'arrêté du 30 décembre 2022), art. 3, 4, 5 et annexe 2. Relus le
 * 2026-10-17 par l'API Légifrance (bac à sable, égalité avec la production non
 * vérifiée), pages propres de chaque article : verbatim conforme au corpus
 * `arrete-2010-02-01-legionelles`, lu le 2026-09-20.
 *
 * DÉCISION DE LA PROPRIÉTAIRE DU 2026-10-17. Elle révise celle du 2026-09-20
 * (« aucune obligation n'est encodée », voir le corpus). Les légionelles passent
 * par le MATÉRIEL, sans question à l'accueil : le produit ne sait pas dire qui
 * a une installation collective ni un point d'usage à risque, et c'est en
 * déclarant l'installation (`EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC`) que le
 * dirigeant le dit. L'objection de 2026-09-20 — « deux attributs
 * d'établissement que personne dans la cible n'aurait à renseigner » — tombe :
 * il n'y a pas d'attribut, il y a une catégorie que seul le concerné déclare.
 * Les hôtels (type O) sont le cas le plus important de la cible ; la catégorie
 * est suggérée aux types O et X (`pre-remplissage.ts`).
 *
 * LE CHAMP, DIT PAR LA CATÉGORIE. L'art. 1er vise les installations
 * COLLECTIVES qui alimentent des points d'usage à risque « dans […] les hôtels
 * et résidences de tourisme, les campings et les autres établissements
 * recevant du public » ; l'art. 2 définit le point d'usage à risque (accessible
 * au public ET producteur d'aérosols : douches, douchettes, bains à remous ou à
 * jets). D'où `typologies: { erp: true }` : un établissement de travail seul
 * qui déclarerait la catégorie ne reçoit aucune ligne.
 *
 * PAS DE DOUBLON AVEC LE CARNET SANITAIRE. `calendrier/echeances.ts`
 * (`sourceLegionelles`) se tait quand la catégorie est déclarée ; le tableau de
 * bord cesse de rappeler l'analyse (`dashboard/obligations.ts`). Dette écrite :
 * une analyse saisie au carnet ne fait pas rouler la ligne du calendrier
 * (`docs/dette-chantier-porteur-echeance.md`). ADR-010 amendé le 2026-10-17.
 */

import type { Obligation, ReferenceLegale } from "./types";

const CATEGORIE = "EAU_CHAUDE_COLLECTIVE_DOUCHES_PUBLIC" as const;

const URL_ANNEXE_2 =
  "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021796797";

const REF_ART_3: ReferenceLegale = {
  source: "ARRETE",
  reference:
    "Arrêté du 1er février 2010 (surveillance des légionelles), art. 3 (surveillance des installations par le responsable des installations, aux fréquences minimales de l'annexe 2)",
  article: "Arrêté 01-02-2010 art. 3",
  url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890723/",
  note: "« Cette surveillance repose notamment sur des mesures de la température de l'eau et des campagnes d'analyse pour la recherche de légionelles dans chacun des réseaux d'eau chaude sanitaire, aux fréquences de contrôle minimales précisées en annexe 1 pour les établissements de santé et en annexe 2 pour les autres établissements. » Relu le 2026-10-17 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2023-01-01.",
  versionConstatee: "2023-01-01",
};

const REF_ART_1_2: ReferenceLegale = {
  source: "ARRETE",
  reference:
    "Arrêté du 1er février 2010, art. 1er et 2 (installations collectives alimentant des points d'usage à risque — douches, douchettes, bains à remous ou à jets accessibles au public — dans les hôtels, campings et autres ERP)",
  article: "Arrêté 01-02-2010 art. 1",
  url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890717/",
  note: "Le champ de la ligne. Art. 1er : « installations collectives de production, de stockage et de distribution d'eau chaude sanitaire qui alimentent des points d'usage à risque définis à l'article 2 dans […] les hôtels et résidences de tourisme, les campings et les autres établissements recevant du public ». Art. 2 : « point d'usage à risque, tout point d'usage accessible au public et pouvant produire des aérosols d'eau chaude sanitaire […] ; il s'agit notamment des douches, des douchettes, des bains à remous ou à jets ». Relus le 2026-10-17 par l'API Légifrance (bac à sable), version du 2023-01-01.",
  versionConstatee: "2023-01-01",
};

/** Le responsable des installations, tel que l'art. 2 le définit. Dit sans qualifier. */
const TITULAIRES =
  "Le responsable des installations peut être, selon le texte, le propriétaire des installations, le directeur de l'établissement recevant du public, ou un exploitant si cette responsabilité lui a été contractuellement déléguée.";

export const obligationsEauChaudeSanitaire: Obligation[] = [
  {
    id: "ecs-temperature-mensuelle",
    domaine: "eau_chaude_sanitaire",
    libelle:
      "Mesure de la température de l'eau chaude sanitaire (installation collective alimentant des points d'usage à risque)",
    description: `Une fois par mois au moins, le responsable des installations mesure la température de l'eau à la sortie de la production d'eau chaude, aux points d'usage à risque les plus représentatifs du réseau (à défaut les plus éloignés de la production) et sur chaque retour de boucle. Il consigne les résultats dans le fichier sanitaire des installations — le carnet sanitaire de Rojer. ${TITULAIRES}`,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er février 2010, annexe 2 (fréquences minimales hors établissements de santé — température de l'eau : 1 fois par mois)",
        article: "Arrêté 01-02-2010 annexe 2",
        url: URL_ANNEXE_2,
        note: "« Sortie de la/des production(s) d'eau chaude sanitaire (mise en distribution). Température de l'eau : 1 fois par mois. » ; aux points d'usage à risque représentatifs : « Température de l'eau : 1 fois par mois » ; au retour de boucle : « Température de l'eau : 1 fois par mois au niveau de chaque boucle ». Relu le 2026-10-17 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2010-02-10.",
        versionConstatee: "2010-02-10",
      },
      REF_ART_3,
      REF_ART_1_2,
    ],
    periodicite: "mensuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    porteur: "equipement",
    categoriesEquipement: [CATEGORIE],
    notesInternes:
      "ENTRÉE LE 2026-10-17, DÉCISION DE LA PROPRIÉTAIRE (sous-lot F de la mise à jour du référentiel). Voir l'en-tête du fichier pour la révision de la décision du 2026-09-20.\n\nRYTHME ÉCRIT (annexe 2 : « Température de l'eau : 1 fois par mois »), à trois points de surveillance. Ce sont des fréquences MINIMALES (art. 3 : « fréquences de contrôle minimales ») ; la stratégie d'échantillonnage du responsable peut les resserrer, rien n'en est daté. Pas de rythme vague, donc pas de défaut annuel (ADR-039).\n\nNORMES ET ARRÊTÉS D'APPLICATION (relevé du 2026-10-17, demandé par la propriétaire). Pour la mesure de température, le texte ne renvoie à AUCUNE norme ni à aucun arrêté d'application : ni contenu ni rythme ne viennent d'ailleurs que de l'annexe 2. Les normes que l'arrêté cite (art. 2 et 5) portent sur l'analyse, le prélèvement et l'accréditation — voir `ecs-legionelles-analyse-annuelle`.\n\nRÉALISATEUR `exploitant`. Le texte ne réserve la mesure de température à personne : seuls les prélèvements et les analyses de légionelles vont à un laboratoire accrédité (art. 5). `supposeUnTiers()` reste faux pour cette ligne.\n\nTITULAIRE : le « responsable des installations » de l'art. 2 — propriétaire, directeur de l'ERP, ou exploitant par délégation contractuelle. Le produit ne départage pas ; la description le dit sans qualifier.\n\nUNE LIGNE PAR INSTALLATION DÉCLARÉE. L'annexe 2 porte des mesures « pour chacun des réseaux d'eau chaude sanitaire » : un réseau = une installation déclarée. Le relevé au carnet sanitaire (`PointReleve`) ne fait pas rouler cette ligne : dette écrite dans `docs/dette-chantier-porteur-echeance.md`.\n\n`usageEcran: null` : ligne d'équipement datée, elle ne va pas à l'écran « Ce qui doit être en place ».",
  },
  {
    id: "ecs-legionelles-analyse-annuelle",
    domaine: "eau_chaude_sanitaire",
    libelle:
      "Analyse de légionelles de l'eau chaude sanitaire par un laboratoire accrédité (installation collective alimentant des points d'usage à risque)",
    description: `Une fois par an au moins, le responsable des installations fait réaliser des prélèvements et des analyses de légionelles par un laboratoire ou un organisme accrédité : en fond de ballon de production et de stockage, aux points d'usage à risque les plus représentatifs du réseau (à défaut les plus éloignés) et au retour de boucle. Legionella pneumophila doit rester sous la limite de qualité de 1 000 UFC par litre à tous les points d'usage à risque ; au-delà, des mesures correctives sont dues sans délai. Les résultats se consignent dans le fichier sanitaire des installations — le carnet sanitaire de Rojer. ${TITULAIRES}`,
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er février 2010, annexe 2 (fréquences minimales hors établissements de santé — analyses de légionelles : 1 fois par an)",
        article: "Arrêté 01-02-2010 annexe 2",
        url: URL_ANNEXE_2,
        note: "« Fond de ballon(s) de production et de stockage d'eau chaude sanitaire, le cas échéant. Analyses de légionelles : 1 fois par an. » ; aux points d'usage à risque représentatifs et au retour de boucle : « Analyses de légionelles : 1 fois par an ». Relu le 2026-10-17 par l'API Légifrance (bac à sable, égalité avec la production non vérifiée), version du 2010-02-10.",
        versionConstatee: "2010-02-10",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er février 2010, art. 5 (prélèvements et analyses par un laboratoire ou un organisme accrédité)",
        article: "Arrêté 01-02-2010 art. 5",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890730",
        note: "« Le responsable des installations fait réaliser les prélèvements d'eau et les analyses de légionelles par un laboratoire ou un organisme accrédité pour les prélèvements et la recherche des légionelles […] » Relu le 2026-10-17 par l'API Légifrance (bac à sable), version du 2023-01-01.",
        versionConstatee: "2023-01-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 1er février 2010, art. 4 (limite de qualité de 1 000 UFC/L en Legionella pneumophila aux points d'usage à risque)",
        article: "Arrêté 01-02-2010 art. 4",
        url: "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000046890728",
        note: "« Les dénombrements en Legionella pneumophila doivent être inférieurs à la limite de qualité fixée à 1 000 unités formant colonie par litre au niveau de tous les points d'usage à risque. » Le critère de l'analyse, sans échéance propre. Relu le 2026-10-17 par l'API Légifrance (bac à sable), version du 2023-01-01.",
        versionConstatee: "2023-01-01",
      },
      REF_ART_3,
      REF_ART_1_2,
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["organisme_accredite"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    porteur: "equipement",
    categoriesEquipement: [CATEGORIE],
    notesInternes:
      "ENTRÉE LE 2026-10-17, DÉCISION DE LA PROPRIÉTAIRE (sous-lot F de la mise à jour du référentiel). Voir l'en-tête du fichier pour la révision de la décision du 2026-09-20.\n\nRYTHME ÉCRIT (annexe 2 : « Analyses de légionelles : 1 fois par an »), fréquence minimale. Pas de rythme vague, donc pas de défaut annuel (ADR-039).\n\nNORMES ET ARRÊTÉS D'APPLICATION (relevé du 2026-10-17, demandé par la propriétaire). L'arrêté cite quatre documents normatifs, dont il fixe le millésime par avis au Journal officiel : la norme NF T90-431 (analyse de légionelles, art. 2), le fascicule FD T 90 522 et la norme NF EN ISO 19458 (prélèvement, art. 2), la norme NF EN ISO/IEC 17025 (accréditation du laboratoire, art. 5). AUCUN N'A ÉTÉ LU, ni les avis qui en fixent le millésime. Le texte les cite pour la MÉTHODE (comment analyser, prélever, accréditer), pas pour un rythme : le rythme est écrit à l'annexe 2 et ne dépend d'aucun d'eux. Rojer n'en tire rien et ne les cite pas à l'écran ; c'est le laboratoire accrédité qui les applique. Aucun arrêté d'application n'est renvoyé.\n\nRÉALISATEUR `organisme_accredite` : l'art. 5 fait réaliser prélèvements ET analyses par « un laboratoire ou un organisme accrédité » (COFRAC ou équivalent européen). C'est un tiers : `DOMAINES_PRESTATAIRE_ATTENDUS.eau_chaude_sanitaire` le traduit en `carnet_sanitaire`, la valeur existante de l'annuaire.\n\nL'ART. 4, RETENU ICI. La limite de 1 000 UFC/L est le critère de l'analyse, sans échéance propre (décision de c6 du 2026-10-17) : elle est citée et dite dans la description. Ses mesures correctives (« sans délai ») et les analyses qui en vérifient l'efficacité ne sont pas datées par le référentiel : réserve du corpus.\n\nTITULAIRE : le « responsable des installations » de l'art. 2 — propriétaire, directeur de l'ERP, ou exploitant par délégation contractuelle. Dit sans qualifier.\n\nPAS DE DOUBLON AVEC LE CARNET : l'échéance du module (`sourceLegionelles`, « Analyse légionelles (eau chaude sanitaire) ») se tait dès que l'établissement déclare une installation de la catégorie. DETTE : une analyse saisie au carnet sanitaire ne fait pas rouler cette ligne ; le dirigeant y dépose le rapport du laboratoire (`docs/dette-chantier-porteur-echeance.md`).\n\n`usageEcran: null` : ligne d'équipement datée, elle ne va pas à l'écran « Ce qui doit être en place ».",
  },
];
