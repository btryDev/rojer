import type {
  CategorieEquipement,
  Periodicite,
  Realisateur,
  TypologieApplication,
} from "../types-communs";

/**
 * Référentiel d'obligations réglementaires (ADR-003).
 *
 * Règle absolue : chaque `Obligation` cite **au moins une** référence primaire
 * vérifiable sur Légifrance (Code du travail, CCH, arrêté) ou sur une source
 * institutionnelle reconnue (INRS). Pas de normes privées (APSAD, NF),
 * pas de recommandations sans force opposable.
 *
 * Les obligations vivent en TypeScript versionné avec le code (pas en base),
 * ce qui garantit l'auditabilité via l'historique Git (ADR-003).
 */

export const DOMAINES_OBLIGATION = [
  "electricite",
  "incendie",
  "aeration",
  "cuisson_hotte",
  "ascenseur",
  "porte_portail",
  "equipement_sous_pression",
  "stockage_dangereux",
  "levage",
  "froid",
  // Les trois domaines qui suivent sont entrés avec le lot 7, et ils ont un
  // point commun qu'aucun des dix précédents n'a : ils ne naissent pas d'un
  // équipement. Un tableau électrique, un ascenseur, une hotte se déclarent au
  // parc ; une formation à la sécurité, une visite d'information et de
  // prévention, un secouriste ne se déclarent nulle part dans le parc parce
  // qu'ils n'y sont pas.
  //
  // C'est pourquoi aucun domaine existant ne pouvait les accueillir. Ranger la
  // formation à la sécurité sous `incendie` parce qu'elle parle d'évacuation,
  // ou le secourisme sous `incendie` parce que les deux relèvent de l'urgence,
  // aurait été le rabattage que ce référentiel refuse ailleurs : le domaine
  // sert à grouper ce qu'un dirigeant lit dans son calendrier, et « Incendie /
  // sécurité » ne décrit pas une visite médicale.

  /**
   * Formation à la sécurité — `L. 4141-1` et s., `R. 4141-1` et s.
   *
   * L'obligation la plus universelle du Code du travail : elle s'impose dès le
   * premier salarié, sans condition d'équipement, de secteur ni d'effectif.
   * Porte aussi la formation à la conduite et l'autorisation de conduite
   * (`R. 4323-55` et s.), qui sont des formations avant d'être des questions
   * d'équipement.
   */
  "formation_securite",

  /**
   * Suivi individuel de l'état de santé — `R. 4624-10` et s.
   *
   * Visite d'information et de prévention, suivi individuel renforcé, et la
   * liste des postes à risques particuliers que l'employeur tient à jour.
   *
   * Ce domaine est le seul dont toutes les obligations salarié portent
   * `pieceMedicale: true`. Ce que l'outil en détient est strictement borné par
   * `docs/rgpd.md` § 2.3 : existence, date, échéance. Jamais l'avis, jamais le
   * motif, jamais la pièce.
   */
  "sante_travail",

  /**
   * Premiers secours — `R. 4224-14` à `R. 4224-16`.
   *
   * Le matériel, le secouriste et les mesures d'organisation. Trois articles
   * voisins, trois obligations, deux porteurs : c'est le cas d'école de
   * l'ADR-022, et le fondre en une seule ligne aurait reproduit exactement le
   * défaut qu'elle a corrigé.
   */
  "secours",

  // Les quatre domaines qui suivent sont entrés avec le lot 8. Ils partagent le
  // déclencheur des trois précédents — le statut d'employeur, pas un équipement
  // — mais ils s'en distinguent sur un point : aucun d'eux n'appelle de tiers.
  // Une formation se commande à un organisme, une visite médicale à un service ;
  // un affichage, un règlement intérieur, un lavabo se font seul. C'est pourquoi
  // ils sont les premiers à porter `aucun_tiers_attendu` dans
  // `DOMAINES_PRESTATAIRE_ATTENDUS`.

  /**
   * Organisation de la prévention — `L. 4644-1`, `L. 2311-2`, `L. 1321-1`.
   *
   * Qui s'occupe de la prévention, et sous quelles instances. Le salarié
   * désigné compétent, le comité social et économique, le règlement intérieur.
   *
   * Ce n'est pas de la formation : c'est l'organisation qui la précède. Ranger
   * le salarié désigné sous `formation_securite` parce que le texte lui promet
   * une formation aurait pris la conséquence pour l'obligation — `L. 4644-1`
   * impose de DÉSIGNER quelqu'un, et il l'impose même à l'employeur dont le
   * désigné est déjà formé.
   */
  "organisation_prevention",

  /**
   * Information des travailleurs — `D. 4711-1`, `R. 4121-4`.
   *
   * Ce que l'employeur doit porter à la connaissance de ses salariés, sous une
   * forme que l'inspection peut constater sur place : les affichages
   * obligatoires et l'avis sur les modalités d'accès au document unique.
   *
   * Distinct de `formation_securite`, où vit l'information ORALE et
   * individuelle due à chaque salarié (`L. 4141-1`, `R. 4141-3-1`, encodée au
   * lot 7). La différence n'est pas de nuance : l'une se prouve par un support
   * affiché, l'autre par un entretien. Un employeur peut avoir fait la seconde
   * sans la première, et c'est le cas ordinaire.
   */
  "information_travailleurs",

  /**
   * Locaux sociaux — `R. 4225-2`, `R. 4228-1` et s.
   *
   * Les installations que le Code impose au bénéfice des personnes plutôt
   * qu'au titre d'une machine : vestiaires, lavabos, cabinets d'aisance, eau
   * potable, local ou emplacement de restauration.
   *
   * Aucune ne naît d'un équipement déclaré, et aucune n'est un état de
   * l'équipement : un lavabo n'est pas vérifié périodiquement, il est mis à
   * disposition et maintenu. D'où un domaine à elles, et non un rangement sous
   * `aeration` ou `incendie` au motif que ce sont « des locaux ».
   */
  "locaux_sociaux",

  /**
   * Co-activité — `R. 4515-1` et s.
   *
   * Ce qu'impose la présence d'une entreprise extérieure dans l'enceinte de
   * l'établissement. Le protocole de sécurité de chargement ou de déchargement
   * en est la seule entrée à ce jour.
   *
   * Le module `PlanPrevention` sert l'autre versant de la co-activité
   * (`R. 4512-6` et s.) et n'est pas dans le référentiel d'obligations.
   * `R. 4515-1` écarte expressément le plan de prévention pour les opérations
   * de chargement : les deux ne se recouvrent pas, ils s'excluent.
   */
  "co_activite",

  /**
   * Signalisation de sécurité — arrêté du 4 novembre 1993, pris pour
   * l'application de `R. 4224-24`.
   *
   * Les panneaux, les couleurs, les bandes jaune et noir, les signaux lumineux
   * et acoustiques, et ce que le texte impose d'en faire : les poser, les
   * entretenir, et vérifier ceux qui se déclenchent.
   *
   * ENTRÉ LE 2026-09-02, ET IL COMBLE UN DOMAINE ENTIER : le référentiel ne
   * portait aucune obligation de signalisation, sous aucun de ses trois
   * porteurs, parce que le texte qui gouverne la matière n'avait jamais été
   * ouvert.
   *
   * POURQUOI PAS `incendie` NI `stockage_dangereux`, où deux de ses lignes
   * auraient pu se ranger. Parce que le domaine sert à grouper ce qu'un
   * dirigeant traite d'un seul geste, et qu'ici le geste est le même pour les
   * neuf : faire le tour de ses murs. Ranger le balisage d'évacuation sous
   * `incendie` et le pictogramme CLP sous `stockage_dangereux` aurait éclaté
   * cette tournée en deux écrans, et laissé les bandes jaune et noir des
   * obstacles sans domaine du tout.
   *
   * Comme les quatre domaines du lot 8, il n'appelle aucun tiers : l'arrêté ne
   * réserve ni la pose ni la vérification de la signalisation à un organisme,
   * à une personne compétente ni à une qualification quelconque. Il porte donc
   * `aucun_tiers_attendu` dans `DOMAINES_PRESTATAIRE_ATTENDUS`, et c'est une
   * lecture du texte, pas un mot vide.
   */
  "signalisation",

  /**
   * Compactage des déchets — arrêté du 5 mars 1993, art. 1er, pris pour
   * l'application de `R. 4323-23`.
   *
   * La vérification générale périodique trimestrielle des presses à balles et
   * des compacteurs à déchets : le compacteur-presse à cartons du commerce de
   * détail, le compacteur du quai de livraison d'un supermarché ou d'une
   * grande cuisine.
   *
   * POURQUOI PAS `levage`, où l'on aurait pu le ranger au motif que les deux
   * portent une VGP d'équipement de travail fondée sur le même article
   * habilitant. Parce que ce sont deux branches qui ne se recouvrent JAMAIS et
   * que le corpus l'écrit : l'arrêté du 1er mars 2004 borne son champ à la
   * définition d'« appareil de levage » de son article 2 a), l'arrêté du
   * 5 mars 1993 procède par liste nominative fermée de machines qui n'en sont
   * pas. Un compacteur rangé sous « Levage » au calendrier enverrait le
   * dirigeant chercher son vérificateur de chariots élévateurs, et ferait
   * croire à l'inverse — qu'un palan relève du trimestre.
   *
   * POURQUOI PAS UN DOMAINE « MACHINES » NI « ÉQUIPEMENTS DE TRAVAIL ». Le
   * même motif que pour la catégorie d'équipement, et il vaut ici aussi : la
   * liste de l'article 1er est fermée, neuf de ses onze entrées ne touchent
   * pas les secteurs cibles, et un nom large annoncerait au dirigeant une
   * couverture que le référentiel n'a pas. Le jour où une autre entrée de
   * cette liste s'encode — un massicot MOTORISÉ d'atelier de reprographie est
   * le seul candidat plausible —, la question du nom se rouvre : ce sera une
   * décision, pas un effet de bord.
   */
  "compactage_dechets",

  /**
   * Éclairage des lieux de travail — `R. 4223-1` à `R. 4223-12`.
   *
   * L'éclairage ORDINAIRE : combien de lumière au plan de travail pendant que
   * les gens travaillent, et l'entretien du matériel qui la produit. Une seule
   * ligne à ce jour, `R. 4223-11` : l'employeur FIXE les règles d'entretien
   * périodique du matériel d'éclairage et les consigne dans un document
   * communiqué au comité social et économique.
   *
   * ENTRÉ LE 2026-09-04, ET IL COMBLE UN DOMAINE ENTIER, comme `signalisation`
   * le 2026-09-02 : le référentiel ne portait aucune obligation d'éclairage de
   * travail, sous aucun de ses trois porteurs, alors que le corpus
   * `code-travail-eclairage` avait relevé l'article dès le 2026-09-02 et le
   * classait `obligation_manquante` en écrivant que rien ne le bloquait.
   *
   * POURQUOI PAS `incendie`, OÙ VIVENT DÉJÀ DES OBLIGATIONS D'ÉCLAIRAGE. Celles
   * qui y vivent portent l'ÉCLAIRAGE DE SÉCURITÉ — les blocs qui prennent le
   * relais quand le courant tombe (`R. 4227-14`, arrêté du 14 décembre 2011,
   * `EC 14`). Ce n'est pas le même objet, pas le même texte et pas le même
   * geste : l'un se teste tous les mois pour qu'une évacuation reste possible,
   * l'autre se nettoie et se relampe pour qu'on voie ce qu'on fait. Le corpus
   * pose déjà cette frontière en tête de `code-travail-eclairage.ts` ; la
   * franchir ici l'aurait effacée côté obligations.
   *
   * POURQUOI PAS `electricite`. Un luminaire est un appareil électrique, mais
   * `DOMAINES_PRESTATAIRE_ATTENDUS` traduit chaque domaine en catégorie de
   * prestataire attendue : y ranger cette ligne aurait fait chercher un
   * organisme de contrôle électrique à un dirigeant à qui le texte demande
   * seulement d'écrire ses propres règles d'entretien. Ce domaine porte donc
   * `aucun_tiers_attendu`, et c'est une lecture de l'article — « L'EMPLOYEUR
   * fixe les règles » — pas un repli.
   */
  "eclairage",

  /**
   * Protection individuelle — `R. 4323-91` à `R. 4323-106`, arrêté du
   * 19 mars 1993.
   *
   * POURQUOI UN DOMAINE À LUI, ET PAS UN RANGEMENT DANS UN VOISIN. Deux
   * candidats se présentaient, et chacun aurait rabattu quelque chose. Sous
   * `formation_securite`, la vérification annuelle du harnais serait devenue
   * une affaire de formation, quand c'est un contrôle d'objet. Sous
   * `information_travailleurs`, la consigne d'utilisation aurait rejoint des
   * affichages muraux, quand c'est un écrit remis au CSE. Le domaine sert à
   * grouper ce qu'un dirigeant lit dans son calendrier : « Protection
   * individuelle » lui dit de quoi il s'agit, aucun des deux autres ne le
   * ferait.
   *
   * SON PRESTATAIRE ATTENDU. `R. 4323-100` dit « personnes qualifiées,
   * appartenant ou NON à l'établissement » : aucun organisme accrédité n'est
   * exigé, à la différence des équipements sous pression. Le domaine ne
   * réclame donc pas un tiers d'une catégorie particulière.
   */
  "epi",
] as const;

export type DomaineObligation = (typeof DOMAINES_OBLIGATION)[number];

export const SOURCES_LEGALES = [
  "CODE_TRAVAIL",
  "CCH",
  "CODE_ENVIRONNEMENT",
  "ARRETE",
  "DECRET",
  "INRS",
  // Un règlement européen est d'application directe : il est opposable sans
  // transposition, et se cite donc comme source primaire au même titre qu'un
  // article de code. Ajouté pour le contrôle d'étanchéité des fluides
  // frigorigènes, dont les seuils et les périodicités ne vivent plus que dans
  // le règlement (UE) 2024/573 — le droit national renvoyant encore au texte
  // qu'il abroge.
  "REGLEMENT_UE",
  // Code de la santé publique. Il porte des obligations de sécurité du
  // bâtiment que le Code du travail ne couvre pas — dossier technique amiante,
  // radon, constat de risque d'exposition au plomb — et il est consultable sur
  // Légifrance au même titre qu'un article du Code du travail. Aucune
  // obligation ne le cite encore (ADR-022).
  "CSP",
  // Code de la sécurité sociale. Il fonde le registre des accidents bénins et
  // la déclaration d'accident du travail, aujourd'hui hors périmètre produit.
  // Déclaré ici pour que la source existe le jour où le périmètre bouge, sans
  // qu'on soit tenté de ranger ces obligations sous CODE_TRAVAIL, qui ne les
  // porte pas (ADR-022).
  "CSS",
] as const;

export type SourceLegale = (typeof SOURCES_LEGALES)[number];

/**
 * Ce que chaque source s'appelle quand on la montre à quelqu'un.
 *
 * L'interface affichait jusqu'ici la valeur brute de l'enum — `CODE_TRAVAIL`,
 * `ARRETE`. Passable tant que les sigles se lisaient ; illisible dès `CSP` et
 * `CSS`, qu'aucun dirigeant n'a à décoder. Un `Record` exhaustif plutôt qu'un
 * objet libre : ajouter une source sans lui donner de nom ne compile pas.
 */
export const LIBELLE_SOURCE: Record<SourceLegale, string> = {
  CODE_TRAVAIL: "Code du travail",
  CCH: "Code de la construction et de l'habitation",
  CODE_ENVIRONNEMENT: "Code de l'environnement",
  ARRETE: "Arrêté",
  DECRET: "Décret",
  INRS: "INRS",
  REGLEMENT_UE: "Règlement européen",
  CSP: "Code de la santé publique",
  CSS: "Code de la sécurité sociale",
};

export type ReferenceLegale = {
  source: SourceLegale;
  /**
   * Référence littérale telle qu'on la citerait dans un document officiel.
   * Ex. : "R. 4226-16", "Arrêté du 25 juin 1980, art. EL 19".
   *
   * **AUCUN TEST NE LA GARDE, et c'est elle qui s'imprime.** Mesuré le
   * 2026-09-01 par le lot A, en remettant « EL 19 § 1 et § 2 » là où il venait
   * d'écrire « EL 19 § 3 » : 1907 tests au vert. La clé `article` est
   * rapprochée d'un corpus, la `versionConstatee` est comparée à celle de
   * l'article lu, l'`url` est contrôlée présente — cette chaîne-ci n'est
   * confrontée à rien. Or c'est le paragraphe qu'elle nomme qui décide de ce
   * qu'un dirigeant lit sous une échéance, et deux obligations rattachées au
   * même article ne se distinguent que par elle.
   *
   * Deux défauts du 2026-09-01 vivaient entièrement ici, sous une clé juste :
   * `elec-erp-cat1-4-annuelle` citait le paragraphe de l'acte inverse, et
   * `stockage-dangereux-verification-etancheite` annonçait un « entretien
   * régulier des équipements de stockage » que R. 4412-11 n'écrit pas.
   * Règle de rédaction, faute de garde : **descendre au paragraphe, et n'y
   * écrire que ce que le paragraphe dit.** Un intervalle — « art. 12 à 15 »,
   * « R. 134-1 à R. 134-5 » — noie l'article porteur et a produit deux des
   * onze défauts du même jour.
   */
  reference: string;
  /**
   * URL de la source, telle qu'un lecteur peut l'ouvrir. Légifrance pour le
   * droit national — la dernière version consolidée en cas de doute, les URL
   * LEGIARTI étant stables dans le temps — mais pas seulement : le droit de
   * l'Union se cite sur EUR-Lex, et le champ s'appelait `urlLegifrance` alors
   * qu'il portait déjà autre chose. Un champ dont le nom ne décrit plus le
   * contenu finit par faire passer une source pour une autre.
   */
  url?: string;
  /**
   * Commentaire libre pour expliciter la portée (ex. périmètre d'application
   * restreint, dérogation possible…). Optionnel.
   */
  note?: string;
  /**
   * Identifiant canonique de l'article visé, tel qu'un corpus le nomme :
   * « MS 38 », « PE 4 », « R. 4227-39 », « CCH R. 143-44 ».
   *
   * `reference` est faite pour être lue par un humain — elle porte le texte
   * porteur, le paragraphe, parfois l'ancienne numérotation. Elle ne peut pas
   * servir de clé : rapprocher « Arrêté du 25 juin 1980, art. MS 38 § 4 » de
   * l'article « MS 38 » d'un corpus supposait une comparaison de sous-chaînes,
   * c'est-à-dire une devinette. Ce champ est la clé ; `reference` reste la
   * citation.
   *
   * `undefined` = pas encore rattaché à un corpus. Le rattachement est ce qui
   * permet d'affirmer qu'une obligation repose sur un texte lu.
   */
  article?: string;
  /**
   * Date de la version du texte constatée à la dernière relecture, en clé de
   * jour civil « AAAA-MM-JJ ».
   *
   * C'est le point de comparaison de la veille : Légifrance affiche pour
   * chaque article la date depuis laquelle sa version est en vigueur. Si elle
   * a bougé depuis celle-ci, le texte a été modifié et l'obligation est à
   * relire.
   *
   * Sans ce repère, rien ne distingue une référence relue hier d'une
   * référence encodée il y a deux ans : R. 143-44 a été réécrit le
   * 1er juillet 2026 et le référentiel a continué de le citer deux mois,
   * sans que rien ne puisse le signaler.
   *
   * `undefined` = jamais constatée. À traiter comme « à vérifier », pas
   * comme « à jour ».
   */
  versionConstatee?: string;
};

/**
 * Un rendez-vous de relecture, quand le texte lui-même en annonce un.
 *
 * Deux cas seulement, et ils sont réels : un article porte une version future
 * programmée (R. 4227-37 change au 1er janvier 2027), ou un arrêté est publié
 * avec une date d'application différée (arrêté du 1er décembre 2025 applicable
 * au 1er juillet 2026).
 *
 * Cette information existait déjà — mais en prose, dans `notesInternes`, donc
 * illisible par une machine et invisible le jour venu. Deux des trois
 * rendez-vous que portait le référentiel étaient déjà échus sans que personne
 * ne l'ait su.
 */
export type RelectureDue = {
  /** Clé de jour civil « AAAA-MM-JJ ». */
  le: string;
  /** Ce qui change, et où le lire. Une phrase. */
  motif: string;
};

/**
 * Condition d'application complémentaire à la typologie. Couvre les règles
 * qui dépendent d'attributs portés par un équipement (ex. parking couvert
 * avec > 250 véhicules). Reste déclaratif pour rester auditable : aucune
 * fonction TypeScript arbitraire n'entre dans le référentiel (ADR-003).
 *
 * Six formes, qui se distinguent par leur comportement **quand la propriété
 * n'est pas renseignée** — c'est le point de sécurité du modèle.
 *
 * (Ce dénombrement disait « trois » alors que la liste en portait déjà quatre,
 * et il l'a dit pendant tout le temps où la quatrième existait. Un compte écrit
 * en toutes lettres au-dessus d'une liste ne se met pas à jour tout seul : il
 * se relit à chaque ajout, sinon il devient la prochaine fausse justification.)
 *
 *  - `equipement_propriete_numerique` : propriété absente ⇒ condition NON
 *    satisfaite. À réserver aux obligations dont la portée exacte dépend d'un
 *    chiffre que l'utilisateur doit fournir (capacité de parking…), et dont la
 *    sur-application serait aussi fausse que la sous-application.
 *  - `equipement_propriete_booleenne` : propriété absente ⇒ condition NON
 *    satisfaite. Sémantique « opt-in » : l'obligation n'apparaît qu'après une
 *    réponse positive explicite.
 *  - `equipement_propriete_non_infirmee` : la condition est satisfaite **tant
 *    que l'utilisateur n'a pas répondu « non »** (propriété absente, ou d'un
 *    type inattendu ⇒ satisfaite ; seule la valeur booléenne `false` la rend
 *    non satisfaite). Sémantique « opt-out ».
 *  - `equipement_propriete_infirmee` : le miroir de la précédente. La
 *    condition est satisfaite **tant que l'utilisateur n'a pas répondu
 *    « oui »** (seule la valeur booléenne `true` la rend non satisfaite).
 *    Elle sert à écarter une obligation générale au profit d'une obligation
 *    plus spécifique, sans jamais créer de trou : si la question n'a pas été
 *    posée, c'est la règle générale qui continue de s'appliquer. C'est le cas
 *    de la VGP de levage, annuelle par principe et semestrielle pour les
 *    chariots élévateurs et gerbeurs (arrêté du 1er mars 2004, art. 20-II
 *    et 23) — les deux périodicités s'excluent, et l'absence de réponse
 *    laisse la périodicité annuelle en place plutôt que de tout éteindre.
 *  - `equipement_propriete_enum_egale` : propriété absente ⇒ condition NON
 *    satisfaite. C'est l'« opt-in » du couple d'énumération : la ligne
 *    spécifique n'apparaît qu'une fois la valeur explicitement choisie.
 *  - `equipement_propriete_enum_differente` : propriété absente ⇒ condition
 *    SATISFAITE. C'est le miroir, et il est le seul des deux à pouvoir porter
 *    la règle générale : tant que la famille n'a pas été renseignée, c'est
 *    elle qui continue de s'appliquer. Une valeur d'un type inattendu est
 *    traitée comme une absence, pour la même raison.
 *
 * Le couple `enum_egale` / `enum_differente` est à l'énumération ce que le
 * couple `booleenne` / `infirmee` est au booléen : il sert à SCINDER un régime
 * en deux, jamais à en ajouter un. Poser l'égalité sans poser la différence
 * sur la ligne générale ne crée pas un trou — il crée un DOUBLON : l'appareil
 * visé reçoit alors les deux échéances, la générale et la sienne, pour un seul
 * acte. C'est l'erreur symétrique de celle que `infirmee` prévient, et elle est
 * plus difficile à voir parce qu'elle ne retire rien à personne.
 *
 * Règle de rédaction (verrouillée par `conformite.test.ts`) : ajouter une
 * condition sur une obligation **déjà publiée** de criticité ≥ 4 impose une
 * forme qui reste satisfaite quand la propriété est absente, c'est-à-dire
 * `non_infirmee` ou `infirmee`. Sinon, tous les équipements déjà déclarés —
 * qui n'ont évidemment pas la nouvelle propriété — perdraient l'obligation en
 * silence, sans que personne ne soit averti. Sur une obligation de criticité
 * élevée, une sur-application visible et corrigeable par une réponse « non »
 * est toujours préférable à un faux négatif muet.
 */
export type ConditionApplication =
  | {
      type: "equipement_propriete_numerique";
      categorie: CategorieEquipement;
      propriete: string;
      operateur: ">" | ">=" | "<" | "<=" | "==";
      valeur: number;
    }
  | {
      type: "equipement_propriete_booleenne";
      categorie: CategorieEquipement;
      propriete: string;
      valeur: boolean;
    }
  | {
      type: "equipement_propriete_non_infirmee";
      categorie: CategorieEquipement;
      propriete: string;
    }
  | {
      type: "equipement_propriete_infirmee";
      categorie: CategorieEquipement;
      propriete: string;
    }
  | {
      type: "equipement_propriete_enum_egale";
      categorie: CategorieEquipement;
      propriete: string;
      valeur: string;
    }
  | {
      type: "equipement_propriete_enum_differente";
      categorie: CategorieEquipement;
      propriete: string;
      valeur: string;
    };

/**
 * Le régime temporel que le texte impose : à quel titre l'acte est-il dû ?
 * (ADR-026)
 *
 * L'ADR-022 § 8 nommait ces quatre natures et annonçait qu'elles vivaient
 * « dans le référentiel TypeScript ». Elles n'y étaient pas : aucun champ ne
 * les portait, et `Periodicite.autre` servait de tenant-lieu. Or `autre` ne dit
 * qu'une chose — **le texte n'écrit pas de rythme** — et cette phrase est vraie
 * d'au moins trois régimes différents. L'audit du 2026-08-31
 * (`docs/revues/rapport-audit-sans-surface.md`) l'a établi sur trois cas :
 * `stockage-dangereux-declaration-icpe` est une qualification faite une fois,
 * `froid-controle-etancheite-apres-modification` se redéclenche à chaque
 * modification du circuit, et `incendie-erp-5-visite-commission` est une visite
 * quinquennale. Les trois portaient la même valeur.
 *
 * C'est la nature, et elle seule, qui dit si **une déclaration unique suffit** :
 * elle suffit pour un état permanent et pour une obligation ponctuelle, elle ne
 * suffit ni pour une échéance récurrente ni pour une obligation événementielle,
 * qui reviennent. Un écran bâti sur `periodicite === "autre"` mélangerait les
 * quatre.
 *
 * **La nature est une propriété du TEXTE, jamais de ce que le produit sait en
 * faire.** Une échéance récurrente dont l'article n'écrit pas le rythme reste
 * récurrente — elle porte alors `periodicite: "autre"`, et ce couple se lit
 * « elle revient, on ne sait pas à quel rythme ». C'est un état légitime, et le
 * plus fréquent des quarante-trois.
 */
export const NATURES_OBLIGATION = [
  /**
   * L'acte est dû, puis redû, à intervalle. Le rythme peut être écrit dans le
   * texte (`periodicite` chiffrée) ou renvoyé à un règlement qui ne l'a pas
   * fixé, à un accord collectif, ou au seul mot « régulièrement »
   * (`periodicite: "autre"`).
   */
  "echeance_recurrente",
  /**
   * Un état à constituer puis à maintenir. Il n'y a pas d'acte à refaire à
   * date : soit l'état est là, soit il ne l'est pas. De l'eau potable à
   * disposition, un registre tenu, un salarié désigné.
   */
  "etat_permanent",
  /**
   * L'acte est dû **une fois**, à un moment déterminé de la vie de l'objet ou
   * de la personne : la mise en service d'un appareil, l'affectation d'un
   * travailleur à son poste. Une fois fait, il ne se refait pas.
   */
  "ponctuelle",
  /**
   * L'acte est dû **à chaque survenance d'un fait** — une modification, une
   * réparation, un changement de poste, l'arrivée d'un nouveau transporteur.
   * Le produit n'observe aucun de ces faits : il ne peut donc ni dater
   * l'échéance, ni la tenir pour soldée.
   */
  "evenementielle",
] as const;

export type NatureObligation = (typeof NATURES_OBLIGATION)[number];

/**
 * Ce qu'on écrit quand on montre une nature à quelqu'un. `Record` exhaustif :
 * ajouter une nature sans lui donner de nom ne compile pas.
 */
export const LIBELLE_NATURE: Record<NatureObligation, string> = {
  echeance_recurrente: "échéance récurrente",
  etat_permanent: "état permanent",
  ponctuelle: "obligation ponctuelle",
  evenementielle: "obligation événementielle",
};

/**
 * Sur quoi porte l'échéance que l'obligation engendre (ADR-022).
 *
 * - `equipement` : une ligne par équipement déclaré qui la déclenche.
 * - `etablissement` : **une seule** ligne, quels que soient les équipements
 *   déclarés — y compris aucun. C'est le point décisif : `PE 4 § 2` reste dû
 *   via `PE 2 § 3` par les établissements qui ont le moins déclaré, et une
 *   décomposition par installation y produirait zéro ligne.
 *
 * - `salarie` : une ligne par personne **déclarée détentrice du titre**
 *   (ADR-023). Et c'est le point qui distingue ce porteur des deux autres :
 *   les instances ne sont PAS dérivées par le moteur. Rien dans le modèle ne
 *   dit qu'une personne opère sur des installations électriques — ce serait le
 *   cinquième déclencheur, « activité réellement exercée », non implémenté.
 *   Appliquer l'habilitation à tout l'effectif parce qu'un tableau électrique
 *   existe serait un faux positif de masse. L'employeur déclare qui détient
 *   quoi ; le référentiel fournit le catalogue et les rythmes.
 *
 * L'ADR-022 annonçait que l'union était « faite pour accueillir `salarie` sans
 * rien changer d'autre ». C'était faux : la branche du moteur était écrite en
 * négation et concluait « établissement » en dur, la boucle du générateur était
 * un ternaire, et la clé de réconciliation n'avait qu'une sentinelle. Les trois
 * sont corrigées par l'ADR-023 — d'où l'insistance, plus bas, sur l'analyse de
 * cas exhaustive.
 */
export type PorteurObligation = "equipement" | "etablissement" | "salarie";

/**
 * Ce qu'une obligation implique **ailleurs que sur elle-même** (ADR-024).
 *
 * Le produit sait très bien faire naître une obligation — moteur de matching,
 * trois porteurs, générateur idempotent. Il ne savait pas dire ce qu'elle
 * exige d'autre. Une électricienne déclarée à l'effectif, un tableau
 * électrique déclaré au parc, et rien nulle part ne disait qu'une habilitation
 * était peut-être due.
 *
 * Ce type est le troisième terme entre **dériver** — refusé, et à raison :
 * rien ne dit qui opère sur quoi, appliquer l'habilitation à tout l'effectif
 * parce qu'un tableau existe serait un faux positif de masse (ADR-023) — et
 * **se taire**, qui était l'état précédent. Il **nomme le trou sans le
 * combler**, exactement comme `equipements/hors-referentiel.ts` (« le silence
 * ne doit jamais ressembler à une réponse ») et `duerps/couverture.ts` (« ce
 * module ne comble pas le trou : il le nomme »).
 *
 * Une transmission ne crée aucune ligne de calendrier, ne coche rien, ne
 * préremplit rien. Elle pose une question dont la réponse appartient au
 * dirigeant.
 *
 * **Ce qui se dérive n'est pas ici.** Qu'une obligation exigeant un
 * `organisme_agree` en électricité suppose un prestataire d'électricité se
 * calcule depuis `domaine` et `realisateurs`, qui existent déjà : la
 * correspondance vit une fois dans `domaines.ts`, pas 85 fois dans le
 * référentiel. `Transmission` ne porte que l'indérivable.
 */
export type Transmission =
  | {
      /**
       * L'obligation suppose une **personne nommée**, et le produit ne peut
       * pas deviner laquelle.
       */
      vers: "salarie_designe";
      /**
       * L'identifiant de l'obligation salarié correspondante au catalogue —
       * ou `null` quand le référentiel ne sait pas encore l'encoder.
       *
       * `null` est une **réponse déclarée**, pas un oubli. Le champ est
       * nullable et requis pour cette raison précise : optionnel, l'absence
       * aurait été muette.
       *
       * **Il n'en reste aucun, et `transmission.test.ts` tient le cliquet à
       * zéro.** Le seul cas qui a existé était l'habilitation électrique de
       * `R. 4544-10` — branchée sur `elec-salarie-habilitation` le
       * 2026-09-01. Ce qu'il coûtait mérite d'être su avant d'en réécrire
       * un : l'écran disait au dirigeant « cette obligation suppose une
       * personne nommée, aucune n'est déclarée » et ne lui laissait pas
       * répondre. Un `null` n'est donc pas neutre — il pose une question
       * fermée. Et ce qui bloquait l'encodage n'était pas l'absence de
       * lecture, c'était la croyance qu'un titre suppose une durée :
       * `TitreSalarie.echeanceLe` est nullable, et `periodicite: "autre"`
       * interdit au générateur d'en calculer une. Avant d'écrire `null`,
       * vérifier que le blocage n'est pas celui-là.
       */
      titre: string | null;
      /** Ce que le texte dit, qui fonde la transmission. Une phrase. */
      motif: string;
    }
  | {
      /**
       * L'obligation produit une échéance que **rien ne peut solder
       * correctement** : le modèle qui la recevrait n'existe pas.
       *
       * Le cas type est `R. 4227-39`, qui impose que la date et les
       * observations des exercices soient « consignées sur un registre ». Le
       * produit n'offre qu'un dépôt de fichier là où le texte attend un
       * formulaire.
       */
      vers: "modele_absent";
      /** Le nom du modèle manquant, tel que `docs/registre-securite-ecart.md` le nomme. */
      modele: string;
      motif: string;
    }
  | {
      /**
       * Il manque un **attribut** pour trancher l'applicabilité, et personne
       * ne peut le renseigner parce que le champ n'existe pas.
       *
       * Nommer l'attribut ne rouvre aucun ADR : le bâtiment reste un lieu qui
       * ne porte aucune échéance (ADR-019). Dire « il manque l'année du permis
       * de construire » n'est pas lui donner un régime.
       */
      vers: "attribut_absent";
      sujet: "etablissement" | "batiment";
      /** Le nom de l'attribut, tel qu'il s'appellerait au schéma. */
      attribut: string;
      motif: string;
    };

/**
 * Deux titres que le droit **interdit de cumuler sur la même personne**.
 *
 * Le référentiel le savait déjà et le disait en prose : « EXCLUSIF DU SIR »,
 * « se substitue à la visite d'information et de prévention », « la visite
 * intermédiaire mentionnée au même article n'est pas requise », « l'interface
 * ne doit pas proposer les deux ensemble ». Rien ne lisait ces phrases. Un
 * employeur pouvait déclarer les deux titres, et le générateur inscrivait au
 * calendrier une échéance que le texte **écarte expressément** — le genre
 * d'échéance inventée qui se présente à un contrôle.
 *
 * **Pourquoi pas une `ConditionApplication`.** Elles portent sur des propriétés
 * d'ÉQUIPEMENT et sont interdites sur un porteur salarié (`conditions?: never`).
 * Elles décident en outre de l'applicabilité d'une obligation d'après un fait
 * du parc ; ici il n'y a aucun fait à interroger, seulement deux déclarations
 * de l'employeur qui ne peuvent pas coexister.
 *
 * **Pourquoi au référentiel et pas à l'interface.** L'exclusion est une
 * propriété du texte, pas d'un écran. Une règle écrite dans le formulaire
 * serait invisible à `declarerTitre`, qui est une action serveur atteignable
 * sans lui, et invisible aux dossiers où les deux titres sont **déjà**
 * déclarés. Même raisonnement que l'ADR-024 pour `transmet` : le référentiel
 * porte ce que le texte dit, les lecteurs en tirent des écrans.
 *
 * **CE QUE CE CHAMP PORTE, ET CE QU'IL NE PORTE PAS.** Il porte ce qu'un texte
 * EXCLUT — une substitution (« se substitue à »), une dispense (« n'est pas
 * requise »), ou le même acte à un autre rythme (« et non tous les quatre
 * ans »). Il ne porte PAS ce qui serait seulement incohérent. La visite
 * intermédiaire du suivi renforcé ne naît pas chez un salarié qui n'a qu'une
 * visite d'information et de prévention, mais aucun texte ne l'exclut pour
 * lui : elle n'est donc pas déclarée là. Sans cette ligne, la table cesse
 * d'être une lecture du droit et devient un treillis déduit, qui refuserait
 * des saisies que rien n'interdit.
 *
 * **UN SEUL CÔTÉ DÉCLARE, ET C'EST LE CÔTÉ DÉROGATOIRE.** L'obligation qui
 * porte le texte d'exception — R. 4624-24 qui substitue, R. 4451-82 qui
 * dispense — déclare ce qu'elle écarte ; l'autre ne recopie rien. La symétrie
 * n'est pas écrite deux fois puis vérifiée, elle est **fermée à la lecture**
 * par `exclusionsDuTitre()` (`lib/salaries/catalogue.ts`), donc vraie par
 * construction. C'est la règle du dépôt sur les listes tenues à la main :
 * recopiée, une moitié de couple finit par manquer, et une garde qui se répare
 * en recopiant cesse de vérifier.
 *
 * La relation n'est **jamais fermée transitivement**. A exclut B et B exclut C
 * n'implique pas que A exclut C ; les couples qui tiennent se déclarent, un
 * par un, chacun avec le texte qui le fonde.
 */
export type ExclusionMutuelle = {
  /**
   * L'identifiant de l'autre titre. Doit désigner une obligation **portée par
   * un salarié** et réellement présente au référentiel — `exclusion.test.ts`
   * le vérifie, et un titre ne s'exclut pas lui-même.
   */
  titre: string;
  /**
   * Ce que le texte dit, qui fonde l'exclusion. Une phrase — et pas une note
   * interne : **elle est montrée au dirigeant** quand le produit refuse la
   * déclaration ou signale le cumul déjà en place. Un refus sans motif serait
   * un mur ; le motif est ce qui le rend actionnable.
   */
  motif: string;
};

/** Champs communs à toutes les obligations, quel que soit leur porteur. */
type ObligationCommune = {
  /** Identifiant stable, versionné avec le code. Jamais réutilisé. */
  id: string;
  domaine: DomaineObligation;
  /** Libellé court affichable dans l'UI et le calendrier. */
  libelle: string;
  /** Texte long optionnel pour la fiche détaillée et le registre. */
  description?: string;
  /**
   * Liste non vide de références. Au moins une source primaire opposable.
   *
   * Convention d'ordre : `referencesLegales[0]` est l'article qui **fonde**
   * l'obligation — celui qu'on citerait seul devant un inspecteur. Les
   * suivantes sont du contexte (article qui pose un seuil, texte d'application,
   * fiche INRS). Le test anti-doublon du référentiel s'appuie sur cette
   * convention : deux obligations fondées sur le même article, pour la même
   * catégorie d'équipement et la même périodicité, sont un doublon.
   */
  referencesLegales: [ReferenceLegale, ...ReferenceLegale[]];
  periodicite: Periodicite;
  /**
   * Le plafond du PREMIER cycle, quand le texte en fixe un distinct du rythme.
   *
   * Absent presque partout, et c'est la vérité commune : un extincteur installé
   * en mars se vérifie en mars suivant, puis chaque mars. Le champ ne sert que
   * là où le texte dit autre chose — « la première inspection a lieu dans les
   * trois ans suivant la mise en service, puis tous les quatre ans ».
   *
   * **Il n'est lu que par la branche sans historique du générateur**, et cette
   * portée est délibérée : une vérification réalisée fait repartir le RYTHME,
   * pas le premier délai. Élargir sa lecture au calcul d'après rapport
   * rejouerait indéfiniment le premier cycle.
   *
   * POURQUOI IL EXISTE. `esp-inspection-periodique` a porté `triennale`
   * pendant des mois : c'était le plafond du premier cycle de l'arrêté du
   * 20 novembre 2017, pris pour la récurrence. Le corriger en `quadriennale` a
   * rendu la récurrence juste et laissé le premier cycle un an en retard —
   * échangeant une sur-application visible contre une sous-application que
   * personne ne peut voir, sur une ligne de criticité 5. Le modèle n'avait
   * simplement pas de place pour les deux valeurs.
   *
   * **Ce n'est pas une exception ESP.** `PE 4` porte aussi un premier délai
   * distinct de son rythme, et le règlement des chaufferies un troisième.
   * Encoder le premier délai à la place du rythme est une faute qui se
   * reproduira partout où le modèle n'a pas de place pour lui.
   */
  premierDelai?: Periodicite;
  /**
   * Le régime temporel que le texte impose (ADR-026). **Requis, et c'est le
   * point** — même raisonnement que `transmet` et `pieceMedicale` : optionnel,
   * le champ se serait tu, et l'oubli aurait été la faute naturelle.
   *
   * Il ne se déduit pas de `periodicite`, et c'est toute sa raison d'être :
   * `autre` recouvre au moins trois natures, et `mise_en_service_uniquement`
   * en recouvre deux. Voir `NatureObligation`.
   *
   * **Règle de résolution quand un article porte plusieurs titres.** Certains
   * en portent deux — « à la mise en service **ou après modification** », « à
   * l'embauche **et chaque fois que nécessaire** ». On encode alors celui qui
   * **oblige à refaire l'acte**, dans cet ordre : `echeance_recurrente`, puis
   * `evenementielle`, puis `ponctuelle`, puis `etat_permanent`. Le motif est
   * dans la conséquence : une obligation qui revient ne se solde pas par une
   * déclaration unique, et c'est la question à laquelle ce champ sert à
   * répondre. Chaque ligne concernée le dit dans ses `notesInternes`.
   *
   * **N'entre pas dans `empreinteReferentiel()`.** La nature ne décide ni de
   * l'existence d'une ligne de `Verification`, ni de sa date : c'est
   * `periodicite` et `porteur` qui le font. L'y faire entrer réconcilierait
   * tout le parc pour un résultat identique.
   */
  nature: NatureObligation;
  /**
   * Le nom que le texte donne à l'**écrit dont l'existence est elle-même
   * l'obligation** — registre, carnet, dossier, contrat, consigne, protocole,
   * liste, fiche, autorisation. `null` quand l'obligation porte sur un **acte**
   * (une vérification, une formation, une visite) ou sur un **état matériel**
   * (de l'eau potable, un extincteur accessible).
   *
   * La distinction est fine et elle décide d'un comportement d'écran. Une
   * vérification annuelle produit un rapport, mais le rapport est la *trace* de
   * l'acte, pas l'obligation : `pieceAttendue` reste `null`. `R. 4226-19`, lui,
   * n'impose pas de vérifier, il impose de **consigner sur un registre** — et
   * là l'écrit est l'obligation.
   *
   * **Pourquoi ce champ existe.** Un écran de déclaration d'états permanents
   * (brief `docs/revues/brief-ecran-etats-permanents.md`) pose que le dirigeant
   * coche, sans pièce. C'est juste pour une affiche au mur ou de l'eau
   * potable ; c'en est une pour un registre de sécurité, où une case cochée
   * sans rien derrière serait exactement la déclaration-qui-ressemble-à-une-
   * preuve que le même brief interdit. Le champ nomme les seize lignes où la
   * case seule ne suffit pas.
   *
   * Requis pour la même raison que `nature` : `null` est une réponse, un champ
   * absent n'en est pas une.
   *
   * **N'entre pas dans `empreinteReferentiel()`** : il ne change ni le nombre
   * de lignes ni leurs dates.
   */
  pieceAttendue: string | null;
  /** Réalisateurs acceptés. Au moins un. En général 1, parfois 2 (ex. "personne qualifiée OU organisme agréé"). */
  realisateurs: [Realisateur, ...Realisateur[]];
  /** 1 = informatif, 5 = vital (mise en danger directe si manquement). */
  criticite: 1 | 2 | 3 | 4 | 5;
  /** Régimes auxquels l'obligation s'applique. */
  typologies: TypologieApplication;
  /** Note de contexte interne (ex. précisions de portée) — non affichée par défaut. */
  notesInternes?: string;
  /**
   * Ce que cette obligation implique ailleurs (ADR-024). **Requis, et c'est
   * le point** : un tableau vide est une réponse, un champ absent n'en est
   * pas une.
   *
   * Même raisonnement que `pieceMedicale`, mot pour mot : optionnel, le champ
   * se serait tu, et l'oubli aurait été la faute naturelle — celle qui a fait
   * découvrir treize implications non écrites, une par une, en revue. Requis,
   * l'oubli ne compile pas.
   *
   * **N'entre pas dans `empreinteReferentiel()`**, délibérément. L'empreinte
   * détecte qu'une obligation productrice d'échéances a changé, et force la
   * réconciliation de tous les calendriers. Une transmission ne produit
   * aucune échéance ; l'y faire entrer réconcilierait tous les dossiers à
   * chaque annotation de relecture, pour un résultat identique.
   */
  transmet: Transmission[];
  /**
   * Rendez-vous de relecture annoncé par le texte lui-même. Un test échoue
   * quand la date est passée : une note qui ne réveille personne n'est pas un
   * garde-fou.
   */
  relectureDue?: RelectureDue;
};

/**
 * Obligation déclenchée par un équipement déclaré : une ligne de calendrier
 * par équipement qui la déclenche, aucune si aucun n'est déclaré.
 */
export type ObligationPorteeParEquipement = ObligationCommune & {
  /**
   * Absent vaut `"equipement"` : les 85 obligations livrées avant l'ADR-022
   * n'ont pas à être annotées une par une pour rester ce qu'elles sont.
   */
  porteur?: "equipement";
  /** Catégories d'équipement qui déclenchent l'obligation (au moins une). */
  categoriesEquipement: [CategorieEquipement, ...CategorieEquipement[]];
  /** Conditions supplémentaires (propriétés d'équipement). Optionnel. */
  conditions?: ConditionApplication[];
  /** Interdit ici : le contexte n'a de sens que pour un porteur établissement. */
  equipementsEnContexte?: never;
};

/**
 * Obligation portée par l'établissement : **une seule** ligne de calendrier,
 * indépendante des équipements déclarés (ADR-022, § 4).
 */
export type ObligationPorteeParEtablissement = ObligationCommune & {
  porteur: "etablissement";
  /**
   * Interdit : aucune catégorie ne déclenche cette obligation. Le champ est
   * déclaré en `never` plutôt qu'omis pour que l'erreur soit lisible — sans
   * lui, TypeScript ne signalerait qu'une propriété « inconnue ».
   */
  categoriesEquipement?: never;
  /** Interdit : les conditions portent sur des propriétés d'équipement. */
  conditions?: never;
  /**
   * Catégories affichées **à titre indicatif** sous l'obligation, pour que le
   * dirigeant voie lesquels de ses équipements sont concernés. Ce n'est pas un
   * déclencheur : la ligne existe même si aucun n'est déclaré, et l'interface
   * accompagne la liste de la mention « non limitative » — `PE 4 § 2` finit
   * par « etc. », le produit ne doit pas prétendre le contraire.
   */
  equipementsEnContexte?: CategorieEquipement[];
};

/**
 * Obligation portée par un salarié nommé (ADR-023).
 *
 * Nominative par nature : `R. 4544-10` délivre le titre d'habilitation « à un
 * travailleur désigné », et il en va de même d'une attestation SST, d'un CACES
 * ou d'une autorisation de conduite. Un suivi par poste produirait un compteur
 * — « deux caristes à habiliter » — et ne prouverait rien en contrôle.
 *
 * Ses lignes de calendrier naissent d'un `TitreSalarie` déclaré par
 * l'employeur, pas du moteur de matching : voir le commentaire de
 * `PorteurObligation`.
 */
export type ObligationPorteeParSalarie = ObligationCommune & {
  porteur: "salarie";
  /** Interdit : aucune catégorie d'équipement ne déclenche cette obligation. */
  categoriesEquipement?: never;
  /** Interdit : les conditions portent sur des propriétés d'équipement. */
  conditions?: never;
  /** Interdit : le contexte d'équipement n'a de sens que pour l'établissement. */
  equipementsEnContexte?: never;
  /**
   * Les titres que le droit interdit de cumuler avec celui-ci. **Requis, et
   * c'est le point** — troisième champ de ce type après `transmet` et
   * `pieceMedicale`, et le même argument mot pour mot : un tableau vide est
   * une réponse, un champ absent n'en est pas une.
   *
   * L'arithmétique est celle qui compte ici, et elle diffère de `transmet`.
   * Le champ ne vit **que sur le porteur salarié** : treize obligations, pas
   * cent seize. Une exclusion ne peut mordre que là où un humain DÉCLARE —
   * les instances d'équipement et d'établissement sont dérivées par le moteur,
   * qui ne peut pas produire un couple interdit. Requis sur treize lignes dont
   * cinq portent quelque chose, ce n'est pas du sur-engineering : c'est le
   * cliquet qui force la question au prochain titre encodé.
   *
   * Et l'oubli est ici la faute NATURELLE, pas une hypothèse : les deux
   * dernières obligations entrées dans ce fichier — `-vip-adaptee` et
   * `-sir-categorie-a` — ont chacune créé une exclusion, l'ont écrite dans
   * leurs notes, et personne ne l'a portée nulle part. Optionnel, le champ se
   * serait tu une troisième fois.
   *
   * **N'entre pas dans `empreinteReferentiel()`**, comme `transmet`. Une
   * exclusion ne crée aucune ligne de calendrier ; elle en empêche une. Ce
   * qu'elle change, elle le change à la saisie, pas à la génération.
   */
  exclut: ExclusionMutuelle[];
  /**
   * La pièce est-elle de nature médicale ? **Requis, et c'est le point.**
   *
   * Décide ce que l'interface s'autorise à demander. Sur une pièce médicale,
   * l'outil ne collecte que l'existence, la date et l'échéance — jamais le
   * motif, jamais le sens détaillé, jamais le fichier. C'est **plus strict que
   * le droit** : `R. 4544-11-1` autorise l'employeur à conserver copie de
   * l'attestation. Le choix est assumé et motivé dans `docs/rgpd.md` § 2.3.
   *
   * Pourquoi pas `?: boolean`. Une seule obligation salarié existe aujourd'hui
   * et elle porte le drapeau. Quand les dix-huit autres arriveront — SST,
   * CACES, autorisation de conduite, visite d'information et de prévention —
   * l'oubli sera la faute naturelle : optionnel, le champ se serait tu, et
   * l'interface aurait proposé de téléverser l'attestation. Requis, l'oubli ne
   * compile pas.
   *
   * Le rendre obligatoire vaut mieux qu'un test qui devinerait, d'après le
   * libellé, ce qui « parle de médecine » : c'est exactement l'inférence que ce
   * référentiel refuse partout ailleurs. Ici, quelqu'un tranche, et sa décision
   * est écrite.
   */
  pieceMedicale: boolean;
};

export type Obligation =
  | ObligationPorteeParEquipement
  | ObligationPorteeParEtablissement
  | ObligationPorteeParSalarie;

/**
 * Le porteur d'une obligation, avec sa valeur par défaut appliquée.
 * À préférer à `o.porteur` partout : ce dernier est `undefined` sur les
 * obligations d'équipement qui ne l'annoncent pas.
 */
export function porteurDe(o: Obligation): PorteurObligation {
  return o.porteur ?? "equipement";
}

/**
 * Rétrécit une obligation à sa variante « équipement ». Les lecteurs qui ne
 * savent traiter que ce cas s'en servent comme garde, plutôt que de supposer
 * que `categoriesEquipement` existe.
 */
export function estPorteeParEquipement(
  o: Obligation,
): o is ObligationPorteeParEquipement {
  return porteurDe(o) === "equipement";
}

/**
 * Rétrécit une obligation à sa variante « salarié ».
 *
 * À utiliser plutôt qu'une négation. `!estPorteeParEquipement(o)` a signifié
 * « établissement » tant qu'il n'y avait que deux porteurs ; le jour où le
 * troisième est arrivé, cette négation l'a silencieusement attribué au cas
 * précédent (ADR-023, § Contexte). Un quatrième porteur ferait la même chose à
 * celui-ci.
 */
export function estPorteeParSalarie(
  o: Obligation,
): o is ObligationPorteeParSalarie {
  return porteurDe(o) === "salarie";
}
