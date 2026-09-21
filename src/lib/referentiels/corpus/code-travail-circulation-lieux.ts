// Corpus : code du travail — circulation dans les lieux de travail, les deux
// articles auxquels l'arrêté du 4 novembre 1993 (signalisation) renvoie.
//
// POURQUOI CE FICHIER EXISTE. L'article 13 de cet arrêté impose de border les
// voies de circulation d'une bande continue « lorsque [elles] doivent être
// clairement identifiées en application des articles R. 4214-11 ou R. 4224-3 ».
// Le corpus le classait « texte à lire » : aucun des deux n'avait été ouvert.
// Ils le sont, le 2026-09-21, chacun sur sa page propre.
//
// CE QUE LA LECTURE REND. Les deux articles ne s'adressent pas à la même
// personne. `R. 4214-11` est au Titre Ier — « Obligations du MAÎTRE D'OUVRAGE
// pour la conception des lieux de travail » — : c'est une règle de
// construction. `R. 4224-3` est au Titre II, obligations de l'EMPLOYEUR, et il
// ne parle ni de marquage ni d'identification : il pose un résultat, la
// circulation sûre des piétons et des véhicules. Ce qui décide du marquage de
// l'article 13 est donc un FAIT de l'établissement — des véhicules y
// circulent-ils ? — que personne ne demande au dirigeant.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_CIRCULATION_LIEUX: Corpus = {
  id: "code-travail-circulation-lieux",
  intitule:
    "Code du travail — circulation dans les lieux de travail (R. 4214-11 et R. 4224-3)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018488972/",
  etendue: "articles_cites",
  portee:
    "Deux articles seulement, ceux que l'article 13 de l'arrêté du 4 novembre 1993 nomme. Le reste de la section « Voies de circulation et accès » (R. 4214-9 à R. 4214-17) et de la section « Caractéristiques des lieux de travail » (R. 4224-1 à R. 4224-8) n'est PAS dépouillé.",
  articles: [
    {
      ref: "R. 4214-11",
      intitule: "Marquage au sol des voies de circulation — conception des lieux de travail",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532497",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-21",
      lecture: "agent_verbatim",
      prescrit:
        "Dès que l'importance de la circulation des véhicules ou le danger lié à l'usage et à l'équipement des locaux le justifie, le marquage au sol des voies de circulation est mis en évidence, selon la réglementation de la signalisation. S'adresse au maître d'ouvrage.",
      citationCle:
        "Dès que l'importance de la circulation des véhicules ou le danger lié à l'utilisation et à l'équipement des locaux le justifie, le marquage au sol des voies de circulation est mis en évidence. Ce marquage obéit à la réglementation en vigueur relative à la signalisation dans les lieux de travail.",
      statut: "hors_perimetre",
      exclusion: "construction",
      motif:
        "Titre Ier du Livre II : « Obligations du maître d'ouvrage pour la conception des lieux de travail », section « Voies de circulation et accès » — fil d'Ariane relevé le 2026-09-21. Règle de conception, qui ne pèse pas sur l'exploitant d'un local existant. C'est pourtant ELLE qui porte le critère — « l'importance de la circulation des véhicules » — dont l'article 13 de l'arrêté de 1993 a besoin.",
    },
    {
      ref: "R. 4224-3",
      intitule: "Circulation sûre des piétons et des véhicules",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532231",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-21",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur aménage ses lieux de travail, intérieurs et extérieurs, pour que piétons et véhicules y circulent de manière sûre. Obligation de résultat : ni acte, ni pièce, ni rythme.",
      citationCle:
        "Les lieux de travail intérieurs et extérieurs sont aménagés de telle façon que la circulation des piétons et des véhicules puisse se faire de manière sûre.",
      statut: "obligation_manquante",
      cause: "a_trancher",
      toucheLaCible: true,
      motif:
        "Obligation d'employeur réelle, sans seuil, que le référentiel ne porte pas. Elle est de la même espèce que `R. 4223-4` (éclairement) : un RÉSULTAT matériel, sans acte à faire ni écrit à tenir. La porter en état permanent donnerait une case « la circulation est sûre chez moi » — une déclaration qui ressemble à une preuve, ce que l'ADR-027 interdit. La voie qui l'ouvrirait est le DUERP, où la circulation interne est un risque à coter, pas le calendrier de conformité. D'où `a_trancher` : ce n'est pas un blocage technique. TROUVÉE EN OUVRANT L'ARTICLE POUR UN AUTRE : le compte des manquantes monte d'une unité, et c'est le produit normal d'une lecture.",
    },
  ],
};
