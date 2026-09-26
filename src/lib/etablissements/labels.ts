import type { CATEGORIES_ERP, TYPE_ERP } from "./schema";

/**
 * Les libellés lisibles des types et catégories d'ERP.
 *
 * Ils vivaient dans `components/etablissements/EtablissementForm.tsx`, où
 * l'onboarding ne pouvait pas les lire. Depuis que le parcours de création ne
 * déduit plus le type mais le fait **déclarer** (ADR-025 § 2, décision du
 * 2026-09-01), les deux écrans posent exactement la même question et doivent
 * la poser avec les mêmes mots : deux listes recopiées finissent par diverger,
 * et c'est alors le dirigeant qui lit deux fois autre chose.
 *
 * Les `Record` sont exhaustifs par construction : ajouter un type à l'enum
 * sans lui écrire de libellé ne compile pas.
 */

/**
 * **Les vingt-deux types de l'article GN 1 § 1, et ils y sont tous.**
 *
 * Ils n'étaient que vingt et un jusqu'au 2026-09-03. La note qui vivait ici
 * disait que le type J — structures d'accueil pour personnes âgées et
 * personnes handicapées — était écarté par un choix de PÉRIMÈTRE, à trancher
 * ailleurs qu'en ajoutant une ligne à ce `Record`. C'était une reconstruction
 * après coup : rien, dans l'histoire du dépôt, ne montre une décision de
 * l'écarter. L'ADR-004 avait écrit la liste une seule fois, de mémoire,
 * en concluant sur « (~20 valeurs) » — et personne ne l'avait jamais
 * confrontée à la nomenclature. Le manque a été DÉCOUVERT en lisant le
 * tableau de GE 4, pas décidé.
 *
 * L'écran, lui, ne triait rien : un exploitant de type J cherchait sa ligne,
 * ne la trouvait pas, et se rangeait sous U ou sous R pour pouvoir continuer.
 * La donnée était fausse à la source, et tout ce qui s'en déduit avec elle.
 *
 * LES LIBELLÉS SUIVENT DÉSORMAIS LE TEXTE, ET PAS SEULEMENT LES LETTRES.
 * Quatre d'entre eux ont été recalés sur le verbatim de GN 1 le même jour,
 * pour la même raison qu'ils existent — décider si quelqu'un se reconnaît :
 *   - `L` ne disait ni « réunion » ni « polyvalente », alors que l'arrêté du
 *     7 février 2022 a précisément remplacé « à usage multiple » par
 *     « ou polyvalentes » ; une salle des fêtes communale ne s'y voyait pas.
 *   - `R` disait « enseignement, colonies » là où le texte écrit « éveil,
 *     enseignement, FORMATION, centres de vacances, centres de loisirs sans
 *     hébergement » : un organisme de formation et une crèche ne s'y
 *     reconnaissaient pas.
 *   - `U` disait « établissement de soins », le texte dit « établissements
 *     sanitaires » ; les deux mots sont gardés, l'un pour la source, l'autre
 *     pour la reconnaissance.
 *   - `GA` disait « gare accessible au public », le texte dit « gares » —
 *     la précision ajoutée n'est pas dans la nomenclature.
 *
 * Les `Record` sont exhaustifs par construction : ajouter un type à l'enum
 * sans lui écrire de libellé ne compile pas. Ce que la compilation ne dit pas,
 * c'est si l'enum est complet — `types-erp.test.ts` s'en charge, en dérivant
 * la liste du verbatim de GN 1 dépouillé au corpus.
 */
export const LABEL_TYPE_ERP: Record<(typeof TYPE_ERP)[number], string> = {
  M: "M · Magasin de vente, centre commercial",
  N: "N · Restaurant, débit de boissons",
  O: "O · Hôtel, pension de famille",
  L: "L · Salle d'audition, de conférence, de réunion, de spectacle ou polyvalente",
  P: "P · Salle de danse, salle de jeux",
  R: "R · Éveil, enseignement, formation, centre de vacances ou de loisirs",
  S: "S · Bibliothèque, centre de documentation",
  T: "T · Salle d'exposition",
  U: "U · Établissement sanitaire, de soins",
  V: "V · Établissement de culte",
  W: "W · Administration, banque, bureau",
  X: "X · Établissement sportif couvert",
  Y: "Y · Musée",
  // Le libellé dit ce que la nomenclature dit, et pas la lettre seule : c'est
  // lui qui décide si le directeur d'un EHPAD, d'une résidence autonomie ou
  // d'un foyer d'accueil médicalisé se reconnaît dans la liste. « J » tout
  // court ne lui aurait rien appris.
  J: "J · Structure d'accueil pour personnes âgées ou handicapées",
  PA: "PA · Établissement de plein air",
  CTS: "CTS · Chapiteau, tente, structure",
  SG: "SG · Structure gonflable",
  PS: "PS · Parc de stationnement couvert",
  REF: "REF · Refuge de montagne",
  GA: "GA · Gare",
  OA: "OA · Hôtel-restaurant d'altitude",
  EF: "EF · Établissement flottant",
};

/**
 * Les seuils entre parenthèses comptent le **public admis**, jamais les
 * salariés. C'est ce qui a tranché le périmètre du produit le 2026-09-01 :
 * un restaurant de huit salariés qui peut accueillir quatre cents personnes à la fois relève de la
 * 3ᵉ catégorie et reste dans la cible, alors que la borne de l'outil est de
 * cinquante travailleurs. Les deux chiffres ne parlent pas de la même chose.
 */
export const LABEL_CATEGORIE_ERP: Record<
  (typeof CATEGORIES_ERP)[number],
  string
> = {
  N1: "1ʳᵉ catégorie (> 1500 personnes)",
  N2: "2ᵉ catégorie (701 à 1500)",
  N3: "3ᵉ catégorie (301 à 700)",
  N4: "4ᵉ catégorie (jusqu'à 300, seuil du type)",
  N5: "5ᵉ catégorie (petits établissements, règles PE)",
};
