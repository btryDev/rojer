import type { StatutPermisFeu } from "@prisma/client";

/**
 * Le vocabulaire d'état d'un permis de feu, en un seul endroit.
 *
 * Il en existait deux : la liste disait « Validé » et « Terminé », la fiche
 * « Prêt à démarrer » et « Travaux terminés ». On repérait un permis dans la
 * grille, on cliquait, et la fiche annonçait autre chose — sans qu'on sache
 * si c'était le même état ou une étape franchie entre-temps.
 *
 * Un `Record` sur l'enum Prisma, et non une cascade : ajouter un statut sans
 * le nommer ici ne compile pas. Les deux tables précédentes avaient chacune
 * un `else` fourre-tout qui affichait « Brouillon » pour un permis annulé.
 */
export const ETAT_PERMIS: Record<
  StatutPermisFeu,
  { ton: "fait" | "retard" | "bleu" | "proche" | "neutre"; mot: string }
> = {
  brouillon: { ton: "neutre", mot: "Brouillon" },
  attente_signatures: { ton: "proche", mot: "En attente de signatures" },
  valide: { ton: "bleu", mot: "Prêt à démarrer" },
  // LE ROSE ICI EST DÉLIBÉRÉ, ET C'EST LA SEULE EXCEPTION DU PRODUIT.
  //
  // Partout ailleurs le champ signal dit « échéance dépassée » — c'est
  // l'interdit 3 de la charte : « pas de rose là où rien n'a d'échéance ». Un
  // chantier qui se déroule n'est en retard sur rien, et à ce titre le rose
  // devrait être exclu ; c'est le raisonnement qui a fait passer « Plan écrit
  // obligatoire » du rose au bleu sur le module voisin.
  //
  // On le garde pour une raison propre à cet objet : `en_cours` est le seul
  // état du produit où quelque chose de physiquement dangereux se produit AU
  // MOMENT où l'écran est lu. Des travaux par point chaud sont en cours, ou
  // leur surveillance l'est — le référentiel exige au moins deux heures après
  // l'arrêt (`referentiel.ts`, `surveillance-2h-min`). Le rose n'y dit pas
  // « vous êtes en retard » mais « il se passe quelque chose maintenant ».
  //
  // Deux conséquences à connaître. Cette exception ne se copie pas : aucun
  // autre module n'a d'état de ce genre. Et elle occupe la couleur que
  // porterait un permis dont la date de fin est passée sans clôture
  // (`finDepassee`, `calendrier/echeances.ts`) : sur la fiche, seul le statut
  // s'affiche, les deux ne se croisent donc pas — mais si un jour les deux
  // devaient cohabiter dans la même pastille, c'est ici qu'il faudrait
  // trancher.
  en_cours: { ton: "retard", mot: "Travaux en cours" },
  termine: { ton: "fait", mot: "Travaux terminés" },
  // Ni vert, ni rose : une opération annulée n'a plus de rendez-vous. Elle
  // n'est pas « faite », et rien n'y est en retard.
  annule: { ton: "neutre", mot: "Annulé" },
};

/**
 * Le libellé de la pastille d'un permis, décompte de signatures compris.
 *
 * Extrait du composant, et c'est le correctif de fond. La fiche construisait
 * son libellé en interpolant le mot de la table — `` `1 ${mot}` `` — ce qui
 * marchait tant que la table portait « signature manquante », et a produit
 * « **1 En attente de signatures** » le jour où ce mot a été unifié avec celui
 * de la liste. Le défaut n'était visible que dans l'état intermédiaire normal
 * du module : une signature recueillie sur deux.
 *
 * Une table de vocabulaire d'état et un décompte d'objets ne se concatènent
 * pas : l'une nomme un statut, l'autre compte. Les tenir dans la même fonction
 * pure rend la faute impossible à refaire sans qu'un test tombe.
 */
export function libellePastillePermis(
  statut: StatutPermisFeu,
  manquantes: number,
): string {
  if (statut !== "attente_signatures") return ETAT_PERMIS[statut].mot;
  if (manquantes <= 0) return ETAT_PERMIS.attente_signatures.mot;
  return signaturesManquantes(manquantes);
}

function signaturesManquantes(manquantes: number): string {
  const s = manquantes > 1 ? "s" : "";
  return `${manquantes} signature${s} manquante${s}`;
}

/**
 * Le titre de la section « Signatures » de la fiche, depuis le MÊME décompte
 * que la pastille (audit du 2026-10-12, constat 5). Le titre comptait
 * `2 - signatures.length` dans la page, la pastille lisait le statut — jamais
 * écrit `valide` : un permis signé deux fois portait « En attente de
 * signatures » au-dessus de « Permis co-signé et valide ». Le décompte vient
 * désormais des parties (`repartirSignatures`), et le statut passe `valide`
 * quand elles ont toutes signé (`validerSiCoSigne`).
 */
export function titreSignaturesPermis(manquantes: number): string {
  return manquantes > 0 ? signaturesManquantes(manquantes) : "Permis co-signé et valide";
}
