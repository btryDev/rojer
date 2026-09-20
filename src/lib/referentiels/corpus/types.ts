// L'état de dépouillement d'un corpus réglementaire.
//
// Le référentiel d'obligations sait dire ce qu'il CONNAÎT. Il ne sait pas dire
// ce qu'il a LU. Aucun test ne peut donc échouer parce qu'une obligation
// manque : seulement parce qu'une obligation est fausse. Une liste rassemblée
// ne prouve jamais sa complétude — on ne découvre ce qui manque qu'en butant
// dessus, ce qui est arrivé quatre fois en une seule journée.
//
// Ce module tient le registre inverse : les textes qui gouvernent le
// périmètre, article par article, chacun classé et motivé. La couverture
// devient alors une phrase qu'on peut écrire ou ne pas écrire — « PE : 37
// articles sur 37 dépouillés » — au lieu d'une impression.
//
// Ce n'est pas de la veille. La veille surveille ce qui change ; ceci établit
// ce qu'on a lu. L'une suppose l'autre, et l'ordre avait été pris à l'envers.
//
// Module **pur** : ni Prisma, ni React.
//
// ---------------------------------------------------------------------------
// RÈGLE DE LECTURE : UN ARTICLE MODIFIÉ SE LIT AVEC LE TEXTE QUI L'A MODIFIÉ
// ---------------------------------------------------------------------------
//
// **Quand un article que vous ouvrez porte un texte modificateur récent,
// ouvrez ce texte EN ENTIER et listez ce qu'il touche d'autre.** Puis
// consignez ici ce que vous en avez tiré — les articles retenus comme ceux
// écartés, `sans_objet` étant fait pour ça.
//
// Le décret n° 2025-482 du 27 mai 2025 est entré dans ce dépôt par la porte de
// `R. 4225-2` — « eau potable ET FRAÎCHE », rédaction que le décret venait
// d'introduire — et la porte s'est refermée derrière lui. Personne n'a ouvert
// le décret. Son chapitre principal traite de la CHALEUR, et mord directement
// sur la cuisine de restaurant, l'un des trois secteurs cibles. Ce n'est pas
// un oubli d'attention : rien, dans la méthode, ne faisait remonter d'un
// article modifié au texte qui le modifie. **Le dépôt lisait des articles, pas
// des textes.**
//
// Le champ `ArticleDepouille.modifiePar` NE PRÉVIENT RIEN TOUT SEUL, et c'est
// le point à comprendre avant de s'y fier. Il enregistre une réponse ; c'est
// la règle ci-dessus qui la produit. Un dépouilleur qui remplit le champ sans
// avoir ouvert le texte a écrit une donnée juste et raté le décret quand même.
// Le champ sert au coup d'APRÈS : il rend interrogeable, sur l'ensemble du
// corpus, « quels textes ce dépôt a-t-il croisés sans les lire ».
//
// Trois autres familles ont été manquées le 2026-08-31 par des causes de la
// même espèce, et la règle ne les couvre pas : un article d'habilitation lu
// sans énumérer les arrêtés qu'il habilite (`R. 4323-23`), et un article
// classé une fois puis jamais relu alors que sa version a changé depuis. Voir
// `docs/revues/lot-d3-recoupement-droit.md`.

import type { MotifExclusion } from "./perimetre";

/**
 * Le sort d'un article après lecture.
 *
 * `non_depouille` est une valeur de plein droit, et c'est le point : un
 * article présent au corpus mais non lu se compte, se voit, et empêche
 * d'annoncer une couverture complète. Sans elle, un article oublié serait
 * simplement absent — indistinguable d'un article qui n'existe pas.
 */
/**
 * POURQUOI UNE OBLIGATION LUE N'EST PAS ENCODÉE — vocabulaire fermé, posé le
 * 2026-09-20.
 *
 * `bloquePar` existait, en prose libre : soixante-six obligations manquantes,
 * dix-neuf sans blocage écrit, et plus de quarante formulations distinctes pour
 * les autres. Un registre de dette qu'on ne peut pas COMPTER par cause ne dit
 * pas quoi construire : il a fallu relire les soixante-six motifs pour
 * apprendre que onze d'entre elles attendent la même chose. La prose reste —
 * elle porte le raisonnement — et ce champ la rend interrogeable.
 *
 * Une valeur nouvelle se justifie ici, pas dans l'entrée qui l'emploie.
 */
export const CAUSES_BLOCAGE = [
  /** Rien ne bloque : à encoder. Une dette qui n'a pas d'excuse. */
  "libre",
  /**
   * Déclenchée par un événement que le produit n'observe pas (un accident, une
   * reprise, un épisode de chaleur, un signalement). Il ne peut pas la DATER ;
   * il pourrait la DIRE. Attend une surface pour l'événementiel.
   */
  "evenement",
  /** Aucune catégorie d'équipement ne désigne l'objet visé. */
  "categorie_equipement",
  /** Le fait qui la déclenche est un attribut d'établissement absent du modèle. */
  "attribut_etablissement",
  /** Le texte vise quelqu'un (propriétaire du réseau…) que le produit ne sait pas identifier. */
  "destinataire",
  /** Cinquième déclencheur de l'ADR-022 : une activité réellement exercée, que rien ne déclare. */
  "activite_exercee",
  /** Elle pèse sur une relation contractuelle, qui n'est aucun des trois porteurs. */
  "relation_tiers",
  /** Un module existant (plan de prévention, DUERP) n'a pas le champ qu'elle demande. */
  "module",
  /** Son champ dépend d'un article qui n'est pas dépouillé, ou d'un point de lecture non résolu. */
  "texte_a_lire",
  /** Rien de technique : une décision de conception ou de périmètre, qui appartient à la propriétaire. */
  "a_trancher",
  /** Encodable, mais hors de la cible : ni priorité ni blocage. */
  "perimetre",
] as const;
export type CauseBlocage = (typeof CAUSES_BLOCAGE)[number];

export type StatutArticle =
  /** Retenu : l'article fonde une ou plusieurs obligations du référentiel. */
  | {
      statut: "retenu";
      /** Les `Obligation.id` qui s'appuient dessus. Au moins un. */
      obligations: [string, ...string[]];
      /**
       * Ce que l'article impose ENCORE et que le référentiel ne porte pas.
       *
       * Un article n'est pas toujours retenu en entier. `PE 4` en est le cas
       * type : son § 2 est encodé depuis l'ADR-022, son § 1 — contrat annuel
       * du système de détection, réservé aux locaux à sommeil — attend un
       * attribut d'établissement qui n'existe pas.
       *
       * Sans ce champ, il fallait choisir entre deux mensonges : « retenu »
       * tout court, qui efface le manque, ou « obligation manquante », qui
       * nie ce qui est fait. Les deux font disparaître la moitié de la
       * vérité, et c'est exactement ce que le dépouillement existe pour
       * empêcher.
       *
       * Une réserve n'est pas une note : elle se compte, comme une obligation
       * manquante — voir `reservesDeLecture()`.
       */
      reserve?: string;
    }
  /**
   * Lu, dans le périmètre, mais ne produit aucune échéance : définition,
   * renvoi, règle ponctuelle sans récurrence. À distinguer absolument de
   * `hors_perimetre` — celui-ci dit « ça nous concerne mais il n'y a rien à
   * inscrire au calendrier », l'autre dit « ça ne nous concerne pas ».
   *
   * **Une référence écartée après lecture se consigne, au même titre qu'une
   * référence retenue.** C'est l'usage le moins évident de ce statut et le plus
   * utile : quand on ouvre un article réputé fonder une obligation et qu'on
   * constate qu'il dit autre chose, l'entrée `sans_objet` qui le note est ce
   * qui empêche le prochain lecteur de refaire le détour.
   *
   * Le cas qui l'établit, du 2026-08-31. `L. 4622-7` est couramment cité comme
   * l'article de l'adhésion à un service de prévention et de santé au travail ;
   * ouvert, il traite de la responsabilité des dirigeants du service. Le lot 8
   * l'a consigné ici plutôt que de simplement ne pas le citer. Le même jour, un
   * relecteur a soutenu l'inverse, la session de coordination l'a relayé sans
   * ouvrir l'article, et le lot 7 a retiré une citation juste sur cette base :
   * **trois sessions ont refait le détour que cette entrée existait pour
   * épargner**, et c'est elle qui a permis de le rattraper. Une référence
   * écartée sans trace se réexamine indéfiniment ; six lignes suffisent à
   * clore la question.
   */
  | { statut: "sans_objet"; motif: string }
  /**
   * Lu, dans le périmètre, et il CRÉE une obligation que le référentiel ne
   * porte pas.
   *
   * C'est le statut qui justifie tout l'exercice. Sans lui, un texte lu qui
   * impose quelque chose qu'on n'a pas encodé n'a que deux issues : être
   * classé « retenu » en désignant une obligation qui n'existe pas, ou
   * « sans objet » — ce qui serait un mensonge. Les deux effacent la
   * trouvaille.
   *
   * Une obligation manquante n'est pas un défaut du dépouillement : c'est son
   * produit. Le compte de ces articles est ce que le référentiel doit rattraper.
   */
  | {
      statut: "obligation_manquante";
      motif: string;
      /** Le blocage, en prose — tel que la personne qui a lu l'a écrit. */
      bloquePar?: string;
      /** Pourquoi elle n'est pas encodée, dans un vocabulaire FERMÉ. */
      cause: CauseBlocage;
      /**
       * Touche-t-elle la cible du produit — restaurant, commerce de détail,
       * bureau, 5ᵉ catégorie d'ERP, cinquante salariés au plus ?
       *
       * `false` ne dit pas « sans importance » : il dit qu'un hôtel, un
       * immeuble d'habitation, un ERP des quatre premières catégories ou un
       * chantier d'échafaudage y sont soumis, et que le produit les SERT sans
       * les viser (ADR-031). Dans le doute, `true` : entre sur- et sous-compter
       * une dette, on sur-compte.
       */
      toucheLaCible: boolean;
    }
  /**
   * L'article impose quelque chose à un exploitant, mais le produit ne le
   * couvre pas — et le dit.
   *
   * À distinguer absolument de `hors_perimetre`. « Hors périmètre » veut dire
   * qu'aucune obligation n'en découle pour un exploitant : une règle de
   * construction, un article qui s'adresse à l'administration. `non_couvert`
   * veut dire qu'une obligation existe, qu'elle vise des établissements que le
   * produit pourrait servir, et qu'on a choisi de ne pas la porter.
   *
   * Les confondre revient à faire passer un manque pour une non-question. Le
   * principe est de couvrir le maximum de ce qui est possible et, à défaut, de
   * le dire clairement — ce qui suppose d'abord de le compter.
   *
   * `declareA` dit OÙ le manque est annoncé à l'utilisateur. Un manque qui
   * n'est déclaré nulle part n'est pas « dit clairement », c'est un silence
   * documenté en interne.
   */
  | { statut: "non_couvert"; motif: string; declareA?: string }
  /**
   * Écarté parce qu'aucune obligation d'exploitant n'en découle — jamais
   * parce qu'on a choisi de ne pas s'en occuper. Ce dernier cas est
   * `non_couvert`.
   */
  | { statut: "hors_perimetre"; exclusion: MotifExclusion; motif?: string }
  /** Présent au corpus, pas encore lu. */
  | { statut: "non_depouille" };

/**
 * Comment l'article a été lu. Le degré de confiance est une donnée, pas un
 * souvenir : sans lui, une lecture indirecte et une lecture à la source se
 * ressemblent une fois écrites.
 */
export type SourceLecture =
  /** Lu sur Légifrance, verbatim relevé par la personne qui l'encode. */
  | "premiere_main"
  /**
   * Lu sur Légifrance par un agent, qui en a rapporté le verbatim et la date
   * de version. Vaut constat, pas garantie : le verbatim n'a pas été recoupé.
   */
  | "agent_verbatim"
  /**
   * Lu ailleurs qu'à la source — reproduction consolidée, base
   * professionnelle, résumé. NE PEUT PAS fonder une entrée du référentiel :
   * deux reproductions concordantes peuvent dériver du même relevé, et aucune
   * ne porte la date de version faisant foi.
   */
  | "indirect";

export type ArticleDepouille = {
  /** Tel qu'il se cite : « PE 4 », « R. 4227-39 », « MS 73 ». */
  ref: string;
  intitule?: string;
  url?: string;
  /** Date de la version lue, en clé de jour civil. */
  versionEnVigueur?: string;
  /**
   * **Par quel texte** la version en vigueur l'est devenue.
   *
   * L'INCIDENT QUI FAIT CE CHAMP. `versionEnVigueur` et `luLe` disaient
   * quelle version avait été lue et quand ; jamais par quel texte. Le décret
   * n° 2025-482 du 27 mai 2025 est donc entré dans le dépôt par la porte de
   * `R. 4225-2` — « eau potable ET FRAÎCHE », rédaction que ce décret venait
   * d'introduire — et la porte s'est refermée derrière lui. Son chapitre
   * principal traite de la CHALEUR et mord directement sur la cuisine de
   * restaurant. Le dépôt lisait des articles, pas des textes ; l'information
   * qui manquait, et qui aurait fait remonter de l'article au décret, est
   * exactement celle-ci.
   *
   * `null` est une **réponse déclarée**, comme partout ailleurs dans ce
   * dépôt : « j'ai regardé, cet article n'a pas de texte modificateur à
   * signaler ». Absent veut dire autre chose — la question n'a pas été
   * posée — et les deux ne doivent pas se confondre, sans quoi le champ
   * mesurerait le zèle du dépouilleur au lieu de l'état du texte.
   *
   * **LE VIDE N'EST PAS UN OUBLI, ET IL EST MASSIF.** Les 276 articles déjà
   * dépouillés ne sont PAS repris rétroactivement. Le faire supposerait de
   * rouvrir Légifrance article par article, et une valeur devinée y serait
   * pire que le vide : elle donnerait à un texte non ouvert l'apparence d'un
   * texte contrôlé. Un index partiel attrape quand même le prochain décret,
   * ce qui est tout ce qu'on lui demande. Ne comptez donc rien sur ce champ,
   * et ne concluez pas d'un `undefined` qu'un article n'a pas été modifié.
   *
   * **Le champ ne prévient rien tout seul** — voir la règle de lecture en tête
   * de fichier, qui est la moitié qui travaille. Celle-ci n'en est que la
   * trace.
   *
   * Une seule valeur est écrite à l'ouverture du champ : celle de `R. 4225-2`,
   * l'article de l'incident, dont le texte modificateur était déjà relevé en
   * prose dans sa `reserve`. Ce n'est pas une reprise rétroactive — c'est le
   * cas d'école, déplacé de la prose vers un champ interrogeable.
   */
  modifiePar?: { texte: string; url?: string } | null;
  /** Terme ou version future programmée, s'il y en a une. */
  versionFuture?: string;
  /**
   * Ce qui FUT une réserve, et ne l'est plus : un défaut corrigé, un relevé
   * infirmé, un détour à ne pas refaire. **Ne se compte pas.**
   *
   * Le champ existe depuis le 2026-09-20 parce que `reserve` est une DETTE —
   * « ce que l'article impose encore et que le référentiel ne porte pas » — et
   * que sept réserves commençaient par « CORRIGÉ LE… » ou « RÉSERVE LEVÉE » sans
   * rien laisser d'ouvert. Elles gonflaient le compte d'une dette soldée. Les
   * supprimer aurait effacé ce qui empêche de rouvrir la question : la règle 11
   * de `CLAUDE.md` dit de rayer, pas de retirer. Déplacer le texte ici EST la
   * rature — il reste lisible, et il cesse d'être compté.
   *
   * Une réserve qui garde UN point ouvert reste une `reserve`, en entier.
   */
  historique?: string;
  /** Ce que l'article impose, et à qui. Une phrase. */
  prescrit?: string;
  /** Le verbatim de la phrase décisive, quand elle en porte une. */
  citationCle?: string;
  /** Date à laquelle l'article a été lu. */
  luLe?: string;
  /** Comment il a été lu. Obligatoire dès qu'il est dépouillé. */
  lecture?: SourceLecture;
} & StatutArticle;

export type Corpus = {
  id: string;
  intitule: string;
  url: string;
  /** Ce que ce corpus gouverne, en une phrase — pour situer sa portée. */
  portee: string;
  /**
   * `articles` couvre-t-il TOUT le texte, ou seulement une partie ?
   *
   * Sans ce drapeau, « complet » signifierait « j'ai lu tout ce que j'ai bien
   * voulu inscrire » — une tautologie. Un corpus partiel ne peut jamais se
   * déclarer complet, quel que soit l'état de ses articles.
   *
   * `integral` : la liste énumère tous les articles du texte, y compris ceux
   * qui n'intéressent pas le produit.
   * `articles_cites` : la liste ne contient que les articles que le référentiel
   * cite. Utile — c'est là que la dette se rembourse — mais ne prouve rien sur
   * ce que le texte contient d'autre.
   */
  etendue: "integral" | "articles_cites";
  articles: readonly ArticleDepouille[];
};

/** Ce qu'on peut dire de la couverture d'un corpus, sans l'embellir. */
export type CouvertureCorpus = {
  corpusId: string;
  total: number;
  depouilles: number;
  retenus: number;
  sansObjet: number;
  horsPerimetre: number;
  /** Articles qui imposent quelque chose que le référentiel ne porte pas. */
  obligationsManquantes: number;
  /** Articles qui imposent quelque chose que le produit choisit de ne pas couvrir. */
  nonCouverts: number;
  nonDepouilles: number;
  /**
   * Vrai seulement si le corpus est intégral ET qu'aucun article n'est resté
   * non dépouillé. Un corpus partiel est toujours faux, par construction.
   */
  complet: boolean;
  etendue: Corpus["etendue"];
};

export function couverture(c: Corpus): CouvertureCorpus {
  const par = (s: StatutArticle["statut"]) =>
    c.articles.filter((a) => a.statut === s).length;
  const nonDepouilles = par("non_depouille");
  return {
    corpusId: c.id,
    etendue: c.etendue,
    total: c.articles.length,
    depouilles: c.articles.length - nonDepouilles,
    retenus: par("retenu"),
    sansObjet: par("sans_objet"),
    horsPerimetre: par("hors_perimetre"),
    obligationsManquantes: par("obligation_manquante"),
    nonCouverts: par("non_couvert"),
    nonDepouilles,
    complet: c.etendue === "integral" && nonDepouilles === 0,
  };
}
