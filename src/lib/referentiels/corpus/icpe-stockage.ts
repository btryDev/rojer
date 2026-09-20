// Corpus : installations classées — les trois régimes, et la rétention.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.
//
// L'INTITULÉ DISAIT « HORS PÉRIMÈTRE PRODUIT », ET CE N'EST PLUS VRAI depuis le
// recadrage tranché le 2026-09-01 (ADR-025 § 1). L'ICPE ne figure plus parmi
// les régimes refusés : « Tout le reste se déclare et ne se refuse pas […] on
// refuse ce qu'on ne peut pas servir, pas ce qu'on ne couvre pas entièrement. »
// Deux refus subsistent à l'entrée d'un dossier — plus de cinquante
// travailleurs, et un ERP situé dans un IGH — et l'ICPE n'en est pas.

import type { Corpus } from "./types";

export const ICPE_STOCKAGE: Corpus = {
  id: "icpe-stockage",
  intitule: "Installations classées — les trois régimes, et la rétention",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074220/LEGISCTA000006159273/",
  etendue: "articles_cites",
  portee:
    "Les trois régimes ICPE — autorisation (L. 512-1), enregistrement (L. 512-7), déclaration (L. 512-8) — et les valeurs de rétention de l'arrêté du 1er juin 2015. L'autorisation n'est pratiquement jamais atteinte dans les secteurs couverts ; l'enregistrement et la déclaration, si : une chambre froide, un stockage de gaz ou une installation de réfrigération peuvent y soumettre un commerce ou un restaurant.",
  articles: [
    {
      ref: "C. env. L. 512-1",
      intitule: "Installations soumises à autorisation environnementale",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033933233",
      versionEnVigueur: "2017-03-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Deux phrases, et rien de plus : elles posent le SEUL régime de l'autorisation — les installations qui présentent de graves dangers ou inconvénients pour les intérêts de L. 511-1 —, et renvoient la procédure à l'autorisation environnementale du livre Ier. Aucune démarche d'exploitant n'y est décrite, aucun seuil, aucune rubrique.",
      citationCle:
        "Sont soumises à autorisation les installations qui présentent de graves dangers ou inconvénients pour les intérêts mentionnés à l'article L. 511-1. L'autorisation, dénommée autorisation environnementale, est délivrée dans les conditions prévues au chapitre unique du titre VIII du livre Ier.",
      statut: "retenu",
      obligations: ["stockage-dangereux-declaration-icpe"],
      historique:
        "RÉSERVE LEVÉE LE 2026-09-01 (lot C). Elle disait : « UN SEUL DES TROIS RÉGIMES […] les deux articles réellement utiles à un commerce ou un restaurant, L. 512-7 et L. 512-8, ne sont ni cités ni au corpus. » Ils le sont désormais, chacun avec son entrée et son verbatim, et `stockage-dangereux-declaration-icpe` les cite avec leur clé d'article. Ce qui subsiste ici est le CHEMIN, qui explique pourquoi cet article-ci ne pouvait pas porter les trois : Livre V, Titre Ier, Chapitre II, SECTION 1 « Installations soumises à autorisation ». L'enregistrement est à la section 2, la déclaration à la section 3.\n\nÀ ne pas confondre avec la nomenclature : ce n'est pas cet article qui classe, c'est le décret de nomenclature pris pour L. 511-2. L'article ne dit pas quelles quantités déclenchent quoi.",
    },
    {
      ref: "C. env. L. 512-7",
      intitule: "Installations soumises à enregistrement (autorisation simplifiée)",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042654882",
      versionEnVigueur: "2020-12-09",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Pose le régime de l'ENREGISTREMENT, dénommé « autorisation simplifiée » : les installations qui présentent des dangers ou inconvénients graves pour les intérêts de L. 511-1 lorsque ceux-ci peuvent, en principe, être prévenus par le respect de prescriptions générales édictées par le ministre. Comme L. 512-1, c'est un article de RÉGIME et non de démarche : il dit à quelle porte une installation se présente, pas ce que l'exploitant doit déposer — la procédure est aux articles L. 512-7-1 et suivants. Chemin : Partie législative > Livre V > Titre Ier > Chapitre II > SECTION 2 « Installations soumises à enregistrement ».",
      citationCle:
        "Sont soumises à autorisation simplifiée, sous la dénomination d'enregistrement, les installations qui présentent des dangers ou inconvénients graves pour les intérêts mentionnés à l'article L. 511-1, lorsque ces dangers et inconvénients peuvent, en principe, eu égard aux caractéristiques des installations et de leur impact potentiel, être prévenus par le respect de prescriptions générales édictées par le ministre chargé des installations classées.",
      statut: "retenu",
      obligations: ["stockage-dangereux-declaration-icpe"],
      reserve:
        "LA PROCÉDURE N'EST PAS PORTÉE, et ce n'est pas la même chose que le régime. `stockage-dangereux-declaration-icpe` fait vérifier à l'exploitant SOUS QUEL RÉGIME il tombe ; les articles L. 512-7-1 à L. 512-7-7 — contenu du dossier, consultation du public, arrêté préfectoral, basculement possible vers l'autorisation — ne sont pas dépouillés. Le manque est celui d'un accompagnement de procédure, pas d'une échéance.",
    },
    {
      ref: "C. env. L. 512-8",
      intitule: "Installations soumises à déclaration",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006834242",
      versionEnVigueur: "2017-03-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Deux alinéas. Le premier pose le régime de la DÉCLARATION : les installations qui, ne présentant pas de graves dangers ou inconvénients pour les intérêts de L. 511-1, doivent néanmoins respecter les prescriptions générales édictées par le préfet. C'est le régime le plus bas des trois, et le seul qu'un commerce ou un restaurant rencontre couramment. Le second rattache à la déclaration les installations, ouvrages, travaux et activités « loi sur l'eau » que leur connexité rend nécessaires, et lui fait valoir application des articles L. 214-3 à L. 214-6. Article de RÉGIME : il ne décrit ni le formulaire, ni le délai — la procédure est aux articles L. 512-9 et suivants. Chemin : Partie législative > Livre V > Titre Ier > Chapitre II > SECTION 3 « Installations soumises à déclaration ».",
      citationCle:
        "Sont soumises à déclaration les installations qui, ne présentant pas de graves dangers ou inconvénients pour les intérêts visés à l'article L. 511-1, doivent néanmoins respecter les prescriptions générales édictées par le préfet en vue d'assurer dans le département la protection des intérêts visés à l'article L. 511-1. La déclaration inclut les installations, ouvrages, travaux et activités relevant du II de l'article L. 214-3 projetés par le pétitionnaire que leur connexité rend nécessaires à l'installation classée ou dont la proximité est de nature à en modifier notablement les dangers ou inconvénients. La déclaration vaut application des dispositions des articles L. 214-3 à L. 214-6.",
      statut: "retenu",
      obligations: ["stockage-dangereux-declaration-icpe"],
      reserve:
        "DEUX CHOSES QUE LE RÉFÉRENTIEL NE PORTE PAS, et qui ne sont pas des oublis de ce lot.\n\n(1) LA PROCÉDURE — L. 512-9 et s. : dépôt de la déclaration avant la mise en service, preuve de dépôt, contrôles périodiques du régime déclaratif soumis à contrôle (« DC »). Aucun de ces articles n'est dépouillé. Le contrôle périodique du régime DC serait une échéance récurrente réelle, mais sa périodicité dépend de la rubrique de nomenclature, que le produit ne détient pas.\n\n(2) CE QUI CLASSE. Ni cet article ni les deux autres ne disent quelles quantités déclenchent quel régime : c'est le décret de nomenclature pris pour L. 511-2. Le produit ne détient pas les quantités stockées, et il ne les devine pas (ADR-023) — c'est pourquoi l'obligation encodée fait VÉRIFIER le régime au lieu de le déduire.",
    },
    {
      ref: "Arrêté 2015-06-01 art. 22",
      intitule: "Rétentions",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000030684466",
      versionEnVigueur: "2022-01-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Fixe, pour les seules installations ENREGISTRÉES au titre des rubriques 4331 ou 4734, le dimensionnement et la tenue des capacités de rétention : le volume minimal (I.A), l'étanchéité et sa pérennité (I.B), la résistance (I.C), l'évacuation des eaux accumulées et la disponibilité permanente de la rétention (I.D), puis des régimes particuliers pour les réservoirs aériens (III), les récipients mobiles (IV), les bâtiments (V) et les rétentions déportées (VI). C'est une exigence d'état permanent : aucune vérification datée de la rétention elle-même.",
      citationCle:
        "Tout stockage de produits liquides susceptibles de créer une pollution de l'eau ou du sol, autres que ceux visés aux points III ; IV et VI de l'article 22 est associé à une capacité de rétention dont le volume est au moins égal à la plus grande des deux valeurs suivantes : -100 % de la capacité du plus grand réservoir ; -50 % de la capacité globale des réservoirs et récipients associés.",
      statut: "retenu",
      obligations: ["stockage-dangereux-retention"],
      reserve:
        "TROIS CHOSES RELEVÉES LE 2026-09-01, ARTICLE LU EN ENTIER.\n\n(1) LE CAS DES PETITS RÉCIPIENTS MANQUE, et c'est celui de tout le périmètre du produit. Le second alinéa du I.A écrit : « Lorsque le stockage est constitué exclusivement de récipients mobiles de capacité unitaire inférieure ou égale à 250 litres, le volume minimal de la rétention est égal soit à la capacité totale des récipients si cette capacité est inférieure à 800 litres, soit à 20 % de la capacité totale avec un minimum de 800 litres si cette capacité excède 800 litres. » Un restaurant ou un commerce stocke des bidons, pas des réservoirs : c'est cette règle-là qui leur parlerait, et la `description` de l'obligation ne cite que celle des réservoirs.\n\n(2) AUCUNE VÉRIFICATION PÉRIODIQUE D'ÉTANCHÉITÉ n'y figure. Ce que l'article impose est un état et une procédure : « La rétention est étanche aux produits qu'elle pourrait contenir. L'exploitant s'assure dans le temps de la pérennité de ce dispositif » (I.B), et « La rétention et ses dispositifs associés font l'objet d'une surveillance et d'une maintenance appropriées, définies dans une procédure » (I.F). La seule fréquence chiffrée de tout l'article est au VI.6, et elle vise autre chose : les dispositifs ACTIFS de drainage des rétentions déportées, testés « à une fréquence à minima semestrielle ». Ce semestre ne se transporte pas sur `stockage-dangereux-verification-etancheite`.\n\n(3) LE CHAMP EST L'ENREGISTREMENT SEUL — rubriques 4331 ou 4734. Ni la déclaration, ni le hors-ICPE. La `reference` de l'obligation le dit déjà (« opposables uniquement sous ce régime ICPE ») ; c'est exact, et cela reste vrai après lecture.",
    },
  ],
};
