// Corpus : arrêté du 8 octobre 1987 — contrôle périodique des installations d'aération.
//
// Étendue « articles_cites » : seuls les articles que le référentiel cite.

import type { Corpus } from "./types";

export const ARRETE_1987_10_08_AERATION: Corpus = {
  id: "arrete-1987-10-08-aeration",
  intitule:
    "Arrêté du 8 octobre 1987 — contrôle périodique des installations d'aération",
  url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000863044/",
  etendue: "articles_cites",
  portee:
    "Pris pour R. 4222-20. L'article 4 fixe le contrôle annuel des locaux à pollution spécifique, et un contrôle semestriel supplémentaire lorsqu'il existe un système de recyclage.",
  articles: [
    {
      ref: "Arrêté 1987-10-08 art. 2",
      intitule: "Dossier de l'installation",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000863044/",
      versionEnVigueur: "1988-04-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      prescrit:
        "Impose au chef d'établissement de tenir à jour DEUX documents et de les tenir à la disposition de l'inspection du travail, des agents des services de prévention et du CHSCT. Le a) — installations nouvelles et installations ayant fait l'objet de modifications notables — est la notice d'instruction, complétée d'un DOSSIER DE VALEURS DE RÉFÉRENCE à établir au plus tard UN MOIS après la première mise en service. Le b) — toutes les installations — est la consigne d'utilisation, complétée d'un dossier de maintenance où sont portés les dates et résultats des contrôles, les opérations d'entretien et de nettoyage, et les aménagements apportés. Entré au corpus le 2026-09-01 : c'est le seul article de la chaîne qui date un acte par la mise en service, et `aeration-travail-mise-en-service` s'ancrait sur l'article 3, qui ne le porte pas.",
      citationCle:
        "Ce dossier doit être établi, au plus tard, un mois après la première mise en service des installations.",
      statut: "retenu",
      obligations: ["aeration-travail-mise-en-service"],
      reserve:
        "DEUX EXIGENCES DE L'ARTICLE NE SONT PORTÉES NULLE PART, relevées au corpus le 2026-09-01 sous l'article 3 et confirmées ici. (1) La TENUE À JOUR du dossier et sa mise à disposition de l'inspection du travail, des services de prévention et du CHSCT : un état permanent, sans porteur. (2) Le b) désigne « la consigne d'utilisation prescrite par l'article R. 232-5-9 du code du travail » — numérotation d'avant la recodification de 2008, aujourd'hui R. 4222-21 —, écrit que le référentiel n'encode pas davantage, et qui est la raison pour laquelle R. 4222-21 est classé `obligation_manquante`. Le lot A ne crée pas d'obligation.\n\nRENVOI À UNE NUMÉROTATION ABROGÉE, à ne pas recopier : le a) vise « l'article R. 235-10 du code du travail », disparu à la recodification de 2008.",
    },
    {
      ref: "Arrêté 1987-10-08 art. 3",
      intitule: "Locaux à pollution non spécifique",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000863044/",
      versionEnVigueur: "1988-04-01",
      luLe: "2026-08-27",
      lecture: "premiere_main",
      prescrit:
        "Deux temps. Le 1 fixe ce que le dossier de valeurs de référence doit contenir pour les locaux à pollution NON spécifique. Le 2 porte l'ANNUELLE — quatre opérations, dont le contrôle du débit global minimal d'air neuf —, dont les résultats vont au dossier de maintenance de l'article 2 (b). Aucun réalisateur n'est désigné.",
      citationCle:
        "Au minimum une fois par an, les opérations suivantes doivent être effectuées et leurs résultats portés sur le dossier de maintenance mentionné à l'article 2 (b) : contrôle du débit global minimal d'air neuf de l'installation ; examen de l'état des éléments de l'installation (système d'introduction et d'extraction, gaines, ventilateurs) […] ; examen de l'état des systèmes de traitement de l'air (humidificateur, batterie d'échangeurs) ; lorsque le dossier de valeurs de référence est constitué, contrôle des pressions statiques ou des vitesses d'air aux points caractéristiques de l'installation.",
      statut: "retenu",
      obligations: [
        // Cité en contexte par la mise en service : le 1 dit ce que le dossier
        // de valeurs de référence doit contenir, donc ce que les mesures
        // initiales portent. Le délai d'un mois, lui, est à l'article 2 a).
        "aeration-travail-mise-en-service",
        // Le rythme annuel de l'obligation portée par l'établissement vient
        // de cet article : R. 4222-20 dit « régulièrement » sans chiffre.
        "aeration-controle-installations-r4222-20",
      ],
      reserve:
        "CE QUE L'ARTICLE NE DIT PAS, relevé le 2026-09-10 en relisant le verbatim à la source. Il fixe un intervalle — « au minimum une fois par an » — et **ne dit pas d'où il part** : ni la vérification précédente, ni une date civile, ni la mise en service. Il ne dit pas davantage ce qu'il advient quand une PARTIE seulement de l'installation a été contrôlée dans l'année. Ces deux silences ont été cherchés, pas supposés : R. 4222-20 (aucun chiffre), cet article, et le focus juridique INRS « Contrôle des installations de ventilation » ne les comblent pas. Toute règle produit sur l'ancrage de l'échéance est donc une DÉDUCTION, et doit se présenter comme telle. Ce qui est en revanche écrit, à l'article 2 b) et repris par l'INRS ED 6008 p. 5 (« un dossier d'installation pour chaque installation »), c'est que la trace est tenue PAR INSTALLATION et porte « les dates et les résultats des contrôles périodiques ».\n\nCORRIGÉ LE 2026-09-01 (lot A). LE MOIS N'EST PAS DANS CET ARTICLE : `aeration-travail-mise-en-service` décrivait un contrôle « au plus tard un mois après la mise en service » et s'ancrait ici ; or ce délai est à l'ARTICLE 2 a), et il ne porte pas sur un contrôle mais sur l'établissement du DOSSIER DE VALEURS DE RÉFÉRENCE. L'article 2 est entré au corpus et porte désormais le fondement ; l'article 3 reste cité, en contexte, pour le contenu du dossier.\n\nUne autre chose tenue par l'article 2 et encodée nulle part : il rend le chef d'établissement responsable de TENIR À JOUR ce dossier et de le tenir à disposition de l'inspection du travail, des services de prévention et du CHSCT.\n\nDEUX RENVOIS À UNE NUMÉROTATION ABROGÉE, à ne pas recopier. LES DEUX RENVOIS MORTS SONT DANS LE TEXTE OFFICIEL, pas dans le référentiel : c'est l'arrêté du 8 octobre 1987 lui-même, tel que Légifrance le publie aujourd'hui, qui les porte — son visa comme son article 2. Relevé le 2026-09-01, article 2 relu à la source le même jour.\n\n(1) Le a) fait tenir à jour « la notice d'instruction en application de l'article R. 235-10 du code du travail ». Correspondance vérifiée le 2026-09-01 sur le CONTENU : `R. 4212-7`, aux termes duquel « le maître d'ouvrage précise, dans une notice d'instructions qu'il transmet à l'employeur, les dispositions prises pour la ventilation et l'assainissement des locaux et les informations nécessaires à l'entretien des installations, au contrôle de leur efficacité et à l'établissement de la consigne d'utilisation prévue à l'article R. 4222-21 ». Même acteur, même acte, même objet.\n\n(2) Le b) désigne « la consigne d'utilisation prescrite par l'article R. 232-5-9 du code du travail ». Correspondance vérifiée le 2026-09-01 sur le CONTENU : `R. 4222-21`, « L'employeur indique dans une consigne d'utilisation les dispositions prises pour la ventilation et fixe les mesures à prendre en cas de panne des installations » — et R. 4212-7 nomme cette consigne par ce numéro, ce qui referme la boucle entre les deux renvois. C'est le même écrit que celui relevé sous R. 4222-21 dans `code-travail-risque-chimique`, vu par l'autre bout.\n\nAucune des deux correspondances ne vient d'une table de concordance — aucune n'a été lue. Elles viennent de l'identité d'acteur, d'acte et d'objet, constatée sur les verbatims. C'est dit ici pour que le prochain lecteur sache exactement ce qui a été vérifié.",

    },
    {
      ref: "Arrêté 1987-10-08 art. 4",
      intitule: "Locaux à pollution spécifique",
      url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000863044/",
      versionEnVigueur: "1988-04-01",
      luLe: "2026-09-01",
      lecture: "agent_verbatim",
      citationCle:
        "2. Les opérations périodiques suivantes doivent être effectuées et leurs résultats portés sur le dossier de maintenance mentionné à l'article 2 (b) : a) Au minimum tous les ans : - contrôle du débit global d'air extrait par l'installation ; - contrôle des pressions statiques ou des vitesses aux points caractéristiques de l'installation, notamment au niveau des systèmes de captage ; - examen de l'état de tous les éléments de l'installation (système de captage, gaines, dépoussiéreurs, épurateurs, systèmes d'apport d'air de compensation...). b) Au minimum tous les six mois lorsqu'il existe un système de recyclage : - contrôle de la concentration en poussières sans effet spécifique ou en autres polluants dans les gaines de recyclage ou à leur sortie dans un écoulement canalisé ; - contrôle de tous les systèmes de surveillance mis en oeuvre.",
      statut: "retenu",
      obligations: [
        "aeration-travail-locaux-pollution-specifique",
        "stockage-dangereux-ventilation-locaux",
      ],
      prescrit:
        "RYTHME NON PORTÉ, relevé le 2026-08-27. Le b) impose « au minimum tous les six mois lorsqu'il existe un système de recyclage » le contrôle de la concentration en poussières ou autres polluants dans les gaines de recyclage, et de tous les systèmes de surveillance. Il S'AJOUTE à l'annuel du a) et porte sur des objets DIFFÉRENTS — l'un les débits et l'état, l'autre les concentrations. Non encodé : la présence d'un système de recyclage est un attribut d'équipement que le modèle n'a pas.",
    },
  ],
};
