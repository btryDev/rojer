// Corpus : code du travail — manutention manuelle des charges et travail sur
// écran de visualisation.
//
// Étendue « articles_cites » : deux articles, un par chapitre. Le chapitre Ier
// du titre IV (manutention, R. 4541-1 à R. 4541-10) et le chapitre II
// (écrans, R. 4542-1 à R. 4542-19) ne sont dépouillés ni l'un ni l'autre : les
// obligations d'aménagement, d'évaluation des postes et d'examen
// ophtalmologique qu'ils portent aussi n'ont pas été ouvertes.
//
// CE QUE CE DÉPOUILLEMENT A CONFIRMÉ. Les deux références du brief du lot 8
// étaient exactes, ce qui n'a pas été le cas partout : `R. 4541-8` porte bien
// l'information et la formation à la manutention manuelle, `R. 4542-16` bien
// l'information et la formation au travail sur écran. Les vérifier n'était pas
// perdu — c'est en les ouvrant qu'on constate ce que les deux articles ne
// disent PAS.
//
// AUCUN DES DEUX N'ÉCRIT DE DURÉE DE VALIDITÉ NI DE RECYCLAGE. On lit
// couramment que la formation « gestes et postures » se renouvelle tous les
// deux ou cinq ans. Aucun de ces rythmes n'est dans le Code : ce sont des
// pratiques d'organismes de formation. Les deux obligations portent
// `periodicite: "autre"`.
//
// AUCUN DES DEUX NE PRODUIT DE TITRE NOMINATIF, et c'est ce qui a décidé de
// leur porteur. Le critère appliqué est celui du lot 7 : une formation devient
// un titre de salarié quand le texte la date par personne ET lui fait produire
// une pièce nominative. `R. 4541-8` ne fait ni l'un ni l'autre ; `R. 4542-16`
// date bien par personne — « avant sa première affectation » — mais ne produit
// aucune pièce. Surtout, ni l'un ni l'autre ne désigne des personnes que le
// produit sait nommer : « les travailleurs dont l'activité comporte des
// manutentions manuelles » est une qualification que ni le parc d'équipements
// ni le code NAF ne donnent. Un titre que personne ne sait attribuer ne produit
// aucune ligne (ADR-023). Les deux obligations sont donc portées par
// l'établissement.
//
// CINQ ARTICLES DE PLUS LE 2026-09-26, lus pour les référentiels de risques du
// DUERP (`commun.ts`, `bureau.ts`) et non pour une obligation : `R. 4541-2`,
// `R. 4541-3`, `R. 4541-9`, `R. 4542-1` et `R. 4542-4`. Le risque `trv-charges`
// attribuait à `R. 4541-2` l'obligation d'éviter la manutention manuelle, qui
// est à `R. 4541-3` — `R. 4541-2` n'est qu'une définition — et résumait
// `R. 4541-9` en « limites hautes avec avis médical », là où son second alinéa
// fixe 25 et 40 kilogrammes pour les femmes, sans avis médical. Le travail sur
// écran se disait « plus de 4 heures par jour » : `R. 4542-1` ne chiffre rien.
// Chacun est lu sur sa page propre, structure demandée d'abord, formulation
// décisive confirmée par une seconde lecture ciblée. Tous `sans_objet` : aucun
// ne produit d'échéance ; les descriptions des risques les citent mot pour
// mot, et `referentiels/citations-risques.test.ts` les confronte à ce relevé.

import type { Corpus } from "./types";

export const CODE_TRAVAIL_MANUTENTION_ECRAN: Corpus = {
  id: "code-travail-manutention-ecran",
  intitule:
    "Code du travail — formation à la manutention manuelle et au travail sur écran",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018492445/",
  etendue: "articles_cites",
  portee:
    "Deux formations que le titre IV impose sans condition d'équipement : l'information et la formation à la manutention manuelle (R. 4541-8) et l'information et la formation au travail sur écran de visualisation (R. 4542-16). Ce sont les deux plus universelles dans les trois secteurs cibles du produit. Le reste des deux chapitres — évaluation des postes, aménagement, ambiances, examen ophtalmologique, arrêté sur les facteurs individuels de risque — n'est pas dépouillé.",
  articles: [
    {
      ref: "R. 4541-8",
      intitule:
        "Information et formation des travailleurs dont l'activité comporte des manutentions manuelles",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528891",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-08-31",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur fait bénéficier les travailleurs dont l'activité comporte des manutentions manuelles d'une information sur les risques encourus et d'une formation adéquate à la sécurité, essentiellement pratique, portant sur les gestes et postures.",
      citationCle:
        "2° D'une formation adéquate à la sécurité relative à l'exécution de ces opérations. Au cours de cette formation, essentiellement à caractère pratique, les travailleurs sont informés sur les gestes et postures à adopter pour accomplir en sécurité les manutentions manuelles.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-manutention"],
      reserve:
        "L'arrêté prévu à R. 4541-6, qui définit les « facteurs individuels de risque » auxquels le 1° renvoie, n'a pas été recherché : aucune obligation ne s'y appuie et son contenu n'est pas encodé. Le porteur établissement fait par ailleurs perdre la traçabilité nominative — l'outil ne saura pas QUI a été formé. C'est un coût assumé, préféré au faux négatif d'un titre que personne ne sait attribuer.",
    },
    {
      ref: "R. 4542-16",
      intitule:
        "Information et formation des travailleurs sur écran de visualisation",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528838",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "L'employeur assure l'information et la formation des travailleurs sur les modalités d'utilisation de l'écran et de l'équipement dans lequel il est intégré, avant la première affectation et à chaque modification substantielle du poste.",
      citationCle:
        "L'employeur assure l'information et la formation des travailleurs sur les modalités d'utilisation de l'écran et de l'équipement de travail dans lequel cet écran est intégré. Chaque travailleur en bénéficie avant sa première affectation à un travail sur écran de visualisation et chaque fois que l'organisation du poste de travail est modifiée de manière substantielle.",
      statut: "retenu",
      obligations: ["formation-securite-etablissement-travail-sur-ecran"],
      reserve:
        "Le second déclenchement — « chaque fois que l'organisation du poste de travail est modifiée de manière substantielle » — est un événement non daté et non détectable par le produit. Il est porté par la description de l'obligation, jamais par une échéance : c'est la position de `.claude/CLAUDE.md` sur l'absence de sixième déclencheur. Le reste du chapitre II, dont l'analyse des postes (R. 4542-3) et l'examen ophtalmologique approprié (R. 4542-17), n'est pas dépouillé.",
    },
    {
      ref: "R. 4541-2",
      intitule: "Définition de la manutention manuelle",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528909",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit: "Rien : l'article définit la manutention manuelle.",
      citationCle:
        "On entend par manutention manuelle, toute opération de transport ou de soutien d'une charge, dont le levage, la pose, la poussée, la traction, le port ou le déplacement, qui exige l'effort physique d'un ou de plusieurs travailleurs.",
      statut: "sans_objet",
      motif:
        "UNE DÉFINITION, ET C'EST POUR LE DIRE QU'ELLE EST ICI. La description du risque transverse `trv-charges` lui attribuait « l'obligation d'éviter le recours à la manutention manuelle » jusqu'au 2026-09-26 ; l'article n'emploie ni « éviter » ni « employeur » (seconde lecture ciblée). L'obligation est à R. 4541-3. Aucune échéance.",
    },
    {
      ref: "R. 4541-3",
      intitule: "Éviter le recours à la manutention manuelle",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528905",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "L'employeur prend les mesures d'organisation ou utilise les moyens appropriés, notamment mécaniques, pour éviter le recours à la manutention manuelle de charges.",
      citationCle:
        "L'employeur prend les mesures d'organisation appropriées ou utilise les moyens appropriés, et notamment les équipements mécaniques, afin d'éviter le recours à la manutention manuelle de charges par les travailleurs.",
      statut: "sans_objet",
      motif:
        "Principe de prévention appliqué à la manutention, sans acte daté ni pièce : il se traite dans l'évaluation des risques que le DUERP porte. Cité mot pour mot dans la description du risque transverse `trv-charges`.",
    },
    {
      ref: "R. 4541-9",
      intitule: "Charges maximales portées de façon habituelle",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528889",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "Quand la manutention manuelle est inévitable et que les aides mécaniques de R. 4541-5 ne peuvent être mises en œuvre : au-delà de 55 kg portés habituellement, aptitude reconnue par le médecin du travail, 105 kg au plus. Pour les femmes, 25 kg portés, 40 kg à la brouette, brouette comprise — sans avis médical.",
      citationCle:
        "un travailleur ne peut être admis à porter d'une façon habituelle des charges supérieures à 55 kilogrammes qu'à condition d'y avoir été reconnu apte par le médecin du travail, sans que ces charges puissent être supérieures à 105 kilogrammes. Toutefois, les femmes ne sont pas autorisées à porter des charges supérieures à 25 kilogrammes ou à transporter des charges à l'aide d'une brouette supérieures à 40 kilogrammes, brouette comprise.",
      statut: "sans_objet",
      motif:
        "Des plafonds de poids, sans échéance. La `citationCle` commence après la condition d'entrée du premier alinéa (« Lorsque le recours à la manutention manuelle est inévitable et que les aides mécaniques prévues au 2° de l'article R. 4541-5 ne peuvent pas être mises en œuvre, ») : deux lectures ont rendu « œuvre » avec la ligature, et la graphie de Légifrance a déjà trompé ce dépôt (`L. 4121-2`, C28) — la condition est donc citée en prose, jamais entre guillemets. Le second alinéa, lu deux fois, ne mentionne ni médecin ni aptitude : la description de `trv-charges` qui parlait de « limites hautes avec avis médical » taisait les 25 et 40 kilogrammes.",
    },
    {
      ref: "R. 4542-1",
      intitule: "Champ du chapitre écrans de visualisation",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528877",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "Le chapitre s'applique aux travailleurs qui utilisent un écran de façon habituelle et pendant une partie non négligeable du temps de travail, sauf cinq catégories d'équipements.",
      citationCle:
        "Les dispositions du présent chapitre s'appliquent aux travailleurs qui utilisent de façon habituelle et pendant une partie non négligeable du temps de travail des équipements de travail comportant des écrans de visualisation.",
      statut: "sans_objet",
      motif:
        "Article de champ. Il ne chiffre AUCUNE durée (seconde lecture ciblée) : le seuil de « plus de 4 heures par jour » que portaient la description de `trv-tms-ecran` et la question `q-ecran` n'avait pas de source et a été retiré le 2026-09-26. Les cinq exclusions (1° à 5°, dont les caisses enregistreuses) ne sont pas recopiées ici.",
    },
    {
      ref: "R. 4542-4",
      intitule: "Interruption du travail quotidien sur écran",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018528867",
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-26",
      lecture: "premiere_main",
      prescrit:
        "L'employeur organise l'activité pour que le temps quotidien de travail sur écran soit périodiquement interrompu par des pauses ou des changements d'activité.",
      citationCle:
        "L'employeur organise l'activité du travailleur de telle sorte que son temps quotidien de travail sur écran soit périodiquement interrompu par des pauses ou par des changements d'activité réduisant la charge de travail sur écran.",
      statut: "sans_objet",
      motif:
        "Obligation d'organisation sans rythme chiffré — ni durée, ni « 20 », ni distance (seconde lecture ciblée). Elle remplace dans les mesures `trv-ecran-pauses` et `bur-pauses-ecran` la « règle 20-20-20 », qu'aucune source du dépôt ne porte.",
    },
  ],
};
