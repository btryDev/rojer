/**
 * Types partagés entre référentiels DUERP et Conformité (ADR-003).
 *
 * Les valeurs correspondent **à l'identique** aux enums Prisma du modèle V2
 * (cf. `prisma/schema.prisma`). Toute divergence rend le seed ou le moteur de
 * matching incohérent — si l'un bouge, l'autre doit bouger en PR jumelle.
 *
 * Sources de typologie (ADR-004) :
 * - Arrêté du 25 juin 1980 (ERP) — dispositions générales du règlement de
 *   sécurité contre les risques d'incendie et de panique dans les ERP.
 *   https://www.legifrance.gouv.fr/loda/id/LEGITEXT000020303557/
 * - Arrêté du 22 juin 1990 (ERP 5ᵉ cat — règles PE).
 *   https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000525278
 * - Arrêté du 30 décembre 2011 (IGH — règlement de sécurité).
 *   https://www.legifrance.gouv.fr/loda/id/JORFTEXT000025167121
 * - CCH art. R. 143-1 s. (ERP) et R. 146-3 s. (IGH).
 */

// -----------------------------------------------------------------------------
// Périodicité — reflet exact de l'enum Prisma `Periodicite`
// -----------------------------------------------------------------------------

export const PERIODICITES = [
  "hebdomadaire",
  "bimensuelle",
  "mensuelle",
  "six_semaines",
  "trimestrielle",
  "semestrielle",
  "annuelle",
  "biennale",
  "triennale",
  "quadriennale",
  "quinquennale",
  "decennale",
  "mise_en_service_uniquement",
  "autre",
] as const;

export type Periodicite = (typeof PERIODICITES)[number];

/**
 * Durée approximative d'une périodicité, en jours. **Un ORDRE, pas un
 * calendrier.**
 *
 * Elle sert à deux choses, et à deux seulement : comparer deux rythmes
 * (`estPeriodicitePlusStricte` — une prescription d'assureur renforce-t-elle
 * le rythme réglementaire ?) et dire si une périodicité a un rythme du tout
 * (`null` = pas d'échéance suivante). Pour ces deux usages, une approximation
 * monotone est exacte.
 *
 * **Elle ne sert plus à dater une échéance**, et c'est le lot 4 du § 11 qui
 * l'en a retirée le 2026-09-10. `annuelle = 365` dérive d'un jour une fois sur
 * quatre, `triennale = 1095` trois fois sur quatre, `quadriennale = 1460` et
 * `quinquennale = 1825` **toujours** — tout intervalle de quatre ou cinq ans
 * contient un 29 février. Un contrôle fait le 1er juin 2025, quinquennal,
 * tombait le 31 mai 2030 ; le texte dit cinq ans, donc le 1er juin. Le sens
 * de la dérive était conservateur (en avance, jamais en retard), ce qui l'a
 * rendue tolérable un mois de trop. Dater se fait avec
 * `PERIODICITE_CALENDAIRE` ci-dessous, par `prochaineEcheance`.
 */
export const PERIODICITE_EN_JOURS: Record<Periodicite, number | null> = {
  hebdomadaire: 7,
  // Quinze jours. Introduite pour EL 18 § 4, qui impose « tous les quinze
  // jours » la vérification des niveaux d'un groupe électrogène de sécurité.
  // Sans elle, le choix se réduisait à `hebdomadaire` — qui double la charge
  // réelle — ou `mensuelle`, qui tait l'obligation. Quatorze jours et non
  // quinze : la conversion sert à calculer une échéance, et un multiple de
  // sept fait retomber le rendez-vous le même jour de la semaine.
  bimensuelle: 14,
  mensuelle: 30,
  // Quarante-deux jours. L'annexe de l'arrêté du 18 novembre 2004 écrit un
  // « INTERVALLE maximum de six semaines » pour la visite de base des
  // ascenseurs. Six semaines n'est pas un mois et demi : le texte compte en
  // semaines, la conversion est exacte.
  six_semaines: 42,
  trimestrielle: 91,
  semestrielle: 182,
  annuelle: 365,
  biennale: 730,
  triennale: 1095,
  quadriennale: 1460,
  quinquennale: 1825,
  decennale: 3650,
  mise_en_service_uniquement: null,
  autre: null,
};

/**
 * Ce qu'une périodicité vaut EN CALENDRIER — l'unité que le texte emploie.
 *
 * Deux unités, parce que les textes en emploient deux. Les rythmes courts sont
 * écrits en jours ou en semaines (« tous les quinze jours », EL 18 § 4 ; « un
 * intervalle maximum de six semaines », arrêté du 18 novembre 2004) : sept
 * jours font toujours sept jours, la conversion est exacte. Les rythmes longs
 * sont écrits en mois ou en ans (« au minimum une fois par an », « tous les
 * cinq ans ») : un an n'est pas 365 jours, c'est le même jour l'année
 * suivante — écrêté en fin de mois quand il n'existe pas, 29 février compris.
 *
 * `null` = pas de rendez-vous suivant : une obligation ponctuelle ou un état
 * permanent (ADR-026).
 *
 * `mensuelle` et `trimestrielle`/`semestrielle` passent en MOIS et non plus
 * en 30/91/182 jours : « tous les mois » fait le même jour le mois suivant,
 * pas trente jours plus tard — la différence est d'un à trois jours et se
 * cumule à chaque cycle.
 */
export const PERIODICITE_CALENDAIRE: Record<
  Periodicite,
  { jours: number } | { mois: number } | null
> = {
  hebdomadaire: { jours: 7 },
  bimensuelle: { jours: 14 },
  six_semaines: { jours: 42 },
  mensuelle: { mois: 1 },
  trimestrielle: { mois: 3 },
  semestrielle: { mois: 6 },
  annuelle: { mois: 12 },
  biennale: { mois: 24 },
  triennale: { mois: 36 },
  quadriennale: { mois: 48 },
  quinquennale: { mois: 60 },
  decennale: { mois: 120 },
  mise_en_service_uniquement: null,
  autre: null,
};

// -----------------------------------------------------------------------------
// Profil du réalisateur — reflet exact de l'enum Prisma `Realisateur`
// -----------------------------------------------------------------------------

export const REALISATEURS = [
  "organisme_agree",
  "organisme_accredite",
  "personne_qualifiee",
  "personne_competente",
  "exploitant",
  "fabricant",
  "bureau_controle",
  // Le médecin du travail, nommément. Ajouté avec le suivi médical (lot 7) :
  // `R. 4624-28` réserve le renouvellement du suivi individuel renforcé au
  // médecin du travail, et `R. 4323-56` lui réserve la délivrance de
  // l'attestation d'absence de contre-indication à la conduite. Aucune valeur
  // existante ne le disait. `exploitant` aurait été le repli naturel — c'est
  // celui qu'a pris `elec-salarie-attestation-medicale-voisinage` avant ce lot
  // — et il annonce au dirigeant qu'il réalise lui-même un acte qu'il lui est
  // interdit de réaliser.
  "medecin_travail",
  // « L'un des professionnels de santé mentionnés au premier alinéa de
  // l'article L. 4624-1 » — médecin du travail, mais aussi collaborateur
  // médecin, interne, infirmier de santé au travail. `R. 4624-10` (visite
  // d'information et de prévention) et la visite intermédiaire de
  // `R. 4624-28` l'écrivent ainsi, là où le renouvellement du SIR exige le
  // médecin. La distinction est dans le texte : la rabattre sur une seule
  // valeur ferait croire qu'une VIP requiert un médecin du travail, ce qui
  // resserre l'obligation au-delà de ce que le Code impose.
  "professionnel_sante_travail",
  // L'équipe pluridisciplinaire d'un service de prévention et de santé au
  // travail interentreprises. `R. 4624-46` la distingue explicitement du
  // médecin : la fiche d'entreprise est établie « par le médecin du travail
  // OU, dans les services de prévention et de santé au travail
  // interentreprises, l'équipe pluridisciplinaire » — verbatim relevé le
  // 2026-08-31, version en vigueur du 2022-04-28.
  //
  // Ce n'est pas un cas limite mais le cas ORDINAIRE de la cible du produit :
  // une TPE de six personnes adhère à un service interentreprises, elle ne
  // salarie pas de médecin du travail. Rabattre ce réalisateur sur
  // `professionnel_sante_travail` restreindrait au personnel soignant une
  // mission que le texte confie à une équipe qui ne l'est pas toute.
  "equipe_pluridisciplinaire",
] as const;

export type Realisateur = (typeof REALISATEURS)[number];

/**
 * Ce qui, dans un texte, nomme chacun de ces réalisateurs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `Realisateur` N'EST PAS LA TRANSCRIPTION D'UNE NOMENCLATURE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Le § 9 de `docs/chantiers-ouverts.md` range cette liste parmi les sept qui
 * « transcrivent une nomenclature écrite dans un texte », et lui donne pour
 * source « `R. 4323-24` et voisins ». Ouvert le 2026-09-03, `R. 4323-24` ne
 * nomme **qu'une seule** de ces dix valeurs : « Les vérifications générales
 * périodiques sont réalisées par des personnes qualifiées, appartenant ou non à
 * l'établissement… ». Il n'y a pas d'article, ni d'arrêté, qui énumère les
 * qualifications admises pour vérifier quoi que ce soit : chaque texte nomme
 * celle qu'il exige, et le produit les agrège.
 *
 * **Il n'y a donc pas de comparaison à faire, dans les deux sens, avec une
 * liste de référence — il n'en existe aucune.** Ce qui se vérifie à la place
 * est plus faible et c'est la seule chose vraie : qu'aucune de ces valeurs ne
 * soit un mot de métier sans texte derrière. Chacune désigne ici l'article du
 * corpus dont le verbatim l'écrit, et `realisateur.test.ts` va relire ce
 * verbatim. Une valeur ajoutée sans ancrage fait rougir le test ; elle ne se
 * répare pas en recopiant une autre déclaration, mais en trouvant le texte.
 *
 * `expression` est le mot du TEXTE, pas la valeur du modèle — les deux
 * divergent volontairement deux fois, et c'est le point le plus intéressant de
 * cette table : voir `bureau_controle` et `exploitant`.
 */
export const ANCRAGE_REALISATEUR: Record<
  Realisateur,
  { ref: string; expression: string }
> = {
  // « soit par des organismes agréés par le ministre de l'intérieur, soit par
  // des techniciens compétents » (GE 6 § 1).
  organisme_agree: { ref: "GE 6", expression: "organismes agréés" },
  // « Lorsque les vérifications sont effectuées par un organisme accrédité… »
  // — R. 4226-19, la consignation au registre des résultats de vérification
  // électrique. AU SINGULIER : la première rédaction de cet ancrage écrivait
  // « organismes accrédités », au pluriel comme son voisin `GE 6`, et le test
  // a rougi. C'est la démonstration en petit de ce que la table sert à faire —
  // le mot vient du texte, pas de la symétrie avec la ligne d'à côté.
  organisme_accredite: { ref: "R. 4226-19", expression: "organisme accrédité" },
  // L'article qui dit QUI réalise les vérifications générales périodiques, pour
  // tous les équipements de travail. Le seul des dix que le § 9 nommait.
  personne_qualifiee: { ref: "R. 4323-24", expression: "personnes qualifiées" },
  // « sous la direction d'une personne compétente » — le montage des
  // échafaudages. À ne pas confondre avec la phrase de `R. 4323-24`, qui
  // emploie « compétentes » comme un adjectif de la personne QUALIFIÉE et non
  // comme une qualité distincte.
  personne_competente: { ref: "R. 4323-69", expression: "personne compétente" },
  // LE TEXTE N'ÉCRIT PAS « EXPLOITANT » ICI, IL ÉCRIT « L'EMPLOYEUR », et la
  // valeur couvre les deux : `R. 4323-23` met la vérification à la charge de
  // l'employeur, qui « procède OU fait procéder ». C'est cette première branche
  // — il la fait lui-même — que `exploitant` nomme. Le règlement ERP, lui, dit
  // « l'exploitant » ; les deux mots désignent le destinataire du produit.
  exploitant: { ref: "R. 4323-23", expression: "l'employeur procède" },
  // « la vérification de l'état de conservation […] conformément à la notice
  // d'instructions du fabricant » — arrêté du 1er mars 2004, art. 5.
  fabricant: { ref: "Arrêté 2004-03-01 art. 5", expression: "fabricant" },
  // LA SEULE VALEUR DONT LE MOT N'EST DANS AUCUN TEXTE. « Bureau de contrôle »
  // est du vocabulaire de métier ; le droit dit « contrôleur technique »
  // (CCH, L. 125-1, et R. 134-12 pour les ascenseurs, qui énumère les
  // contrôleurs admis). La valeur est ancrée sur ce mot-là, et l'écart est
  // déclaré ici plutôt que corrigé : renommer la clé imposerait une migration
  // de données pour un gain nul côté dirigeant, qui ne lit que le libellé et
  // pour qui « bureau de contrôle » est le mot juste. Ce qu'il ne faut pas
  // faire, c'est présenter cette valeur comme un mot du texte.
  bureau_controle: {
    ref: "Arrêté 2012-08-07",
    expression: "contrôleur technique",
  },
  // `R. 4544-11-1` : l'attestation d'absence de contre-indication médicale à la
  // conduite, que seul le médecin du travail délivre.
  medecin_travail: { ref: "R. 4544-11-1", expression: "médecin du travail" },
  // « l'un des professionnels de santé mentionnés au premier alinéa de
  // l'article L. 4624-1 » — la visite d'information et de prévention.
  professionnel_sante_travail: {
    ref: "R. 4624-10",
    expression: "professionnels de santé",
  },
  // « le médecin du travail OU, dans les services de prévention et de santé au
  // travail interentreprises, l'équipe pluridisciplinaire ».
  equipe_pluridisciplinaire: {
    ref: "R. 4624-46",
    expression: "équipe pluridisciplinaire",
  },
};

// -----------------------------------------------------------------------------
// Typologie — ADR-004 (régimes cumulables)
// -----------------------------------------------------------------------------

/**
 * Les VINGT-DEUX types d'exploitation de l'article GN 1 § 1 de l'arrêté du
 * 25 juin 1980 — reflet exact de l'enum Prisma `TypeErp` et de `TYPE_ERP`
 * (src/lib/etablissements/schema.ts).
 *
 * **Cette liste ne se relit plus, elle se dérive.** Elle en portait vingt et
 * un jusqu'au 2026-09-03 : l'ADR-004 l'avait écrite une seule fois, de
 * mémoire, en concluant sur « (~20 valeurs) », et personne ne l'avait
 * confrontée à la nomenclature. Le type J — structures d'accueil pour
 * personnes âgées et personnes handicapées — y manquait, si bien qu'un EHPAD
 * ouvrait la liste des types sans y trouver la sienne.
 *
 * GN 1 est dépouillé depuis (`corpus/arrete-1980-livre-1.ts`), et
 * `types-erp.test.ts` extrait la liste attendue de son verbatim pour la
 * confronter aux quatre déclarations du dépôt, dans les deux sens. Ajouter ou
 * retirer une valeur ici sans que le texte l'écrive fait tomber ce test en
 * nommant la lettre en cause.
 *
 * L'ORDRE N'EST PAS CELUI DU TEXTE, et le test le sait : il compare des
 * ENSEMBLES. GN 1 range J en tête ; le produit met en avant les types des
 * secteurs cibles. Ce qui est repris du texte, en revanche, c'est son
 * découpage en deux groupes — a) établissements installés dans un bâtiment
 * (M à J ci-dessous), b) établissements spéciaux (PA à EF).
 */
export const TYPES_ERP = [
  // a) Établissements installés dans un bâtiment.
  "M", "N", "O", "L", "P", "R", "S", "T", "U", "V",
  "W", "X", "Y", "J",
  // b) Établissements spéciaux.
  "PA", "CTS", "SG", "PS", "REF", "GA", "OA", "EF",
] as const;
export type TypeErp = (typeof TYPES_ERP)[number];

/**
 * Catégories d'ERP — CCH, art. R. 143-19, dans l'ordre du texte.
 *
 * PAS `GN 2` de l'arrêté du 25 juin 1980, qu'on lui attribuait : cet article
 * traite du classement des GROUPEMENTS d'établissements. Le règlement de
 * sécurité emploie la nomenclature, le code la pose. Les cinq valeurs, elles,
 * sont justes — confrontées au verbatim le 2026-09-03.
 */
export const CATEGORIES_ERP = ["N1", "N2", "N3", "N4", "N5"] as const;
export type CategorieErp = (typeof CATEGORIES_ERP)[number];

/**
 * Classes d'IGH — **ce que la base peut CONTENIR**, reflet exact de
 * l'énumération Prisma `ClasseIgh`.
 *
 * À NE PAS CONFONDRE AVEC `CLASSES_IGH` DE `src/lib/etablissements/schema.ts`,
 * qui est la liste des classes DÉCLARABLES. Les deux listes ont été identiques
 * jusqu'au 2026-09-03 ; elles ne le sont plus, et l'écart est le sujet.
 *
 * Le texte — CCH, art. R. 146-4 — écrit DIX classes. Celle-ci en porte ONZE :
 * `GHTC`, `GHW1` et `GHW2` y entrent, et `GHW` y RESTE alors que le code ne
 * l'écrit nulle part. La liste était tirée de l'arrêté du 30 décembre 2011,
 * dont le titre III groupe GH W 1 et GH W 2 sous un chapitre unique « GH W » —
 * un chapitre de règlement, pas une classe.
 *
 * `GHW` est en SURSIS, pas toléré : il a disparu de tous les choix offerts, si
 * bien que plus personne ne peut en créer, mais il reste dans le type parce
 * que des dossiers peuvent en porter et qu'on ne le sait pas encore. Le retirer
 * du type réécrirait la colonne et effacerait ces valeurs sans équivalent —
 * `GHW` ne dit pas si la tour fait 40 ou 60 mètres. Retrait au temps 2 :
 * condition et marche à suivre dans `docs/chantiers-ouverts.md` § 9 bis.
 */
export const CLASSES_IGH = [
  "GHA", "GHO", "GHR", "GHS", "GHTC", "GHU", "GHW1", "GHW2", "GHZ", "ITGH",
  // EN SURSIS — absente de R. 146-4. Ne pas la remettre dans un menu.
  "GHW",
] as const;
export type ClasseIgh = (typeof CLASSES_IGH)[number];

/**
 * Familles d'habitation — arrêté du 31 janvier 1986 (ADR-025 § 4).
 * Reflet exact de l'enum Prisma `FamilleHabitation`.
 *
 * La 3ᵉ famille est scindée : 3A et 3B se distinguent par la desserte par la
 * voie échelle, et cette distinction emporte des obligations différentes.
 */
export const FAMILLES_HABITATION = [
  "PREMIERE",
  "DEUXIEME",
  "TROISIEME_A",
  "TROISIEME_B",
  "QUATRIEME",
] as const;
export type FamilleHabitation = (typeof FAMILLES_HABITATION)[number];

/**
 * Critère d'application d'une obligation à un établissement (ADR-004).
 *
 * Sémantique des champs :
 *  - `undefined` = critère indifférent (pas de contrainte sur ce régime)
 *  - `true`      = requis (doit être vrai côté établissement)
 *  - `false`     = exclu (doit être faux côté établissement)
 *  - `{ categories: [...] }` = requis ET restreint à ces catégories ERP
 *  - `{ types:      [...] }` = requis ET restreint à ces types d'exploitation ERP
 *  - `{ typesExclus: [...] }` = requis SAUF pour ces types d'exploitation ERP
 *  - `{ classes:   [...] }` = requis ET restreint à ces classes IGH
 *
 * `categories` et `types` sont indépendants et cumulables : une obligation
 * peut viser « les ERP de type O, toutes catégories », « les ERP de 1ʳᵉ à 4ᵉ
 * catégorie, tous types », ou les deux à la fois. Chacun se lit **en ET** avec
 * le reste (cf. moteur de matching), et l'absence de la précision côté
 * établissement vaut rejet — comme pour les catégories : une restriction que
 * l'on ne peut pas vérifier ne doit pas être silencieusement ignorée.
 *
 * Restriction par type : à n'employer que si le texte fondateur vise
 * explicitement un ou plusieurs types d'exploitation (dispositions
 * particulières du règlement de sécurité). Les articles des dispositions
 * générales (EL, MS, EC, DF, CH, GC, GZ, GE) s'appliquent à tous les types :
 * y ajouter une liste de types serait une restriction inventée. **Une
 * exception, et elle est la raison d'être de `typesExclus`** : `GE 4 § 1`
 * est un article des dispositions générales dont le corps est un TABLEAU
 * croisant le type et la catégorie. Il ne restreint pas son champ à quelques
 * types — il s'applique à tous — mais il ne leur donne pas la même
 * périodicité.
 *
 * `typesExclus` : le complément de `types`, et il n'en est PAS le symétrique
 * exact. Là où `types` rejette un ERP dont le `typeErp` est inconnu — une
 * restriction invérifiable ne s'ignore pas —, `typesExclus` le **retient** :
 * une exclusion invérifiable ne s'applique pas. L'asymétrie est délibérée et
 * va dans le même sens que la première : dans les deux cas, l'ignorance du
 * type ne fait jamais disparaître une ligne d'un calendrier. Elle est ce qui
 * permet d'écrire le complément d'un tableau sans creuser un faux négatif
 * muet chez l'établissement qui n'a pas précisé son activité.
 *
 * `types` et `typesExclus` sont mutuellement exclusifs sur une même
 * obligation (un test le vérifie) : écrire les deux, c'est écrire deux fois
 * la même frontière et se garantir qu'elles divergeront.
 *
 * Cette structure est consommée par le moteur de matching (étape 5) de manière
 * purement déclarative, sans fonction TS arbitraire — condition nécessaire à
 * l'auditabilité du système.
 */
export type TypologieApplication = {
  travail?: boolean;
  erp?:
    | boolean
    | {
        categories?: CategorieErp[];
        types?: TypeErp[];
        typesExclus?: TypeErp[];
      };
  igh?: boolean | { classes: ClasseIgh[] };
  /**
   * `{ familles: [...] }` = requis ET restreint à ces familles d'habitation.
   *
   * **La famille non renseignée ne rejette PAS**, à l'inverse de la catégorie
   * ERP et du type d'exploitation. La dissymétrie est voulue et elle tient à
   * qui subit l'erreur : la catégorie ERP est demandée à la création depuis
   * toujours, son absence est une anomalie ; la famille d'habitation n'existe
   * que depuis le 2026-09-01, et tous les dossiers antérieurs en sont
   * dépourvus. Les écarter reviendrait à retirer en silence des obligations à
   * des dossiers qui les doivent peut-être — un faux négatif que personne ne
   * peut voir. On retient donc l'obligation, en disant dans la raison qu'elle
   * est à confirmer : un dirigeant qui lit une échéance qu'il ne doit pas a
   * une chance de s'en apercevoir, l'inverse n'en a aucune.
   */
  habitation?: boolean | { familles: FamilleHabitation[] };
  /**
   * Présence, **pour le public**, de locaux à sommeil — chambres d'hôtel,
   * chambres d'hôtes, hébergement. Évalué sur
   * `Etablissement.comporteLocauxSommeilPublic`. En ET avec le reste : ce
   * n'est pas un régime, c'est une caractéristique de l'établissement, au même
   * titre qu'un seuil d'effectif.
   *
   * Quatre articles du Livre III de l'arrêté du 25 juin 1980 s'y adossent :
   * PE 4 § 1, PE 33, PE 35 et PE 37.
   *
   * LES DEUX SENS N'ONT PAS LE MÊME COMPORTEMENT FACE AU SILENCE, et c'est
   * toute la raison d'être de ce champ. C'est la règle du non-renseigné
   * (`.claude/CLAUDE.md`), écrite pour un attribut d'ÉTABLISSEMENT — l'inverse
   * exact d'`equipement_propriete_booleenne`, où une propriété absente dit
   * « cet équipement n'a pas cette caractéristique » :
   *
   *   - `true` (l'obligation exige des locaux à sommeil) : l'attribut non
   *     renseigné **ne rejette pas**. L'obligation est retenue, et la raison
   *     dit « à confirmer ». Même dissymétrie qu'`habitation: { familles }`,
   *     et pour le même motif — la colonne n'existe que depuis le 2026-09-01,
   *     aucun dossier antérieur ne porte de réponse, et les écarter retirerait
   *     en silence une visite de commission à un hôtel.
   *   - `false` (l'obligation ne vise que les établissements SANS locaux à
   *     sommeil — un allègement de régime) : l'attribut non renseigné
   *     **rejette**. Un allègement ne se donne pas sur une absence supposée ;
   *     il attend que l'absence soit déclarée.
   *
   * Aucune obligation n'écrit `false` à ce jour, et le sens existe quand même :
   * PE 2 § 3 réduit le régime des établissements « ne comportant pas de locaux
   * à sommeil » qui reçoivent au plus 19 personnes. Le jour où cet allègement
   * s'encode, la moitié qui protège est déjà là et éprouvée.
   */
  locauxSommeilPublic?: boolean;
  effectifMin?: number;
  effectifMax?: number;
  /**
   * Seuil sur les personnes habituellement présentes — salariés **et**
   * public — évalué sur `personnesPresentesHabituellement`, à défaut sur
   * `effectifSurSite`. Source : R. 4227-34 CT (« occupées ou réunies
   * habituellement »), à distinguer de `effectifMin` qui ne compte que les
   * salariés.
   */
  personnesPresentesMin?: number;
  /**
   * Champ d'application de R. 4227-34 CT, disjonctif par nature : satisfait
   * si `personnesPresentesMin` est atteint **OU** si l'établissement déclare
   * manipuler et mettre en œuvre des matières visées par R. 4227-22
   * (`manipuleMatieresR422722 === true`). C'est le seul OU inter-critères du
   * moteur, nommé d'après son article pour rester auditable : le référentiel
   * écrit `{ personnesPresentesMin: 51, champR422734: true }`, le chiffre
   * reste dans le référentiel, la logique dans le moteur.
   *   https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018532067
   */
  champR422734?: true;
};

// -----------------------------------------------------------------------------
// Catégorie d'équipement — reflet exact de l'enum Prisma `CategorieEquipement`
// -----------------------------------------------------------------------------

export const CATEGORIES_EQUIPEMENT = [
  "INSTALLATION_ELECTRIQUE",
  "EXTINCTEUR",
  "RIA",
  "BAES",
  "ALARME_INCENDIE",
  "DESENFUMAGE",
  "VMC",
  "CTA",
  "HOTTE_PRO",
  "APPAREIL_CUISSON_ERP",
  "ASCENSEUR",
  "PORTE_AUTO",
  "PORTAIL_AUTO",
  "EQUIPEMENT_SOUS_PRESSION",
  "STOCKAGE_MATIERE_DANGEREUSE",
  "EQUIPEMENT_LEVAGE",
  "INSTALLATION_FRIGORIFIQUE",
  // Entrée le 2026-09-02 avec la branche HORS LEVAGE de `R. 4323-23` —
  // l'arrêté du 5 mars 1993, corpus `arrete-1993-03-05-machines`.
  //
  // LE NOM PORTE LE PROVISO, ET C'EST TOUTE SA RAISON D'ÊTRE. Le I de
  // l'article 1er ne soumet à la vérification trimestrielle que les
  // équipements « mus par une source d'énergie autre que la force humaine
  // employée directement ET dont le chargement ou le déchargement est
  // effectué manuellement en phase de production » — deux conditions
  // cumulatives, dont aucune n'a d'attribut d'équipement au modèle. La
  // seconde est vraie par construction pour ces machines : on y jette ses
  // cartons à la main. La première ne l'est pas — une presse à levier de
  // petit commerce existe —, elle est donc écrite dans le nom plutôt que
  // posée en question, et le libellé de formulaire la répète.
  //
  // POURQUOI PAS « MACHINE » NI « ÉQUIPEMENT DE TRAVAIL ». Une catégorie de
  // ce nom attirerait le pétrin, le laminoir, la trancheuse — que l'arrêté
  // ne vise pas —, et leur réclamerait tous les trois mois une vérification
  // de criticité 5. La liste de l'article 1er est NOMINATIVE et FERMÉE : la
  // catégorie se nomme donc pour ses deux entrées, et pour elles seules.
  //
  // POURQUOI PAS DEUX CATÉGORIES, une par entrée de la liste. « Presses à
  // balles » et « compacteurs à déchets » portent le même acte, la même
  // périodicité, le même réalisateur et le même contenu de vérification ; et
  // le dirigeant qui déclare son matériel ne fait pas la différence entre son
  // compacteur et sa presse. Les scinder aurait produit deux lignes de
  // calendrier là où il y a une machine.
  "COMPACTEUR_PRESSE_DECHETS_MOTORISE",
  // Une famille, et non un régime — c'est ce qui la distingue de toutes les
  // autres entrées de cette liste. Un harnais antichute relève d'une
  // vérification périodique, un casque de chantier n'en relève pas. Aucune
  // obligation ne la vise, et il ne faut PAS en attacher une avant d'avoir lu
  // R. 4323-95 à R. 4323-99 et l'arrêté qui fixe la liste des EPI soumis à
  // vérification : le faire réclamerait un rendez-vous annuel à qui a déclaré
  // des gants. La lecture dira peut-être de scinder cette valeur en deux.
  "EPI",
  // Les trois catégories vérifiables, scindées le 2026-09-04 après lecture de
  // l'arrêté du 19 mars 1993 : lui seul nomme les EPI soumis à vérification, et
  // il le fait par des NOMS D'OBJETS, jamais par un critère technique — d'où
  // des catégories et non une propriété. Ses cinq entrées se rangent en trois
  // valeurs : les deux appareils respiratoires et leurs cartouches partagent
  // acte, rythme, réalisateur et détenteur.
  "EPI_ANTICHUTE",
  "EPI_RESPIRATOIRE",
  "EPI_GILET_SAUVETAGE",
  "AUTRE",
] as const;

export type CategorieEquipement = (typeof CATEGORIES_EQUIPEMENT)[number];
