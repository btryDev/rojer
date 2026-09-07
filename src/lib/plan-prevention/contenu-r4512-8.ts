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

export const RUBRIQUES_R4512_8: readonly RubriqueR4512_8[] = [
  {
    numero: 1,
    titre: "Phases d'activité dangereuses",
    verbatim:
      "La définition des phases d'activité dangereuses et des moyens de prévention spécifiques correspondants",
    renseignee: (p) => p.phasesDangereuses.some((f) => rempli(f.phase)),
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
    // LE TITRE PORTE LES DEUX MOITIÉS DE L'ALINÉA, ET C'EST LE SEUL DES CINQ
    // OÙ ÇA SE JOUE. Les surfaces n'impriment pas toutes le `verbatim` — le
    // ZIP écrit « 4° <titre> : NON RENSEIGNÉE » et rien d'autre. Or le texte
    // demande DEUX choses : l'organisation, ET « la description du dispositif
    // mis en place à cet effet par l'entreprise utilisatrice ». Sous le titre
    // court « Organisation des premiers secours », le destinataire du dossier
    // de contrôle n'apprenait jamais qu'il en fallait deux. Le 2° et le 5°
    // portent déjà leurs deux moitiés ; le 1° tronque aussi, mais le ZIP
    // imprime « → moyens : » sous chaque phase, ce qui les rend.
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
export function contenuR4512_8(plan: ContenuPlan): string[] {
  const out: string[] = [
    `  Contenu minimal (art. R. 4512-8) — ${CHAPEAU_R4512_8}`,
  ];
  for (const r of RUBRIQUES_R4512_8) {
    if (!r.renseignee(plan)) {
      out.push(`    ${r.numero}° ${r.titre} : NON RENSEIGNÉE`);
      continue;
    }
    if (r.numero === 1) {
      out.push(`    1° ${r.titre} :`);
      for (const f of plan.phasesDangereuses) {
        out.push(
          `       · ${f.phase}\n` +
            `         → moyens : ${f.moyensPrevention ?? "—"}`,
        );
      }
      continue;
    }
    out.push(`    ${r.numero}° ${r.titre} :`);
    out.push(`       ${texteRubrique(plan, r.numero) ?? ""}`);
  }
  return out;
}
