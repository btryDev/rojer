import type {
  Periodicite,
  Realisateur,
} from "@/lib/referentiels/types-communs";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
// `import type`, et jamais une valeur : `echeances.ts` ouvre la base et lit la
// session, et ce module-ci est importé par `AnneeCalendrier`, qui est un
// composant client. La première version de cet en-tête importait
// `FAMILLES_FILTRABLES` — une valeur — et faisait entrer Prisma, `requireUser`
// et `next/headers` dans le paquet du navigateur. `tsc` n'a rien vu ; c'est le
// build qui a refusé. La liste des familles se dérive donc des clés de
// `LABEL_FAMILLE_PROSE`, et un test rapproche les deux.
import type { FamilleEcheance } from "./echeances";

export const LABEL_PERIODICITE: Record<Periodicite, string> = {
  hebdomadaire: "hebdomadaire",
  bimensuelle: "tous les 15 jours",
  mensuelle: "mensuelle",
  six_semaines: "toutes les 6 semaines",
  trimestrielle: "trimestrielle",
  semestrielle: "semestrielle",
  annuelle: "annuelle",
  biennale: "tous les 2 ans",
  triennale: "tous les 3 ans",
  quadriennale: "tous les 4 ans",
  quinquennale: "tous les 5 ans",
  decennale: "tous les 10 ans",
  mise_en_service_uniquement: "à la mise en service",
  // `autre` ne dit qu'une chose, et l'ADR-026 l'écrit : **le texte n'écrit pas
  // de rythme**. Il ne dit pas que l'obligation est permanente. Écrire
  // « permanente » ici, c'était répondre à la place du droit — et la table s'en
  // chargeait pour les 42 obligations qui portent cette valeur, dont 13 ne sont
  // pas des états permanents : 7 événementielles, 3 ponctuelles et 3 échéances
  // récurrentes dont le rythme n'est renvoyé à aucun texte. Une obligation
  // événementielle redevient due au fait suivant ; rien de permanent là-dedans.
  //
  // Le mélange venait d'avant l'ADR-026, quand `periodicite: "autre"` tenait
  // lieu de nature faute de champ. `nature` existe depuis ; cette table était
  // restée en arrière, et elle est le seul endroit du produit qui parlait encore
  // l'ancienne langue. Le libellé dit désormais ce que le champ sait, et rien de
  // plus — ce que l'obligation EST se lit dans `LIBELLE_NATURE`.
  autre: "sans rythme écrit",
};

export const LABEL_REALISATEUR: Record<Realisateur, string> = {
  organisme_agree: "Organisme agréé",
  organisme_accredite: "Organisme accrédité",
  personne_qualifiee: "Personne qualifiée",
  personne_competente: "Personne compétente",
  exploitant: "Exploitant (interne)",
  fabricant: "Fabricant",
  bureau_controle: "Bureau de contrôle",
  medecin_travail: "Médecin du travail",
  professionnel_sante_travail: "Professionnel de santé au travail",
  equipe_pluridisciplinaire: "Équipe pluridisciplinaire (service de santé au travail)",
};

export const LABEL_DOMAINE: Record<DomaineObligation, string> = {
  electricite: "Électricité",
  incendie: "Incendie / sécurité",
  aeration: "Aération / ventilation",
  cuisson_hotte: "Cuisson et hotte",
  ascenseur: "Ascenseur",
  porte_portail: "Portes et portails",
  equipement_sous_pression: "Équipement sous pression",
  stockage_dangereux: "Stockage dangereux",
  levage: "Levage",
  froid: "Froid / fluides frigorigènes",
  formation_securite: "Formation à la sécurité",
  sante_travail: "Santé au travail",
  secours: "Premiers secours",
  organisation_prevention: "Organisation de la prévention",
  information_travailleurs: "Information des travailleurs",
  locaux_sociaux: "Locaux sociaux",
  co_activite: "Co-activité",
  signalisation: "Signalisation de sécurité",
  compactage_dechets: "Compactage des déchets",
  // « Protection individuelle » et non « EPI » : le sigle est celui du droit
  // et des préventeurs, pas celui du dirigeant qui lit son calendrier.
  epi: "Protection individuelle",
  // « des lieux de travail », et les quatre mots comptent : « Éclairage » tout
  // court se confondrait avec l'éclairage de sécurité, dont les obligations
  // vivent en domaine « Incendie / sécurité ». Deux objets, deux textes, deux
  // gestes — voir le commentaire du domaine dans `conformite/types.ts`.
  eclairage: "Éclairage des lieux de travail",
};

export const MOIS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/**
 * Libellés de trois à quatre lettres pour les graduations de la règle
 * annuelle. Tronquer `MOIS_FR` à trois lettres ne suffit pas : juin et
 * juillet donnent tous deux « jui », et l'année devient illisible là où
 * elle doit se lire d'un coup d'œil.
 */
export const MOIS_FR_COURT = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const;

export function libelleMois(cle: string): string {
  // cle = "YYYY-MM"
  const [annee, mois] = cle.split("-");
  const idx = Number(mois) - 1;
  return `${MOIS_FR[idx] ?? mois} ${annee}`;
}

/** Libellé de la case « sans bâtiment » dans les filtres et les listes
 *  (ADR-019). Ici et non dans `echeances.ts`, qui importe Prisma : les
 *  composants client doivent pouvoir le lire. */
export const LABEL_TOUT_ETABLISSEMENT = "Tout l'établissement";

/**
 * Le nom du porteur d'une échéance, quel qu'il soit (ADR-022, ADR-023).
 *
 * Trois cas, un seul endroit. Écrit partout à la main, le repli
 * `?? LABEL_TOUT_ETABLISSEMENT` était juste tant qu'il n'y avait que deux
 * porteurs ; à l'arrivée du troisième, il fait dire « Tout l'établissement » à
 * la ligne d'une personne — c'est-à-dire qu'il attribue à tout le monde ce qui
 * n'incombe qu'à quelqu'un.
 *
 * L'ordre suit celui de `cleDeLigne` : équipement, puis salarié, puis
 * l'établissement à défaut.
 */
export function libellePorteur(v: {
  // REQUIS, et nullables. Pas `?`, délibérément : un appelant qui oublie
  // `salarie: true` dans son `select` doit avoir une erreur de compilation, pas
  // un repli silencieux sur « Tout l'établissement » — c'est-à-dire exactement
  // le défaut que cette fonction existe pour corriger. Le `?` initial l'avait
  // laissé passer sur sept écrans.
  equipement: { libelle: string } | null;
  salarie: { nom: string; prenom: string } | null;
}): string {
  if (v.equipement) return v.equipement.libelle;
  if (v.salarie) return `${v.salarie.prenom} ${v.salarie.nom}`.trim();
  return LABEL_TOUT_ETABLISSEMENT;
}

/**
 * Le porteur d'une ligne, **sans nommer la personne**.
 *
 * Pour les surfaces qui sortent du produit : le serveur MCP, qui alimente
 * l'assistant que l'utilisateur branche — un service d'inférence hors de notre
 * contrôle —, et les documents remis à un tiers.
 *
 * `libellePorteur` a été écrit pour corriger un vrai défaut : sept écrans
 * disaient « Tout l'établissement » sur la ligne d'une personne, attribuant à
 * tout le monde ce qui n'incombe qu'à quelqu'un. La correction était juste
 * **dans le produit**. Appliquée telle quelle aux surfaces sortantes, elle a
 * fait fuir le nom : `docs/rgpd.md` § 6 promettait qu'« aucune donnée de
 * salarié n'est envoyée à un service d'inférence, jamais », et c'était faux le
 * jour même où la phrase a été écrite.
 *
 * L'utilité est préservée : savoir qu'une attestation expire ne demande pas de
 * savoir de qui. Le dirigeant ouvre l'écran Équipe pour le nom.
 */
export const LABEL_PORTEUR_SALARIE_ANONYME = "Un salarié";

export function libellePorteurSansNom(v: {
  equipement: { libelle: string } | null;
  salarieId: string | null;
}): string {
  if (v.equipement) return v.equipement.libelle;
  if (v.salarieId !== null) return LABEL_PORTEUR_SALARIE_ANONYME;
  return LABEL_TOUT_ETABLISSEMENT;
}

/**
 * Ce que la pastille d'année annonce, en un mot : combien d'échéances, et de
 * quelle nature.
 *
 * Extrait de `AnneeCalendrier` pour être éprouvable. La règle vivait en JSX,
 * inline, et **elle mentait** : elle ne lisait que `total`, le compte des
 * échéances DATÉES, et ignorait les occurrences « à planifier ».
 *
 * Ces dernières sont hors des barres par construction — leur `datePrevue` est
 * une date de génération, pas un rendez-vous, et les poser sur un mois
 * donnerait à lire un engagement qui n'existe pas. Cette exclusion-là est
 * juste, et elle n'est pas remise en cause ici. Ce qui ne l'était pas, c'est
 * d'écrire « aucune échéance » quand le seul état peuplé est celui qu'on
 * exclut.
 *
 * Sur un dossier neuf, l'écran affichait « 2026 · AUCUNE ÉCHÉANCE » au-dessus
 * d'un chip « 2 à planifier » et d'une carte de mois qui les listait. Avec un
 * titre daté en plus : « 1 ÉCHÉANCE » au-dessus de trois lignes.
 *
 * ⚠ **L'écart s'aggrave tout seul.** Tant que « à planifier » reste hors du
 * total, chaque obligation d'état permanent ajoutée au référentiel creuse la
 * distance entre ce que l'en-tête annonce et ce que la liste montre. Ce n'est
 * pas un défaut qui se stabilise — raison pour laquelle il est corrigé dans le
 * libellé plutôt que laissé à un arbitrage ultérieur.
 */
export function libelleTotalAnnee(total: number, sansDate: number): string {
  const s = (n: number) => (n > 1 ? "s" : "");
  if (total === 0) {
    return sansDate > 0
      ? `aucune datée · ${sansDate} à planifier`
      : "aucune échéance";
  }
  return sansDate > 0
    ? `${total} datée${s(total)} · ${sansDate} à planifier`
    : `${total} échéance${s(total)}`;
}

/**
 * Le libellé de la couture des mois passés.
 *
 * Extrait de `AnneeCalendrier` pour la même raison que `libelleTotalAnnee` :
 * une phrase qui vit dans du JSX n'est appelable par aucun test, donc
 * n'est balayable par aucune propriété. Ce n'est pas qu'on oublie de
 * l'éprouver, c'est qu'on ne le peut pas.
 *
 * Le défaut qui l'a fait sortir : « Voir les 1 mois précédents », affiché sur
 * tous les dossiers le 1er septembre. Il n'a été introduit par aucun commit —
 * au 31 août, aucun mois n'était passé dans l'année et la branche ne se rendait
 * jamais. **Il est apparu par le seul passage du temps**, et aucune revue de
 * diff ne pouvait le voir : il n'y avait pas de diff.
 */
export function libelleMoisPrecedents(nbCartesPassees: number): string {
  return nbCartesPassees === 1
    ? "Voir le mois précédent"
    : `Voir les ${nbCartesPassees} mois précédents`;
}

/**
 * Ce que chaque famille apporte au calendrier, dit en courant — pour une phrase
 * qui les énumère, pas pour une pilule qui les nomme.
 *
 * ## Pourquoi une table de plus
 *
 * `LABEL_FAMILLE` et `LABEL_FAMILLE_LONG` (`MarqueurFamille.tsx`) nomment une
 * famille prise seule, en tête de pilule ou de filtre : capitales, groupe
 * nominal, esperluette. Enfilés dans une phrase ils donnaient « Corrections &
 * réparations, Documents à renouveler » au milieu d'un paragraphe. Cette
 * table-ci est la même liste dite à voix haute.
 *
 * ## Pourquoi elle est exhaustive, et ce que ça garde
 *
 * Le 2026-09-03, la page Calendrier annonçait « Vos échéances datées, réunies :
 * vérifications d'équipements, corrections à mener, chantiers encadrés,
 * documents à renouveler ». Quatre familles nommées, cinq réunies : la famille
 * `personnel` est née avec l'ADR-023 sans que la phrase bouge. Son aide disait
 * pire — « les compteurs du bandeau réunissent toutes les familles —
 * vérifications, corrections et papiers » : trois nommées sur cinq, sous le mot
 * « toutes ».
 *
 * Une énumération recopiée cesse d'être vraie au lot suivant, et aucun diff ne
 * la touche. Celle-ci est un `Record` sur le type fermé : une sixième famille
 * ne compile pas tant que personne ne lui a donné ses mots, et la phrase se
 * fabrique en parcourant les clés. C'est le mécanisme de `FAMILLE_DE_TYPE`,
 * appliqué à une phrase.
 *
 * L'ORDRE DES CLÉS EST CELUI DES PILULES du calendrier (`FAMILLES_FILTRABLES`),
 * et c'est un rapprochement que ce module ne peut pas faire lui-même — la
 * liste est une valeur d'un module qui ouvre la base, et ce module-ci est
 * chargé par un composant client. `porteurs-comptes.test.ts` confronte les deux
 * ensembles ; c'est le même dispositif que l'invariant écrit au-dessus de
 * `FAMILLES_FILTRABLES`, qui existe parce que deux listes voisines se sont déjà
 * contredites sans que rien ne le dise.
 */
export const LABEL_FAMILLE_PROSE: Record<FamilleEcheance, string> = {
  controle: "vérifications périodiques",
  travaux: "corrections à mener",
  operations: "chantiers encadrés",
  papiers: "documents à renouveler",
  // « titres de vos salariés » et non « personnel » : la famille ne suit pas
  // des gens, elle suit l'échéance des titres qu'ils détiennent (ADR-023,
  // docs/rgpd.md § 2.3).
  personnel: "titres de vos salariés",
};

/**
 * Toutes les familles nommables, dans l'ordre où la phrase les dit — dérivé du
 * `Record` ci-dessus, jamais recopié à côté de lui.
 */
export const FAMILLES_NOMMEES = Object.keys(
  LABEL_FAMILLE_PROSE,
) as FamilleEcheance[];

/**
 * Les familles du calendrier, énumérées en toutes lettres.
 *
 * L'ordre est celui des pilules de l'écran : la phrase et la rangée de filtres
 * se lisent dans le même sens.
 */
export function enumererFamilles(
  familles: readonly FamilleEcheance[] = FAMILLES_NOMMEES,
): string {
  const mots = familles.map((f) => LABEL_FAMILLE_PROSE[f]);
  if (mots.length <= 1) return mots[0] ?? "";
  return `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`;
}
