/**
 * Obligations réglementaires — Établissement sportif (code du sport).
 *
 * Décision de la propriétaire du 2026-10-17 (sous-lot E de la mise à jour du
 * référentiel). ~~« salles de sport gardées, léger » : six lignes~~
 * [2026-10-17, seconde décision du même jour — « on n'est pas un outil de
 * gestion de salle de sport, on n'alourdit pas » : DEUX lignes]. Sources
 * primaires, relues le 2026-10-17 par l'API Légifrance (bac à sable, égalité
 * avec la production non vérifiée), page propre de chaque article :
 *   - code du sport, art. R. 322-4 (secours), R. 322-19 et R. 322-25 (buts et
 *     paniers).
 *
 * CE QUI N'EST PAS ENCODÉ, PAR DÉCISION (2026-10-17). R. 322-5 (affichage des
 * diplômes, cartes, textes et attestation d'assurance, et l'affiche
 * Signal-sports de l'arrêté du 20 mai 2025), L. 321-7 (assurance de
 * responsabilité civile — les assurances sont hors périmètre) et A. 322-3
 * (information des pratiquants) sont lus et `non_couvert` au corpus, annoncés
 * en une phrase dans l'aide du type X (`AIDE_TYPE_ERP.X`). Le titre salarié de
 * la carte professionnelle n'est pas entré. R. 322-25-1 (signalement d'un
 * accident grave) est en réserve.
 *
 * LA PHRASE DE `AIDE_TYPE_ERP.X` (`src/lib/etablissements/aide-type-erp.ts`,
 * surface créée par le sous-lot D, qui merge avant E — décision de c6 du
 * 2026-10-17). Elle entre au rebase de E sur D, telle que relue ici ; chaque
 * sujet passe par `nonPorte(…)`, et les `declareA` du corpus en citent quatre
 * fragments mot pour mot (vérifié le 2026-10-17) :
 *   Dans un établissement sportif, Rojer ne suit pas ${nonPorte("les
 *   affichages propres aux établissements sportifs (diplômes et cartes des
 *   éducateurs, textes de sécurité, attestation d'assurance, affiche
 *   Signal-sports)")}, ${nonPorte("la qualification des éducateurs
 *   employés")}, ${nonPorte("l'assurance de responsabilité civile de
 *   l'exploitant")} ni ${nonPorte("l'information des pratiquants")} (code du
 *   sport, art. R. 322-5, L. 212-8, L. 321-7, A. 322-3).
 *
 * LE CHAMP. Ces articles visent « les établissements où sont pratiquées une ou
 * des activités physiques ou sportives » (L. 322-2). Le produit ne connaît pas
 * ce fait ; il le lit sur le type d'ERP X (établissements sportifs couverts).
 * La ligne des secours est donc bornée à `erp: { types: ["X"] }`, toutes
 * catégories. Un établissement sportif de plein
 * air (PA) est refusé à l'accueil ; un club qui n'est pas déclaré X ne reçoit
 * rien, et c'est une limite du produit, écrite.
 *
 * LES BUTS ET PANIERS, SEULS, NE SONT PAS BORNÉS À X (décision de c6 du
 * 2026-10-17). R. 322-19 vise tout exploitant qui met à disposition des cages
 * ou des buts de basket de 10 kg ou plus, en plein air ou en salle, « à des
 * fins d'activité sportive ou de jeu » — un hôtel avec un terrain, par exemple.
 * La ligne naît de la catégorie déclarée (`siEquipementDeclare`), quel que soit
 * le régime.
 *
 * AUCUN RYTHME N'EST INVENTÉ. Aucun de ces textes n'écrit de périodicité : la
 * trousse, le moyen d'alerte et le tableau sont un état à tenir ;
 * pour les buts, R. 322-25 délègue la périodicité au plan de l'exploitant —
 * une délégation expresse, pas un rythme vague : pas de défaut annuel
 * (ADR-039).
 *
 */

import type { Obligation, ReferenceLegale } from "./types";

const X: Obligation["typologies"] = { erp: { types: ["X"] } };

/**
 * Le champ de la ligne des secours : R. 322-4 vise « les établissements
 * mentionnés à l'article L. 322-1 dans lesquels sont pratiquées des activités
 * physiques et sportives » (revue indépendante du 2026-10-17 : le renvoi est à
 * L. 322-1, pas à L. 322-2).
 */
const REF_L322_1: ReferenceLegale = {
  source: "CODE_SPORT",
  reference:
    "L. 322-1 (établissements dans lesquels sont pratiquées des activités physiques ou sportives — l'article auquel R. 322-4 renvoie)",
  article: "C. sport L. 322-1",
  url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006547695",
  note: "« Nul ne peut exploiter soit directement, soit par l'intermédiaire d'un tiers, un établissement dans lequel sont pratiquées des activités physiques ou sportives s'il a fait l'objet d'une condamnation prévue à l'article L. 212-9. » Cité pour le champ que R. 322-4 lui emprunte (« les établissements mentionnés à l'article L. 322-1 »), non pour l'incapacité qu'il pose. Relu le 2026-10-17 par l'API Légifrance (bac à sable), version du 2006-05-25.",
  versionConstatee: "2006-05-25",
};

/** En contexte : les garanties d'hygiène et de sécurité que R. 322-4 précise. */
const REF_L322_2: ReferenceLegale = {
  source: "CODE_SPORT",
  reference:
    "L. 322-2 (garanties d'hygiène et de sécurité des établissements où sont pratiquées des activités physiques ou sportives)",
  article: "C. sport L. 322-2",
  url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006547696",
  note: "« Les établissements où sont pratiquées une ou des activités physiques ou sportives doivent présenter pour chaque type d'activité et d'établissement des garanties d'hygiène et de sécurité définies par voie réglementaire. » Relu le 2026-10-17 par l'API Légifrance (bac à sable), version du 2006-05-25.",
  versionConstatee: "2006-05-25",
};

const NOTE_CHAMP_X =
  "CHAMP : le type d'ERP X, toutes catégories (décision de la propriétaire du 2026-10-17). Le texte vise tout établissement où sont pratiquées des activités physiques ou sportives (L. 322-2) ; le produit lit ce fait sur le type X. Un établissement sportif qui ne serait pas déclaré X ne reçoit pas la ligne : limite du produit, écrite.";

const NOTE_RYTHME_AUCUN =
  "RYTHME : aucun. Le texte n'écrit aucune périodicité et ne renvoie à aucune norme ni à aucun arrêté qui en fixerait une ; ce n'est pas un rythme vague mais un état à tenir : pas de défaut annuel (ADR-039). Normes : aucune citée.";

export const obligationsEtablissementSportif: Obligation[] = [
  {
    id: "sport-etablissement-secours-r322-4",
    domaine: "etablissement_sportif",
    libelle:
      "Trousse de secours, moyen d'alerter les secours et tableau d'organisation des secours affiché (établissement sportif)",
    description:
      "L'établissement dispose d'une trousse de secours pour apporter les premiers soins en cas d'accident, et d'un moyen de communication permettant d'alerter rapidement les services de secours. Un tableau d'organisation des secours est affiché : il donne les adresses et numéros de téléphone des personnes et organismes susceptibles d'intervenir en cas d'urgence.",
    referencesLegales: [
      {
        source: "CODE_SPORT",
        reference:
          "R. 322-4 (trousse de secours, moyen de communication pour alerter les secours, tableau d'organisation des secours affiché)",
        article: "C. sport R. 322-4",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006548228",
        note: "« Les établissements mentionnés à l'article L. 322-1 dans lesquels sont pratiquées des activités physiques et sportives doivent disposer d'une trousse de secours destinée à apporter les premiers soins en cas d'accident et d'un moyen de communication permettant d'alerter rapidement les services de secours. Un tableau d'organisation des secours est affiché dans l'établissement et comporte les adresses et numéros de téléphone des personnes et organismes susceptibles d'intervenir en cas d'urgence. » Relu le 2026-10-17 par l'API Légifrance (bac à sable), version du 2007-07-25.",
        versionConstatee: "2007-07-25",
      },
      REF_L322_1,
      REF_L322_2,
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "tableau d'organisation des secours affiché",
    usageEcran: { groupe: "incendie_secours", sous: "secourir" },
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: X,
    porteur: "etablissement",
    transmet: [],
    notesInternes: `ENTRÉE LE 2026-10-17, DÉCISION DE LA PROPRIÉTAIRE (sous-lot E).\n\nUNE LIGNE POUR LES TROIS EXIGENCES DE L'ARTICLE (décision de c6 du 2026-10-17, option a) : la trousse, le moyen d'alerte et le tableau. Le plan ne nommait que le tableau ; l'article en porte trois, et les trois se constatent ensemble, « en place ».\n\nDOUBLON ASSUMÉ AVEC R. 4224-14 (matériel de premiers secours, Code du travail, \`secours-etablissement-materiel\`) chez un établissement X qui emploie : deux textes, deux champs (les travailleurs, les pratiquants), deux lignes. Une même trousse peut répondre aux deux ; le dirigeant déclare chaque ligne.\n\n${NOTE_CHAMP_X}\n\n${NOTE_RYTHME_AUCUN}`,
  },
  {
    id: "sport-etablissement-buts-plan-verification",
    domaine: "etablissement_sportif",
    libelle:
      "Plan de vérification et d'entretien des buts et paniers de sport, et registre des essais et contrôles",
    description:
      "L'exploitant ou le gestionnaire de cages de buts ou de buts de basket-ball de 10 kg ou plus établit un plan de vérification et d'entretien, qui précise notamment la périodicité des vérifications, et tient, pour chaque site, un registre de la date et des résultats des essais et contrôles. Plan et registre sont tenus à la disposition des agents chargés du contrôle. Les équipements sont régulièrement entretenus ; un équipement non conforme est immédiatement rendu inaccessible aux usagers.",
    referencesLegales: [
      {
        source: "CODE_SPORT",
        reference:
          "R. 322-25 (entretien régulier, plan de vérification et d'entretien, registre des essais et contrôles)",
        article: "C. sport R. 322-25",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032432112",
        note: "« Les exploitants ou les gestionnaires des équipements installés établissent un plan de vérification et d'entretien qui précise notamment la périodicité des vérifications. Ils tiennent à la disposition des agents chargés du contrôle ce plan ainsi qu'un registre comportant, pour chaque site, la date et les résultats des essais et contrôles effectués. » Relu le 2026-10-17 par l'API Légifrance (bac à sable), version du 2016-04-21.",
        versionConstatee: "2016-04-21",
      },
      {
        source: "CODE_SPORT",
        reference:
          "R. 322-19 (cages de buts et buts de basket-ball, plein air ou salle ; buts de moins de 10 kg exclus)",
        article: "C. sport R. 322-19",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043849075",
        note: "« […] s'appliquent aux cages de buts de football, de handball, de hockey sur gazon et en salle et aux buts de basket-ball destinés à être utilisés en plein air ou en salle couverte, à des fins d'activité sportive ou de jeu. Sont exclus du champ d'application de la présente section les buts légers dont le poids total est inférieur à 10 kg. » Relu le 2026-10-17 par l'API Légifrance (bac à sable), version du 2016-07-01.",
        versionConstatee: "2016-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "plan de vérification et d'entretien",
    usageEcran: { groupe: "installations", sous: null },
    realisateurs: ["exploitant"],
    criticite: 4,
    // Décision de c6 du 2026-10-17 : le champ de R. 322-19 n'est pas borné
    // aux salles de sport ; la catégorie déclarée cible la ligne.
    typologies: { travail: true, erp: true, habitation: true, igh: true },
    porteur: "etablissement",
    siEquipementDeclare: ["BUT_PANIER_SPORTIF"],
    equipementsEnContexte: ["BUT_PANIER_SPORTIF"],
    transmet: [],
    notesInternes:
      "ENTRÉE LE 2026-10-17, DÉCISION DE LA PROPRIÉTAIRE (sous-lot E).\n\nRYTHME DÉLÉGUÉ AU PLAN, PAS DE DÉFAUT ANNUEL. R. 322-25 fait préciser « notamment la périodicité des vérifications » par le plan de l'exploitant. C'est une délégation expresse, pas un rythme vague (« régulièrement entretenus » qualifie l'entretien, dont le plan fixe le rythme) : `periodicite: \"autre\"`, sans `rythmeRetenu` (décision de c6). La ligne se constate « en place » : le plan existe, le registre est tenu.\n\nNORMES CITÉES, NON LUES. R. 322-22 répute conformes les équipements fabriqués selon « les normes de sécurité les concernant, dont les références sont publiées au Journal officiel », et R. 322-25 fait contrôler les buts « dès la première installation […] conformément aux prescriptions des normes les concernant ». Aucune de ces normes n'a été lue ni identifiée ; aucune n'est citée. Elles ne fixent pas le rythme de la ligne.\n\nPORTEUR ÉTABLISSEMENT, UNE LIGNE (`siEquipementDeclare`). Le plan et le registre se tiennent « pour chaque site », pas par but. La catégorie `BUT_PANIER_SPORTIF` porte le seuil de 10 kg dans son libellé.\n\nCHAMP OUVERT (décision de c6 du 2026-10-17) : tout établissement qui déclare la catégorie, quel que soit son régime — R. 322-19 vise les buts mis à disposition « à des fins d'activité sportive ou de jeu », pas les seules salles de sport.\n\nCE QUI N'EST PAS ENCODÉ (réserve du corpus) : le contrôle à la première installation selon les normes (non lues), la sécurisation des buts non fixés après usage et l'inaccessibilité d'un équipement non conforme (règles d'exploitation sans échéance, dites dans la description pour la seconde), et le signalement sans délai au préfet d'un accident grave (R. 322-25-1, événementiel, décision de c6 : réserve).",
  },
];
