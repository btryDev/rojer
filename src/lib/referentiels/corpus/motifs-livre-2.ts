// Motifs partagés des corpus du livre II de l'arrêté du 25 juin 1980
// (`arrete-1980-livre-2` pour le titre Ier, `arrete-1980-livre-2-titre-2`).
//
// Extraits le 2026-10-17 (revue indépendante de `lot/ref-a-corpus-titre-1`) :
// un motif recopié quarante fois se corrige quarante fois, ou une seule et pas
// les autres. Une constante n'entre ici que si son texte est IDENTIQUE dans
// toutes les entrées qui l'emploient ; une entrée qui dit plus l'ajoute à la
// suite (`MOTIF_X + " …"`). Les motifs propres au titre II (généralités,
// dotation, usage, manifestation du type T, SSIAP) restent dans leur fichier :
// aucun n'a de texte identique au titre Ier. `motifs-livre-2.test.ts` vérifie
// que chaque phrase ci-dessous n'est écrite qu'ici.
//
// Module **pur**.

/** Chapitre XI (MS) : un moyen de secours imposé, à réaliser à l'installation. */
export const MOTIF_DOTATION_MOYEN_DE_SECOURS =
  "Règle de DOTATION ou de conception d'un moyen de secours (caractéristiques, alimentation, implantation, normes), imposé par la commission ou par les dispositions particulières : il se réalise à l'installation. Ce que l'exploitant doit sur le moyen en service — entretien et vérification — est à MS 72 et MS 73, et aux lignes du référentiel par équipement déclaré.";

/** Chapitre V (CH) : règles d'installation du chauffage, de la ventilation, du froid. */
export const MOTIF_INSTALLATION_CHAUFFAGE_VENTILATION =
  "Règle d'installation (implantation, isolement, ventilation, matériaux, dispositifs de sécurité intégrés) : elle s'adresse à l'installateur et se contrôle à la mise en service. L'entretien et la vérification annuels des installations de chauffage-ventilation sont portés par CH 57 et CH 58 (`aeration-erp-chauffage-ventilation-annuelle`).";

/** Chapitre VII (EL) : règles de l'installation électrique. */
export const MOTIF_INSTALLATION_ELECTRIQUE =
  "Règle de conception et de réalisation de l'installation électrique (NF C 15-100, NF S 61-940, NF EN 50171) : elle s'adresse à l'installateur et se contrôle à la mise en service. L'entretien et la vérification de l'installation en service sont à EL 18 et EL 19, portés au référentiel.";

/** Chapitre X (GC) : règles des installations de cuisson. */
export const MOTIF_INSTALLATION_CUISSON =
  "Règle d'implantation, d'isolement ou de ventilation des installations de cuisson : elle s'adresse au concepteur et à l'installateur, et se contrôle à la mise en service (`cuisson-erp-verification-initiale`). L'entretien et la vérification en service sont à GC 21 et GC 22, au corpus.";

/** Chapitre VI (GZ) : exigences de l'installation de gaz. */
export const MOTIF_INSTALLATION_GAZ =
  "Exigence de conception et de réalisation de l'installation de gaz, que les guides approuvés de GZ 3 déclinent en solutions techniques : elle s'adresse au concepteur et à l'installateur. Ce que l'exploitant doit, sur l'installation en service, est à GZ 13 § 4 (vérification avant mise en service), GZ 14 (entretien) et GZ 15 (vérification annuelle).";

/** Chapitre VIII (EC) : conception de l'éclairage. */
export const MOTIF_CONCEPTION_ECLAIRAGE =
  "Règle de conception de l'éclairage (circuits, flux, normes des luminaires et des blocs) : elle s'adresse à l'installateur. L'entretien et la vérification de l'éclairage de sécurité en service sont à EC 13 à EC 15 et EL 18, portés au corpus.";

/** Chapitre III (AM) : réaction au feu des matériaux. */
export const MOTIF_REACTION_AU_FEU =
  "Exigence de RÉACTION AU FEU d'un matériau ou d'un élément d'aménagement (classes européennes ou catégories M) : elle se remplit au choix et à la pose du matériau, par l'aménageur ; l'exploitant ne la rythme pas.";

/** Article d'objectifs (EL 1, EC 1). */
export const MOTIF_OBJECTIFS_DU_CHAPITRE =
  "Objectifs du chapitre : ni acte ni échéance.";

/** Pièces du dossier de sécurité des travaux (EC 4, MS 3). */
export const MOTIF_PIECES_DOSSIER_TRAVAUX =
  "Pièces du dossier de sécurité des travaux (GE 2 § 2).";

/** Fin du motif d'un article abrogé — partagée par les deux corpus du livre II. */
export const SUITE_ARTICLE_ABROGE_LU =
  "Lu pour être compté : la table des matières le liste encore, et un article qui manque au corpus ne se distingue pas d'un article oublié.";

/** Suite d'un motif de construction dont la version au 2027-06-01 a été lue. */
export const SUITE_VERSION_FUTURE_CONSTRUCTION =
  " Version future au 2027-06-01 (arrêté du 19 février 2026) lue : même nature, règle de conception.";

/** Même chose pour la réaction au feu. */
export const SUITE_VERSION_FUTURE_REACTION_AU_FEU =
  " Version future au 2027-06-01 (arrêté du 19 février 2026) lue : même nature, exigence de réaction au feu des matériaux.";

/** Suite d'un motif du chapitre GZ récrit par l'arrêté du 23 février 2025. */
export const SUITE_REDACTION_GAZ_2026 =
  " Rédaction issue de l'arrêté du 23 février 2025, en vigueur le 2026-01-01, lue dans cette version.";

// ~~/** Suite d'un motif d'acte trouvé le 2026-10-17, en attente du sous-lot C. */~~
// ~~export const SUITE_TRANSITOIRE_SOUS_LOT_C = " À faire au sous-lot C ;
// transitoirement au § 9.";~~ — 2026-10-17, sous-lot C : retirée, plus aucun
// motif ne la portait. Les entrées qui l'employaient sont retenues ou
// annoncées, et leur `historique` recopie la phrase rayée.

/** Adresse d'annonce : la phrase de manque de l'axe `categorie_erp` (déplacée ici depuis `arrete-1980-livre-2-titre-2.ts`). */
export const DECLARE_A_CATEGORIE_ERP =
  "src/lib/perimetre/couverture.ts — phrase de manque de l'axe `categorie_erp`, servie à tout ERP des catégories 1 à 4 : « le service de sécurité incendie assuré par des agents de sécurité incendie, notamment, n'y est pas, et des dispositions particulières par type d'activité, il ne porte que quelques-unes ».";

/** Fin du motif de tout article dont le classement `non_couvert` est une décision prise le 2026-10-17 et dont l'adresse est encore muette : la garde « annonce décidée » le reconnaît par cette phrase (revue de `lot/ref-a-corpus-titre-1`). */
export const SUITE_ANNONCE_DECIDEE =
  " Classement décidé le 2026-10-17 : `non_couvert`, et non une ligne à encoder ; où et quand c'est dit est au `declareA`.";
