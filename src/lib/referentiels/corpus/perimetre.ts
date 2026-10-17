// Ce que le produit prend en charge, et ce qu'il écarte — en données.
//
// Le périmètre existait, mais en prose, dans le CLAUDE.md. Conséquence : le
// classement « hors périmètre » d'un article n'était reproductible ni d'une
// lecture à l'autre, ni d'un relecteur à l'autre. Deux personnes lisant le
// même article pouvaient le ranger différemment, toutes deux de bonne foi, et
// rien ne permettait de trancher.
//
// Chaque exclusion porte donc un identifiant et un motif. Un article écarté
// cite l'exclusion qui l'écarte ; sans cela, « hors périmètre » n'est pas un
// classement, c'est une opinion.
//
// ⚠ Ces exclusions ne disent JAMAIS « on a choisi de ne pas s'en occuper ».
// Elles disent « aucune obligation d'exploitant n'en découle » : une règle de
// construction, un article qui s'adresse à l'administration, une disposition
// que le règlement lui-même écarte. Un manque de couverture assumé se marque
// `non_couvert`, se compte, et s'annonce à l'utilisateur.
//
// La différence n'est pas de vocabulaire. Ranger un manque parmi les
// exclusions le fait disparaître du décompte : il cesse d'être une dette pour
// devenir une non-question.
//
// Module **pur** : ni Prisma, ni React.

// Ce module ne déclare PAS quelles catégories d'ERP sont couvertes : cette
// donnée vit dans `src/lib/perimetre/couverture.ts` (`CATEGORIES_COUVERTES`),
// qui qualifie un établissement réel et alimente le bandeau de l'écran. La
// redéclarer ici en ferait une seconde source de vérité, sur un fait que le
// produit ne peut avoir qu'une fois — et deux constantes dans deux modules ne
// peuvent même pas se contredire par un test, elles divergent en silence.
//
// Ce module ne porte que les MOTIFS d'exclusion : le vocabulaire par lequel un
// article écarté dit pourquoi il l'est. C'est une notion de dépouillement, pas
// de périmètre — le périmètre dit qui est couvert, les exclusions disent
// pourquoi tel article ne le concerne pas.

/**
 * Une raison de ranger un article hors du périmètre.
 *
 * Fermée à dessein : si un article ne relève d'aucune de ces exclusions, il
 * est DANS le périmètre — ou bien il manque une exclusion, qu'il faut alors
 * discuter et ajouter ici plutôt que d'écarter l'article au cas par cas.
 */
export const EXCLUSIONS = {
  categorie_erp: {
    libelle: "Écarté par le règlement lui-même en 5ᵉ catégorie",
    motif:
      "Les dispositions du Livre II du règlement de sécurité ERP ne s'appliquent pas au deuxième groupe, sauf renvoi exprès du Livre III (PE 1 § 1). Ce n'est pas un choix de couverture : le texte ne vise pas ces établissements.",
  },
  // ~~« ICPE soumises à autorisation, ATEX, rayonnements ionisants,
  // équipements sportifs, piscines : … »~~ — 2026-10-17, sous-lot B du plan
  // « mise à jour du référentiel » (§ 3), validé par la propriétaire : les
  // équipements sportifs SORTENT de l'exclusion (le sous-lot E du plan les
  // instruit, X 25 compris) ; les bains à remous et les appareils de bronzage
  // (UV), que la liste des matériels non couverts nomme désormais, y sont
  // écrits. Le motif s'affiche sur la page « Ce que Rojer ne couvre pas »
  // (`perimetre/exclusions.ts`) : l'ancienne rédaction est rayée ici, pas à
  // l'écran. `exclusions.test.ts` tient qu'aucun article du type X n'y est rangé.
  risque_specialise: {
    libelle: "Risque spécialisé hors périmètre",
    motif:
      "ICPE soumises à autorisation, ATEX, rayonnements ionisants, piscines, bains à remous, appareils de bronzage (UV) : risques dont le traitement demande une expertise que le produit ne prétend pas porter.",
  },
  construction: {
    libelle: "Règle de construction, pas d'exploitation",
    motif:
      "Le produit accompagne l'exploitation d'un établissement existant. Les règles qui s'adressent au constructeur ou à l'aménageur — résistance au feu des matériaux, dimensionnement des dégagements — ne produisent aucune échéance pour un exploitant.",
  },
  sans_destinataire_exploitant: {
    libelle: "Ne s'adresse pas à l'exploitant",
    motif:
      "L'article s'adresse à l'administration, à la commission de sécurité, au maire ou au préfet. Il décrit une procédure que l'exploitant subit, il ne lui prescrit rien.",
  },
} as const;

export type MotifExclusion = keyof typeof EXCLUSIONS;
