// Corpus : code du travail — bruit (titre III) et vibrations mécaniques
// (titre IV), les articles que le produit cite.
//
// POURQUOI CE FICHIER EXISTE. Le PDF du DUERP — un document remis à des
// tiers — imprime, sous les mesures physiques : « bruit (R. 4432-1 et suiv.),
// éclairement (R. 4223-4), ambiances thermiques, vibrations (R. 4441-1 et
// suiv.) ». Aucun de ces deux articles n'avait jamais été ouvert. Une citation
// non fondée pèse plus lourd sur un imprimé qu'à l'écran : l'écran se corrige
// au prochain rendu, le PDF est parti.
//
// CE QUE LA LECTURE REND, ET C'EST L'INVERSE DE CE QU'ON POUVAIT CRAINDRE. Les
// deux citations sont JUSTES, et prudemment formulées : le PDF écrit « et
// suiv. », ce qui est exactement la bonne forme pour désigner un titre entier
// par son premier article. `R. 4432-1` ouvre bien les principes de prévention
// du bruit et `R. 4441-1` ouvre bien le titre des vibrations. Ni l'un ni
// l'autre n'impose quoi que ce soit de datable, et le PDF ne le prétend pas :
// il les donne comme « textes de référence », c'est-à-dire comme aide à la
// cotation. Rien à corriger sur ces deux lignes.
//
// CE QUE LA LECTURE REND EN REVANCHE, ET QUE PERSONNE N'AVAIT DEMANDÉ : le
// titre III porte une périodicité chiffrée, une seule, et elle est à
// `R. 4433-2` — « En cas de mesurage, celui-ci est renouvelé au moins tous les
// cinq ans ». Le produit collecte DÉJÀ la donnée qui la rendrait calculable :
// `Risque.dateMesuresPhysiques`, saisie sur l'écran de cotation, et affichée
// dans le PDF. Elle n'est rattachée à aucune exigence. C'est le manque le plus
// proche d'être livrable de tout ce lot, et il n'a été trouvé qu'en ouvrant le
// chapitre voisin de celui qu'on citait.
//
// `R. 4434-9` N'EST PAS CITÉ AU DIRIGEANT, contrairement à ce que le balayage
// des citations d'écran rapporte. Sa seule occurrence dans `src/` est une ligne
// de COMMENTAIRE JSX de l'écran permis de feu, qui raconte une correction faite
// le 2026-08-28 : une URL pointait `LEGIARTI000018530333` pour `R. 4224-17`,
// alors que cet identifiant sert `R. 4434-9`. Le commentaire est exact, la
// correction est faite, et rien de tout cela n'atteint le dirigeant.
// `citations-ecran.ts` le compte quand même parce qu'il n'écarte que les lignes
// COMMENÇANT par un marqueur de commentaire, et que cette ligne-ci est la
// deuxième d'un bloc `{/* … */}` : elle commence par « R. 4224-17 mais
// R. 4434-9 ». Le module dit vouloir exclure les commentaires — « un
// commentaire qui cite un article raconte une décision, souvent une
// correction », et il donne pour exemple ceux de `code-travail-secours.ts` ;
// c'est donc un faux positif au regard de sa propre règle, pas un manque de
// corpus. Il est dépouillé quand même, parce qu'un article lu vaut mieux
// qu'un article discuté, et parce que le contenu est réel.
//
// ÉTENDUE « articles_cites » : cinq articles sur les quelque trente que
// comptent les deux titres. Ce n'est pas une couverture du domaine du bruit,
// et le domaine du bruit N'EST PAS COUVERT — c'est un remboursement de dette
// de citation, plus deux articles ouverts pour comprendre ce que les autres
// disent.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-02.

import type { Corpus } from "./types";

const ART = (id: string) =>
  `https://www.legifrance.gouv.fr/codes/article_lc/${id}`;

export const CODE_TRAVAIL_BRUIT_VIBRATIONS: Corpus = {
  id: "code-travail-bruit-vibrations",
  intitule: "Code du travail — bruit et vibrations mécaniques",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018490904/",
  etendue: "articles_cites",
  portee:
    "Les articles des titres III (bruit, R. 4431-1 à R. 4437-4) et IV (vibrations mécaniques, R. 4441-1 à R. 4447-1) que le produit cite, plus ceux qu'il a fallu ouvrir pour les lire : le principe de prévention du bruit (R. 4432-1), l'évaluation et le mesurage des niveaux (R. 4433-1), leur planification et LEUR RENOUVELLEMENT AU MOINS TOUS LES CINQ ANS (R. 4433-2), la vérification de l'efficacité des mesures du chapitre (R. 4434-9) et les deux définitions qui ouvrent le titre des vibrations (R. 4441-1). NE SONT PAS OUVERTS, et le domaine ne peut donc pas se dire couvert : les seuils d'exposition de R. 4431-2, qui commandent tout le titre III ; la conservation décennale des résultats (R. 4433-3) et leur communication (R. 4433-4) ; les protecteurs auditifs individuels (R. 4434-7) ; la surveillance médicale (R. 4435-*) ; l'information et la formation (R. 4436-1) ; les dérogations (R. 4437-*) ; et la totalité du titre IV au-delà de ses définitions.",
  articles: [
    {
      ref: "R. 4432-1",
      intitule: "Principe de prévention du risque d'exposition au bruit",
      url: ART("LEGIARTI000018530378"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Pose le principe : l'employeur prend des mesures de prévention visant à supprimer ou à réduire au minimum les risques résultant de l'exposition au bruit, en tenant compte du progrès technique et de la disponibilité de mesures de maîtrise du risque à la source. Aucun seuil, aucun acte daté, aucune pièce.",
      citationCle:
        "L'employeur prend des mesures de prévention visant à supprimer ou à réduire au minimum les risques résultant de l'exposition au bruit, en tenant compte du progrès technique et de la disponibilité de mesures de maîtrise du risque à la source.",
      statut: "sans_objet",
      motif:
        "ARTICLE DE PRINCIPE, ET LA CITATION QUI LE PORTE EST EXACTE. Le PDF du DUERP l'imprime comme « texte de référence pour les mesures physiques », sous la forme « R. 4432-1 et suiv. » — c'est la bonne façon de désigner un titre par son premier article, et c'est bien lui qui ouvre les principes de prévention du bruit. L'article lui-même ne prescrit aucun acte, aucune périodicité et aucune pièce : c'est la transposition du principe général de prévention au bruit. Rien à inscrire au calendrier, et rien à corriger dans le PDF.",
    },
    {
      ref: "R. 4433-1",
      intitule: "Évaluation et, si nécessaire, mesurage des niveaux de bruit",
      url: ART("LEGIARTI000018530370"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'employeur évalue et, si nécessaire, mesure les niveaux de bruit auxquels les travailleurs sont exposés, aux deux fins de déterminer les paramètres physiques de R. 4431-1 et de constater si les valeurs d'exposition de R. 4431-2 sont dépassées.",
      citationCle:
        "L'employeur évalue et, si nécessaire, mesure les niveaux de bruit auxquels les travailleurs sont exposés. Cette évaluation et ce mesurage ont pour but : 1° De déterminer les paramètres physiques définis à l'article R. 4431-1 ; 2° De constater si, dans une situation donnée, les valeurs d'exposition fixées à l'article R. 4431-2 sont dépassées.",
      statut: "sans_objet",
      motif:
        "L'ÉVALUATION EST DÉJÀ PORTÉE, PAR LE DUERP LUI-MÊME. Le référentiel sectoriel de restauration cite cet article en clair sur sa fiche de risque bruit (« l'employeur évalue et, si nécessaire, mesure les niveaux de bruit ») : c'est la déclinaison au bruit de l'évaluation des risques de L. 4121-3, que le produit porte comme son objet principal. L'article n'ajoute donc aucune échéance propre — son « si nécessaire » ne se déclenche que sur les seuils de R. 4431-2, non ouverts, et le rythme du mesurage vit à l'article suivant. Il est ici parce que R. 4433-2 ne se lit pas sans lui.",
    },
    {
      ref: "R. 4433-2",
      intitule:
        "Planification du mesurage et renouvellement au moins tous les cinq ans",
      url: ART("LEGIARTI000018530368"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Trois règles : l'évaluation et le mesurage sont planifiés et réalisés par des PERSONNES COMPÉTENTES, avec le concours éventuel du service de santé au travail ; ils sont réalisés à des intervalles appropriés, notamment lorsqu'une modification des installations ou des modes de travail est susceptible d'élever les niveaux de bruit ; et EN CAS DE MESURAGE, CELUI-CI EST RENOUVELÉ AU MOINS TOUS LES CINQ ANS.",
      citationCle:
        "L'évaluation des niveaux de bruit et, si nécessaire, leur mesurage sont planifiés et réalisés par des personnes compétentes, avec le concours, le cas échéant, du service de santé au travail. Ils sont réalisés à des intervalles appropriés, notamment lorsqu'une modification des installations ou des modes de travail est susceptible d'entraîner une élévation des niveaux de bruit. En cas de mesurage, celui-ci est renouvelé au moins tous les cinq ans.",
      statut: "obligation_manquante",
      cause: "texte_a_lire",
      toucheLaCible: true,
      motif:
        "LA SEULE PÉRIODICITÉ CHIFFRÉE DES DEUX TITRES, ET LE PRODUIT DÉTIENT DÉJÀ LA DATE QUI LA CALCULERAIT. `Risque.dateMesuresPhysiques` est saisie sur l'écran de cotation du DUERP, sous une aide qui nomme le bruit, l'éclairement, les ambiances thermiques et les vibrations, et elle est réimprimée dans le PDF. Elle n'est rattachée à aucune exigence : personne ne dit au dirigeant que ce mesurage se renouvelle. `quinquennale` existe au modèle, `personne_qualifiee` porte la compétence exigée, et le porteur établissement conviendrait.\n\nCE QUI LE BLOQUE EST UNE CONDITION D'ENTRÉE, ET ELLE EST RÉELLE. L'obligation ne naît que « EN CAS DE MESURAGE » — c'est-à-dire une fois que le « si nécessaire » de R. 4433-1 s'est déclenché, ce qui dépend des valeurs d'exposition de R. 4431-2, article non ouvert et donnée que le produit ne détient pas. Faire naître une échéance quinquennale du seul fait qu'une date a été saisie inverserait la charge : ce serait n'exiger le renouvellement que de celui qui a déjà mesuré une fois, et rien de celui qui aurait dû. C'est très exactement le faux négatif d'ancrage corrigé sur R. 4227-34 le 2026-08-31, et l'y refaire ici serait le refaire en connaissance de cause.\n\nAJOUTÉ SANS ÊTRE CITÉ NULLE PART : cet article n'apparaît sur aucune surface. Il entre au corpus parce qu'on a ouvert le chapitre voisin de celui que le PDF cite, et il est la seule chose que ce détour ait rendue.",
    },
    {
      ref: "R. 4434-9",
      intitule: "Vérification de l'efficacité des mesures de prévention du bruit",
      url: ART("LEGIARTI000018530333"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Une phrase : l'employeur vérifie l'efficacité des mesures prises en application du chapitre IV (mesures et moyens de prévention du bruit). Un acte de vérification, sans rythme, sans pièce et sans destinataire nommé.",
      citationCle:
        "L'employeur vérifie l'efficacité des mesures prises en application du présent chapitre.",
      statut: "obligation_manquante",
      cause: "texte_a_lire",
      toucheLaCible: true,
      motif:
        "UN ACTE DE VÉRIFICATION QUE PERSONNE NE RÉCLAME, et c'est bien une obligation d'employeur — pas une définition, pas un renvoi. Elle ferme le chapitre IV comme une boucle : après avoir pris des mesures, en vérifier l'effet.\n\nPOURQUOI `obligation_manquante` PLUTÔT QUE `non_couvert`, puisque le domaine du bruit n'est effectivement pas servi. `non_couvert` dit « on a choisi de ne pas le porter, et on le dit à l'utilisateur ». Ni l'une ni l'autre moitié n'est vraie ici : aucune décision n'a jamais été prise sur ce domaine — l'inventaire de la partie IV le range comme « jamais ouvert » —, et aucune surface ne l'annonce à qui que ce soit. Surtout, les manques `non_couvert` du référentiel visent des établissements que le produit NE SERT PAS ; celui-ci vise un restaurant avec musique et lave-vaisselle, c'est-à-dire la cible même. Le classer là-bas ferait passer une dette pour une non-question, ce que `perimetre.ts` interdit en toutes lettres.\n\nCE QUI LE BLOQUE : aucun rythme dans le texte, et surtout aucun objet à vérifier tant que le produit ne sait pas quelles mesures ont été prises. Son déclenchement suppose un dépassement des valeurs de R. 4431-2, donc un mesurage — la même condition d'entrée que R. 4433-2, et le même trou.",
    },
    {
      ref: "R. 4441-1",
      intitule: "Définitions des vibrations mains-bras et corps entier",
      url: ART("LEGIARTI000018530289"),
      versionEnVigueur: "2008-05-01",
      modifiePar: null,
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Deux définitions, et rien d'autre : la vibration transmise aux mains et aux bras (troubles vasculaires, lésions ostéo-articulaires, troubles neurologiques ou musculaires) et la vibration transmise à l'ensemble du corps (lombalgies, microtraumatismes de la colonne vertébrale).",
      citationCle:
        "Au sens du présent titre, on entend par : 1° Vibration transmise aux mains et aux bras, une vibration mécanique qui, lorsqu'elle est transmise aux mains et aux bras chez l'homme, entraîne des risques pour la santé et la sécurité des travailleurs, notamment des troubles vasculaires, des lésions ostéo-articulaires ou des troubles neurologiques ou musculaires ; 2° Vibration transmise à l'ensemble du corps, une vibration mécanique qui, lorsqu'elle est transmise à l'ensemble du corps, entraîne des risques pour la santé et la sécurité des travailleurs, notamment des lombalgies et des microtraumatismes de la colonne vertébrale.",
      statut: "sans_objet",
      motif:
        "ARTICLE DE DÉFINITIONS PUR : il ne prescrit rien à personne. La citation du PDF du DUERP — « vibrations (R. 4441-1 et suiv.) », donnée comme texte de référence pour les mesures physiques — est exacte : c'est bien l'article qui ouvre le titre IV, et « et suiv. » ne prétend pas qu'il porte lui-même une obligation. Le déclencheur du titre est un outil vibrant tenu à la main ou un engin conduit, rare dans les trois secteurs cibles ; le reste du titre n'est pas ouvert, et la conservation décennale de R. 4444-3 qu'un sommaire de page annonce n'a PAS été vérifiée à la source par ce lot.",
    },
  ],
};
