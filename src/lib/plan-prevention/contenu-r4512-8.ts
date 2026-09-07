/**
 * Le contenu minimal du plan de prévention — art. `R. 4512-8` du code du
 * travail, en un seul endroit.
 *
 * POURQUOI CE MODULE EXISTE PLUTÔT QUE CINQ CHAMPS ÉPARPILLÉS. Trois surfaces
 * doivent dire la même chose des mêmes rubriques : le formulaire de saisie, la
 * fiche du plan, et le fichier `07_Plans_de_prevention.txt` du ZIP de contrôle
 * remis à un tiers. Les trois doivent nommer la rubrique de la même façon, et
 * surtout s'accorder sur ce qui est MANQUANT — c'est la seule information que
 * le dirigeant ne peut pas déduire de ce qu'il lit. Trois copies de la liste
 * auraient divergé au premier ajout, et c'est déjà arrivé dans ce module :
 * `prisma/schema.prisma` annotait `inspectionDate` « (art. R4512-7) » quand
 * l'inspection commune est `R. 4512-2`.
 *
 * LE VERBATIM EST ICI, PAS DANS LES ÉCRANS. Chaque rubrique porte le texte
 * exact de son alinéa, relevé sur Légifrance le 2026-09-07
 * (LEGIARTI000018529781, version en vigueur au 1er mai 2008, décret
 * n° 2008-244 du 7 mars 2008). Les surfaces l'affichent, elles ne le
 * réécrivent pas : c'est ce qui a manqué au chapeau de la section
 * « Inspection commune préalable », qui citait `R. 4512-2` entre guillemets en
 * coupant trois mots sans points de suspension.
 *
 * CE QUE CE MODULE NE FAIT PAS. Il ne bloque rien. `rubriquesManquantes` rend
 * une liste, pas un verdict : aucune conséquence de droit ne se tire d'un plan
 * incomplet ici, et le produit n'a d'ailleurs aucune porte de validation sur
 * les plans. Ce qui est calculé sert à MONTRER le manque à qui le subit — le
 * dirigeant qui remet le document —, pas à le qualifier.
 *
 * LE 1° N'EST PAS LES LIGNES RISQUE ↔ MESURES, et c'est la distinction qui
 * commande tout ce module. Ces lignes transcrivent le second alinéa de
 * `R. 4512-6` : les risques « pouvant résulter de l'INTERFÉRENCE entre les
 * activités, installations et matériels ». Le 1° de `R. 4512-8` vise les
 * phases dangereuses de l'opération elle-même, qui existent même sans
 * co-activité. Deux rubriques distinctes, deux relations distinctes.
 */

/** La forme minimale qu'une surface doit fournir pour être lue. */
export type ContenuPlan = {
  phasesDangereuses: { phase: string; moyensPrevention: string | null }[];
  adaptationMateriels: string | null;
  instructionsTravailleurs: string | null;
  organisationSecours: string | null;
  participationCroisee: string | null;
};

export type RubriqueR4512_8 = {
  /** Le rang de l'alinéa dans l'article : 1 à 5. */
  numero: number;
  /** Le nom court, celui que portent le formulaire et la fiche. */
  titre: string;
  /** Le texte exact de l'alinéa, relevé le 2026-09-07. */
  verbatim: string;
  /** Renseignée ou non, sur un plan donné. */
  renseignee: (plan: ContenuPlan) => boolean;
};

const rempli = (v: string | null | undefined): boolean =>
  typeof v === "string" && v.trim().length > 0;

/**
 * CE QUI DÉCIDE DE LA LONGUEUR D'UN `titre`, ET CE N'EST PAS LA SYMÉTRIE.
 *
 * Quatre titres portent les deux moitiés de leur alinéa, un seul en porte une.
 * Ce n'est pas un oubli, et il ne faut ni allonger le 1° ni raccourcir le 4°
 * pour aligner la colonne.
 *
 * Le critère est : **la seconde moitié de l'alinéa atteint-elle le lecteur du
 * ZIP ?** Ce fichier-là est le plus pauvre des quatre surfaces — il écrit
 * `<n>° <titre> : NON RENSEIGNÉE` et n'imprime jamais le `verbatim` —, et son
 * destinataire est un inspecteur, un assureur ou un acquéreur, à qui personne
 * ne répétera ce que le texte demande. Rubrique par rubrique :
 *
 *  - 2° et 5° : les deux moitiés sont dans le titre. Rien à faire.
 *  - 1° : le titre tronque « et des moyens de prévention spécifiques
 *    correspondants », MAIS le ZIP imprime « → Moyens de prévention : » sous
 *    chaque phase.
 *    La seconde moitié est matériellement là, sous une autre forme.
 *  - 3° : l'alinéa n'a qu'une moitié.
 *  - 4° : le titre tronquait, et RIEN ne rattrapait ailleurs. Sous
 *    « Organisation des premiers secours », le lecteur du dossier n'apprenait
 *    jamais que le texte demande AUSSI « la description du dispositif mis en
 *    place à cet effet par l'entreprise utilisatrice ». C'était le seul des
 *    cinq où la troncature mordait ; c'est le seul qu'on a allongé.
 *
 * Autrement dit : on juge chaque rubrique sur ce qui arrive au lecteur, pas
 * sur ce à quoi la liste ressemble. Aligner les cinq par ressemblance ferait
 * perdre au 4° la moitié qu'on vient de lui rendre.
 */
export const RUBRIQUES_R4512_8: readonly RubriqueR4512_8[] = [
  {
    numero: 1,
    // Titre volontairement court : voir le critère ci-dessus — le ZIP rend la
    // seconde moitié par les « → Moyens de prévention : » de chaque phase.
    titre: "Phases d'activité dangereuses",
    verbatim:
      "La définition des phases d'activité dangereuses et des moyens de prévention spécifiques correspondants",
    // UN DES DEUX CHAMPS SUFFIT, ET C'EST P7 QUI L'A IMPOSÉ. Tant que la
    // rubrique ne comptait que `phase`, une ligne en base dont la phase était
    // blanche et les moyens renseignés faisait imprimer « 1° … : NON
    // RENSEIGNÉE » — et les moyens stockés DISPARAISSAIENT du dossier. Ce
    // module promet qu'une rubrique vide s'imprime ; il doit d'abord promettre
    // qu'une rubrique remplie ne s'efface pas.
    renseignee: (p) =>
      p.phasesDangereuses.some((f) => rempli(f.phase) || rempli(f.moyensPrevention)),
  },
  {
    numero: 2,
    titre: "Adaptation des matériels et conditions d'entretien",
    verbatim:
      "L'adaptation des matériels, installations et dispositifs à la nature des opérations à réaliser ainsi que la définition de leurs conditions d'entretien",
    renseignee: (p) => rempli(p.adaptationMateriels),
  },
  {
    numero: 3,
    titre: "Instructions à donner aux travailleurs",
    verbatim: "Les instructions à donner aux travailleurs",
    renseignee: (p) => rempli(p.instructionsTravailleurs),
  },
  {
    numero: 4,
    // Le seul titre qu'on ait allongé, et le critère est ci-dessus : sa
    // seconde moitié n'atteignait le lecteur du ZIP par aucun autre chemin.
    titre:
      "Organisation des premiers secours et description du dispositif de l'entreprise utilisatrice",
    verbatim:
      "L'organisation mise en place pour assurer les premiers secours en cas d'urgence et la description du dispositif mis en place à cet effet par l'entreprise utilisatrice",
    renseignee: (p) => rempli(p.organisationSecours),
  },
  {
    numero: 5,
    titre: "Participation croisée et organisation du commandement",
    verbatim:
      "Les conditions de la participation des travailleurs d'une entreprise aux travaux réalisés par une autre en vue d'assurer la coordination nécessaire au maintien de la sécurité et, notamment, de l'organisation du commandement",
    renseignee: (p) => rempli(p.participationCroisee),
  },
];

/** Le chapeau de l'article, affiché avant l'énumération. */
export const CHAPEAU_R4512_8 =
  "Les mesures prévues par le plan de prévention comportent au moins les dispositions suivantes :";

export const URL_R4512_8 =
  "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018529781";

/** Celles qu'un plan donné ne porte pas. Une liste, jamais un verdict. */
export function rubriquesManquantes(
  plan: ContenuPlan,
): readonly RubriqueR4512_8[] {
  return RUBRIQUES_R4512_8.filter((r) => !r.renseignee(plan));
}

/** Ce que la rubrique 2° à 5° contient sur ce plan, ou `null`. */
function texteRubrique(plan: ContenuPlan, numero: number): string | null {
  switch (numero) {
    case 2:
      return plan.adaptationMateriels;
    case 3:
      return plan.instructionsTravailleurs;
    case 4:
      return plan.organisationSecours;
    case 5:
      return plan.participationCroisee;
    default:
      return null;
  }
}

/**
 * Les cinq rubriques mises en texte pour le dossier de contrôle.
 *
 * Le vide s'écrit « NON RENSEIGNÉE » et ne disparaît pas. Ce fichier est remis
 * à un inspecteur, un assureur, un bailleur ou un acquéreur : une rubrique
 * omise en silence se lit comme une rubrique absente de l'obligation, et c'est
 * exactement le contraire que dit « comportent au moins ».
 *
 * Le formatage vit ici, avec la liste, pour la même raison qu'elle : le jour
 * où une sixième rubrique apparaîtrait, il n'y a qu'un endroit à corriger.
 */
/** Le retrait des lignes de rubrique. */
const RANG_RUBRIQUE = "    ";
/** Le retrait des lignes de structure INTERNES au 1° : phase, moyens. */
const RANG_PHASE = "       ";
/** Le retrait des lignes qui portent du texte saisi. */
const RANG_SAISIE = "         ";
/**
 * LA MARQUE QUI FERME LA CONTREFAÇON, ET ELLE VAUT À TOUTE PROFONDEUR.
 *
 * Toute ligne portant du texte que l'utilisateur a tapé commence par elle ;
 * aucune ligne produite par le module ne la porte. Un retrait supplémentaire
 * n'aurait fait que repousser le problème d'un cran — c'est d'ailleurs
 * exactement ce qui s'est passé : la première correction séparait les rubriques
 * de la saisie, et la saisie s'est mise à contrefaire la structure INTERNE du
 * 1° (« · phase », « → moyens : »), d'un rang plus bas. La marque ne dépend
 * d'aucun niveau : elle dit « ceci est cité », et c'est vrai du premier au
 * dernier caractère saisi.
 */
const MARQUE_SAISIE = "> ";

/**
 * Une saisie utilisateur, rendue sans qu'aucune de ses lignes ne puisse se lire
 * comme une ligne de structure.
 *
 * CE QUE ÇA CORRIGE, ET IL A FALLU S'Y REPRENDRE À DEUX FOIS. Les champs 2° à
 * 5° et `moyensPrevention` sont des `textarea` : leur contenu porte des retours
 * à la ligne. La première version n'indentait que la PREMIÈRE ligne, si bien
 * qu'une saisie contenant « 3° Instructions à donner aux travailleurs : Rien à
 * signaler » ressortait à la colonne des rubriques, indiscernable d'une ligne
 * du module. Le document remis à un inspecteur portait alors une rubrique que
 * personne n'avait remplie.
 *
 * LA CORRECTION PAR LE RETRAIT A DÉPLACÉ LE DÉFAUT D'UN CRAN, ELLE NE L'A PAS
 * FERMÉ. Pousser toute saisie plus profond que les rubriques laissait intacte
 * la structure INTERNE du 1° — « · phase », « → moyens : » —, écrite au même
 * rang que la saisie. Un `moyensPrevention` valant
 * « Permis de feu\\n· Phase inventée\\n  → moyens : néant » fabriquait donc une
 * SECONDE phase d'activité dangereuse, avec ses moyens, dans un dossier de
 * contrôle où une seule était déclarée. Plus lourd que le cas des rubriques :
 * une fausse rubrique dit « rien à signaler » sur un contenu absent, une
 * fausse phase AJOUTE une déclaration de danger et de mesure que les deux
 * employeurs n'ont jamais arrêtée d'un commun accord.
 *
 * D'OÙ UNE MARQUE PLUTÔT QU'UN TROISIÈME RANG. Un rang de plus aurait rejoué
 * le même correctif un niveau plus bas, et l'argument qui a produit celui-ci
 * aurait valu encore au suivant. `MARQUE_SAISIE` ne dépend d'aucune
 * profondeur : toute ligne de texte saisi la porte, aucune ligne du module ne
 * la porte, et les libellés de structure vivent seuls sur leur ligne pour
 * qu'aucune valeur ne partage la leur. Rien n'est retiré ni réécrit du texte du
 * dirigeant — on ne censure pas ce qu'il a écrit, on l'empêche d'occuper la
 * place de la structure.
 *
 * CE QUI RESTE, ET QUI DÉBORDE CE MODULE. Le reste de
 * `07_Plans_de_prevention.txt` a exactement la même propriété : `lieux` et
 * `naturesTravaux` — quatre mille caractères, multiligne — s'impriment en clair
 * sur leur ligne, et le fichier n'est pas le seul du ZIP dans ce cas. C'est une
 * propriété du format plat, antérieure à ce lot. Ce module cesse d'y
 * contribuer ; il ne la corrige pour personne d'autre.
 */
function citer(valeur: string): string[] {
  // `\r?\n` et non `\n` : un `<textarea>` est posté en CRLF, et découper sur le
  // seul saut de ligne laissait un `\r` à la fin de chaque ligne intermédiaire
  // du fichier remis.
  return valeur
    .split(/\r?\n/)
    .map((ligne) => `${RANG_SAISIE}${MARQUE_SAISIE}${ligne}`);
}

export function contenuR4512_8(plan: ContenuPlan): string[] {
  const out: string[] = [
    `  Contenu minimal (art. R. 4512-8) — ${CHAPEAU_R4512_8}`,
  ];
  for (const r of RUBRIQUES_R4512_8) {
    if (!r.renseignee(plan)) {
      out.push(`${RANG_RUBRIQUE}${r.numero}° ${r.titre} : NON RENSEIGNÉE`);
      continue;
    }
    out.push(`${RANG_RUBRIQUE}${r.numero}° ${r.titre} :`);

    // AUCUNE VALEUR SAISIE N'EST ÉCRITE SUR UNE LIGNE DE STRUCTURE, et c'est
    // la règle qui rend la marque efficace. Tant que « · <phase> » mettait le
    // texte du dirigeant sur la ligne du puce, un retour à la ligne dans ce
    // texte fabriquait une deuxième puce. Les libellés vivent seuls sur leur
    // ligne ; les valeurs vivent seules sur les leurs, citées.
    if (r.numero === 1) {
      for (const f of plan.phasesDangereuses) {
        out.push(`${RANG_PHASE}· Phase :`);
        out.push(...citer(f.phase));
        out.push(`${RANG_PHASE}  → Moyens de prévention :`);
        // `rempli` et non `||` : une valeur faite d'espaces est vraie pour
        // JavaScript, et la ligne s'imprimait sans contenu NI tiret (P5).
        out.push(...citer(rempli(f.moyensPrevention) ? f.moyensPrevention! : "—"));
      }
      continue;
    }
    const valeur = texteRubrique(plan, r.numero);
    out.push(...citer(rempli(valeur) ? valeur! : "—"));
  }
  return out;
}
