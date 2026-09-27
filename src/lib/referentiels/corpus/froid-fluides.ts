// Corpus : contrôle d'étanchéité des fluides frigorigènes.
//
// Étendue « articles_cites ». Deux textes de rangs différents : le Code de
// l'environnement, et un règlement de l'Union, d'application directe et donc
// citable comme source primaire au même titre qu'un article de code.
//
// Un décalage à connaître, et il est délibéré côté référentiel : R. 543-79,
// dans sa version au 1er janvier 2025, renvoie encore au règlement (UE)
// n° 517/2014 — abrogé par le règlement (UE) 2024/573. Le droit national
// n'a pas suivi l'abrogation. Les seuils et périodicités opposables sont donc
// à lire dans le règlement de 2024, ce que fait le référentiel.

import type { Corpus } from "./types";

export const FROID_FLUIDES: Corpus = {
  id: "froid-fluides-frigorigenes",
  intitule:
    "Contrôle d'étanchéité des fluides frigorigènes — Code de l'environnement et règlement (UE) 2024/573",
  url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031790640",
  etendue: "articles_cites",
  portee:
    "Obligation de contrôle d'étanchéité à la charge du détenteur d'équipement. Les seuils sont exprimés en tonnes équivalent CO2 et commandent la périodicité.",
  articles: [
    {
      ref: "C. env. R. 543-79",
      intitule:
        "Contrôle d'étanchéité des équipements — obligation du détenteur",
      versionEnVigueur: "2025-01-01",
      luLe: "2026-09-27",
      lecture: "api_legifrance",
      statut: "retenu",
      obligations: [
        "froid-controle-etancheite-mise-en-service",
        "froid-controle-etancheite-annuel",
        "froid-controle-etancheite-biennal-detection",
        "froid-controle-etancheite-semestriel-50t",
        "froid-controle-etancheite-annuel-50t-detection",
        "froid-controle-etancheite-trimestriel-500t",
        "froid-controle-etancheite-semestriel-500t-detection",
        "froid-controle-etancheite-apres-modification",
      ],
      historique:
        "C51 (2026-09-27), relu par l'API Légifrance (pnpm legifrance:verifier) : citationCle recopiée du texte de l'API — avant « … prévue à l'article R. 543-99. Ce contrôle », après « … prévue à l'article R. 543-99 ou d'un certificat équivalent délivré dans un des Etats membres de l'Union européenne et traduit en langue française. Ce contrôle » ; l'alternative du certificat européen était omise sans marque d'élision ; le débiteur (le détenteur), le déclencheur et les rythmes sont inchangés.",
      citationCle:
        "« Le détenteur d'un équipement dont la charge en HCFC est supérieure à deux kilogrammes, ou dont la charge en HFC ou PFC est supérieure à cinq tonnes équivalent CO2 […] fait procéder, lors de la mise en service de cet équipement, à un contrôle d'étanchéité […] par un opérateur disposant de l'attestation de capacité prévue à l'article R. 543-99 ou d'un certificat équivalent délivré dans un des Etats membres de l'Union européenne et traduit en langue française. Ce contrôle est ensuite périodiquement renouvelé dans les conditions définies par arrêté du ministre chargé de l'environnement. »",
      prescrit:
        "Impose au détenteur le contrôle d'étanchéité à la mise en service, son renouvellement périodique, et un constat écrit en cas de fuite. Renvoie encore au règlement (UE) n° 517/2014, abrogé.",
    },
    {
      ref: "Règlement UE 2024/573 art. 5",
      intitule: "Contrôles d'étanchéité — seuils et exemptions",
      versionEnVigueur: "2024-02-20",
      luLe: "2026-08-26",
      lecture: "premiere_main",
      statut: "retenu",
      obligations: [
        "froid-controle-etancheite-mise-en-service",
        "froid-controle-etancheite-annuel",
        "froid-controle-etancheite-biennal-detection",
        "froid-controle-etancheite-semestriel-50t",
        "froid-controle-etancheite-annuel-50t-detection",
        "froid-controle-etancheite-trimestriel-500t",
        "froid-controle-etancheite-semestriel-500t-detection",
        "froid-controle-etancheite-apres-modification",
      ],
      citationCle:
        "Seuil de contrôle à 5 tonnes équivalent CO2 pour les équipements fixes ; exemption des équipements hermétiquement scellés contenant moins de 10 tonnes équivalent CO2 ; exemption des appareils de commutation électrique sous conditions de taux de fuite, de dispositif d'alerte ou de charge.",
      prescrit:
        "Fixe les seuils et les exemptions du contrôle d'étanchéité. D'application directe : opposable sans transposition.",
    },
  ],
};
