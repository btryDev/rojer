import { z } from "zod";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";

/**
 * Le calcul de l'effectif de l'entreprise depuis ses sites — module pur, lu
 * par le serveur (`effectif.ts`), la page Équipe et le parcours d'entrée.
 *
 * Un site compte ses travailleurs apprentis compris (`effectifSurSite`) ; la
 * société les compte sans les apprentis ni les contrats de
 * professionnalisation, que L. 1111-3 (1° et 6°) écarte du calcul — c'est sur
 * ce nombre que se comptent le CSE (L. 2311-2), le règlement intérieur
 * (L. 1311-2), le programme annuel de prévention (L. 4121-3-1) et la borne de
 * Rojer (ADR-031). S'y ajoutent les salariés de ses établissements que Rojer
 * ne suit pas : les oublier ferait taire un seuil atteint.
 */

export type EffectifSite = { effectifSurSite: number; apprentisSurSite: number };

/** Ce qu'un site apporte à l'effectif de sa société. */
export function contributionDuSite(s: EffectifSite): number {
  return Math.max(0, s.effectifSurSite - s.apprentisSurSite);
}

export function effectifEntrepriseDesSites(
  sites: readonly EffectifSite[],
  horsRojer: number,
): number {
  return sites.reduce((n, s) => n + contributionDuSite(s), 0) + horsRojer;
}

/**
 * Un site entre dans une société suivie (parcours d'entrée, ou SIRET qui le
 * rattache à la société de son SIREN). Il n'était pas suivi : s'il a été
 * déclaré, ses salariés l'ont été parmi les « hors Rojer », d'où il sort — au
 * plus ce qu'il y en a. Sans cela, les mêmes personnes compteraient deux fois
 * (revue du 2026-11-03). Une seule écriture du calcul, pour le serveur
 * (`rejoindre`) et l'aperçu du parcours (`refusSommeDesSites`).
 *
 * @param effectifSansLeSite l'effectif de la société avant son entrée
 */
export function effectifApresRattachement(
  effectifSansLeSite: number,
  horsRojer: number,
  contribution: number,
): { total: number; horsRojerApres: number } {
  const absorbes = Math.min(horsRojer, contribution);
  return {
    total: effectifSansLeSite - absorbes + contribution,
    horsRojerApres: horsRojer - absorbes,
  };
}

/** La borne franchie par la société : même phrase à l'onboarding et dans Équipe. */
export function messageRefusEffectifEntreprise(total: number): string {
  return `Votre société compterait ${total} salariés, tous établissements confondus (apprentis non compris) : Rojer prend en charge les structures jusqu'à ${EFFECTIF_MAX} salariés.`;
}

/** La borne franchie par le site seul, apprentis compris. */
export function messageRefusEffectifSite(effectif: number): string {
  return `${effectif} travailleurs dans l'établissement : Rojer prend en charge les structures jusqu'à ${EFFECTIF_MAX} salariés.`;
}

/** Un nombre de personnes saisi : entier, zéro compris, le vide refusé. */
function nombreDePersonnes(message: string) {
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce
      .number({ message })
      .int("Nombre entier")
      .min(0, "Le nombre ne peut pas être négatif")
      // La borne de la colonne n'est pas celle du produit : la borne de Rojer
      // se lit sur la somme, au serveur (`ecrireEffectifs`), et seulement
      // quand elle croît.
      .max(9999, "Nombre hors limites"),
  );
}

/** Les trois nombres que la carte « Effectif » saisit. */
export type ChampEffectif = "effectifSurSite" | "apprentisSurSite" | "effectifHorsRojer";

/** La saisie des effectifs, dans Équipe (2026-11-03). */
export const effectifsSchema = z
  .object({
    effectifSurSite: nombreDePersonnes("Indiquez le nombre de travailleurs de l'établissement"),
    apprentisSurSite: nombreDePersonnes("Indiquez le nombre d'apprentis (0 si aucun)"),
    effectifHorsRojer: nombreDePersonnes("Indiquez le nombre de salariés hors Rojer (0 si aucun)"),
  })
  .refine((v) => v.apprentisSurSite <= v.effectifSurSite, {
    path: ["apprentisSurSite"],
    message: "Les apprentis sont comptés parmi les travailleurs de l'établissement : pas plus qu'eux.",
  });
