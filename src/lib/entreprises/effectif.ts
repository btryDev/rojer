import "server-only";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { regenererApresMutation } from "@/lib/calendrier/regeneration-sure";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";
import {
  contributionDuSite,
  effectifEntrepriseDesSites,
  messageRefusEffectifEntreprise,
  messageRefusEffectifSite,
  type EffectifSite,
} from "./effectif-calcul";

/**
 * L'EFFECTIF DE L'ENTREPRISE EST CALCULÉ (2026-11-03, décision de la
 * propriétaire ; ADR-028 et ADR-031 amendées).
 *
 *   Entreprise.effectif = Σ (effectifSurSite − apprentisSurSite) des sites
 *                         + effectifHorsRojer
 *
 * Il n'est plus saisi : chaque site déclare ses travailleurs dans Équipe, et
 * la société ceux de ses établissements que Rojer ne suit pas. La colonne
 * reste, recalculée ici et nulle part ailleurs, pour que ses lecteurs — le
 * moteur (`projection.ts`), les seuils du CSE et du règlement intérieur, la
 * couverture — ne changent pas.
 *
 * LA BORNE (ADR-031, `EFFECTIF_MAX`). Toute écriture qui fait CROÎTRE
 * l'effectif de la société au-delà de la borne, ou celui d'un site, est
 * refusée : à l'onboarding comme dans Équipe. Baisser n'est jamais refusé,
 * même au-delà — un dossier ouvert avant la règle garde son dossier et peut
 * se corriger.
 *
 * Module serveur sans action : appelé dans la transaction d'une action
 * serveur, jamais ailleurs.
 */

/** Levée dans la transaction pour l'annuler ; l'action rend son message. */
export class RefusBorneEffectif extends Error {
  constructor(
    message: string,
    /** Le champ du formulaire que le refus vise. */
    readonly champ: "effectifSurSite" | "apprentisSurSite" | "effectifHorsRojer",
  ) {
    super(message);
    this.name = "RefusBorneEffectif";
  }
}

/**
 * Verrouille l'entreprise pour la transaction. Deux sites de la même société
 * qui grandissent en même temps se lisent l'un après l'autre : sans verrou,
 * chacun verrait la somme sans l'autre, et les deux passeraient la borne
 * ensemble. Une écriture sans effet (`increment: 0`) prend le verrou de ligne
 * jusqu'à la fin de la transaction, comme le `FOR UPDATE` de
 * `supprimerEntrepriseSiVide`, sans SQL brut (`auth/portee/imports.test.ts`).
 */
async function verrouiller(tx: Prisma.TransactionClient, entrepriseId: string) {
  await tx.entreprise.update({
    where: { id: entrepriseId },
    data: { effectif: { increment: 0 } },
    select: { id: true },
  });
}

async function lireSites(
  tx: Prisma.TransactionClient,
  entrepriseId: string,
): Promise<{ sites: EffectifSite[]; horsRojer: number; effectif: number }> {
  const e = await tx.entreprise.findUniqueOrThrow({
    where: { id: entrepriseId },
    select: {
      effectif: true,
      effectifHorsRojer: true,
      etablissements: { select: { effectifSurSite: true, apprentisSurSite: true } },
    },
  });
  return { sites: e.etablissements, horsRojer: e.effectifHorsRojer, effectif: e.effectif };
}

/** Verrouille la société d'un site — avant de compter ses fiches. */
export async function verrouillerLaSocieteDuSite(
  tx: Prisma.TransactionClient,
  etablissementId: string,
): Promise<void> {
  const { entrepriseId } = await tx.etablissement.findUniqueOrThrow({
    where: { id: etablissementId },
    select: { entrepriseId: true },
  });
  await verrouiller(tx, entrepriseId);
}

/**
 * Recalcule `Entreprise.effectif` depuis ses sites, sans rien refuser. Pour
 * les écritures qui ne font que déplacer ou retirer un site (suppression,
 * changement de SIREN) : elles ne font croître aucune société de leur fait.
 */
export async function recalculerEffectifEntreprise(
  tx: Prisma.TransactionClient,
  entrepriseId: string,
): Promise<number> {
  await verrouiller(tx, entrepriseId);
  const { sites, horsRojer, effectif } = await lireSites(tx, entrepriseId);
  const total = effectifEntrepriseDesSites(sites, horsRojer);
  if (total !== effectif) {
    await tx.entreprise.update({ where: { id: entrepriseId }, data: { effectif: total } });
  }
  return total;
}

export type NouveauxEffectifs = {
  effectifSurSite?: number;
  apprentisSurSite?: number;
  effectifHorsRojer?: number;
};

/**
 * Écrit les effectifs d'un site (et de sa société), recalcule, et refuse ce
 * qui fait croître au-delà de la borne. Lève `RefusBorneEffectif` : la
 * transaction appelante est annulée en entier.
 */
export async function ecrireEffectifs(
  tx: Prisma.TransactionClient,
  etablissementId: string,
  nouveaux: NouveauxEffectifs,
): Promise<{ entreprise: number; site: number }> {
  const { entrepriseId } = await tx.etablissement.findUniqueOrThrow({
    where: { id: etablissementId },
    select: { entrepriseId: true },
  });
  await verrouiller(tx, entrepriseId);
  // Relu sous le verrou : c'est l'état que la borne compare.
  const site = await tx.etablissement.findUniqueOrThrow({
    where: { id: etablissementId },
    select: { entrepriseId: true, effectifSurSite: true },
  });
  const avant = await lireSites(tx, site.entrepriseId);
  const totalAvant = effectifEntrepriseDesSites(avant.sites, avant.horsRojer);

  if (nouveaux.effectifSurSite !== undefined || nouveaux.apprentisSurSite !== undefined) {
    await tx.etablissement.update({
      where: { id: etablissementId },
      data: {
        effectifSurSite: nouveaux.effectifSurSite,
        apprentisSurSite: nouveaux.apprentisSurSite,
      },
    });
  }
  if (nouveaux.effectifHorsRojer !== undefined) {
    await tx.entreprise.update({
      where: { id: site.entrepriseId },
      data: { effectifHorsRojer: nouveaux.effectifHorsRojer },
    });
  }

  const effectifSite = nouveaux.effectifSurSite ?? site.effectifSurSite;
  if (effectifSite > EFFECTIF_MAX && effectifSite > site.effectifSurSite) {
    throw new RefusBorneEffectif(messageRefusEffectifSite(effectifSite), "effectifSurSite");
  }

  const apres = await lireSites(tx, site.entrepriseId);
  const total = effectifEntrepriseDesSites(apres.sites, apres.horsRojer);
  if (total > EFFECTIF_MAX && total > totalAvant) {
    // Le refus se rend sous le nombre qui a fait croître la société (passe
    // Chrome du 2026-11-03 : il tombait sous le site quand on changeait les
    // salariés hors Rojer).
    const champ =
      apres.horsRojer > avant.horsRojer
        ? "effectifHorsRojer"
        : effectifSite > site.effectifSurSite
          ? "effectifSurSite"
          : "apprentisSurSite";
    throw new RefusBorneEffectif(messageRefusEffectifEntreprise(total), champ);
  }
  if (total !== apres.effectif) {
    await tx.entreprise.update({ where: { id: site.entrepriseId }, data: { effectif: total } });
  }
  return { entreprise: total, site: effectifSite };
}

/**
 * Une personne entre dans l'équipe (création, retour dans l'effectif) : si
 * les fiches actives dépassent l'effectif déclaré du site, il monte d'autant
 * — une fiche est une personne — et la borne s'applique. Rend le nouvel
 * effectif du site s'il a changé, sinon `null`.
 */
export async function effectifSuitLesFiches(
  tx: Prisma.TransactionClient,
  etablissementId: string,
): Promise<number | null> {
  // Sous le verrou : deux créations simultanées se comptent l'une après
  // l'autre, sinon chacune ne verrait pas la fiche de l'autre (revue du
  // 2026-11-03).
  await verrouillerLaSocieteDuSite(tx, etablissementId);
  const [site, actifs] = await Promise.all([
    tx.etablissement.findUniqueOrThrow({
      where: { id: etablissementId },
      select: { effectifSurSite: true },
    }),
    tx.salarie.count({ where: { etablissementId, actif: true } }),
  ]);
  if (actifs <= site.effectifSurSite) return null;
  await ecrireEffectifs(tx, etablissementId, { effectifSurSite: actifs });
  return actifs;
}

/**
 * Un établissement vient d'être créé par le parcours d'entrée.
 *
 * - Seul site de sa société (elle naît avec lui) : le parcours a demandé
 *   l'effectif de la société, apprentis non compris. On en déduit les deux
 *   nombres que le calcul lit — l'écart sous le site est fait d'apprentis,
 *   l'écart au-dessus travaille hors de Rojer —, et la somme retombe dessus.
 * - Société déjà suivie : la valeur postée est ignorée, l'établissement
 *   s'ajoute à la somme, et la borne s'applique (`RefusBorneEffectif`).
 */
export async function accueillirSite(
  tx: Prisma.TransactionClient,
  etablissementId: string,
  effectifEntrepriseDeclare: number,
): Promise<void> {
  const site = await tx.etablissement.findUniqueOrThrow({
    where: { id: etablissementId },
    select: { entrepriseId: true, effectifSurSite: true },
  });
  await verrouiller(tx, site.entrepriseId);
  const { sites } = await lireSites(tx, site.entrepriseId);
  if (sites.length === 1) {
    const apprentis = Math.max(0, site.effectifSurSite - effectifEntrepriseDeclare);
    await tx.etablissement.update({
      where: { id: etablissementId },
      data: { apprentisSurSite: apprentis },
    });
    await tx.entreprise.update({
      where: { id: site.entrepriseId },
      data: {
        effectifHorsRojer: Math.max(0, effectifEntrepriseDeclare - site.effectifSurSite),
        effectif: effectifEntrepriseDeclare,
      },
    });
    return;
  }
  await rejoindreSociete(tx, etablissementId);
}

/**
 * Un site entre dans une société suivie : par le parcours d'entrée, ou parce
 * que son SIRET le rattache à la société de son SIREN.
 *
 * Il n'était pas suivi par Rojer : s'il a été déclaré, ses salariés l'ont été
 * parmi les salariés « hors Rojer » de la société. On les en retire, au plus
 * ce qu'il y en a — sans quoi les mêmes personnes compteraient deux fois, et
 * une société de quarante salariés qui ouvre son second site serait refusée à
 * soixante (revue du 2026-11-03). La borne s'applique à ce qui croît.
 */
export async function rejoindreSociete(
  tx: Prisma.TransactionClient,
  etablissementId: string,
): Promise<void> {
  const site = await tx.etablissement.findUniqueOrThrow({
    where: { id: etablissementId },
    select: { entrepriseId: true, effectifSurSite: true, apprentisSurSite: true },
  });
  await verrouiller(tx, site.entrepriseId);
  const { sites, horsRojer } = await lireSites(tx, site.entrepriseId);
  const contribution = contributionDuSite(site);
  const horsRojerApres = horsRojer - Math.min(horsRojer, contribution);
  const total = effectifEntrepriseDesSites(sites, horsRojerApres);
  const totalAvant = effectifEntrepriseDesSites(sites, horsRojer) - contribution;
  if (total > EFFECTIF_MAX && total > totalAvant) {
    throw new RefusBorneEffectif(messageRefusEffectifEntreprise(total), "effectifSurSite");
  }
  await tx.entreprise.update({
    where: { id: site.entrepriseId },
    data: { effectif: total, effectifHorsRojer: horsRojerApres },
  });
}

/**
 * L'effectif de la société a changé : chacun de ses sites lit les seuils qui
 * en dépendent (CSE, règlement intérieur), tous se recalculent — le patron de
 * `modifierEntreprise`. Hors transaction, après elle.
 */
export async function regenererLaSociete(
  db: Pick<Prisma.TransactionClient, "etablissement">,
  etablissementId: string,
): Promise<boolean> {
  const site = await db.etablissement.findUnique({
    where: { id: etablissementId },
    select: { entrepriseId: true },
  });
  if (!site) return true;
  const sites = await db.etablissement.findMany({
    where: { entrepriseId: site.entrepriseId },
    select: { id: true },
  });
  // L'issue est rendue : un échec ne se tait pas derrière un « Enregistré »
  // (le patron de `modifierEntreprise`).
  let toutes = true;
  for (const s of sites) {
    if (!(await regenererApresMutation(s.id, "entreprises/effectif"))) toutes = false;
    revalidatePath(`/etablissements/${s.id}`, "layout");
  }
  return toutes;
}

/**
 * Un site a changé de société (son SIRET l'a rattaché à celle de son SIREN) :
 * il entre dans la nouvelle, borne comprise, et l'ancienne recompte ses sites
 * si elle n'est pas partie avec lui (`supprimerEntrepriseSiVide`).
 */
export async function changerDeSociete(
  tx: Prisma.TransactionClient,
  etablissementId: string,
  quittee: { id: string; supprimee: boolean },
): Promise<void> {
  await rejoindreSociete(tx, etablissementId);
  if (!quittee.supprimee) await recalculerEffectifEntreprise(tx, quittee.id);
}
